import type { Equipment } from "@/types";
import type {
  MockInspectionTemplate,
  MockInspectionSection,
  EquipmentTemplateAssignment,
} from "@/types/inspection";

// ─── Sections ─────────────────────────────────────────────────────────────

const SECTION_DATOS_GENERALES: MockInspectionSection = {
  id: "sec-datos-gen",
  code: "DATOS_GENERALES",
  name: "Datos Generales del Equipo",
  is_universal: true,
  fields: [
    { key: "tag",           label: "TAG del Equipo",       type: "texto",  required: true },
    { key: "nombre_equipo", label: "Nombre / Descripción", type: "texto",  required: false },
    { key: "fabricante",    label: "Fabricante",           type: "texto",  required: false },
    { key: "modelo",        label: "Modelo",               type: "texto",  required: false },
    { key: "no_serie",      label: "No. de Serie",         type: "texto",  required: false },
    { key: "pid_referencia",label: "Referencia P&ID",      type: "texto",  required: false },
    { key: "ubicacion",     label: "Ubicación / Sistema",  type: "texto",  required: false },
    { key: "fecha_inicio",  label: "Fecha Inicio",         type: "fecha",  required: true },
    { key: "fecha_fin",     label: "Fecha Terminación",    type: "fecha",  required: false },
  ],
};

