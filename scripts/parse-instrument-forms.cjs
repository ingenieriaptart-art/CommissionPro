/* eslint-disable */
// Parser de formularios de precomisionamiento de instrumentos (Excel → modelo → SQL).
//
//   node scripts/parse-instrument-forms.cjs --summary   (default) imprime resumen
//   node scripts/parse-instrument-forms.cjs --json       vuelca el modelo intermedio
//
// El generador de SQL (gen-instrument-forms-sql.cjs) reutiliza buildModel().

const path = require("path");
const crypto = require("crypto");
const XLSX = require(path.join(__dirname, "..", "app", "node_modules", "xlsx"));

const EXCEL =
  process.env.INSTRUMENT_XLSX ||
  "C:/Users/USUARIO/Downloads/ASIGNACION FORMATOS PRE COMISIONAMIENTO INSTRUMENTOS BIOTEC.xlsx";

const LDC_PROJECT_ID = "eba099c0-32ca-4be7-823f-4ab7f3480004";

// ── helpers ────────────────────────────────────────────────────────────────

// UUID determinista (v5-style) desde un string → válido y estable entre corridas.
function detUuid(str) {
  const h = crypto.createHash("sha1").update("instr-forms:" + str).digest("hex");
  // formato 8-4-4-4-12, version 5, variant 8
  return (
    h.slice(0, 8) + "-" + h.slice(8, 12) + "-5" + h.slice(13, 16) + "-8" +
    h.slice(17, 20) + "-" + h.slice(20, 32)
  );
}

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
const CHECKBOX = /[☐☑☒□▢◻◼■]/;                       // varios glifos según el formato
const isOnlyCheckbox = (s) => /^[\s☐☑☒□▢◻◼■]+$/.test(s) && CHECKBOX.test(s);
const hasCheckbox = (cells) => cells.some((c) => CHECKBOX.test(String(c)));
const joinRow = (cells) => cells.map((c) => String(c)).join(" ");

// ¿col A es un número de sección/ítem? "1." "2.1" "2.1.1"
const numTitle = /^(\d+(?:\.\d+)*)\.?\s+(.+\S)/; // "1. Título" / "2.1 Subtítulo"
const itemNum = /^(\d+(?:\.\d+)+)\.?$/;          // "2.1.1" (solo número, en col A de un ítem)

// slug para keys de campo
const slug = (s) =>
  clean(s)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

// Extrae unidad de un texto con "____": "Resistencia de tierra: ____ Ω" → {label, unit}
function parseMeasured(text) {
  const t = clean(text);
  const m = t.split(/_{2,}/);
  const label = clean(m[0]).replace(/[:\-]\s*$/, "");
  const unit = clean(m.slice(1).join(" ")).replace(/^[:\-]\s*/, "");
  return { label, unit };
}

// ── TIPOS DE EQUIPOS → mapeo TAG/form/marca/tipo ─────────────────────────────

function parseTipos(wb) {
  const ws = wb.Sheets["TIPOS DE EQUIPOS"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const out = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const tagCell = clean(r[1]);
    const form = clean(r[6]).toUpperCase().replace(/\s+/g, "");
    const marca = clean(r[7]);
    const tipo = clean(r[8]);
    if (!form && !tagCell) continue;
    out.push({ tagCell, form, marca, tipo, tags: extractTags(tagCell) });
  }
  return out;
}

// "FIT101- FIT102" / "PIT204 PIT 205" / "TI 201  TI 202" → ["FIT101","FIT102",...]
function extractTags(cell) {
  const text = clean(cell);
  if (!text) return [];
  const tags = [];
  const re = /([A-Za-z]{2,4})\s*-?\s*(\d{2,4})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.push((m[1] + m[2]).toUpperCase());
  }
  return [...new Set(tags)];
}

const normTag = (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, "");

// ── Parseo de una hoja CHK ───────────────────────────────────────────────────

