/* eslint-disable */
// Parser de los formatos de pre-comisionamiento de EQUIPOS (Excel → modelo).
//   node scripts/parse-precom-equipos.cjs            (default) imprime resumen
//   node scripts/parse-precom-equipos.cjs --json     vuelca el modelo
//
// El texto de ítems/placa se lee verbatim del .xls; las fronteras de sección
// vienen de scripts/precom-equipos.config.cjs.

const path = require("path");
const crypto = require("crypto");
const XLSX = require(path.join(__dirname, "..", "app", "node_modules", "xlsx"));
const CONFIG = require("./precom-equipos.config.cjs");

const SRC_DIR = path.join(__dirname, "formatos-nuevos");

// UUID determinista (v5-style) estable entre corridas.
function detUuid(str) {
  const h = crypto.createHash("sha1").update("precom-equipos:" + str).digest("hex");
  return (
    h.slice(0, 8) + "-" + h.slice(8, 12) + "-5" + h.slice(13, 16) + "-8" +
    h.slice(17, 20) + "-" + h.slice(20, 32)
  );
}

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

// Normaliza para comparar títulos de sección (sin acentos, minúsculas, sin signos).
const norm = (s) =>
  clean(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

// Texto de la primera celda no vacía de una fila (las celdas vacías de col A se saltan).
function firstText(ws, r, range) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cc = ws[XLSX.utils.encode_cell({ r, c })];
    const v = clean(cc && cc.v);
    if (v) return v;
  }
  return "";
}

const RE_CHECKLIST = /^(check ?list|chek list|lista de chequeo|lista de verificacion)/i;
const RE_PLACA     = /datos de dise[nñ]o/i;
const RE_FOOTER    = /^(notas?|firmas?|resultado|aprobado)\b/i;

function parseForm(cfg) {
  const wb = XLSX.readFile(path.join(SRC_DIR, cfg.file));
  const ws = wb.Sheets[cfg.sheet];
  if (!ws) throw new Error(`Hoja '${cfg.sheet}' no existe en ${cfg.file}`);
  const range = XLSX.utils.decode_range(ws["!ref"]);

  // Texto por fila (verbatim).
  const rowText = [];
  for (let r = range.s.r; r <= range.e.r; r++) rowText[r] = firstText(ws, r, range);

  // Localizar marcadores — dos pasadas para evitar que rFooter quede anclado
  // a un rChecklist parcial detectado dentro del mismo bucle.
  let rChecklist = -1, rPlaca = -1, rFooter = -1;
  // Pass 1: primer rPlaca y último rChecklist.
  for (let r = range.s.r; r <= range.e.r; r++) {
    const t = rowText[r];
    if (!t) continue;
    if (rPlaca === -1 && RE_PLACA.test(t)) rPlaca = r;
    if (RE_CHECKLIST.test(t)) rChecklist = r;          // última ocurrencia gana
  }
  if (rChecklist === -1) throw new Error(`No se halló 'Check List' en ${cfg.key}`);
  // Pass 2: primer rFooter a partir de rChecklist+1.
  for (let r = rChecklist + 1; r <= range.e.r; r++) {
    if (rowText[r] && RE_FOOTER.test(rowText[r])) { rFooter = r; break; }
  }
  if (rFooter === -1) rFooter = range.e.r + 1;

  const titleSet = new Set(cfg.sectionTitles.map(norm));
  const sections = [];
  let sIdx = 0;
  const newSection = (name) => {
    sIdx++;
    const code = `${cfg.key}-S${sIdx}`;
    const s = { code, name: clean(name), sectionId: detUuid("sec:" + code), fields: [] };
    sections.push(s);
    return s;
  };

  // Sección de datos de placa (entre marcador DATOS DE DISEÑO y Check List).
  if (rPlaca !== -1) {
    const placa = newSection(cfg.defaultSection || "Datos de Placa");
    for (let r = rPlaca + 1; r < rChecklist; r++) {
      const t = rowText[r];
      if (!t) continue;
      placa.fields.push({
        key: `placa_${placa.fields.length + 1}`,
        label: t.replace(/[:\-]\s*$/, ""),
        type: "texto",
        required: false,
      });
    }
    // Si quedó vacía, descártala (no cuenta como sección).
    if (!placa.fields.length) sections.pop(), sIdx--;
  }

  // Cuerpo del checklist.
  let cur = null;
  let itemN = 0;
  for (let r = rChecklist + 1; r < rFooter; r++) {
    const t = rowText[r];
    if (!t) continue;
    if (titleSet.has(norm(t))) {
      cur = newSection(t);
      itemN = 0;
      continue;
    }
    if (!cur) { cur = newSection(cfg.defaultSection || "Verificación"); itemN = 0; }
    itemN++;
    const base = `it${itemN}`;
    cur.fields.push({
      key: base, label: t, type: "checkbox", required: false, options: cfg.resultOptions,
    });
    cur.fields.push({
      key: base + "_obs", label: "Observación", type: "textarea", required: false,
    });
  }

  // Resultado final (select) si el formato lo trae.
  if (cfg.resultado) {
    const res = newSection("Resultado del Pre-Comisionamiento");
    res.fields.push({
      key: "resultado_final", label: cfg.resultado.label, type: "select",
      required: true, options: cfg.resultado.options,
    });
  }

  return {
    key: cfg.key,
    name: cfg.name,
    revision: cfg.revision,
    sourceDoc: cfg.file,
    equipmentType: cfg.equipmentType,
    alcance: cfg.alcance,
    templateId: detUuid("tmpl:" + cfg.key),
    sections,
  };
}