const SECTION_INSPECCION_VISUAL: MockInspectionSection = {
  id: "sec-insp-vis",
  code: "INSPECCION_VISUAL",
  name: "Inspección Visual y Mecánica",
  is_universal: true,
  fields: [
    { key: "limpieza",         label: "Limpieza general",           type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "pintura",          label: "Estado de pintura",          type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "identificacion",   label: "Placa de identificación",    type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "danos_fisicos",    label: "Sin daños físicos visibles", type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "foto_general",     label: "Fotografía general",        type: "imagen",   required: false },
    { key: "obs_visual",       label: "Observaciones",             type: "textarea", required: false },
    { key: "resultado_visual", label: "Resultado Inspección Visual",type: "select",  required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_ANCLAJE: MockInspectionSection = {
  id: "sec-anclaje",
  code: "ANCLAJE_NIVELACION",
  name: "Anclaje y Nivelación",
  is_universal: true,
  fields: [
    { key: "pernos_anclaje",  label: "Pernos de anclaje",     type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "nivelacion",      label: "Nivelación correcta",   type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "alineacion_base", label: "Alineación con base",   type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_anclaje",     label: "Observaciones",         type: "textarea", required: false },
  ],
};

const SECTION_REDLINE: MockInspectionSection = {
  id: "sec-redline",
  code: "CAMBIOS_DISENO_REDLINE",
  name: "Cambios de Diseño / Redline",
  is_universal: true,
  fields: [
    { key: "hay_cambios",      label: "¿Hubo cambios de diseño?",    type: "checkbox", required: true,  options: ["SI", "NO"] },
    { key: "desc_cambio",      label: "Descripción del cambio",       type: "textarea", required: false },
    { key: "redline_actualizado", label: "Redline actualizado en planos", type: "checkbox", required: false, options: ["SI", "NO", "N/A"] },
  ],
};

const SECTION_AISLAMIENTO: MockInspectionSection = {
  id: "sec-aislamiento",
  code: "PRUEBA_AISLAMIENTO",
  name: "Prueba de Aislamiento (Meggueo)",
  is_universal: false,
  fields: [
    { key: "resistencia_f1",        label: "Resistencia Fase R",      type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "resistencia_f2",        label: "Resistencia Fase S",      type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "resistencia_f3",        label: "Resistencia Fase T",      type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "tension_prueba",        label: "Tensión de prueba",       type: "select",   required: true,  options: ["500V", "1000V", "2500V"] },
    { key: "foto_megguer",          label: "Foto del megóhmetro",     type: "imagen",   required: false },
    { key: "obs_aislamiento",       label: "Observaciones",           type: "textarea", required: false },
    { key: "resultado_aislamiento", label: "Resultado",               type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_CONTINUIDAD: MockInspectionSection = {
  id: "sec-continuidad",
  code: "PRUEBA_CONTINUIDAD",
  name: "Prueba de Continuidad",
  is_universal: false,
  fields: [
    { key: "continuidad_f1",       label: "Continuidad Fase R",  type: "numero",  required: true,  validations: { unit: "Ω", min: 0 } },
    { key: "continuidad_f2",       label: "Continuidad Fase S",  type: "numero",  required: true,  validations: { unit: "Ω", min: 0 } },
    { key: "continuidad_f3",       label: "Continuidad Fase T",  type: "numero",  required: true,  validations: { unit: "Ω", min: 0 } },
    { key: "obs_continuidad",      label: "Observaciones",       type: "textarea",required: false },
    { key: "resultado_continuidad",label: "Resultado",           type: "select",  required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_TIERRA: MockInspectionSection = {
  id: "sec-tierra",
  code: "PUESTA_TIERRA",
  name: "Verificación Puesta a Tierra",
  is_universal: false,
  fields: [
    { key: "resistencia_tierra", label: "Resistencia de tierra",  type: "numero",  required: true,  validations: { unit: "Ω", min: 0 } },
    { key: "conexion_tierra",    label: "Conexión a tierra",      type: "checkbox",required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_tierra",         label: "Observaciones",          type: "textarea",required: false },
    { key: "resultado_tierra",   label: "Resultado",              type: "select",  required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_ALINEAMIENTO: MockInspectionSection = {
  id: "sec-alineamiento",
  code: "ALINEAMIENTO",
  name: "Verificación de Alineamiento",
  is_universal: false,
  fields: [
    { key: "offset_radial",       label: "Offset radial",        type: "numero",  required: false, validations: { unit: "mm" } },
    { key: "offset_angular",      label: "Offset angular",       type: "numero",  required: false, validations: { unit: "mm" } },
    { key: "alineamiento_laser",  label: "Alineamiento con láser",type: "checkbox",required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_alineamiento",    label: "Observaciones",        type: "textarea",required: false },
    { key: "resultado_alineamiento",label: "Resultado",          type: "select",  required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_LOOP_CHECK: MockInspectionSection = {
  id: "sec-loop",
  code: "LOOP_CHECK",
  name: "Loop Check / Verificación de Lazos",
  is_universal: false,
  fields: [
    { key: "lazo_verificado",  label: "Lazo verificado",       type: "checkbox",required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "senal_origen",     label: "Señal origen",          type: "numero",  required: false, validations: { unit: "mA" } },
    { key: "senal_destino",    label: "Señal en destino",      type: "numero",  required: false, validations: { unit: "mA" } },
    { key: "error_senal",      label: "Error de señal",        type: "numero",  required: false, validations: { unit: "%" } },
    { key: "obs_loop",         label: "Observaciones",         type: "textarea",required: false },
    { key: "resultado_loop",   label: "Resultado",             type: "select",  required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_OPERATIVA: MockInspectionSection = {
  id: "sec-operativa",
  code: "PRUEBA_OPERATIVA",
  name: "Pruebas Operativas",
  is_universal: false,
  fields: [
    { key: "arranque_prueba",   label: "Arranque de prueba",     type: "checkbox",required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "temp_rodamientos",  label: "Temperatura rodamientos",type: "numero",  required: false, validations: { unit: "°C" } },
    { key: "vibracion",         label: "Vibración",             type: "numero",  required: false, validations: { unit: "mm/s" } },
    { key: "amperaje",          label: "Amperaje medido",       type: "numero",  required: false, validations: { unit: "A" } },
    { key: "obs_operativa",     label: "Observaciones",         type: "textarea",required: false },
    { key: "resultado_operativa",label: "Resultado",            type: "select",  required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_FIRMAS: MockInspectionSection = {
  id: "sec-firmas",
  code: "FIRMAS",
  name: "Firmas de Aprobación",
  is_universal: true,
  fields: [
    { key: "firma_ingeniero",    label: "Firma Ingeniero PreCommissioning", type: "firma",   required: true },
    { key: "firma_constructor",  label: "Firma Representante Constructor",  type: "firma",   required: true },
    { key: "firma_interventoria",label: "Firma Interventoría (si aplica)", type: "firma",   required: false },
  ],
};

// ─── Secciones especializadas adicionales ──────────────────────────────────

const SECTION_CABLE: MockInspectionSection = {
  id: "sec-cable",
  code: "PRUEBA_CABLE",
  name: "Verificación de Cable",
  is_universal: false,
  fields: [
    { key: "calibre",              label: "Calibre / Sección",             type: "texto",    required: true },
    { key: "tipo_aislamiento",     label: "Tipo de aislamiento",           type: "select",   required: true,  options: ["XLPE", "PVC", "EPR", "THHN", "Otro"] },
    { key: "longitud_m",           label: "Longitud instalada (m)",        type: "numero",   required: true,  validations: { unit: "m", min: 0 } },
    { key: "tension_sistema",      label: "Tensión del sistema",           type: "select",   required: true,  options: ["120V", "208V", "480V", "13.8kV", "34.5kV"] },
    { key: "aislamiento_f1",       label: "Aislamiento Fase R (MΩ)",       type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "aislamiento_f2",       label: "Aislamiento Fase S (MΩ)",       type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "aislamiento_f3",       label: "Aislamiento Fase T (MΩ)",       type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "tension_prueba_cable", label: "Tensión de prueba aplicada",    type: "select",   required: true,  options: ["500V", "1000V", "2500V", "5000V"] },
    { key: "continuidad_f1",       label: "Continuidad Fase R (Ω)",        type: "numero",   required: true,  validations: { unit: "Ω", min: 0 } },
    { key: "continuidad_f2",       label: "Continuidad Fase S (Ω)",        type: "numero",   required: true,  validations: { unit: "Ω", min: 0 } },
    { key: "continuidad_f3",       label: "Continuidad Fase T (Ω)",        type: "numero",   required: true,  validations: { unit: "Ω", min: 0 } },
    { key: "etiquetado",           label: "Cables etiquetados ambos extremos", type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_cable",            label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_cable",      label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_TRAFO: MockInspectionSection = {
  id: "sec-trafo",
  code: "PRUEBA_TRANSFORMADOR",
  name: "Pruebas Eléctricas Transformador",
  is_universal: false,
  fields: [
    { key: "tension_primario",     label: "Tensión primario (kV)",         type: "numero",   required: true,  validations: { unit: "kV", min: 0 } },
    { key: "tension_secundario",   label: "Tensión secundario (V)",        type: "numero",   required: true,  validations: { unit: "V",  min: 0 } },
    { key: "potencia_kva",         label: "Potencia nominal (kVA)",        type: "numero",   required: true,  validations: { unit: "kVA", min: 0 } },
    { key: "grupo_vector",         label: "Grupo vectorial",               type: "texto",    required: false },
    { key: "relacion_transf",      label: "Relación de transformación medida", type: "numero", required: true, validations: { min: 0 } },
    { key: "res_devanado_1",       label: "Resistencia devanado primario (Ω)", type: "numero", required: true, validations: { unit: "Ω", min: 0 } },
    { key: "res_devanado_2",       label: "Resistencia devanado secundario (Ω)", type: "numero", required: true, validations: { unit: "Ω", min: 0 } },
    { key: "iso_prim_masa",        label: "Aislamiento devanado prim–tierra (MΩ)", type: "numero", required: true, validations: { unit: "MΩ", min: 0 } },
    { key: "iso_sec_masa",         label: "Aislamiento devanado sec–tierra (MΩ)", type: "numero", required: true, validations: { unit: "MΩ", min: 0 } },
    { key: "iso_prim_sec",         label: "Aislamiento devanados entre sí (MΩ)", type: "numero", required: true, validations: { unit: "MΩ", min: 0 } },
    { key: "nivel_aceite",         label: "Nivel de aceite (si aplica)",   type: "checkbox", required: false, options: ["OK", "BAJO", "N/A"] },
    { key: "obs_trafo",            label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_trafo",      label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_HW_CONTROL: MockInspectionSection = {
  id: "sec-hw-ctrl",
  code: "VERIFICACION_HW",
  name: "Verificación Hardware",
  is_universal: false,
  fields: [
    { key: "chasis_rack",          label: "Chasis / rack instalado",       type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "fuente_alimentacion",  label: "Fuente de alimentación",        type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "tension_bus",          label: "Tensión bus DC (V)",            type: "numero",   required: false, validations: { unit: "V", min: 0 } },
    { key: "modulos_io",           label: "Módulos I/O instalados",        type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "qty_di",               label: "Cantidad entradas digitales",   type: "numero",   required: false },
    { key: "qty_do",               label: "Cantidad salidas digitales",    type: "numero",   required: false },
    { key: "qty_ai",               label: "Cantidad entradas analógicas",  type: "numero",   required: false },
    { key: "comunicacion",         label: "Comunicación (EtherNet/Profibus)", type: "checkbox", required: true, options: ["OK", "FALLA", "N/A"] },
    { key: "ups_respaldo",         label: "UPS de respaldo",               type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_hw",               label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_hw",         label: "Resultado HW",                  type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_SW_CONTROL: MockInspectionSection = {
  id: "sec-sw-ctrl",
  code: "VERIFICACION_SW",
  name: "Verificación Software",
  is_universal: false,
  fields: [
    { key: "version_fw",           label: "Versión firmware cargada",      type: "texto",    required: true },
    { key: "nombre_proyecto",      label: "Nombre proyecto PLC",           type: "texto",    required: true },
    { key: "fecha_compilacion",    label: "Fecha compilación programa",    type: "fecha",    required: false },
    { key: "backup_realizado",     label: "Backup programa realizado",     type: "checkbox", required: true,  options: ["SI", "NO"] },
    { key: "senales_configuradas", label: "Señales I/O configuradas",      type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "alarmas_configuradas", label: "Alarmas configuradas",          type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "scada_comunicando",    label: "Comunicación con SCADA",        type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_sw",               label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_sw",         label: "Resultado SW",                  type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_VDF_CONFIG: MockInspectionSection = {
  id: "sec-vdf",
  code: "CONFIG_VARIADOR",
  name: "Configuración Variador de Velocidad",
  is_universal: false,
  fields: [
    { key: "tension_nominal",      label: "Tensión nominal motor (V)",     type: "numero",   required: true,  validations: { unit: "V", min: 0 } },
    { key: "corriente_nominal",    label: "Corriente nominal motor (A)",   type: "numero",   required: true,  validations: { unit: "A", min: 0 } },
    { key: "frecuencia_base",      label: "Frecuencia base (Hz)",          type: "numero",   required: true,  validations: { unit: "Hz", min: 0 } },
    { key: "frecuencia_max",       label: "Frecuencia máxima (Hz)",        type: "numero",   required: false, validations: { unit: "Hz", min: 0 } },
    { key: "frecuencia_min",       label: "Frecuencia mínima (Hz)",        type: "numero",   required: false, validations: { unit: "Hz", min: 0 } },
    { key: "tipo_control",         label: "Tipo de control",               type: "select",   required: true,  options: ["V/f", "Vector abierto", "Vector lazo cerrado", "PM"] },
    { key: "tiempo_aceleracion",   label: "Tiempo aceleración (s)",        type: "numero",   required: false, validations: { unit: "s", min: 0 } },
    { key: "tiempo_desaceleracion",label: "Tiempo desaceleración (s)",     type: "numero",   required: false, validations: { unit: "s", min: 0 } },
    { key: "fuente_referencia",    label: "Fuente de referencia",          type: "select",   required: true,  options: ["Teclado", "Analógica 4-20mA", "Red EtherNet", "Profibus"] },
    { key: "arranque_prueba_vdf",  label: "Arranque de prueba OK",         type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "corriente_vacio",      label: "Corriente vacío medida (A)",    type: "numero",   required: false, validations: { unit: "A", min: 0 } },
    { key: "obs_vdf",              label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_vdf",        label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_GENERADOR: MockInspectionSection = {
  id: "sec-gen",
  code: "PRUEBA_GENERADOR",
  name: "Pruebas Generador de Emergencia",
  is_universal: false,
  fields: [
    { key: "potencia_kva",         label: "Potencia nominal (kVA)",        type: "numero",   required: true,  validations: { unit: "kVA", min: 0 } },
    { key: "nivel_combustible",    label: "Nivel combustible",             type: "checkbox", required: true,  options: ["OK", "BAJO", "N/A"] },
    { key: "nivel_refrigerante",   label: "Nivel refrigerante",            type: "checkbox", required: true,  options: ["OK", "BAJO", "N/A"] },
    { key: "arranque_automatico",  label: "Arranque automático",           type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "tiempo_respuesta_s",   label: "Tiempo respuesta arranque (s)", type: "numero",   required: true,  validations: { unit: "s", min: 0 } },
    { key: "tension_salida_ab",    label: "Tensión salida V A-B (V)",      type: "numero",   required: true,  validations: { unit: "V", min: 0 } },
    { key: "tension_salida_bc",    label: "Tensión salida V B-C (V)",      type: "numero",   required: true,  validations: { unit: "V", min: 0 } },
    { key: "tension_salida_ca",    label: "Tensión salida V C-A (V)",      type: "numero",   required: true,  validations: { unit: "V", min: 0 } },
    { key: "frecuencia_salida",    label: "Frecuencia salida (Hz)",        type: "numero",   required: true,  validations: { unit: "Hz", min: 0 } },
    { key: "transferencia_auto",   label: "Transferencia automática ATS",  type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "prueba_carga",         label: "Prueba bajo carga",             type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "potencia_medida_kw",   label: "Potencia medida en carga (kW)", type: "numero",   required: false, validations: { unit: "kW", min: 0 } },
    { key: "obs_gen",              label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_gen",        label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_CELDA_MT: MockInspectionSection = {
  id: "sec-celda-mt",
  code: "PRUEBA_CELDA_MT",
  name: "Pruebas Celda / Aparato de Corte MT",
  is_universal: false,
  fields: [
    { key: "tension_sistema_mt",   label: "Tensión del sistema (kV)",      type: "numero",   required: true,  validations: { unit: "kV", min: 0 } },
    { key: "corriente_nominal_mt", label: "Corriente nominal (A)",         type: "numero",   required: true,  validations: { unit: "A",  min: 0 } },
    { key: "poder_corte",          label: "Poder de corte (kA)",           type: "numero",   required: false, validations: { unit: "kA", min: 0 } },
    { key: "iso_2500v_f1",         label: "Aislamiento 2.5kV Fase R (MΩ)",type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "iso_2500v_f2",         label: "Aislamiento 2.5kV Fase S (MΩ)",type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "iso_2500v_f3",         label: "Aislamiento 2.5kV Fase T (MΩ)",type: "numero",   required: true,  validations: { unit: "MΩ", min: 0 } },
    { key: "resistencia_contactos",label: "Resistencia contactos (μΩ)",   type: "numero",   required: true,  validations: { unit: "μΩ", min: 0 } },
    { key: "tiempo_apertura_ms",   label: "Tiempo apertura (ms)",          type: "numero",   required: false, validations: { unit: "ms", min: 0 } },
    { key: "protecciones_rel",     label: "Relés de protección verificados",type: "checkbox",required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "interbloqueos",        label: "Interbloqueos mecánicos",       type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_celda",            label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_celda",      label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_HIDRO: MockInspectionSection = {
  id: "sec-hidro",
  code: "PRUEBA_HIDRO",
  name: "Prueba Hidrostática / Neumática",
  is_universal: false,
  fields: [
    { key: "tipo_prueba",          label: "Tipo de prueba",                type: "select",   required: true,  options: ["Hidrostática", "Neumática", "Vacío"] },
    { key: "presion_diseno",       label: "Presión de diseño (bar)",       type: "numero",   required: true,  validations: { unit: "bar", min: 0 } },
    { key: "presion_prueba",       label: "Presión de prueba (bar)",       type: "numero",   required: true,  validations: { unit: "bar", min: 0 } },
    { key: "tiempo_prueba_min",    label: "Tiempo de prueba (min)",        type: "numero",   required: true,  validations: { unit: "min", min: 0 } },
    { key: "presion_final",        label: "Presión al final de prueba (bar)", type: "numero",required: true,  validations: { unit: "bar", min: 0 } },
    { key: "fugas_detectadas",     label: "¿Se detectaron fugas?",         type: "checkbox", required: true,  options: ["SI", "NO"] },
    { key: "desc_fugas",           label: "Descripción de fugas (si hubo)",type: "textarea", required: false },
    { key: "foto_prueba",          label: "Fotografía manómetro / prueba", type: "imagen",   required: false },
    { key: "obs_hidro",            label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_hidro",      label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_QUEMADOR: MockInspectionSection = {
  id: "sec-quemador",
  code: "PRUEBA_QUEMADOR",
  name: "Pruebas Quemador / Sistema de Ignición",
  is_universal: false,
  fields: [
    { key: "presion_gas_entrada",  label: "Presión gas entrada (mbar)",    type: "numero",   required: true,  validations: { unit: "mbar", min: 0 } },
    { key: "piloto_encendido",     label: "Encendido piloto",              type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "llama_principal",      label: "Llama principal establecida",   type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "sensor_llama",         label: "Sensor de llama funcionando",   type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "corte_seguridad",      label: "Corte de seguridad por fallo",  type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "temperatura_trabajo",  label: "Temperatura de trabajo (°C)",   type: "numero",   required: false, validations: { unit: "°C", min: 0 } },
    { key: "control_modulacion",   label: "Control de modulación",         type: "checkbox", required: false, options: ["OK", "FALLA", "N/A"] },
    { key: "alarmas_seguridad",    label: "Alarmas de seguridad activas",  type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "obs_quemador",         label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_quemador",   label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_PRESION: MockInspectionSection = {
  id: "sec-presion",
  code: "CALIBRACION_PRESION",
  name: "Calibración y Verificación de Presión",
  is_universal: false,
  fields: [
    { key: "rango_min",          label: "Rango mínimo LRV",                type: "numero",   required: true,  validations: { unit: "bar" } },
    { key: "rango_max",          label: "Rango máximo URV",                type: "numero",   required: true,  validations: { unit: "bar" } },
    { key: "unidad_ing",         label: "Unidad de ingeniería",            type: "select",   required: true,  options: ["bar", "psi", "kPa", "MPa", "mbar", "inH2O", "mmHg", "mH2O"] },
    { key: "senal_salida",       label: "Señal de salida",                 type: "select",   required: true,  options: ["4-20 mA HART", "4-20 mA", "Fieldbus", "PROFIBUS PA", "Digital 24VDC"] },
    { key: "tipo_montaje",       label: "Tipo de montaje",                 type: "select",   required: false, options: ["Directo en proceso", "Manifold 2 válvulas", "Manifold 3 válvulas", "Manifold 5 válvulas"] },
    { key: "material_diafragma", label: "Material diafragma / cuerpo",     type: "select",   required: false, options: ["AISI 316L", "Hastelloy C", "Monel", "Titanio", "Otro"] },
    { key: "valvula_bloqueo",    label: "Válvula de bloqueo instalada",    type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "purga_proceso",      label: "Purga de proceso realizada",      type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "conex_proceso",      label: "Conexión a proceso sin fugas",    type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "cal_0_aplicado",     label: "Presión aplicada  0 % (LRV)",    type: "numero",   required: true,  validations: { unit: "bar" } },
    { key: "cal_0_leido_ma",     label: "Señal leída  0 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_25_aplicado",    label: "Presión aplicada 25 %",           type: "numero",   required: true,  validations: { unit: "bar" } },
    { key: "cal_25_leido_ma",    label: "Señal leída 25 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_50_aplicado",    label: "Presión aplicada 50 %",           type: "numero",   required: true,  validations: { unit: "bar" } },
    { key: "cal_50_leido_ma",    label: "Señal leída 50 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_75_aplicado",    label: "Presión aplicada 75 %",           type: "numero",   required: true,  validations: { unit: "bar" } },
    { key: "cal_75_leido_ma",    label: "Señal leída 75 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_100_aplicado",   label: "Presión aplicada 100 % (URV)",   type: "numero",   required: true,  validations: { unit: "bar" } },
    { key: "cal_100_leido_ma",   label: "Señal leída 100 % (mA)",         type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "error_max_pct",      label: "Error máximo admisible (%)",      type: "numero",   required: false, validations: { unit: "%", min: 0 } },
    { key: "ajuste_cero",        label: "Ajuste de cero realizado",        type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "ajuste_span",        label: "Ajuste de span realizado",        type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "foto_calibrador",    label: "Foto calibrador / evidencia",     type: "imagen",   required: false },
    { key: "obs_presion",        label: "Observaciones",                   type: "textarea", required: false },
    { key: "resultado_presion",  label: "Resultado",                       type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_FLUJO: MockInspectionSection = {
  id: "sec-flujo",
  code: "CALIBRACION_FLUJO",
  name: "Calibración y Verificación de Flujo",
  is_universal: false,
  fields: [
    { key: "tipo_caudalimetro",  label: "Tipo de caudalímetro",            type: "select",   required: true,  options: ["Electromagnético", "Coriolis", "Ultrasónico", "Vórtex", "Diferencial (DP)", "Turbina", "Rotámetro"] },
    { key: "diametro_nominal",   label: "Diámetro nominal (DN / pulg)",    type: "texto",    required: true },
    { key: "rango_min",          label: "Rango mínimo LRV",                type: "numero",   required: true,  validations: { unit: "m³/h" } },
    { key: "rango_max",          label: "Rango máximo URV",                type: "numero",   required: true,  validations: { unit: "m³/h" } },
    { key: "unidad_ing",         label: "Unidad de ingeniería",            type: "select",   required: true,  options: ["m³/h", "L/s", "L/min", "GPM", "kg/h", "t/h", "Nm³/h"] },
    { key: "fluido",             label: "Fluido en proceso",               type: "texto",    required: false },
    { key: "senal_salida",       label: "Señal de salida",                 type: "select",   required: true,  options: ["4-20 mA HART", "4-20 mA + Pulso", "Fieldbus", "PROFIBUS PA", "Pulso"] },
    { key: "longitud_aguas_arr", label: "Longitudes rectas aguas arriba (D)", type: "numero", required: false, validations: { unit: "D" } },
    { key: "longitud_aguas_ab",  label: "Longitudes rectas aguas abajo (D)", type: "numero", required: false, validations: { unit: "D" } },
    { key: "orientacion",        label: "Orientación de instalación",      type: "select",   required: false, options: ["Horizontal", "Vertical ascendente", "Vertical descendente"] },
    { key: "tubo_lleno",         label: "Tubo completamente lleno",        type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "cal_0_aplicado",     label: "Flujo aplicado  0 % (LRV)",      type: "numero",   required: true,  validations: { unit: "m³/h" } },
    { key: "cal_0_leido_ma",     label: "Señal leída  0 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_25_aplicado",    label: "Flujo aplicado 25 %",             type: "numero",   required: true,  validations: { unit: "m³/h" } },
    { key: "cal_25_leido_ma",    label: "Señal leída 25 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_50_aplicado",    label: "Flujo aplicado 50 %",             type: "numero",   required: true,  validations: { unit: "m³/h" } },
    { key: "cal_50_leido_ma",    label: "Señal leída 50 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_75_aplicado",    label: "Flujo aplicado 75 %",             type: "numero",   required: true,  validations: { unit: "m³/h" } },
    { key: "cal_75_leido_ma",    label: "Señal leída 75 % (mA)",          type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "cal_100_aplicado",   label: "Flujo aplicado 100 % (URV)",     type: "numero",   required: true,  validations: { unit: "m³/h" } },
    { key: "cal_100_leido_ma",   label: "Señal leída 100 % (mA)",         type: "numero",   required: true,  validations: { unit: "mA" } },
    { key: "totalizador_ok",     label: "Totalizador verificado",          type: "checkbox", required: false, options: ["OK", "FALLA", "N/A"] },
    { key: "ajuste_cero",        label: "Ajuste de cero realizado",        type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "error_max_pct",      label: "Error máximo admisible (%)",      type: "numero",   required: false, validations: { unit: "%", min: 0 } },
    { key: "foto_calibrador",    label: "Foto calibrador / evidencia",     type: "imagen",   required: false },
    { key: "obs_flujo",          label: "Observaciones",                   type: "textarea", required: false },
    { key: "resultado_flujo",    label: "Resultado",                       type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_TEMPERATURA: MockInspectionSection = {
  id: "sec-temperatura",
  code: "CALIBRACION_TEMPERATURA",
  name: "Calibración y Verificación de Temperatura",
  is_universal: false,
  fields: [
    { key: "tipo_sensor",        label: "Tipo de sensor",                  type: "select",   required: true,  options: ["PT100 (RTD)", "PT1000 (RTD)", "Termocupla tipo J", "Termocupla tipo K", "Termocupla tipo T", "Termocupla tipo E", "Bimetálico (TW)", "NTC"] },
    { key: "rango_min",          label: "Rango mínimo LRV (°C)",          type: "numero",   required: true,  validations: { unit: "°C" } },
    { key: "rango_max",          label: "Rango máximo URV (°C)",          type: "numero",   required: true,  validations: { unit: "°C" } },
    { key: "senal_salida",       label: "Señal de salida",                 type: "select",   required: true,  options: ["4-20 mA HART", "4-20 mA", "RTD directo 3 hilos", "RTD directo 4 hilos", "mV termocupla"] },
    { key: "material_vaina",     label: "Material vaina / termopozo",      type: "select",   required: false, options: ["AISI 316L", "Inconel 600", "Hastelloy C", "Titanio", "Latón", "Sin vaina"] },
    { key: "longitud_vaina_mm",  label: "Longitud de inserción (mm)",      type: "numero",   required: false, validations: { unit: "mm", min: 0 } },
    { key: "tipo_conexion",      label: "Tipo de conexión a proceso",      type: "select",   required: false, options: ["Rosca NPT ½\"", "Rosca NPT ¾\"", "Brida 1\"", "Brida 2\"", "Compresión"] },
    { key: "cal_punto_1_ref",    label: "Temperatura referencia punto 1 (°C)", type: "numero", required: true, validations: { unit: "°C" } },
    { key: "cal_punto_1_leido",  label: "Lectura instrumento punto 1 (°C)", type: "numero", required: true, validations: { unit: "°C" } },
    { key: "cal_punto_2_ref",    label: "Temperatura referencia punto 2 (°C)", type: "numero", required: true, validations: { unit: "°C" } },
    { key: "cal_punto_2_leido",  label: "Lectura instrumento punto 2 (°C)", type: "numero", required: true, validations: { unit: "°C" } },
    { key: "cal_punto_3_ref",    label: "Temperatura referencia punto 3 (°C)", type: "numero", required: true, validations: { unit: "°C" } },
    { key: "cal_punto_3_leido",  label: "Lectura instrumento punto 3 (°C)", type: "numero", required: true, validations: { unit: "°C" } },
    { key: "senal_0_ma",         label: "Señal a LRV (mA)",               type: "numero",   required: false, validations: { unit: "mA" } },
    { key: "senal_100_ma",       label: "Señal a URV (mA)",               type: "numero",   required: false, validations: { unit: "mA" } },
    { key: "tiempo_respuesta_s", label: "Tiempo de respuesta (s)",         type: "numero",   required: false, validations: { unit: "s", min: 0 } },
    { key: "error_max_c",        label: "Error máximo admisible (°C)",     type: "numero",   required: false, validations: { unit: "°C", min: 0 } },
    { key: "ajuste_cero",        label: "Ajuste de cero realizado",        type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "ajuste_span",        label: "Ajuste de span realizado",        type: "checkbox", required: true,  options: ["SI", "NO", "N/A"] },
    { key: "foto_calibrador",    label: "Foto calibrador / evidencia",     type: "imagen",   required: false },
    { key: "obs_temperatura",    label: "Observaciones",                   type: "textarea", required: false },
    { key: "resultado_temp",     label: "Resultado",                       type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_VALVULA: MockInspectionSection = {
  id: "sec-valvula",
  code: "VERIFICACION_VALVULA",
  name: "Verificación Válvula",
  is_universal: false,
  fields: [
    { key: "tipo_valvula",         label: "Tipo de válvula",                  type: "select",   required: true,  options: ["Bola", "Mariposa", "Compuerta", "Globo", "Cheque / Retención", "Alivio / PSV", "Control", "Otra"] },
    { key: "diametro_nominal",     label: "Diámetro nominal (DN / pulg)",     type: "texto",    required: true },
    { key: "presion_diseno_bar",   label: "Presión de diseño (bar)",          type: "numero",   required: true,  validations: { unit: "bar", min: 0 } },
    { key: "temperatura_diseno",   label: "Temperatura de diseño (°C)",       type: "numero",   required: false, validations: { unit: "°C" } },
    { key: "material_cuerpo",      label: "Material cuerpo",                  type: "select",   required: false, options: ["Acero inox 316L", "Acero inox 304", "Acero al carbono", "PVC", "CPVC", "HDPE", "Hierro fundido", "Otro"] },
    { key: "fluido_servicio",      label: "Fluido en servicio",               type: "texto",    required: false },
    { key: "operacion_apertura",   label: "Apertura completa OK",             type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "operacion_cierre",     label: "Cierre completo OK",               type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "indicador_abierta",    label: "Indicador posición ABIERTA",       type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "indicador_cerrada",    label: "Indicador posición CERRADA",       type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "presion_prueba_bar",   label: "Presión prueba estanqueidad (bar)",type: "numero",   required: false, validations: { unit: "bar", min: 0 } },
    { key: "fuga_cuerpo",          label: "Fuga cuerpo / vástago",            type: "checkbox", required: true,  options: ["SIN FUGA", "CON FUGA", "N/A"] },
    { key: "fuga_asiento",         label: "Fuga asiento (válvula cerrada)",   type: "checkbox", required: true,  options: ["SIN FUGA", "CON FUGA", "N/A"] },
    { key: "foto_valvula",         label: "Fotografía",                       type: "imagen",   required: false },
    { key: "obs_valvula",          label: "Observaciones",                    type: "textarea", required: false },
    { key: "resultado_valvula",    label: "Resultado",                        type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_ACTUADOR: MockInspectionSection = {
  id: "sec-actuador",
  code: "VERIFICACION_ACTUADOR",
  name: "Actuador y Posicionador",
  is_universal: false,
  fields: [
    { key: "tipo_actuador",        label: "Tipo de actuador",                 type: "select",   required: true,  options: ["Eléctrico", "Neumático", "Hidráulico", "Electroneumático"] },
    { key: "tension_actuador",     label: "Tensión alimentación (V)",         type: "numero",   required: false, validations: { unit: "V", min: 0 } },
    { key: "presion_aire_bar",     label: "Presión aire actuación (bar)",     type: "numero",   required: false, validations: { unit: "bar", min: 0 } },
    { key: "senal_apertura_ma",    label: "Señal apertura verificada (mA)",   type: "numero",   required: false, validations: { unit: "mA", min: 0 } },
    { key: "senal_cierre_ma",      label: "Señal cierre verificada (mA)",     type: "numero",   required: false, validations: { unit: "mA", min: 0 } },
    { key: "tiempo_apertura_s",    label: "Tiempo apertura (s)",              type: "numero",   required: false, validations: { unit: "s", min: 0 } },
    { key: "tiempo_cierre_s",      label: "Tiempo cierre (s)",                type: "numero",   required: false, validations: { unit: "s", min: 0 } },
    { key: "zso_funcionando",      label: "Fin de carrera ABIERTA (ZSO)",     type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "zsc_funcionando",      label: "Fin de carrera CERRADA (ZSC)",     type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "control_remoto",       label: "Mando remoto desde PLC / panel",   type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "posicion_falla",       label: "Posición en falla (fail-safe)",    type: "select",   required: true,  options: ["Abierta (FO)", "Cerrada (FC)", "Sin cambio (FL)", "N/A"] },
    { key: "loop_check_actuador",  label: "Loop check señal 4-20 mA",        type: "checkbox", required: false, options: ["OK", "FALLA", "N/A"] },
    { key: "obs_actuador",         label: "Observaciones",                    type: "textarea", required: false },
    { key: "resultado_actuador",   label: "Resultado Actuador",               type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

const SECTION_IMPERMEABILIZACION: MockInspectionSection = {
  id: "sec-impermeab",
  code: "IMPERMEABILIZACION",
  name: "Impermeabilización y Estanqueidad",
  is_universal: false,
  fields: [
    { key: "revestimiento",        label: "Revestimiento / membrana",      type: "checkbox", required: true,  options: ["OK", "FALLA", "N/A"] },
    { key: "nivel_prueba_m",       label: "Nivel de llenado prueba (m)",   type: "numero",   required: true,  validations: { unit: "m", min: 0 } },
    { key: "tiempo_prueba_h",      label: "Tiempo prueba estanqueidad (h)",type: "numero",   required: true,  validations: { unit: "h", min: 0 } },
    { key: "descenso_nivel_mm",    label: "Descenso nivel observado (mm)", type: "numero",   required: true,  validations: { unit: "mm", min: 0 } },
    { key: "fugas_talud",          label: "Fugas en talud / paredes",      type: "checkbox", required: true,  options: ["SI", "NO"] },
    { key: "geomembrana_ok",       label: "Geomembrana sin perforaciones", type: "checkbox", required: false, options: ["OK", "FALLA", "N/A"] },
    { key: "foto_prueba_civil",    label: "Fotografía prueba",             type: "imagen",   required: false },
    { key: "obs_impermeab",        label: "Observaciones",                 type: "textarea", required: false },
    { key: "resultado_civil",      label: "Resultado",                     type: "select",   required: true,  options: ["APROBADO", "RECHAZADO"] },
  ],
};

// ─── Templates ────────────────────────────────────────────────────────────

export const MOCK_TEMPLATES: MockInspectionTemplate[] = [
  {
    id: "tpl-mec-001",
    code: "P_MEC_001",
    name: "Motor Eléctrico",
    discipline: "Eléctrica / Mecánica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_AISLAMIENTO,
      SECTION_CONTINUIDAD,
      SECTION_TIERRA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-mec-002",
    code: "P_MEC_002",
    name: "Bomba Centrífuga",
    discipline: "Mecánica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_ALINEAMIENTO,
      SECTION_OPERATIVA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ic-001",
    code: "P_IC_001",
    name: "Instrumento I&C",
    discipline: "I&C",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_LOOP_CHECK,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ele-001",
    code: "P_ELE_001",
    name: "Tablero / CCM",
    discipline: "Eléctrica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_AISLAMIENTO,
      SECTION_CONTINUIDAD,
      SECTION_TIERRA,
      SECTION_FIRMAS,
    ],
  },
  // ─── Nuevas plantillas ────────────────────────────────────────────────────
  {
    id: "tpl-ele-002",
    code: "P_ELE_002",
    name: "Cable Eléctrico",
    discipline: "Eléctrica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_CABLE,
      SECTION_TIERRA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ele-003",
    code: "P_ELE_003",
    name: "Transformador",
    discipline: "Eléctrica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_TRAFO,
      SECTION_TIERRA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ele-004",
    code: "P_ELE_004",
    name: "Generador de Emergencia",
    discipline: "Eléctrica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_AISLAMIENTO,
      SECTION_CONTINUIDAD,
      SECTION_TIERRA,
      SECTION_GENERADOR,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ele-005",
    code: "P_ELE_005",
    name: "Celda MT / Aparato de Corte",
    discipline: "Eléctrica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_CELDA_MT,
      SECTION_TIERRA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ic-002",
    code: "P_IC_002",
    name: "PLC / Sistema de Control",
    discipline: "I&C",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_HW_CONTROL,
      SECTION_SW_CONTROL,
      SECTION_LOOP_CHECK,
      SECTION_TIERRA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ic-003",
    code: "P_IC_003",
    name: "Variador de Velocidad (VDF)",
    discipline: "I&C / Eléctrica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_AISLAMIENTO,
      SECTION_VDF_CONFIG,
      SECTION_TIERRA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ic-004",
    code: "P_IC_004",
    name: "Detector Estado Válvula",
    discipline: "I&C",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_LOOP_CHECK,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-mec-003",
    code: "P_MEC_003",
    name: "Compresor / Soplador",
    discipline: "Mecánica",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_ALINEAMIENTO,
      SECTION_OPERATIVA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-mec-004",
    code: "P_MEC_004",
    name: "Tubería / Línea de Proceso",
    discipline: "Mecánica / Proceso",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_HIDRO,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-mec-005",
    code: "P_MEC_005",
    name: "Caldera / TEA",
    discipline: "Mecánica / Proceso",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_ANCLAJE,
      SECTION_REDLINE,
      SECTION_QUEMADOR,
      SECTION_LOOP_CHECK,
      SECTION_OPERATIVA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-efl-001",
    code: "P_EFL_001",
    name: "Laguna / Estructura Civil",
    discipline: "Efluentes / Civil",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_IMPERMEABILIZACION,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ic-005",
    code: "P_IC_005",
    name: "Instrumento de Presión",
    discipline: "I&C",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_PRESION,
      SECTION_LOOP_CHECK,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-mec-006",
    code: "P_MEC_006",
    name: "Válvula Manual",
    discipline: "Mecánica / Proceso",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_VALVULA,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-mec-007",
    code: "P_MEC_007",
    name: "Válvula Actuada / Motorizada",
    discipline: "Mecánica / I&C",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_VALVULA,
      SECTION_ACTUADOR,
      SECTION_LOOP_CHECK,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ic-006",
    code: "P_IC_006",
    name: "Instrumento de Flujo",
    discipline: "I&C",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_FLUJO,
      SECTION_LOOP_CHECK,
      SECTION_FIRMAS,
    ],
  },
  {
    id: "tpl-ic-007",
    code: "P_IC_007",
    name: "Instrumento de Temperatura",
    discipline: "I&C",
    sections: [
      SECTION_DATOS_GENERALES,
      SECTION_INSPECCION_VISUAL,
      SECTION_REDLINE,
      SECTION_TEMPERATURA,
      SECTION_LOOP_CHECK,
      SECTION_FIRMAS,
    ],
  },
];

// ─── Mock Equipments ───────────────────────────────────────────────────────

const PROJECT_ID = "9023a92f-5294-4a20-ac20-1c579662340a"; // Zipaquirá (proyecto principal)
const SUB_ID_SAL_MAQ = "mock-sub-sala-maquinas";
const SUB_ID_SAL_ELE = "mock-sub-sala-electrica";
const NOW = new Date().toISOString();

export const MOCK_EQUIPMENTS: Equipment[] = [
  {
    id: "eq-bba-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "BBA-001",
    name: "Bomba Centrífuga Lodos",
    manufacturer: "Flygt",
    model: "N3102",
    criticality: "alta",
    status: "pendiente",
    service: "Recirculación de lodos primarios",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-mtr-002",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "MTR-002",
    name: "Motor Eléctrico 15 kW",
    manufacturer: "ABB",
    model: "3GBP162430-ADG",
    serial_number: "3GBP-2024-0042",
    criticality: "alta",
    status: "en_ejecucion",
    service: "Accionamiento BBA-001",
    power_kw: 15,
    ccm_panel: "CCM-A2",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-vlv-003",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "VLV-003",
    name: "Válvula Mariposa DN200",
    manufacturer: "VAG",
    model: "EKN DN200",
    criticality: "media",
    status: "pendiente",
    service: "Descarga BBA-001",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-ft-101",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "FT-101",
    name: "Transmisor de Flujo",
    manufacturer: "Endress+Hauser",
    model: "Promag 53",
    criticality: "alta",
    status: "aprobado",
    service: "Medición caudal efluente",
    io_type: "4-20mA HART",
    rtu_destination: "PLC-001 AI-4",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-pt-201",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "PT-201",
    name: "Transmisor de Presión",
    manufacturer: "Rosemount",
    model: "3051C",
    criticality: "media",
    status: "pendiente",
    service: "Presión línea descarga",
    io_type: "4-20mA HART",
    rtu_destination: "PLC-001 AI-8",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-plc-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_ELE,
    tag: "PLC-001",
    name: "Controlador PLC PTAR",
    manufacturer: "Allen-Bradley",
    model: "CompactLogix L33ER",
    criticality: "alta",
    status: "bloqueado",
    service: "Control proceso PTAR Zipaquirá",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-ccm-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_ELE,
    tag: "CCM-001",
    name: "Centro de Control de Motores",
    manufacturer: "Schneider Electric",
    model: "Prisma Plus G",
    criticality: "alta",
    status: "listo_energizacion",
    service: "Distribución 480V sala máquinas",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-bga-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "BGA-001",
    name: "Compresor Biogás",
    manufacturer: "Aerzen",
    model: "GM 10 S",
    criticality: "alta",
    status: "rechazado",
    service: "Compresión biogás digestor",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-tt-101",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "TT-101",
    name: "Transmisor Temperatura",
    manufacturer: "Endress+Hauser",
    model: "iTEMP TMT82",
    criticality: "baja",
    status: "en_ejecucion",
    service: "Temperatura digestor primario",
    io_type: "4-20mA HART",
    rtu_destination: "PLC-001 AI-12",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  // ─── Nuevos equipos ───────────────────────────────────────────────────────
  {
    id: "eq-cab-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_ELE,
    tag: "CAB-001",
    name: "Cable de Potencia 480V — CCM-001 a BBA-001",
    manufacturer: "Centelsa",
    model: "THW 3x4 AWG",
    criticality: "alta",
    status: "pendiente",
    service: "Alimentación bomba BBA-001",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-trf-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_ELE,
    tag: "TR-001",
    name: "Transformador Seco 480/208V 150kVA",
    manufacturer: "ABB",
    model: "RESIBLOC 150kVA",
    criticality: "alta",
    status: "pendiente",
    service: "Alimentación cargas 208V sala control",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-gen-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_ELE,
    tag: "GEN-001",
    name: "Generador de Emergencia 250 kVA",
    manufacturer: "Caterpillar",
    model: "C9 ACERT",
    serial_number: "CAT-2024-0017",
    criticality: "alta",
    status: "pendiente",
    service: "Respaldo eléctrico planta tratamiento",
    power_kw: 200,
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-celmt-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_ELE,
    tag: "CELMT-001",
    name: "Celda de Entrada MT 13.8kV",
    manufacturer: "Schneider Electric",
    model: "SM6 — DM1A",
    criticality: "alta",
    status: "pendiente",
    service: "Entrada alimentación MT subestación PTAR",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-vdf-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_ELE,
    tag: "VDF-001",
    name: "Variador de Velocidad BBA-001",
    manufacturer: "Allen-Bradley",
    model: "PowerFlex 755 18.5kW",
    criticality: "alta",
    status: "pendiente",
    service: "Control velocidad bomba BBA-001",
    power_kw: 18.5,
    ccm_panel: "CCM-001",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-spl-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "SPL-001",
    name: "Soplador Aireación Laguna",
    manufacturer: "Aerzen",
    model: "Delta Blower GM 7 S",
    criticality: "alta",
    status: "pendiente",
    service: "Inyección aire laguna aerobia",
    power_kw: 22,
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-lin-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "LIN-001",
    name: "Tubería Biogás DN100 Laguna→Tren Gas",
    manufacturer: "PAVCO",
    model: "HDPE PN10 DN100",
    criticality: "alta",
    status: "pendiente",
    service: "Conducción biogás desde cubierta a tratamiento",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-tea-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "TEA-001",
    name: "Antorcha / TEA Biogás",
    manufacturer: "Combustion Systems",
    model: "CS-300",
    criticality: "alta",
    status: "pendiente",
    service: "Quema excedentes biogás en emergencia",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
  {
    id: "eq-lag-001",
    project_id: PROJECT_ID,
    subsystem_id: SUB_ID_SAL_MAQ,
    tag: "LAG-001",
    name: "Laguna Anaerobia Biodigestor",
    manufacturer: "PTAR Zipaquirá",
    model: "Laguna cubierta HDPE",
    criticality: "alta",
    status: "pendiente",
    service: "Digestión anaerobia aguas residuales",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    sync_status: "synced",
  },
];

// ─── N:M Equipment ↔ Template assignments ─────────────────────────────────

export const MOCK_EQUIPMENT_TEMPLATES: EquipmentTemplateAssignment[] = [
  { equipmentId: "eq-bba-001", templateId: "tpl-mec-002" }, // Bomba → P_MEC_002
  { equipmentId: "eq-mtr-002", templateId: "tpl-mec-001" }, // Motor → P_MEC_001
  { equipmentId: "eq-vlv-003", templateId: "tpl-mec-006" }, // Válvula → P_MEC_006
  { equipmentId: "eq-ft-101",  templateId: "tpl-ic-001"  }, // FT → P_IC_001
  { equipmentId: "eq-pt-201",  templateId: "tpl-ic-001"  }, // PT → P_IC_001
  { equipmentId: "eq-plc-001", templateId: "tpl-ele-001" }, // PLC → P_ELE_001
  { equipmentId: "eq-ccm-001", templateId: "tpl-ele-001" }, // CCM → P_ELE_001
  { equipmentId: "eq-bga-001", templateId: "tpl-mec-001" }, // Compresor → P_MEC_001
  { equipmentId: "eq-tt-101",  templateId: "tpl-ic-001"  }, // TT → P_IC_001
  { equipmentId: "eq-mtr-002", templateId: "tpl-ele-001" }, // Motor → P_ELE_001 (eléctrica)
  // Nuevos equipos
  { equipmentId: "eq-cab-001",   templateId: "tpl-ele-002" }, // Cable → P_ELE_002
  { equipmentId: "eq-trf-001",   templateId: "tpl-ele-003" }, // Transformador → P_ELE_003
  { equipmentId: "eq-gen-001",   templateId: "tpl-ele-004" }, // Generador → P_ELE_004
  { equipmentId: "eq-celmt-001", templateId: "tpl-ele-005" }, // Celda MT → P_ELE_005
  { equipmentId: "eq-vdf-001",   templateId: "tpl-ic-003"  }, // VDF → P_IC_003
  { equipmentId: "eq-plc-001",   templateId: "tpl-ic-002"  }, // PLC → P_IC_002 (más específico)
  { equipmentId: "eq-spl-001",   templateId: "tpl-mec-003" }, // Soplador → P_MEC_003
  { equipmentId: "eq-bga-001",   templateId: "tpl-mec-003" }, // Compresor → P_MEC_003
  { equipmentId: "eq-lin-001",   templateId: "tpl-mec-004" }, // Tubería → P_MEC_004
  { equipmentId: "eq-tea-001",   templateId: "tpl-mec-005" }, // TEA → P_MEC_005
  { equipmentId: "eq-lag-001",   templateId: "tpl-efl-001" }, // Laguna → P_EFL_001
];

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getEquipmentById(id: string): Equipment | undefined {
  return MOCK_EQUIPMENTS.find(e => e.id === id) ?? getIC02Equipment(id);
}

// Convierte ic02-fit-101 → FIT-101, ic02-sc-vb-4 → SC-VB-4, etc.
function ic02TagFromId(id: string): string {
  return id
    .slice(5)                        // quitar "ic02-"
    .split('-')
    .map(p => p.toUpperCase())
    .join('-');
}

export function getIC02Equipment(equipmentId: string): Equipment | undefined {
  if (!equipmentId.startsWith('ic02-')) return undefined;
  const tag = ic02TagFromId(equipmentId);
  const NOW = new Date().toISOString();
  return {
    id:          equipmentId,
    project_id:  PROJECT_ID,
    subsystem_id: 'ic02-subsystem',
    tag,
    name:         `Instrumento ${tag} — IC02`,
    criticality:  'alta',
    status:       'pendiente',
    io_type:      'Instrumento I&C',
    service:      'Sistema IC02 — Aire y Biogás LDC Bebedouro',
    created_at:   NOW,
    updated_at:   NOW,
    version:      1,
    sync_status:  'synced',
  };
}

export function getTemplateById(id: string): MockInspectionTemplate | undefined {
  return MOCK_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesForEquipment(equipmentId: string): MockInspectionTemplate[] {
  if (equipmentId.startsWith('ic02-')) {
    // Todos los instrumentos IC02 usan el template I&C
    return MOCK_TEMPLATES.filter(t => t.id === 'tpl-ic-001');
  }
  const templateIds = MOCK_EQUIPMENT_TEMPLATES
    .filter(a => a.equipmentId === equipmentId)
    .map(a => a.templateId);
  return MOCK_TEMPLATES.filter(t => templateIds.includes(t.id));
}
