/**
 * Asigna equipment_type_id a los 35 equipos del proyecto LDC.
 * Uso: node --env-file=.env.local scripts/assign-ldc-equipment-types.mjs
 */

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const LDC_ID = "eba099c0-32ca-4be7-823f-4ab7f3480004";

// ── Mapeo TAG → código de tipo ────────────────────────────────────────────────

const TAG_TYPE_MAP = {
  // Bombas centrífugas (14 bombas + 2 dosificadores)
  "B1":    "BOMBA_CENTRIFUGA",
  "B2":    "BOMBA_CENTRIFUGA",
  "B3":    "BOMBA_CENTRIFUGA",
  "B4":    "BOMBA_CENTRIFUGA",
  "B5":    "BOMBA_CENTRIFUGA",
  "B6":    "BOMBA_CENTRIFUGA",
  "B7":    "BOMBA_CENTRIFUGA",
  "B8":    "BOMBA_CENTRIFUGA",
  "B9":    "BOMBA_CENTRIFUGA",
  "B10":   "BOMBA_CENTRIFUGA",
  "B11":   "BOMBA_CENTRIFUGA",
  "B12":   "BOMBA_CENTRIFUGA",
  "B13":   "BOMBA_CENTRIFUGA",
  "B14":   "BOMBA_CENTRIFUGA",
  "DOS-1": "BOMBA_CENTRIFUGA",
  "DOS-2": "BOMBA_CENTRIFUGA",

  // Sopladores de aire
  "SA1": "SOPLADOR",
  "SA2": "SOPLADOR",
  "SA3": "SOPLADOR",
  "A1":  "SOPLADOR",
  "A2":  "SOPLADOR",

  // Sopladores / compresores de biogás
  "SB1": "COMPRESOR_BIOGAS",
  "SB2": "COMPRESOR_BIOGAS",
  "SB3": "COMPRESOR_BIOGAS",
  "SB4": "COMPRESOR_BIOGAS",
  "SB5": "COMPRESOR_BIOGAS",
  "SB6": "COMPRESOR_BIOGAS",

  // Motores eléctricos (agitador + deshidratadores)
  "AGI": "MOTOR_ELECTRICO",
  "DL1": "MOTOR_ELECTRICO",
  "DL2": "MOTOR_ELECTRICO",

  // Generador de emergencia
  "GED": "GENERADOR_EMERGENCIA",

  // Transformadores
  "TR-1": "TRANSFORMADOR_POTENCIA",
  "TR-2": "TRANSFORMADOR_SECO",

  // Eléctrica
  "BCOND": "BANCO_CAPACITORES",
  "UPS-1": "TABLERO_208V",
};

// ── Obtener IDs de tipos de equipo ────────────────────────────────────────────

const neededCodes = [...new Set(Object.values(TAG_TYPE_MAP))];

const { data: typeRows, error: typeErr } = await sb
  .from("equipment_types")
  .select("id, code")
  .in("code", neededCodes);

if (typeErr) { console.error("❌ equipment_types:", typeErr.message); process.exit(1); }

const typeIdByCode = Object.fromEntries(typeRows.map(r => [r.code, r.id]));
console.log(`✓ ${typeRows.length} tipos de equipo cargados`);

// ── Obtener equipos LDC ───────────────────────────────────────────────────────

const { data: equipment, error: eqErr } = await sb
  .from("equipment")
  .select("id, tag, equipment_type_id")
  .eq("project_id", LDC_ID)
  .is("deleted_at", null);

if (eqErr) { console.error("❌ equipment:", eqErr.message); process.exit(1); }
console.log(`✓ ${equipment.length} equipos LDC cargados`);

// ── Asignar tipos ─────────────────────────────────────────────────────────────

let updated = 0;
let skipped = 0;
let unknown = 0;
const errors = [];

for (const eq of equipment) {
  const typeCode = TAG_TYPE_MAP[eq.tag];

  if (!typeCode) {
    console.warn(`  ⚠  TAG sin mapeo: ${eq.tag}`);
    unknown++;
    continue;
  }

  const typeId = typeIdByCode[typeCode];
  if (!typeId) {
    console.warn(`  ⚠  Código de tipo no encontrado: ${typeCode}`);
    unknown++;
    continue;
  }

  if (eq.equipment_type_id === typeId) {
    skipped++;
    continue;
  }

  const { error: updErr } = await sb
    .from("equipment")
    .update({ equipment_type_id: typeId })
    .eq("id", eq.id);

  if (updErr) {
    console.error(`  ❌  ${eq.tag}: ${updErr.message}`);
    errors.push(eq.tag);
  } else {
    console.log(`  ✓  ${eq.tag.padEnd(10)} → ${typeCode}`);
    updated++;
  }
}

// ── Resumen ───────────────────────────────────────────────────────────────────

console.log("\n─────────────────────────────────");
console.log(`✅  Actualizados : ${updated}`);
console.log(`⏭   Ya tenían tipo: ${skipped}`);
if (unknown) console.log(`⚠   Sin mapeo   : ${unknown}`);
if (errors.length) console.log(`❌  Con errores : ${errors.join(", ")}`);
console.log("─────────────────────────────────");
