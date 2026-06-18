/* eslint-disable */
// Genera los SQL de seed a partir del modelo del parser:
//   database/migrations/0036_seed_instrument_forms.sql
//   database/migrations/0037_assign_instrument_equipment.sql
//
//   node scripts/gen-instrument-forms-sql.cjs

const fs = require("fs");
const path = require("path");
const { buildModel, detUuid, LDC_PROJECT_ID } = require("./parse-instrument-forms.cjs");

const OUT_DIR = path.join(__dirname, "..", "database", "migrations");

const esc = (s) => String(s == null ? "" : s).replace(/'/g, "''");
const jsonb = (v) => (v == null ? "NULL" : `$j$${JSON.stringify(v)}$j$::jsonb`);

// tipo de sensor (col I) → equipment_types.code
function classifyType(tipo) {
  const t = (tipo || "").toUpperCase();
  if (/PRESION|PRESIÓN/.test(t)) return "TRANSMISOR_PRESION";
  if (/TEMPERATURA|TERMOMETRO|TERMÓMETRO|RTD|TERMOCUPLA/.test(t)) return "TRANSMISOR_TEMPERATURA";
  if (/NIVEL/.test(t)) return "MEDIDOR_NIVEL";
  if (/CAUDAL|FLUJO|MASICO|MÁSICO/.test(t)) return "MEDIDOR_CAUDAL";
  if (/V[AÁ]LVULA/.test(t)) return "DETECTOR_VALVULA";
  return null;
}

function genSeed(forms) {
  const L = [];
  L.push("-- ============================================================");
  L.push("-- 0036 — Seed: 12 formularios de precomisionamiento de instrumentos");
  L.push("-- Generado por scripts/gen-instrument-forms-sql.cjs desde el Excel BIOTEC.");
  L.push("-- Re-ejecutable: borra y recrea solo los CHK-* (no toca formularios universales).");
  L.push("-- ============================================================");
  L.push("");
  L.push("BEGIN;");
  L.push("");
  L.push("-- Limpieza idempotente (cascade borra form_template_sections y section_fields)");
  L.push("DELETE FROM public.form_templates  WHERE key LIKE 'CHK-%' AND project_id IS NULL;");
  L.push("DELETE FROM public.template_sections WHERE code LIKE 'CHK%';");
  L.push("");

  for (const f of forms) {
    L.push(`-- ───────── ${f.key}: ${f.name} ─────────`);
    L.push(`INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES`);
    L.push(`  ('${f.templateId}', NULL, '${esc(f.key)}', '${esc(f.name)}', 'precomisionamiento');`);
    L.push("");

    f.sections.forEach((s, si) => {
      L.push(`INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES`);
      L.push(`  ('${s.sectionId}', '${esc(s.code)}', '${esc(s.name)}', FALSE, ${(si + 1) * 10});`);
      // vínculo template ↔ sección
      L.push(`INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES`);
      L.push(`  ('${f.templateId}', '${s.sectionId}', ${(si + 1) * 10}, TRUE);`);

      if (s.fields.length) {
        L.push(`INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES`);
        const vals = s.fields.map((fl, fi) => {
          const fid = detUuid(`fld:${s.code}:${fl.key}`);
          return `  ('${fid}', '${s.sectionId}', '${esc(fl.key)}', '${esc(fl.label)}', ` +
            `'${fl.type}'::public.field_type, ${fl.required ? "TRUE" : "FALSE"}, ` +
            `${jsonb(fl.options)}, ${jsonb(fl.validations)}, ${(fi + 1) * 10})`;
        });
        L.push(vals.join(",\n") + ";");
      }
      L.push("");
    });
  }

  L.push("COMMIT;");
  L.push("");
  return L.join("\n");
}

function genAssign(forms, tipos) {
  const tmplByKey = Object.fromEntries(forms.map((f) => [f.key, f.templateId]));
  const L = [];
  L.push("-- ============================================================");
  L.push("-- 0037 — Asignación de formularios de instrumentos a equipos por TAG");
  L.push("-- Aplica marca (col H) + tipo de equipo y asigna la plantilla CHK directa.");
  L.push("-- Best-effort: TAGs ausentes en la BD simplemente no afectan filas.");
  L.push("-- ============================================================");
  L.push("");
  L.push("BEGIN;");
  L.push("");
  L.push("-- Tipo de equipo faltante para medidores de nivel");
  L.push("INSERT INTO public.equipment_types (code, name, discipline, icon, sort_order) VALUES");
  L.push("  ('MEDIDOR_NIVEL', 'Medidor / Switch de Nivel', 'I&C', 'waves', 235)");
  L.push("ON CONFLICT (code) DO NOTHING;");
  L.push("");

  const NORM = `upper(regexp_replace(tag, '[^A-Za-z0-9]', '', 'g'))`;
  let totalTags = 0;

  for (const t of tipos) {
    const tmpl = tmplByKey[t.form];
    if (!tmpl) {
      L.push(`-- ⚠ ${t.form}: sin hoja de formulario, se omite (${t.tagCell})`);
      L.push("");
      continue;
    }
    if (!t.tags.length) continue;
    const typeCode = classifyType(t.tipo);
    L.push(`-- ${t.form} | ${t.marca} | ${t.tipo}`);
    for (const tag of t.tags) {
      totalTags++;
      const norm = tag.toUpperCase().replace(/[^A-Z0-9]/g, "");
      // marca + tipo de equipo
      const setType = typeCode
        ? `, equipment_type_id = (SELECT id FROM public.equipment_types WHERE code = '${typeCode}')`
        : "";
      L.push(
        `UPDATE public.equipment SET manufacturer = '${esc(t.marca)}'${setType} ` +
        `WHERE project_id = '${LDC_PROJECT_ID}' AND deleted_at IS NULL AND ${NORM} = '${norm}';`
      );
      // asignación directa de plantilla
      L.push(
        `INSERT INTO public.equipment_templates (equipment_id, template_id) ` +
        `SELECT e.id, '${tmpl}' FROM public.equipment e ` +
        `WHERE e.project_id = '${LDC_PROJECT_ID}' AND e.deleted_at IS NULL AND ${NORM.replace(/tag/g, "e.tag")} = '${norm}' ` +
        `ON CONFLICT (equipment_id, template_id) DO NOTHING;`
      );
    }
    L.push("");
  }

  L.push("COMMIT;");
  L.push("");
  L.push(`-- TAGs procesados: ${totalTags}`);
  L.push("");
  return L.join("\n");
}

const { forms, tipos } = buildModel();
fs.writeFileSync(path.join(OUT_DIR, "0036_seed_instrument_forms.sql"), genSeed(forms), "utf8");
fs.writeFileSync(path.join(OUT_DIR, "0037_assign_instrument_equipment.sql"), genAssign(forms, tipos), "utf8");
console.log("✓ Generados:");
console.log("  database/migrations/0036_seed_instrument_forms.sql");
console.log("  database/migrations/0037_assign_instrument_equipment.sql");
