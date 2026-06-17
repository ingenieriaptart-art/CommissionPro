/**
 * Ejecuta migración 0032: Template P_ELE_002 — Celda de Media Tensión 13.8 kV
 * Uso: node --env-file=.env.local scripts/migrate-0032.mjs
 *
 * Qué hace:
 *   1. Crea form_template P_ELE_002
 *   2. Crea 4 secciones nuevas (PRUEBA_AISLAMIENTO_MT, RESISTENCIA_CONTACTOS,
 *      VERIFICACION_PROTECCIONES, PRUEBA_INTERRUPTOR_VCB)
 *   3. Crea section_fields para cada sección
 *   4. Vincula secciones al template en form_template_sections
 *   5. Reasigna CELDA_MT → P_ELE_002 (quitando P_ELE_001 genérico)
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌  Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Ejecutar con: node --env-file=.env.local scripts/migrate-0032.mjs");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function fail(label, err) {
  console.error(`❌  ${label}:`, err?.message ?? JSON.stringify(err));
  process.exit(1);
}

// ── 1. Crear form_template P_ELE_002 ─────────────────────────────────────────

const { data: existingTpl } = await sb
  .from("form_templates")
  .select("id")
  .eq("key", "P_ELE_002")
  .is("project_id", null)
  .maybeSingle();

let templateId;
if (existingTpl) {
  templateId = existingTpl.id;
  console.log("✓ P_ELE_002 ya existe, id:", templateId);
} else {
  const { data: newTpl, error: tplErr } = await sb
    .from("form_templates")
    .insert({ key: "P_ELE_002", name: "Celda de Media Tensión 13.8 kV", test_type: "precomisionamiento" })
    .select("id")
    .single();
  if (tplErr) fail("INSERT form_templates", tplErr);
  templateId = newTpl.id;
  console.log("✓ P_ELE_002 creado, id:", templateId);
}

// ── 2. Crear secciones nuevas ─────────────────────────────────────────────────

async function upsertSection(code, name, sort_order) {
  const { data: existing } = await sb
    .from("template_sections")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (existing) {
    console.log(`  ↳ ${code} ya existe`);
    return existing.id;
  }
  const { data, error } = await sb
    .from("template_sections")
    .insert({ code, name, is_universal: false, sort_order })
    .select("id")
    .single();
  if (error) fail(`INSERT template_sections ${code}`, error);
  console.log(`  ✓ ${code} creado`);
  return data.id;
}

console.log("\n── Secciones ──");
const sAmt  = await upsertSection("PRUEBA_AISLAMIENTO_MT",    "Prueba de Aislamiento MT (Meggueo)",       50);
const sRc   = await upsertSection("RESISTENCIA_CONTACTOS",    "Resistencia de Contactos (Micro-ohmímetro)", 60);
const sVp   = await upsertSection("VERIFICACION_PROTECCIONES","Verificación de Relés de Protección",      70);
const sVcb  = await upsertSection("PRUEBA_INTERRUPTOR_VCB",   "Prueba del Interruptor de Vacío (VCB)",    80);

// Sección existente PUESTA_TIERRA
const { data: sPt } = await sb
  .from("template_sections").select("id").eq("code", "PUESTA_TIERRA").maybeSingle();
if (!sPt) fail("No se encontró sección PUESTA_TIERRA (ejecutar 0022 primero)", {});
const sPtId = sPt.id;
console.log("  ✓ PUESTA_TIERRA encontrada");

// ── 3. Campos de las secciones ────────────────────────────────────────────────

async function upsertFields(sectionId, fields) {
  for (const f of fields) {
    const { data: ex } = await sb
      .from("section_fields").select("id").eq("section_id", sectionId).eq("key", f.key).maybeSingle();
    if (ex) continue;
    const { error } = await sb.from("section_fields").insert({ section_id: sectionId, ...f });
    if (error) fail(`INSERT section_fields ${f.key}`, error);
  }
}

console.log("\n── Campos PRUEBA_AISLAMIENTO_MT ──");
await upsertFields(sAmt, [
  { key: "tension_prueba_mt",        label: "Tensión de prueba",           type: "select",   required: true,  options: JSON.stringify(["2500V","5000V"]),                       sort_order: 10,  hint: "Según norma IEC 62271" },
  { key: "fase_r_tierra",            label: "Fase R → Tierra",             type: "numero",   required: true,  validations: JSON.stringify({ unit: "GΩ", min: 0 }),               sort_order: 20,  hint: "Mínimo aceptable: 1 GΩ" },
  { key: "fase_s_tierra",            label: "Fase S → Tierra",             type: "numero",   required: true,  validations: JSON.stringify({ unit: "GΩ", min: 0 }),               sort_order: 30 },
  { key: "fase_t_tierra",            label: "Fase T → Tierra",             type: "numero",   required: true,  validations: JSON.stringify({ unit: "GΩ", min: 0 }),               sort_order: 40 },
  { key: "fase_r_fase_s",            label: "Fase R → Fase S",             type: "numero",   required: false, validations: JSON.stringify({ unit: "GΩ", min: 0 }),               sort_order: 50 },
  { key: "fase_s_fase_t",            label: "Fase S → Fase T",             type: "numero",   required: false, validations: JSON.stringify({ unit: "GΩ", min: 0 }),               sort_order: 60 },
  { key: "fase_r_fase_t",            label: "Fase R → Fase T",             type: "numero",   required: false, validations: JSON.stringify({ unit: "GΩ", min: 0 }),               sort_order: 70 },
  { key: "temperatura_ambiente",     label: "Temperatura ambiente",        type: "numero",   required: false, validations: JSON.stringify({ unit: "°C" }),                       sort_order: 80,  hint: "Registrar para corrección por temperatura" },
  { key: "humedad_relativa",         label: "Humedad relativa",            type: "numero",   required: false, validations: JSON.stringify({ unit: "%", min: 0, max: 100 }),      sort_order: 90 },
  { key: "obs_aislamiento_mt",       label: "Observaciones",               type: "textarea", required: false,                                                                    sort_order: 100 },
  { key: "resultado_aislamiento_mt", label: "Resultado",                   type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]),                 sort_order: 110 },
]);
console.log("  ✓ 11 campos insertados");

console.log("\n── Campos RESISTENCIA_CONTACTOS ──");
await upsertFields(sRc, [
  { key: "corriente_prueba_rc",   label: "Corriente de prueba",                type: "select",   required: true,  options: JSON.stringify(["100A","200A","500A"]),               sort_order: 10, hint: "Según capacidad del equipo de medición" },
  { key: "resist_contactos_r",    label: "Resistencia contactos Fase R",       type: "numero",   required: true,  validations: JSON.stringify({ unit: "μΩ", min: 0 }),           sort_order: 20, hint: "Valor típico < 100 μΩ" },
  { key: "resist_contactos_s",    label: "Resistencia contactos Fase S",       type: "numero",   required: true,  validations: JSON.stringify({ unit: "μΩ", min: 0 }),           sort_order: 30 },
  { key: "resist_contactos_t",    label: "Resistencia contactos Fase T",       type: "numero",   required: true,  validations: JSON.stringify({ unit: "μΩ", min: 0 }),           sort_order: 40 },
  { key: "valor_referencia_rc",   label: "Valor referencia fabricante",        type: "numero",   required: false, validations: JSON.stringify({ unit: "μΩ", min: 0 }),           sort_order: 50 },
  { key: "obs_resistencia",       label: "Observaciones",                      type: "textarea", required: false,                                                                sort_order: 60 },
  { key: "resultado_resistencia", label: "Resultado",                          type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]),             sort_order: 70 },
]);
console.log("  ✓ 7 campos insertados");

console.log("\n── Campos VERIFICACION_PROTECCIONES ──");
await upsertFields(sVp, [
  { key: "modelo_rele",            label: "Modelo del relé",                          type: "texto",    required: true,  sort_order: 10 },
  { key: "ansi_50_51",             label: "Relé ANSI 50/51 (sobrecorriente)",         type: "checkbox", required: true,  options: JSON.stringify(["VERIFICADO","FALLA","N/A"]),   sort_order: 20, hint: "Protección de sobrecorriente instantánea y temporizada" },
  { key: "pickup_50_51",           label: "Pickup corriente (50/51)",                 type: "numero",   required: false, validations: JSON.stringify({ unit: "A" }),              sort_order: 30 },
  { key: "tiempo_op_50_51",        label: "Tiempo de operación (51)",                 type: "numero",   required: false, validations: JSON.stringify({ unit: "ms" }),             sort_order: 40 },
  { key: "ansi_27",                label: "Relé ANSI 27 (subtensión)",                type: "checkbox", required: false, options: JSON.stringify(["VERIFICADO","FALLA","N/A"]),   sort_order: 50, hint: "Protección por caída de tensión" },
  { key: "pickup_27",              label: "Pickup tensión (27)",                       type: "numero",   required: false, validations: JSON.stringify({ unit: "kV" }),             sort_order: 60 },
  { key: "ansi_59",                label: "Relé ANSI 59 (sobretensión)",               type: "checkbox", required: false, options: JSON.stringify(["VERIFICADO","FALLA","N/A"]),   sort_order: 70, hint: "Protección por sobretensión" },
  { key: "pickup_59",              label: "Pickup tensión (59)",                       type: "numero",   required: false, validations: JSON.stringify({ unit: "kV" }),             sort_order: 80 },
  { key: "ansi_81",                label: "Relé ANSI 81 (frecuencia)",                type: "checkbox", required: false, options: JSON.stringify(["VERIFICADO","FALLA","N/A"]),   sort_order: 90, hint: "Protección por sub/sobrefrecuencia" },
  { key: "prueba_disparo",         label: "Prueba de disparo al relé",                type: "checkbox", required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),           sort_order: 100, hint: "Verificar que el interruptor abre al comando del relé" },
  { key: "obs_protecciones",       label: "Observaciones",                            type: "textarea", required: false,                                                          sort_order: 110 },
  { key: "resultado_protecciones", label: "Resultado",                                type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]),       sort_order: 120 },
]);
console.log("  ✓ 12 campos insertados");

console.log("\n── Campos PRUEBA_INTERRUPTOR_VCB ──");
await upsertFields(sVcb, [
  { key: "tipo_interruptor",      label: "Tipo de interruptor",                              type: "select",   required: true,  options: JSON.stringify(["Vacío (VCB)","SF6","Aire"]),  sort_order: 10 },
  { key: "tension_nominal_vcb",   label: "Tensión nominal",                                  type: "numero",   required: true,  validations: JSON.stringify({ unit: "kV" }),            sort_order: 20 },
  { key: "corriente_nominal_vcb", label: "Corriente nominal",                                type: "numero",   required: true,  validations: JSON.stringify({ unit: "A" }),             sort_order: 30 },
  { key: "tiempo_apertura",       label: "Tiempo de apertura",                               type: "numero",   required: true,  validations: JSON.stringify({ unit: "ms", min: 0 }),    sort_order: 40, hint: "Referencia típica: 40–60 ms" },
  { key: "tiempo_cierre",         label: "Tiempo de cierre",                                 type: "numero",   required: true,  validations: JSON.stringify({ unit: "ms", min: 0 }),    sort_order: 50, hint: "Referencia típica: 60–80 ms" },
  { key: "num_operaciones",       label: "N° de operaciones realizadas",                     type: "numero",   required: false, validations: JSON.stringify({ min: 0 }),                sort_order: 60 },
  { key: "mecanismo_carga",       label: "Mecanismo de carga del resorte",                   type: "checkbox", required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),          sort_order: 70 },
  { key: "indicador_posicion",    label: "Indicador de posición (abierto/cerrado)",          type: "checkbox", required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),          sort_order: 80 },
  { key: "enclavamientos",        label: "Enclavamientos mecánicos/eléctricos",              type: "checkbox", required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),          sort_order: 90 },
  { key: "obs_interruptor",       label: "Observaciones",                                    type: "textarea", required: false,                                                          sort_order: 100 },
  { key: "resultado_interruptor", label: "Resultado",                                        type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]),      sort_order: 110 },
]);
console.log("  ✓ 11 campos insertados");

// ── 4. Vincular secciones al template ────────────────────────────────────────

console.log("\n── form_template_sections ──");
const sections = [
  { template_id: templateId, section_id: sAmt,  sort_order: 50 },
  { template_id: templateId, section_id: sRc,   sort_order: 60 },
  { template_id: templateId, section_id: sVp,   sort_order: 70 },
  { template_id: templateId, section_id: sVcb,  sort_order: 80 },
  { template_id: templateId, section_id: sPtId, sort_order: 90 },
];

const { error: ftsErr } = await sb
  .from("form_template_sections")
  .upsert(sections, { onConflict: "template_id,section_id", ignoreDuplicates: true });

if (ftsErr) fail("INSERT form_template_sections", ftsErr);
console.log("✓ 5 secciones vinculadas (PRUEBA_AISLAMIENTO_MT + RESISTENCIA_CONTACTOS + VERIFICACION_PROTECCIONES + PRUEBA_INTERRUPTOR_VCB + PUESTA_TIERRA)");

// ── 5. Reasignar CELDA_MT: quitar P_ELE_001, agregar P_ELE_002 ───────────────

console.log("\n── equipment_type_templates ──");

const { data: etCelda } = await sb
  .from("equipment_types").select("id").eq("code", "CELDA_MT").maybeSingle();
if (!etCelda) fail("No se encontró equipment_type CELDA_MT (ejecutar 0031 primero)", {});

const { data: tEle1 } = await sb
  .from("form_templates").select("id").eq("key", "P_ELE_001").is("project_id", null).maybeSingle();
const { data: tEle2 } = await sb
  .from("form_templates").select("id").eq("key", "P_ELE_002").is("project_id", null).maybeSingle();

if (!tEle1) fail("No se encontró P_ELE_001", {});
if (!tEle2) fail("No se encontró P_ELE_002 recién creado", {});

// Quitar P_ELE_001 de CELDA_MT
const { error: delErr } = await sb
  .from("equipment_type_templates")
  .delete()
  .eq("equipment_type_id", etCelda.id)
  .eq("template_id", tEle1.id);
if (delErr) fail("DELETE equipment_type_templates P_ELE_001/CELDA_MT", delErr);
console.log("✓ P_ELE_001 desvinculado de CELDA_MT");

// Agregar P_ELE_002 a CELDA_MT
const { error: insErr } = await sb
  .from("equipment_type_templates")
  .upsert(
    { equipment_type_id: etCelda.id, template_id: tEle2.id, is_mandatory: true, sort_order: 10 },
    { onConflict: "equipment_type_id,template_id", ignoreDuplicates: true }
  );
if (insErr) fail("INSERT equipment_type_templates P_ELE_002/CELDA_MT", insErr);
console.log("✓ P_ELE_002 vinculado a CELDA_MT (is_mandatory=true, sort_order=10)");

// ── 6. Verificación final ────────────────────────────────────────────────────

console.log("\n── Verificación ──");

const { data: secciones } = await sb
  .from("form_template_sections")
  .select("sort_order, template_sections(code, name)")
  .eq("template_id", templateId)
  .order("sort_order");

console.log(`✓ P_ELE_002 tiene ${secciones?.length ?? 0} secciones no-universales:`);
(secciones ?? []).forEach(s =>
  console.log(`   [${s.sort_order}] ${s.template_sections?.code} — ${s.template_sections?.name}`)
);

const { data: asignacion } = await sb
  .from("equipment_type_templates")
  .select("is_mandatory, sort_order, form_templates(key, name)")
  .eq("equipment_type_id", etCelda.id);

console.log(`\n✓ CELDA_MT → templates:`);
(asignacion ?? []).forEach(a =>
  console.log(`   ${a.form_templates?.key} — mandatory=${a.is_mandatory}`)
);

const { data: campos } = await sb
  .from("section_fields")
  .select("key")
  .in("section_id", [sAmt, sRc, sVp, sVcb]);

console.log(`\n✓ Total campos nuevos creados: ${campos?.length ?? 0}`);

console.log("\n🎉  Migración 0032 completada: template P_ELE_002 listo para Celda MT 13.8 kV");
