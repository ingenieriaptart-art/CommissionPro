/**
 * Ejecuta migración 0026: equipment_type_templates + project_default_templates
 * Uso: node --env-file=.env.local scripts/migrate-0026.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌  Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Ejecutar con: node --env-file=.env.local scripts/migrate-0026.mjs");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// ── helpers ──────────────────────────────────────────────────────────────────

function fail(label, err) {
  console.error(`❌  ${label}:`, err?.message ?? err);
  process.exit(1);
}

// ── 1. Obtener IDs de plantillas globales ─────────────────────────────────────

const { data: tplRows, error: tplErr } = await sb
  .from("form_templates")
  .select("id, key")
  .in("key", ["P_MEC_001", "P_MEC_002", "P_IC_001", "P_ELE_001"])
  .is("project_id", null);

if (tplErr || !tplRows?.length) fail("No se encontraron plantillas globales", tplErr ?? "vacío");

const tpl = Object.fromEntries(tplRows.map(r => [r.key, r.id]));
const { P_MEC_001: mec1, P_MEC_002: mec2, P_IC_001: ic1, P_ELE_001: ele1 } = tpl;

if (!mec1 || !mec2 || !ic1 || !ele1) {
  fail("Faltan plantillas globales (ejecutar 0022 primero)", JSON.stringify(tpl));
}

console.log("✓ Plantillas globales encontradas:", Object.keys(tpl).join(", "));

// ── 2. Obtener IDs de tipos de equipo ─────────────────────────────────────────

const typeCodes = [
  "BOMBA_CENTRIFUGA", "MOTOR_ELECTRICO", "COMPRESOR_BIOGAS", "SOPLADOR",
  "FILTRO", "CHILLER", "CALDERA", "TEA", "LAGUNA", "TANQUE", "TORRE_ENFRIAMIENTO",
  "TRANSFORMADOR_POTENCIA", "TRANSFORMADOR_SECO",
  "CCM", "TABLERO_480V", "TABLERO_208V", "TABLERO_PLC",
  "GENERADOR_EMERGENCIA", "PLC", "VARIADOR_AC", "SCADA",
  "MEDIDOR_CAUDAL", "TRANSMISOR_PRESION", "TRANSMISOR_TEMPERATURA", "DETECTOR_VALVULA",
  "CABLE", "MALLA_TIERRA", "BANCO_CAPACITORES",
];

const { data: etRows, error: etErr } = await sb
  .from("equipment_types")
  .select("id, code")
  .in("code", typeCodes);

if (etErr || !etRows?.length) fail("No se encontraron tipos de equipo", etErr);

const et = Object.fromEntries(etRows.map(r => [r.code, r.id]));
console.log(`✓ ${etRows.length} tipos de equipo encontrados`);

// ── 3. Build rows para equipment_type_templates ───────────────────────────────

const typeTemplateRows = [
  // Mecánica rotativa → P_MEC_001 (aislamiento + continuidad + tierra)
  ...[
    "MOTOR_ELECTRICO", "SOPLADOR", "COMPRESOR_BIOGAS", "GENERADOR_EMERGENCIA", "TEA",
  ].filter(c => et[c]).map(c => ({
    equipment_type_id: et[c], template_id: mec1, is_mandatory: true, sort_order: 10,
  })),

  // Mecánica hidráulica → P_MEC_002 (alineamiento + prueba operativa)
  ...[
    "BOMBA_CENTRIFUGA", "FILTRO", "CHILLER", "CALDERA", "LAGUNA", "TANQUE", "TORRE_ENFRIAMIENTO",
  ].filter(c => et[c]).map(c => ({
    equipment_type_id: et[c], template_id: mec2, is_mandatory: true, sort_order: 10,
  })),

  // I&C → P_IC_001 (loop check)
  ...[
    "PLC", "VARIADOR_AC", "SCADA", "MEDIDOR_CAUDAL", "TRANSMISOR_PRESION",
    "TRANSMISOR_TEMPERATURA", "DETECTOR_VALVULA",
  ].filter(c => et[c]).map(c => ({
    equipment_type_id: et[c], template_id: ic1, is_mandatory: true, sort_order: 10,
  })),

  // Eléctrica → P_ELE_001 (tablero/CCM)
  ...[
    "CCM", "TABLERO_480V", "TABLERO_208V", "TABLERO_PLC",
    "TRANSFORMADOR_POTENCIA", "TRANSFORMADOR_SECO",
    "CABLE", "MALLA_TIERRA", "BANCO_CAPACITORES",
  ].filter(c => et[c]).map(c => ({
    equipment_type_id: et[c], template_id: ele1, is_mandatory: true, sort_order: 10,
  })),

  // Motor también lleva P_ELE_001 (opcional — revisión de cables)
  ...(et["MOTOR_ELECTRICO"] ? [{
    equipment_type_id: et["MOTOR_ELECTRICO"], template_id: ele1, is_mandatory: false, sort_order: 20,
  }] : []),
];

console.log(`→ ${typeTemplateRows.length} filas a insertar en equipment_type_templates`);

// Upsert (ignorar duplicados)
const { error: ettErr } = await sb
  .from("equipment_type_templates")
  .upsert(typeTemplateRows, { onConflict: "equipment_type_id,template_id", ignoreDuplicates: true });

if (ettErr) fail("INSERT equipment_type_templates", ettErr);
console.log(`✓ equipment_type_templates: ${typeTemplateRows.length} filas upserted`);

// ── 4. project_default_templates: P_MEC_001 para todos los proyectos sin default ─

const { data: projects, error: projErr } = await sb
  .from("projects")
  .select("id, name")
  .is("deleted_at", null);

if (projErr) fail("SELECT projects", projErr);
if (!projects?.length) {
  console.log("⚠  Sin proyectos en la base de datos — saltando project_default_templates");
} else {
  const { data: existing, error: exErr } = await sb
    .from("project_default_templates")
    .select("project_id")
    .in("project_id", projects.map(p => p.id));

  if (exErr) fail("SELECT project_default_templates", exErr);

  const existingSet = new Set((existing ?? []).map(r => r.project_id));

  const defaultRows = projects
    .filter(p => !existingSet.has(p.id))
    .map(p => ({ project_id: p.id, template_id: mec1, sort_order: 0 }));

  if (defaultRows.length === 0) {
    console.log("✓ Todos los proyectos ya tienen project_default_templates");
  } else {
    const { error: pdtErr } = await sb
      .from("project_default_templates")
      .insert(defaultRows);

    if (pdtErr) fail("INSERT project_default_templates", pdtErr);

    const names = projects
      .filter(p => defaultRows.some(r => r.project_id === p.id))
      .map(p => p.name).join(", ");

    console.log(`✓ project_default_templates: P_MEC_001 como fallback para [${names}]`);
  }
}

console.log("\n🎉  Migración 0026 completada.");
