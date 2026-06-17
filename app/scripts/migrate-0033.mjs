/**
 * Migración 0033: Templates eléctricos específicos
 *   P_ELE_003 — Transformador de Potencia / Seco
 *   P_ELE_004 — Variador de Frecuencia AC
 *   P_ELE_005 — Generador de Emergencia
 *
 * Uso: node --env-file=.env.local scripts/migrate-0033.mjs
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function fail(label, err) {
  console.error(`❌  ${label}:`, err?.message ?? JSON.stringify(err));
  process.exit(1);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function upsertTemplate(key, name) {
  const { data: ex } = await sb.from("form_templates").select("id").eq("key", key).is("project_id", null).maybeSingle();
  if (ex) { console.log(`  ↳ ${key} ya existe`); return ex.id; }
  const { data, error } = await sb.from("form_templates")
    .insert({ key, name, test_type: "precomisionamiento" }).select("id").single();
  if (error) fail(`INSERT form_templates ${key}`, error);
  console.log(`  ✓ ${key} creado`);
  return data.id;
}

async function upsertSection(code, name, sort_order) {
  const { data: ex } = await sb.from("template_sections").select("id").eq("code", code).maybeSingle();
  if (ex) return ex.id;
  const { data, error } = await sb.from("template_sections")
    .insert({ code, name, is_universal: false, sort_order }).select("id").single();
  if (error) fail(`INSERT template_sections ${code}`, error);
  return data.id;
}

async function upsertFields(sectionId, fields) {
  for (const f of fields) {
    const { data: ex } = await sb.from("section_fields").select("id").eq("section_id", sectionId).eq("key", f.key).maybeSingle();
    if (ex) continue;
    const { error } = await sb.from("section_fields").insert({ section_id: sectionId, ...f });
    if (error) fail(`INSERT section_fields ${f.key}`, error);
  }
}

async function linkSections(templateId, pairs) {
  const rows = pairs.map(([section_id, sort_order]) => ({ template_id: templateId, section_id, sort_order }));
  const { error } = await sb.from("form_template_sections")
    .upsert(rows, { onConflict: "template_id,section_id", ignoreDuplicates: true });
  if (error) fail("INSERT form_template_sections", error);
}

async function assignToType(typeCodes, templateId, replaceKey = null) {
  for (const code of typeCodes) {
    const { data: et } = await sb.from("equipment_types").select("id").eq("code", code).maybeSingle();
    if (!et) { console.log(`  ⚠ equipment_type ${code} no encontrado`); continue; }

    if (replaceKey) {
      const { data: old } = await sb.from("form_templates").select("id").eq("key", replaceKey).is("project_id", null).maybeSingle();
      if (old) {
        await sb.from("equipment_type_templates").delete()
          .eq("equipment_type_id", et.id).eq("template_id", old.id);
      }
    }

    const { error } = await sb.from("equipment_type_templates")
      .upsert({ equipment_type_id: et.id, template_id: templateId, is_mandatory: true, sort_order: 10 },
               { onConflict: "equipment_type_id,template_id", ignoreDuplicates: true });
    if (error) fail(`INSERT equipment_type_templates ${code}`, error);
    console.log(`  ✓ ${code} → template asignado`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// P_ELE_003 — TRANSFORMADOR DE POTENCIA / SECO
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n══ P_ELE_003 — Transformador de Potencia / Seco ══");

const tEle3 = await upsertTemplate("P_ELE_003", "Transformador de Potencia / Seco");

const sRelTr   = await upsertSection("RELACION_TRANSFORMACION", "Relación de Transformación", 50);
const sResDevn = await upsertSection("RESISTENCIA_DEVANADOS",   "Resistencia de Devanados",   60);
const sAislTr  = await upsertSection("PRUEBA_AISLAMIENTO_TRAFO","Prueba de Aislamiento (Meggueo)", 70);
const sVacio   = await upsertSection("PRUEBA_VACIO_TRAFO",      "Prueba en Vacío",             80);

await upsertFields(sRelTr, [
  { key: "tension_at",           label: "Tensión AT nominal",           type: "numero",   required: true,  validations: JSON.stringify({ unit: "kV" }),    sort_order: 10 },
  { key: "tension_bt",           label: "Tensión BT nominal",           type: "numero",   required: true,  validations: JSON.stringify({ unit: "V" }),     sort_order: 20 },
  { key: "relacion_nominal",     label: "Relación nominal (AT/BT)",     type: "numero",   required: true,                                                   sort_order: 30 },
  { key: "relacion_medida_r",    label: "Relación medida — Fase R",     type: "numero",   required: true,                                                   sort_order: 40, hint: "Error aceptable < 0.5%" },
  { key: "error_r",              label: "Error fase R",                 type: "numero",   required: true,  validations: JSON.stringify({ unit: "%" }),     sort_order: 50 },
  { key: "relacion_medida_s",    label: "Relación medida — Fase S",     type: "numero",   required: true,                                                   sort_order: 60 },
  { key: "error_s",              label: "Error fase S",                 type: "numero",   required: true,  validations: JSON.stringify({ unit: "%" }),     sort_order: 70 },
  { key: "relacion_medida_t",    label: "Relación medida — Fase T",     type: "numero",   required: true,                                                   sort_order: 80 },
  { key: "error_t",              label: "Error fase T",                 type: "numero",   required: true,  validations: JSON.stringify({ unit: "%" }),     sort_order: 90 },
  { key: "grupo_vectorial",      label: "Grupo vectorial",              type: "texto",    required: true,                                                   sort_order: 100, hint: "Ej: Dyn11, Yyn0" },
  { key: "obs_relacion",         label: "Observaciones",                type: "textarea", required: false,                                                  sort_order: 110 },
  { key: "resultado_relacion",   label: "Resultado",                    type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]), sort_order: 120 },
]);

await upsertFields(sResDevn, [
  { key: "corriente_prueba_dev", label: "Corriente de prueba",          type: "numero",   required: true,  validations: JSON.stringify({ unit: "A" }),     sort_order: 10 },
  { key: "resist_at_r",         label: "Resistencia AT — Fase R",      type: "numero",   required: true,  validations: JSON.stringify({ unit: "mΩ" }),    sort_order: 20 },
  { key: "resist_at_s",         label: "Resistencia AT — Fase S",      type: "numero",   required: true,  validations: JSON.stringify({ unit: "mΩ" }),    sort_order: 30 },
  { key: "resist_at_t",         label: "Resistencia AT — Fase T",      type: "numero",   required: true,  validations: JSON.stringify({ unit: "mΩ" }),    sort_order: 40 },
  { key: "resist_bt_r",         label: "Resistencia BT — Fase R",      type: "numero",   required: true,  validations: JSON.stringify({ unit: "mΩ" }),    sort_order: 50 },
  { key: "resist_bt_s",         label: "Resistencia BT — Fase S",      type: "numero",   required: true,  validations: JSON.stringify({ unit: "mΩ" }),    sort_order: 60 },
  { key: "resist_bt_t",         label: "Resistencia BT — Fase T",      type: "numero",   required: true,  validations: JSON.stringify({ unit: "mΩ" }),    sort_order: 70 },
  { key: "temp_devanado",       label: "Temperatura devanados",         type: "numero",   required: true,  validations: JSON.stringify({ unit: "°C" }),    sort_order: 80, hint: "Para corrección a 75°C" },
  { key: "obs_resistencia_dev", label: "Observaciones",                 type: "textarea", required: false,                                                  sort_order: 90 },
  { key: "resultado_resist_dev","label": "Resultado",                   type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]), sort_order: 100 },
]);

await upsertFields(sAislTr, [
  { key: "tension_prueba_trafo", label: "Tensión de prueba",            type: "select",   required: true,  options: JSON.stringify(["1000V","2500V","5000V","10kV"]), sort_order: 10 },
  { key: "at_tierra",           label: "AT → Tierra",                  type: "numero",   required: true,  validations: JSON.stringify({ unit: "GΩ", min: 0 }),       sort_order: 20 },
  { key: "bt_tierra",           label: "BT → Tierra",                  type: "numero",   required: true,  validations: JSON.stringify({ unit: "GΩ", min: 0 }),       sort_order: 30 },
  { key: "at_bt",               label: "AT → BT",                      type: "numero",   required: true,  validations: JSON.stringify({ unit: "GΩ", min: 0 }),       sort_order: 40 },
  { key: "indice_polarizacion", label: "Índice de polarización (IP)",  type: "numero",   required: false, validations: JSON.stringify({ min: 0 }),                   sort_order: 50, hint: "IP = R10min/R1min — aceptable > 1.5" },
  { key: "obs_aislamiento_trafo","label": "Observaciones",             type: "textarea", required: false,                                                              sort_order: 60 },
  { key: "resultado_ais_trafo", label: "Resultado",                    type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]),         sort_order: 70 },
]);

await upsertFields(sVacio, [
  { key: "tension_vacio",       label: "Tensión aplicada en vacío",     type: "numero",   required: true,  validations: JSON.stringify({ unit: "V" }),    sort_order: 10 },
  { key: "corriente_vacio_r",   label: "Corriente en vacío — Fase R",   type: "numero",   required: true,  validations: JSON.stringify({ unit: "A" }),    sort_order: 20 },
  { key: "corriente_vacio_s",   label: "Corriente en vacío — Fase S",   type: "numero",   required: true,  validations: JSON.stringify({ unit: "A" }),    sort_order: 30 },
  { key: "corriente_vacio_t",   label: "Corriente en vacío — Fase T",   type: "numero",   required: true,  validations: JSON.stringify({ unit: "A" }),    sort_order: 40 },
  { key: "perdidas_vacio",      label: "Pérdidas en vacío",             type: "numero",   required: false, validations: JSON.stringify({ unit: "W" }),    sort_order: 50 },
  { key: "obs_vacio",           label: "Observaciones",                 type: "textarea", required: false,                                                 sort_order: 60 },
  { key: "resultado_vacio",     label: "Resultado",                     type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]), sort_order: 70 },
]);

// Sección PUESTA_TIERRA existente
const { data: sPtRow } = await sb.from("template_sections").select("id").eq("code", "PUESTA_TIERRA").maybeSingle();
const sPt = sPtRow.id;

await linkSections(tEle3, [
  [sRelTr,  50], [sResDevn, 60], [sAislTr, 70], [sVacio, 80], [sPt, 90],
]);

await assignToType(["TRANSFORMADOR_POTENCIA", "TRANSFORMADOR_SECO"], tEle3, "P_ELE_001");
console.log("✓ P_ELE_003 completo — 4 secciones, asignado a TRANSFORMADOR_POTENCIA + TRANSFORMADOR_SECO");

// ═══════════════════════════════════════════════════════════════════════════════
// P_ELE_004 — VARIADOR DE FRECUENCIA AC
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n══ P_ELE_004 — Variador de Frecuencia AC ══");

const tEle4 = await upsertTemplate("P_ELE_004", "Variador de Frecuencia AC (VFD)");

const sConfigVfd  = await upsertSection("CONFIG_VARIADOR",    "Configuración de Parámetros",  50);
const sComVfd     = await upsertSection("PRUEBA_COM_VFD",     "Prueba de Comunicación",        60);
const sMarchaVfd  = await upsertSection("PRUEBA_MARCHA_VFD",  "Prueba de Marcha",              70);

await upsertFields(sConfigVfd, [
  { key: "tension_entrada_vfd",  label: "Tensión de entrada nominal",    type: "numero",   required: true,  validations: JSON.stringify({ unit: "V" }),     sort_order: 10 },
  { key: "potencia_vfd",         label: "Potencia nominal",              type: "numero",   required: true,  validations: JSON.stringify({ unit: "kW" }),    sort_order: 20 },
  { key: "frecuencia_min",       label: "Frecuencia mínima configurada", type: "numero",   required: true,  validations: JSON.stringify({ unit: "Hz" }),    sort_order: 30 },
  { key: "frecuencia_max",       label: "Frecuencia máxima configurada", type: "numero",   required: true,  validations: JSON.stringify({ unit: "Hz" }),    sort_order: 40 },
  { key: "rampa_aceleracion",    label: "Rampa de aceleración",          type: "numero",   required: true,  validations: JSON.stringify({ unit: "s" }),     sort_order: 50 },
  { key: "rampa_desaceleracion", label: "Rampa de desaceleración",       type: "numero",   required: true,  validations: JSON.stringify({ unit: "s" }),     sort_order: 60 },
  { key: "corriente_maxima",     label: "Corriente máxima configurada",  type: "numero",   required: true,  validations: JSON.stringify({ unit: "A" }),     sort_order: 70 },
  { key: "proteccion_termica",   label: "Protección térmica motor",      type: "checkbox", required: true,  options: JSON.stringify(["CONFIGURADO","N/A"]), sort_order: 80 },
  { key: "control_fuente",       label: "Fuente de referencia",          type: "select",   required: true,  options: JSON.stringify(["Analógica 4-20mA","Analógica 0-10V","Digital Modbus","Potenciómetro"]), sort_order: 90 },
  { key: "obs_config_vfd",       label: "Observaciones",                 type: "textarea", required: false,                                                  sort_order: 100 },
  { key: "resultado_config_vfd", label: "Resultado",                     type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]), sort_order: 110 },
]);

await upsertFields(sComVfd, [
  { key: "protocolo_com",        label: "Protocolo de comunicación",     type: "select",   required: true,  options: JSON.stringify(["Modbus RTU","Modbus TCP","Profibus DP","DeviceNet","EtherNet/IP","N/A"]), sort_order: 10 },
  { key: "direccion_esclavo",    label: "Dirección esclavo",             type: "numero",   required: false,                                                  sort_order: 20 },
  { key: "velocidad_com",        label: "Velocidad de comunicación",     type: "select",   required: false, options: JSON.stringify(["9600","19200","38400","57600","115200"]), sort_order: 30 },
  { key: "lectura_velocidad",    label: "Lectura velocidad desde PLC/SCADA", type: "checkbox", required: true, options: JSON.stringify(["OK","FALLA","N/A"]), sort_order: 40 },
  { key: "escritura_setpoint",   label: "Escritura setpoint desde PLC/SCADA", type: "checkbox", required: true, options: JSON.stringify(["OK","FALLA","N/A"]), sort_order: 50 },
  { key: "obs_com_vfd",          label: "Observaciones",                 type: "textarea", required: false,                                                  sort_order: 60 },
  { key: "resultado_com_vfd",    label: "Resultado",                     type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO","N/A"]), sort_order: 70 },
]);

await upsertFields(sMarchaVfd, [
  { key: "prueba_sin_carga",     label: "Prueba de arranque sin carga",  type: "checkbox", required: true,  options: JSON.stringify(["OK","FALLA"]),         sort_order: 10 },
  { key: "frecuencia_sin_carga", label: "Frecuencia alcanzada sin carga",type: "numero",   required: true,  validations: JSON.stringify({ unit: "Hz" }),     sort_order: 20 },
  { key: "corriente_sin_carga",  label: "Corriente sin carga",           type: "numero",   required: true,  validations: JSON.stringify({ unit: "A" }),      sort_order: 30 },
  { key: "prueba_con_carga",     label: "Prueba de marcha con carga",    type: "checkbox", required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),   sort_order: 40 },
  { key: "frecuencia_con_carga", label: "Frecuencia de operación",       type: "numero",   required: false, validations: JSON.stringify({ unit: "Hz" }),     sort_order: 50 },
  { key: "corriente_con_carga",  label: "Corriente con carga",           type: "numero",   required: false, validations: JSON.stringify({ unit: "A" }),      sort_order: 60 },
  { key: "temperatura_vfd",      label: "Temperatura del variador",      type: "numero",   required: false, validations: JSON.stringify({ unit: "°C" }),     sort_order: 70 },
  { key: "alarmas_vfd",          label: "Alarmas o fallas activas",      type: "checkbox", required: true,  options: JSON.stringify(["NINGUNA","HAY ALARMAS"]), sort_order: 80 },
  { key: "obs_marcha_vfd",       label: "Observaciones",                 type: "textarea", required: false,                                                   sort_order: 90 },
  { key: "resultado_marcha_vfd", label: "Resultado",                     type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]), sort_order: 100 },
]);

await linkSections(tEle4, [
  [sConfigVfd, 50], [sComVfd, 60], [sMarchaVfd, 70], [sPt, 80],
]);

await assignToType(["VARIADOR_AC"], tEle4, "P_IC_001");
console.log("✓ P_ELE_004 completo — 3 secciones, asignado a VARIADOR_AC");

// ═══════════════════════════════════════════════════════════════════════════════
// P_ELE_005 — GENERADOR DE EMERGENCIA
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n══ P_ELE_005 — Generador de Emergencia ══");

const tEle5 = await upsertTemplate("P_ELE_005", "Generador de Emergencia");

const sMotPrim   = await upsertSection("MOTOR_PRIMARIO_GEN",  "Motor Primario (Diesel)",        50);
const sArranqueG  = await upsertSection("PRUEBA_ARRANQUE_GEN", "Prueba de Arranque",             60);
const sCargaG    = await upsertSection("PRUEBA_CARGA_GEN",    "Prueba de Carga",                 70);
const sAtsInteg  = await upsertSection("INTEGRACION_ATS_GEN", "Integración con ATS",            80);

await upsertFields(sMotPrim, [
  { key: "tipo_combustible",     label: "Tipo de combustible",          type: "select",   required: true,  options: JSON.stringify(["Diésel","Gas Natural","Gasolina"]), sort_order: 10 },
  { key: "nivel_combustible",    label: "Nivel de combustible",         type: "numero",   required: true,  validations: JSON.stringify({ unit: "%" }),    sort_order: 20 },
  { key: "nivel_aceite",         label: "Nivel de aceite (dipstick)",   type: "checkbox", required: true,  options: JSON.stringify(["OK","BAJO","CRITICO"]), sort_order: 30 },
  { key: "nivel_refrigerante",   label: "Nivel de refrigerante",        type: "checkbox", required: true,  options: JSON.stringify(["OK","BAJO","CRITICO"]), sort_order: 40 },
  { key: "estado_bateria",       label: "Estado baterías de arranque",  type: "checkbox", required: true,  options: JSON.stringify(["OK","BAJA CARGA","REEMPLAZAR"]), sort_order: 50 },
  { key: "tension_bateria",      label: "Tensión de batería",           type: "numero",   required: true,  validations: JSON.stringify({ unit: "V" }),    sort_order: 60, hint: "Nominal: 12V o 24V" },
  { key: "fugas_visibles",       label: "Fugas visibles (aceite/agua/combustible)", type: "checkbox", required: true, options: JSON.stringify(["NINGUNA","LEVE","SIGNIFICATIVA"]), sort_order: 70 },
  { key: "obs_motor_prim",       label: "Observaciones",                type: "textarea", required: false,                                                 sort_order: 80 },
]);

await upsertFields(sArranqueG, [
  { key: "modo_arranque",        label: "Modo de arranque",             type: "select",   required: true,  options: JSON.stringify(["Automático","Manual"]), sort_order: 10 },
  { key: "tiempo_arranque",      label: "Tiempo hasta estabilización",  type: "numero",   required: true,  validations: JSON.stringify({ unit: "s" }),    sort_order: 20, hint: "Típico: 10-15 s" },
  { key: "tension_generada_r",   label: "Tensión generada — R-S",       type: "numero",   required: true,  validations: JSON.stringify({ unit: "V" }),    sort_order: 30 },
  { key: "tension_generada_s",   label: "Tensión generada — S-T",       type: "numero",   required: true,  validations: JSON.stringify({ unit: "V" }),    sort_order: 40 },
  { key: "tension_generada_t",   label: "Tensión generada — T-R",       type: "numero",   required: true,  validations: JSON.stringify({ unit: "V" }),    sort_order: 50 },
  { key: "frecuencia_gen",       label: "Frecuencia generada",          type: "numero",   required: true,  validations: JSON.stringify({ unit: "Hz" }),   sort_order: 60 },
  { key: "obs_arranque_gen",     label: "Observaciones",                type: "textarea", required: false,                                                 sort_order: 70 },
  { key: "resultado_arranque_gen","label": "Resultado",                 type: "select",   required: true,  options: JSON.stringify(["APROBADO","RECHAZADO"]), sort_order: 80 },
]);

await upsertFields(sCargaG, [
  { key: "potencia_nominal_gen", label: "Potencia nominal del generador",type: "numero",  required: true,  validations: JSON.stringify({ unit: "kVA" }),  sort_order: 10 },
  { key: "carga_25",             label: "Prueba al 25% de carga",        type: "checkbox",required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),  sort_order: 20 },
  { key: "corriente_25",         label: "Corriente al 25% carga",        type: "numero",  required: false, validations: JSON.stringify({ unit: "A" }),    sort_order: 30 },
  { key: "carga_50",             label: "Prueba al 50% de carga",        type: "checkbox",required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),  sort_order: 40 },
  { key: "corriente_50",         label: "Corriente al 50% carga",        type: "numero",  required: false, validations: JSON.stringify({ unit: "A" }),    sort_order: 50 },
  { key: "carga_75",             label: "Prueba al 75% de carga",        type: "checkbox",required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),  sort_order: 60 },
  { key: "corriente_75",         label: "Corriente al 75% carga",        type: "numero",  required: false, validations: JSON.stringify({ unit: "A" }),    sort_order: 70 },
  { key: "temp_motor_carga",     label: "Temperatura motor con carga",   type: "numero",  required: false, validations: JSON.stringify({ unit: "°C" }),   sort_order: 80 },
  { key: "duracion_prueba_carga","label": "Duración de la prueba",       type: "numero",  required: true,  validations: JSON.stringify({ unit: "min" }),  sort_order: 90 },
  { key: "obs_carga_gen",        label: "Observaciones",                 type: "textarea",required: false,                                                 sort_order: 100 },
  { key: "resultado_carga_gen",  label: "Resultado",                     type: "select",  required: true,  options: JSON.stringify(["APROBADO","RECHAZADO","N/A"]), sort_order: 110 },
]);

await upsertFields(sAtsInteg, [
  { key: "tiempo_conmutacion",   label: "Tiempo de conmutación red→gen", type: "numero",  required: true,  validations: JSON.stringify({ unit: "s" }),    sort_order: 10, hint: "Tiempo desde falla red hasta energización con gen" },
  { key: "prueba_falla_red",     label: "Prueba de falla de red simulada",type: "checkbox",required: true, options: JSON.stringify(["OK","FALLA"]),        sort_order: 20 },
  { key: "retorno_red",          label: "Retorno automático a red",      type: "checkbox",required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),  sort_order: 30 },
  { key: "tiempo_retorno",       label: "Tiempo de retorno a red",       type: "numero",  required: false, validations: JSON.stringify({ unit: "s" }),    sort_order: 40 },
  { key: "alarma_falla_gen",     label: "Alarma de falla de generador",  type: "checkbox",required: true,  options: JSON.stringify(["OK","FALLA","N/A"]),  sort_order: 50 },
  { key: "obs_ats_integ",        label: "Observaciones",                 type: "textarea",required: false,                                                 sort_order: 60 },
  { key: "resultado_ats_integ",  label: "Resultado",                     type: "select",  required: true,  options: JSON.stringify(["APROBADO","RECHAZADO","N/A"]), sort_order: 70 },
]);

await linkSections(tEle5, [
  [sMotPrim, 50], [sArranqueG, 60], [sCargaG, 70], [sAtsInteg, 80], [sPt, 90],
]);

await assignToType(["GENERADOR_EMERGENCIA"], tEle5, "P_MEC_001");
console.log("✓ P_ELE_005 completo — 4 secciones, asignado a GENERADOR_EMERGENCIA");

// ─── Resumen final ────────────────────────────────────────────────────────────
console.log("\n── Catálogo global actualizado ──");
const { data: allTpls } = await sb.from("form_templates").select("key, name").is("project_id", null).is("deleted_at", null).order("key");
allTpls.forEach(t => console.log(`  ${t.key.padEnd(14)} ${t.name}`));
console.log(`\n🎉  Migración 0033 completada — ${allTpls.length} templates globales.`);