function parseForm(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const code = sheetName.toUpperCase().replace(/\s+/g, ""); // CHK-201
  const numCode = code.replace(/[^0-9]/g, "");              // 201

  // título descriptivo del formulario (primera fila no vacía tras "Lista de...")
  let title = "";
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const c = clean(rows[i][0]);
    if (c && !/lista de verificaci/i.test(c)) { title = c; break; }
  }

  const sections = [];
  let cur = null;
  let started = false;       // ¿ya pasamos el primer título de sección?
  let inResult = false;      // ¿capturando opciones de resultado final?
  let bodyDone = false;      // ¿ya entramos al pie (firmas/resultado)?
  let resultOpts = [];
  let itemN = 0;             // contador de ítems dentro de la sección actual
  let sIdx = 0;

  // Campos de encabezado específicos del instrumento (los universales se excluyen)
  const headerFields = [];
  const UNIVERSAL_HDR = /^(datos generales|proyecto|planta|[aá]rea|tag\b|fabricante|modelo|no\.? de serie|serie|referencia p|p&id|ubicaci[oó]n|fecha|inspector)/i;

  const pushCur = () => {
    if (cur && cur.fields.length) sections.push(cur);
  };
  const newSection = (name, num) => {
    pushCur();
    sIdx++;
    itemN = 0;
    cur = { code: `${code}-S${sIdx}`, name: clean(name) || "Verificación", num: num || "", fields: [] };
    started = true;
  };

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => String(c));
    const a = clean(cells[0]);
    const rowText = joinRow(cells);

    // Inicio del bloque de resultado → capturar opciones (sin cortar el resto del pie)
    if (/resultado del precomis|resultado final|resultado de la inspecci/i.test(rowText)) {
      inResult = true; bodyDone = true; continue;
    }
    // Otros encabezados del pie: firmas / liberación / criterio → fin del cuerpo, no es resultado
    if (/^(firmas|liberaci[oó]n para energizaci|cargo\b|criterio de aceptaci|observaciones generales)/i.test(a)) {
      inResult = false; bodyDone = true; continue;
    }
    if (inResult) {
      // fila de opción: tiene un glifo de casilla (en cualquier columna)
      if (hasCheckbox(cells)) {
        let opt = "";
        if (CHECKBOX.test(a)) {
          opt = a.replace(CHECKBOX, "").trim();
        } else {
          for (const c of cells) {
            const cc = clean(c);
            if (!cc || isOnlyCheckbox(cc) || /^(estado|selecci[oó]n)$/i.test(cc)) continue;
            opt = cc.replace(CHECKBOX, "").trim();
            break;
          }
        }
        if (opt && !resultOpts.includes(opt)) resultOpts.push(opt);
      }
      continue;
    }
    if (bodyDone) continue; // pie sin resultado (firmas, criterios): ignorar

    const cb = hasCheckbox(cells);

    // Título de sección (numerado, sin casilla)
    if (!cb && numTitle.test(a) && !itemNum.test(a)) {
      const mt = a.match(numTitle);
      newSection(mt[2], mt[1]);
      continue;
    }

    // ── Bloque de encabezado (antes de la primera sección numerada) ──
    if (!started) {
      const colon = a.indexOf(":");
      if (colon > 0) {
        const label = clean(a.slice(0, colon));
        const rest = a.slice(colon + 1);
        if (label && !UNIVERSAL_HDR.test(label)) {
          if (CHECKBOX.test(rest)) {
            // "Tipo de Sensor: □ Pt100 □ Pt1000 □ Otro" → select
            const opts = rest.split(CHECKBOX).map((x) => clean(x)).filter(Boolean);
            if (opts.length) {
              headerFields.push({ key: slug(label), label, type: "select", required: false, options: opts });
            }
          } else if (/_{2,}/.test(rest)) {
            // "Zona Ex: ____" → texto libre
            headerFields.push({ key: slug(label), label, type: "texto", required: false });
          }
        }
      }
      continue; // nada más se hace en el encabezado
    }

    // Ítem de checklist
    if (cb) {
      if (!cur) newSection("Verificación", "");
      // descripción = primera celda no vacía que no sea nº de ítem ni casilla ni OK/NA
      const itemId = itemNum.test(a) ? a : "";
      let desc = "";
      for (const c of cells) {
        const cc = clean(c);
        if (!cc || cc === itemId) continue;
        if (isOnlyCheckbox(cc)) continue;
        if (/^(ok|n\/a|si|no)$/i.test(cc)) continue;
        desc = cc;
        break;
      }
      if (!desc) continue;
      itemN++;
      const keyBase = `it${itemN}`;
      cur.fields.push({ key: keyBase, label: desc, type: "checkbox", required: false, options: ["OK", "N/A"] });
      cur.fields.push({ key: keyBase + "_obs", label: "Observación", type: "textarea", required: false });
      continue;
    }

    // Valor medido (____) — solo dentro de secciones (ignora encabezado Tag/Fecha/Proyecto…)
    if (started && cur && /_{2,}/.test(rowText)) {
      const { label, unit } = parseMeasured(rowText);
      if (label && label.length > 2 &&
          !/^(tag|fecha|inspector|l[ií]nea|ubicaci|proyecto|planta|[aá]rea|fabricante|modelo|servicio|rango)/i.test(label)) {
        cur.fields.push({
          key: `val${cur.fields.length}`,
          label,
          type: "numero",
          required: false,
          validations: unit ? { unit } : undefined,
        });
      }
      continue;
    }
  }
  pushCur();

  // Sección de datos específicos del instrumento (encabezado no universal) → al inicio
  if (headerFields.length) {
    sections.unshift({
      code: `${code}-S0`,
      name: "Datos Específicos del Instrumento",
      num: "",
      fields: headerFields,
    });
  }

  // Sección de resultado final (select) — fiel a las opciones del formulario
  if (resultOpts.length) {
    sections.push({
      code: `${code}-RES`,
      name: "Resultado del Precomisionamiento",
      num: "",
      fields: [{
        key: "resultado_precom",
        label: "Resultado",
        type: "select",
        required: true,
        options: resultOpts,
      }],
    });
  }

  return {
    code,
    key: code,
    name: title || `Checklist ${code}`,
    templateId: detUuid("tmpl:" + code),
    sections: sections.map((s) => ({
      ...s,
      sectionId: detUuid("sec:" + s.code),
    })),
  };
}

