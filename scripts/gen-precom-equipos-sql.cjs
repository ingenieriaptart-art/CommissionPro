/* eslint-disable */
// Genera el SQL de seed + asignación a partir del modelo del parser:
//   database/migrations/0045_seed_precom_equipos.sql
//   database/migrations/0046_assign_precom_equipos.sql
//
//   node scripts/gen-precom-equipos-sql.cjs

const fs = require("fs");
const path = require("path");
const { buildModel, detUuid } = require("./parse-precom-equipos.cjs");

const OUT_DIR = path.join(__dirname, "..", "database", "migrations");

const esc = (s) => String(s == null ? "" : s).replace(/'/g, "''");
const sqlStr = (s) => (s == null ? "NULL" : `'${esc(s)}'`);
const jsonb = (v) => (v == null ? "NULL" : `$j$${JSON.stringify(v)}$j$::jsonb`);

function genSeed(forms) {
  const keys = forms.map((f) => `'${esc(f.key)}'`).join(", ");
  const L = [];
  L.push("-- ============================================================");
  L.push("-- 0045 — Seed: 7 formatos de pre-comisionamiento de equipos");
  L.push("-- Generado por scripts/gen-precom-equipos-sql.cjs desde scripts/formatos-nuevos/.");
  L.push("-- Re-ejecutable: borra y recrea solo estos formatos (no toca universales).");
  L.push("-- ============================================================");
  L.push("");
  L.push("BEGIN;");
  L.push("");
  L.push("-- Limpieza idempotente (cascade borra form_template_sections y section_fields)");
  L.push(`DELETE FROM public.form_templates  WHERE key IN (${keys}) AND project_id IS NULL;`);
  for (const f of forms) {
    L.push(`DELETE FROM public.template_sections WHERE code LIKE '${esc(f.key)}-S%';`);
  }
  L.push("");

  for (const f of forms) {
    L.push(`-- ───────── ${f.key}: ${f.name} ─────────`);
    L.push(`INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES`);
    L.push(`  ('${f.templateId}', NULL, ${sqlStr(f.key)}, ${sqlStr(f.name)}, 'precomisionamiento', ${sqlStr(f.revision)}, ${sqlStr(f.sourceDoc)}, ${sqlStr(f.alcance)},`);
    L.push(`   (SELECT id FROM public.equipment_types WHERE code = ${sqlStr(f.equipmentType)}));`);
    L.push("");

    f.sections.forEach((s, si) => {
      L.push(`INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES`);
      L.push(`  ('${s.sectionId}', ${sqlStr(s.code)}, ${sqlStr(s.name)}, FALSE, ${(si + 1) * 10});`);
      L.push(`INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES`);
      L.push(`  ('${f.templateId}', '${s.sectionId}', ${(si + 1) * 10}, TRUE);`);
      if (s.fields.length) {
        L.push(`INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES`);
        const vals = s.fields.map((fl, fi) => {
          const fid = detUuid(`fld:${s.code}:${fl.key}`);
          return `  ('${fid}', '${s.sectionId}', ${sqlStr(fl.key)}, ${sqlStr(fl.label)}, ` +
            `${sqlStr(fl.type)}::public.field_type, ${fl.required ? "TRUE" : "FALSE"}, ` +
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

function genAssign(forms) {
  const L = [];
  L.push("-- ============================================================");
  L.push("-- 0046 — Asignación de formatos de equipos a su tipo de equipo (nivel global)");
  L.push("-- Inserta en equipment_type_templates; el director gestiona en pestaña 'Tipo de Equipo'.");
  L.push("-- ============================================================");
  L.push("");
  L.push("BEGIN;");
  L.push("");
  for (const f of forms) {
    L.push(`-- ${f.key} → ${f.equipmentType}`);
    L.push(`INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)`);
    L.push(`SELECT et.id, '${f.templateId}' FROM public.equipment_types et WHERE et.code = ${sqlStr(f.equipmentType)}`);
    L.push(`ON CONFLICT (equipment_type_id, template_id) DO NOTHING;`);
    L.push("");
  }
  L.push("COMMIT;");
  L.push("");
  return L.join("\n");
}

module.exports = { genSeed, genAssign };

if (require.main === module) {
  const { forms } = buildModel();
  fs.writeFileSync(path.join(OUT_DIR, "0045_seed_precom_equipos.sql"), genSeed(forms), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "0046_assign_precom_equipos.sql"), genAssign(forms), "utf8");
  console.log("✓ Generados:");
  console.log("  database/migrations/0045_seed_precom_equipos.sql");
  console.log("  database/migrations/0046_assign_precom_equipos.sql");
}
