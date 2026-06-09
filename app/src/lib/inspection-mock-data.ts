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
];

// ─── N:M Equipment ↔ Template assignments ─────────────────────────────────

export const MOCK_EQUIPMENT_TEMPLATES: EquipmentTemplateAssignment[] = [
  { equipmentId: "eq-bba-001", templateId: "tpl-mec-002" }, // Bomba → P_MEC_002
  { equipmentId: "eq-mtr-002", templateId: "tpl-mec-001" }, // Motor → P_MEC_001
  { equipmentId: "eq-vlv-003", templateId: "tpl-mec-002" }, // Válvula → P_MEC_002
  { equipmentId: "eq-ft-101",  templateId: "tpl-ic-001"  }, // FT → P_IC_001
  { equipmentId: "eq-pt-201",  templateId: "tpl-ic-001"  }, // PT → P_IC_001
  { equipmentId: "eq-plc-001", templateId: "tpl-ele-001" }, // PLC → P_ELE_001
  { equipmentId: "eq-ccm-001", templateId: "tpl-ele-001" }, // CCM → P_ELE_001
  { equipmentId: "eq-bga-001", templateId: "tpl-mec-001" }, // Compresor → P_MEC_001
  { equipmentId: "eq-tt-101",  templateId: "tpl-ic-001"  }, // TT → P_IC_001
  { equipmentId: "eq-mtr-002", templateId: "tpl-ele-001" }, // Motor → P_ELE_001 (eléctrica)
];

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getEquipmentById(id: string): Equipment | undefined {
  return MOCK_EQUIPMENTS.find(e => e.id === id);
}

export function getTemplateById(id: string): MockInspectionTemplate | undefined {
  return MOCK_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesForEquipment(equipmentId: string): MockInspectionTemplate[] {
  const templateIds = MOCK_EQUIPMENT_TEMPLATES
    .filter(a => a.equipmentId === equipmentId)
    .map(a => a.templateId);
  return MOCK_TEMPLATES.filter(t => templateIds.includes(t.id));
}