// ── Modelo completo ──────────────────────────────────────────────────────────

function buildModel() {
  const wb = XLSX.readFile(EXCEL);
  const formSheets = wb.SheetNames.filter((n) => /^CHK[-\s]?\d+$/i.test(n));
  const forms = formSheets.map((s) => parseForm(wb, s));
  const tipos = parseTipos(wb);
  return { wb, forms, tipos, LDC_PROJECT_ID, detUuid, normTag };
}

// ── Resumen ────────────────────────────────────────────────────────────────

function printSummary() {
  const { forms, tipos } = buildModel();
  console.log("══════════ FORMULARIOS PARSEADOS ══════════\n");
  for (const f of forms) {
    const fieldCount = f.sections.reduce((n, s) => n + s.fields.length, 0);
    const itemCount = f.sections.reduce(
      (n, s) => n + s.fields.filter((x) => x.type === "checkbox").length, 0);
    console.log(`■ ${f.key}  "${f.name}"`);
    console.log(`   secciones: ${f.sections.length} | ítems: ${itemCount} | campos totales: ${fieldCount}`);
    for (const s of f.sections) {
      const items = s.fields.filter((x) => x.type === "checkbox").length;
      const nums = s.fields.filter((x) => x.type === "numero").length;
      const sels = s.fields.filter((x) => x.type === "select").length;
      const txts = s.fields.filter((x) => x.type === "texto").length;
      const extra = [items ? `ítems:${items}` : "", nums ? `valores:${nums}` : "",
        sels ? `select:${sels}` : "", txts ? `texto:${txts}` : ""].filter(Boolean).join(", ");
      console.log(`      - ${s.code}  ${s.name}  (${extra || "—"})`);
    }
    console.log("");
  }

  console.log("══════════ MAPEO TAG → FORMATO / MARCA / TIPO ══════════\n");
  const allForms = new Set(forms.map((f) => f.key));
  for (const t of tipos) {
    const ok = allForms.has(t.form) ? "" : "  ⚠ formato sin hoja";
    console.log(`${t.form}${ok}  | marca: ${t.marca}`);
    console.log(`   tipo: ${t.tipo}`);
    console.log(`   TAGs: ${t.tags.join(", ") || "(ninguno)"}`);
    console.log("");
  }

  const allTags = [...new Set(tipos.flatMap((t) => t.tags))];
  console.log(`Total TAGs detectados: ${allTags.length}`);
  console.log(allTags.join(", "));
}

module.exports = { buildModel, detUuid, normTag, extractTags, LDC_PROJECT_ID };

if (require.main === module) {
  const arg = process.argv[2] || "--summary";
  if (arg === "--json") {
    const { forms, tipos } = buildModel();
    console.log(JSON.stringify({ forms, tipos }, null, 2));
  } else {
    printSummary();
  }
}