function buildModel() {
  const forms = CONFIG.map(parseForm);
  return { forms, CONFIG, detUuid };
}

// Reporte de comparación: qué otras plantillas ya apuntan a cada tipo de equipo.
// (Estático; la verificación fina se hace en Supabase tras aplicar.)
const KNOWN_GENERIC = {
  BOMBA_CENTRIFUGA: ["P_MEC_001", "P_MEC_002"],
  MOTOR_ELECTRICO: ["P_ELE_001"],
};

function printSummary() {
  const { forms } = buildModel();
  console.log("══════════ FORMATOS DE EQUIPOS PARSEADOS ══════════\n");
  for (const f of forms) {
    const items = f.sections.reduce(
      (n, s) => n + s.fields.filter((x) => x.type === "checkbox").length, 0);
    console.log(`■ ${f.key}  "${f.name}"`);
    console.log(`   tipo: ${f.equipmentType}${f.alcance ? "  alcance: " + f.alcance : ""}  rev: ${f.revision}`);
    console.log(`   secciones: ${f.sections.length} | ítems: ${items}`);
    for (const s of f.sections) {
      const it = s.fields.filter((x) => x.type === "checkbox").length;
      const tx = s.fields.filter((x) => x.type === "texto").length;
      const se = s.fields.filter((x) => x.type === "select").length;
      console.log(`      - ${s.code}  ${s.name}  (${[it && "ítems:" + it, tx && "placa:" + tx, se && "select:" + se].filter(Boolean).join(", ") || "—"})`);
    }
    const others = forms.filter((o) => o !== f && o.equipmentType === f.equipmentType).map((o) => o.key);
    const generic = KNOWN_GENERIC[f.equipmentType] || [];
    if (others.length || generic.length) {
      console.log(`   ⚠ mismo tipo de equipo: ${[...others, ...generic.map((g) => g + " (genérico)")].join(", ")}`);
    }
    console.log("");
  }
}

module.exports = { buildModel, detUuid, CONFIG };

if (require.main === module) {
  const arg = process.argv[2] || "--summary";
  if (arg === "--json") console.log(JSON.stringify(buildModel().forms, null, 2));
  else printSummary();
}
