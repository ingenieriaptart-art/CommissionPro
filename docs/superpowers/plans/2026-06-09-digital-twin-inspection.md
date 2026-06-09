# Digital Twin Inspection MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two-phase Digital Twin inspection UX for CommissionPro — Plant Map as navigation hub (Phase 1) + full-screen dedicated inspection form (Phase 2) — with mock data, no Supabase, no auth.

**Architecture:** Phase 1 enhances the existing `/projects/[id]/plant-map` route by replacing the detail panel with a portal-based `FloatingEquipmentPanel`. Phase 2 is a new full-screen route at `/equipment/[id]/inspection/[templateId]` outside the project sidebar layout, with a `SectionSidebar`, `DynamicFormSection`, and `InspectionMiniMap` fringe.

**Tech Stack:** Next.js 16 (`npm run dev --webpack`), React 18, TypeScript, Tailwind CSS, `react-dom/createPortal` (established pattern in `OverlayEditor`), `sessionStorage` for state persistence.

---

## File Map

**New files:**
```
app/src/types/inspection.ts                              ← InspectionState, EvidenceItem, MockTemplate types
app/src/lib/inspection-mock-data.ts                      ← mock equipments, templates, sections, fields
app/src/app/(workspace)/equipment/
  [equipmentId]/inspection/[templateId]/layout.tsx       ← full-screen layout (no sidebar)
  [equipmentId]/inspection/[templateId]/page.tsx         ← inspection page shell + state management
  [equipmentId]/inspection/[templateId]/summary/page.tsx ← summary sub-route
app/src/components/inspection/
  SectionSidebar.tsx                                     ← section list + progress
  DynamicFormSection.tsx                                 ← maps sections.fields → FieldRenderer
  FieldRenderer.tsx                                      ← switch on FieldType
  EvidenceCapture.tsx                                    ← photo capture + thumbnail grid
  InspectionSummary.tsx                                  ← final summary + CTA
  InspectionMiniMap.tsx                                  ← 80px contextual map fringe
  fields/CheckboxField.tsx                               ← OK / FALLA / N/A toggle
  fields/SignatureField.tsx                              ← stub signature pad
app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx  ← portal panel + template list
app/src/components/plant-map/AreaProgressDashboard.tsx         ← collapsible area progress
```

**Modified files:**
```
app/src/components/plant-map/visual/EquipmentOverlay.tsx  ← onClick passes MouseEvent position
app/src/components/plant-map/visual/PlantVisualMap.tsx    ← onEquipmentClick(id, event)
app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx ← floating panel state + navigation
```

---

## Task 1: Inspection types + mock data

**Files:**
- Create: `app/src/types/inspection.ts`
- Create: `app/src/lib/inspection-mock-data.ts`

- [ ] **Step 1.1 — Create `app/src/types/inspection.ts`**

```typescript
import type { FieldType, EquipmentStatus } from "@/types";

export interface MockInspectionField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  validations?: { unit?: string; min?: number; max?: number };
  hint?: string;
}

export interface MockInspectionSection {
  id: string;
  code: string;
  name: string;
  is_universal: boolean;
  fields: MockInspectionField[];
}

export interface MockInspectionTemplate {
  id: string;
  code: string;
  name: string;
  discipline: string;
  sections: MockInspectionSection[];
}

export type SectionStatus = "pending" | "in_progress" | "complete" | "failed";

export interface EvidenceItem {
  fieldKey: string;
  url: string;           // blob URL (prototype) or storage URL (production)
  caption: string;
  stage: "antes" | "durante" | "despues" | "general";
  timestamp: string;     // ISO date string
}

export interface InspectionState {
  equipmentId: string;
  templateId: string;
  activeSectionIndex: number;
  answers: Record<string, unknown>;
  evidences: Record<string, EvidenceItem[]>;
  sectionStatus: Record<string, SectionStatus>;
  savedAt: string | null;   // ISO date string
  isDirty: boolean;
}

// N:M assignment: which templates apply to which equipment IDs
export interface EquipmentTemplateAssignment {
  equipmentId: string;
  templateId: string;
  // in the DB this comes from equipment_templates or equipment_type_templates
}
```

- [ ] **Step 1.2 — Create `app/src/lib/inspection-mock-data.ts`**

```typescript
import type { Equipment } from "@/types";
import type {
  MockInspectionTemplate,
  MockInspectionSection,
  EquipmentTemplateAssignment,
} from "@/types/inspection";

// ─── Sections (mirrors template_sections seed in 0021) ─────────────────────

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

// ─── Mock Equipments (Bojacá) ──────────────────────────────────────────────

const PROJECT_ID = "101d41a1-a197-4f20-9308-2fa07827657b"; // Bojacá
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
    service: "Control proceso PTAR Bojacá",
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
  // N:M example: MTR-002 also has an electrical inspection
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
```

- [ ] **Step 1.3 — Verify TypeScript compilation**

```bash
cd app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on the new files (only existing errors if any).

- [ ] **Step 1.4 — Commit**

```bash
git add app/src/types/inspection.ts app/src/lib/inspection-mock-data.ts
git commit -m "feat(inspection): tipos y mock data Digital Twin MVP"
```

---

## Task 2: Inspection route — layout + page shell

**Files:**
- Create: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/layout.tsx`
- Create: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`

- [ ] **Step 2.1 — Create directory**

```bash
mkdir -p "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]"
```

- [ ] **Step 2.2 — Create layout.tsx** (full-screen, no sidebar)

```typescript
// app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/layout.tsx
export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-slate-950 flex flex-col">
      {children}
    </div>
  );
}
```

- [ ] **Step 2.3 — Create page.tsx** (shell with state management)

```typescript
// app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEquipmentById,
  getTemplateById,
} from "@/lib/inspection-mock-data";
import { SectionSidebar } from "@/components/inspection/SectionSidebar";
import { DynamicFormSection } from "@/components/inspection/DynamicFormSection";
import { InspectionMiniMap } from "@/components/inspection/InspectionMiniMap";
import type { InspectionState, SectionStatus } from "@/types/inspection";

function buildInitialState(
  equipmentId: string,
  templateId: string,
  sectionCodes: string[],
): InspectionState {
  const sectionStatus: Record<string, SectionStatus> = {};
  for (const code of sectionCodes) sectionStatus[code] = "pending";
  return {
    equipmentId,
    templateId,
    activeSectionIndex: 0,
    answers: {},
    evidences: {},
    sectionStatus,
    savedAt: null,
    isDirty: false,
  };
}

const STORAGE_KEY = (eqId: string, tplId: string) =>
  `inspection_${eqId}_${tplId}`;

export default function InspectionPage() {
  const params       = useParams() as { equipmentId: string; templateId: string };
  const searchParams = useSearchParams();
  const router       = useRouter();

  const { equipmentId, templateId } = params;
  const returnTo = searchParams.get("returnTo") ?? "/";

  const equipment = getEquipmentById(equipmentId);
  const template  = getTemplateById(templateId);

  const [state, setState] = useState<InspectionState | null>(null);

  // Load or initialize state from sessionStorage
  useEffect(() => {
    if (!template) return;
    const key = STORAGE_KEY(equipmentId, templateId);
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        setState(JSON.parse(stored) as InspectionState);
        return;
      }
    } catch { /* ignore */ }
    setState(
      buildInitialState(
        equipmentId,
        templateId,
        template.sections.map(s => s.code),
      )
    );
  }, [equipmentId, templateId, template]);

  // Persist state on every change
  useEffect(() => {
    if (!state) return;
    const key = STORAGE_KEY(equipmentId, templateId);
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch { /* quota exceeded — ignore for prototype */ }
  }, [state, equipmentId, templateId]);

  const handleAnswerChange = useCallback((fieldKey: string, value: unknown) => {
    setState(prev => {
      if (!prev) return prev;
      const section = template?.sections[prev.activeSectionIndex];
      if (!section) return prev;
      const newAnswers = { ...prev.answers, [fieldKey]: value };
      // Recompute section status
      const allRequired = section.fields.filter(f => f.required);
      const allFilled = allRequired.every(f => {
        const v = newAnswers[f.key];
        return v !== undefined && v !== null && v !== "";
      });
      const hasFail = section.fields.some(
        f => newAnswers[f.key] === "FALLA" || newAnswers[f.key] === "NO" || newAnswers[f.key] === "RECHAZADO"
      );
      const sectionStatus: SectionStatus = allFilled
        ? (hasFail ? "failed" : "complete")
        : "in_progress";
      return {
        ...prev,
        answers: newAnswers,
        sectionStatus: { ...prev.sectionStatus, [section.code]: sectionStatus },
        isDirty: true,
        savedAt: new Date().toISOString(),
      };
    });
  }, [template]);

  const handleEvidenceAdd = useCallback((fieldKey: string, url: string) => {
    setState(prev => {
      if (!prev) return prev;
      const existing = prev.evidences[fieldKey] ?? [];
      if (existing.length >= 5) return prev; // prototype limit
      return {
        ...prev,
        evidences: {
          ...prev.evidences,
          [fieldKey]: [
            ...existing,
            { fieldKey, url, caption: "", stage: "general", timestamp: new Date().toISOString() },
          ],
        },
        isDirty: true,
      };
    });
  }, []);

  const handleEvidenceRemove = useCallback((fieldKey: string, index: number) => {
    setState(prev => {
      if (!prev) return prev;
      const existing = prev.evidences[fieldKey] ?? [];
      const updated = existing.filter((_, i) => i !== index);
      return { ...prev, evidences: { ...prev.evidences, [fieldKey]: updated }, isDirty: true };
    });
  }, []);

  const handleSectionSelect = useCallback((index: number) => {
    setState(prev => prev ? { ...prev, activeSectionIndex: index } : prev);
  }, []);

  const handleNext = useCallback(() => {
    setState(prev => {
      if (!prev || !template) return prev;
      const next = Math.min(prev.activeSectionIndex + 1, template.sections.length - 1);
      return { ...prev, activeSectionIndex: next };
    });
  }, [template]);

  const handlePrev = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      return { ...prev, activeSectionIndex: Math.max(0, prev.activeSectionIndex - 1) };
    });
  }, []);

  const handleComplete = useCallback(() => {
    router.push(`/equipment/${equipmentId}/inspection/${templateId}/summary?returnTo=${encodeURIComponent(returnTo)}`);
  }, [router, equipmentId, templateId, returnTo]);

  if (!equipment || !template || !state) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">
          {!equipment ? "Equipo no encontrado" : !template ? "Plantilla no encontrada" : "Cargando…"}
        </p>
      </div>
    );
  }

  const activeSection = template.sections[state.activeSectionIndex];
  const isLastSection = state.activeSectionIndex === template.sections.length - 1;
  const allComplete   = template.sections.every(s =>
    state.sectionStatus[s.code] === "complete" || state.sectionStatus[s.code] === "failed"
  );

  return (
    <>
      {/* HEADER */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push(returnTo)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Plano
        </button>
        <span className="text-slate-700">|</span>
        <span className="text-sm font-mono font-bold text-blue-400">{equipment.tag}</span>
        <span className="text-slate-600 text-sm">—</span>
        <span className="text-sm text-slate-300 truncate">{equipment.name}</span>
        <span className="text-slate-700 text-sm">›</span>
        <span className="text-sm text-slate-400 truncate">{template.code}</span>
        <div className="ml-auto flex items-center gap-2">
          {state.savedAt && (
            <span className="text-[10px] text-slate-600">
              Guardado {new Date(state.savedAt).toLocaleTimeString("es-CO")}
            </span>
          )}
          {allComplete && (
            <button
              onClick={handleComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <CheckCircle size={14} /> Revisar y Cerrar
            </button>
          )}
        </div>
      </header>

      {/* BODY: sidebar + form + minimap */}
      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar
          sections={template.sections}
          activeSectionIndex={state.activeSectionIndex}
          sectionStatus={state.sectionStatus}
          answers={state.answers}
          onSectionSelect={handleSectionSelect}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950">
          <DynamicFormSection
            section={activeSection}
            answers={state.answers}
            evidences={state.evidences}
            onAnswerChange={handleAnswerChange}
            onEvidenceAdd={handleEvidenceAdd}
            onEvidenceRemove={handleEvidenceRemove}
          />
        </main>

        <InspectionMiniMap
          equipmentId={equipmentId}
          equipmentTag={equipment.tag}
        />
      </div>

      {/* FOOTER */}
      <footer className="h-13 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
        <button
          onClick={handlePrev}
          disabled={state.activeSectionIndex === 0}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors",
            state.activeSectionIndex === 0
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          ← {state.activeSectionIndex > 0 ? template.sections[state.activeSectionIndex - 1].name : ""}
        </button>

        <span className="text-[10px] text-slate-600">
          Sección {state.activeSectionIndex + 1} de {template.sections.length}
        </span>

        <button
          onClick={handleNext}
          disabled={isLastSection}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors",
            isLastSection
              ? "text-slate-700 cursor-not-allowed"
              : "text-white bg-blue-700 hover:bg-blue-600"
          )}
        >
          {!isLastSection ? template.sections[state.activeSectionIndex + 1].name : "Última sección"} →
        </button>
      </footer>
    </>
  );
}
```

- [ ] **Step 2.4 — Verify TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -30
```

Expected: only "Cannot find module" errors for components not yet created (SectionSidebar, DynamicFormSection, InspectionMiniMap) — those are fine at this stage.

- [ ] **Step 2.5 — Commit**

```bash
git add "app/src/app/(workspace)/equipment"
git commit -m "feat(inspection): ruta dedicada y shell de inspección pantalla completa"
```

---

## Task 3: SectionSidebar

**Files:**
- Create: `app/src/components/inspection/SectionSidebar.tsx`

- [ ] **Step 3.1 — Create SectionSidebar**

```typescript
// app/src/components/inspection/SectionSidebar.tsx
"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, X, ChevronRight, Circle } from "lucide-react";
import type { MockInspectionSection, SectionStatus } from "@/types/inspection";

interface SectionSidebarProps {
  sections: MockInspectionSection[];
  activeSectionIndex: number;
  sectionStatus: Record<string, SectionStatus>;
  answers: Record<string, unknown>;
  onSectionSelect: (index: number) => void;
}

function SectionIcon({ status, active }: { status: SectionStatus; active: boolean }) {
  if (active) return <ChevronRight size={13} className="text-blue-400" />;
  if (status === "complete")    return <Check  size={13} className="text-green-400" />;
  if (status === "failed")      return <X      size={13} className="text-red-400" />;
  if (status === "in_progress") return <Circle size={13} className="text-yellow-400" />;
  return <Circle size={13} className="text-slate-600" />;
}

function statusBg(status: SectionStatus, active: boolean): string {
  if (active)                    return "bg-blue-900/40 border-l-2 border-blue-500";
  if (status === "complete")     return "hover:bg-slate-800/60";
  if (status === "failed")       return "hover:bg-slate-800/60";
  if (status === "in_progress")  return "hover:bg-slate-800/60";
  return "hover:bg-slate-800/40";
}

export function SectionSidebar({
  sections,
  activeSectionIndex,
  sectionStatus,
  answers,
  onSectionSelect,
}: SectionSidebarProps) {
  const { totalRequired, totalFilled } = useMemo(() => {
    let req = 0, filled = 0;
    for (const sec of sections) {
      for (const f of sec.fields) {
        if (f.required) {
          req++;
          const v = answers[f.key];
          if (v !== undefined && v !== null && v !== "") filled++;
        }
      }
    }
    return { totalRequired: req, totalFilled: filled };
  }, [sections, answers]);

  const pct = totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;

  return (
    <aside className="w-52 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-slate-800">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Secciones
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {sections.map((section, index) => {
          const status = sectionStatus[section.code] ?? "pending";
          const active = index === activeSectionIndex;
          return (
            <button
              key={section.code}
              onClick={() => onSectionSelect(index)}
              className={cn(
                "w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors",
                statusBg(status, active)
              )}
            >
              <span className="mt-0.5 flex-shrink-0">
                <SectionIcon status={status} active={active} />
              </span>
              <div className="min-w-0">
                <p className={cn(
                  "text-xs leading-tight",
                  active ? "text-blue-300 font-semibold" : "text-slate-300"
                )}>
                  {section.name}
                </p>
                {section.is_universal && (
                  <p className="text-[9px] text-slate-600 mt-0.5">Universal</p>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Progress footer */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Completado</p>
          <p className="text-[10px] text-blue-400 font-semibold">{pct}%</p>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[9px] text-slate-600 mt-1">
          {totalFilled} / {totalRequired} campos requeridos
        </p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3.2 — Verify TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -v node_modules | grep "SectionSidebar" | head -10
```

Expected: no errors referencing SectionSidebar.

- [ ] **Step 3.3 — Commit**

```bash
git add app/src/components/inspection/SectionSidebar.tsx
git commit -m "feat(inspection): SectionSidebar con estado y progreso"
```

---

## Task 4: FieldRenderer + DynamicFormSection

**Files:**
- Create: `app/src/components/inspection/fields/CheckboxField.tsx`
- Create: `app/src/components/inspection/fields/SignatureField.tsx`
- Create: `app/src/components/inspection/FieldRenderer.tsx`
- Create: `app/src/components/inspection/DynamicFormSection.tsx`

- [ ] **Step 4.1 — Create CheckboxField** (OK / FALLA / N/A toggle)

```typescript
// app/src/components/inspection/fields/CheckboxField.tsx
"use client";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps {
  options: string[];
  value: string | undefined;
  onChange: (value: string) => void;
}

const OPTION_STYLES: Record<string, { selected: string; hover: string }> = {
  OK:        { selected: "bg-green-800 border-green-500 text-green-300",  hover: "hover:border-green-700" },
  SI:        { selected: "bg-green-800 border-green-500 text-green-300",  hover: "hover:border-green-700" },
  FALLA:     { selected: "bg-red-900   border-red-500   text-red-300",    hover: "hover:border-red-700" },
  NO:        { selected: "bg-red-900   border-red-500   text-red-300",    hover: "hover:border-red-700" },
  RECHAZADO: { selected: "bg-red-900   border-red-500   text-red-300",    hover: "hover:border-red-700" },
  APROBADO:  { selected: "bg-green-800 border-green-500 text-green-300",  hover: "hover:border-green-700" },
  "N/A":     { selected: "bg-slate-700 border-slate-500 text-slate-300",  hover: "hover:border-slate-600" },
};

const DEFAULT_STYLE = {
  selected: "bg-blue-900 border-blue-500 text-blue-300",
  hover:    "hover:border-blue-700",
};

export function CheckboxField({ options, value, onChange }: CheckboxFieldProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = value === opt;
        const style = OPTION_STYLES[opt] ?? DEFAULT_STYLE;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(isSelected ? "" : opt)}
            className={cn(
              "px-4 py-1.5 rounded-md border text-xs font-semibold transition-all",
              isSelected
                ? style.selected
                : cn("border-slate-700 text-slate-500 bg-transparent", style.hover)
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4.2 — Create SignatureField** (stub)

```typescript
// app/src/components/inspection/fields/SignatureField.tsx
"use client";
import { PenLine } from "lucide-react";

interface SignatureFieldProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function SignatureField({ value, onChange }: SignatureFieldProps) {
  if (value) {
    return (
      <div className="relative">
        <div className="bg-slate-800 border border-green-700 rounded-lg p-3 flex items-center gap-2">
          <PenLine size={14} className="text-green-400" />
          <span className="text-xs text-green-300">Firma registrada</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Borrar
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onChange(`signed_${Date.now()}`)}  // stub: real impl uses canvas
      className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm transition-colors w-full justify-center"
    >
      <PenLine size={16} />
      Toca para firmar (stub — canvas en producción)
    </button>
  );
}
```

- [ ] **Step 4.3 — Create FieldRenderer**

```typescript
// app/src/components/inspection/FieldRenderer.tsx
"use client";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckboxField } from "./fields/CheckboxField";
import { SignatureField } from "./fields/SignatureField";
import { EvidenceCapture } from "./EvidenceCapture";
import type { MockInspectionField, EvidenceItem } from "@/types/inspection";

interface FieldRendererProps {
  field: MockInspectionField;
  value: unknown;
  evidences: EvidenceItem[];
  onChange: (fieldKey: string, value: unknown) => void;
  onEvidenceAdd: (fieldKey: string, url: string) => void;
  onEvidenceRemove: (fieldKey: string, index: number) => void;
  /** When true, textarea is visually required (previous checkbox = FALLA/NO) */
  forceRequired?: boolean;
}

const inputClass =
  "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors";

export function FieldRenderer({
  field, value, evidences,
  onChange, onEvidenceAdd, onEvidenceRemove,
  forceRequired = false,
}: FieldRendererProps) {
  const strValue   = (value as string | undefined) ?? "";
  const numValue   = (value as number | undefined) ?? "";
  const isRequired = field.required || forceRequired;

  const label = (
    <label className="block text-xs text-slate-400 mb-1.5">
      {field.label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
      {field.hint && <span className="text-slate-600 ml-1">— {field.hint}</span>}
    </label>
  );

  switch (field.type) {
    case "texto":
      return (
        <div>
          {label}
          <input
            type="text"
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            className={inputClass}
            placeholder={field.label}
          />
        </div>
      );

    case "numero":
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={numValue}
              onChange={e => onChange(field.key, e.target.valueAsNumber)}
              min={field.validations?.min}
              max={field.validations?.max}
              className={cn(inputClass, "w-36")}
              placeholder="0"
              step="any"
            />
            {field.validations?.unit && (
              <span className="text-sm text-slate-500">{field.validations.unit}</span>
            )}
          </div>
        </div>
      );

    case "fecha":
      return (
        <div>
          {label}
          <input
            type="date"
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            className={cn(inputClass, "w-44")}
          />
        </div>
      );

    case "select":
      return (
        <div>
          {label}
          <select
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            className={cn(inputClass, "w-auto min-w-[160px]")}
          >
            <option value="">— Seleccionar —</option>
            {(field.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );

    case "checkbox":
      return (
        <div>
          {label}
          <CheckboxField
            options={field.options ?? ["OK", "FALLA", "N/A"]}
            value={strValue || undefined}
            onChange={v => onChange(field.key, v)}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          {label}
          <textarea
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            rows={3}
            className={cn(
              inputClass,
              "resize-y",
              forceRequired && !strValue ? "border-red-600 bg-red-950/10" : ""
            )}
            placeholder={forceRequired ? "Requerido cuando hay FALLA" : field.label}
          />
        </div>
      );

    case "firma":
      return (
        <div>
          {label}
          <SignatureField
            value={strValue || undefined}
            onChange={v => onChange(field.key, v)}
          />
        </div>
      );

    case "imagen":
      return (
        <div>
          {label}
          <EvidenceCapture
            fieldKey={field.key}
            items={evidences}
            onAdd={url => onEvidenceAdd(field.key, url)}
            onRemove={idx => onEvidenceRemove(field.key, idx)}
          />
        </div>
      );

    default:
      return (
        <div>
          {label}
          <p className="text-xs text-slate-600">Campo tipo "{field.type}" no soportado en prototipo.</p>
        </div>
      );
  }
}
```

- [ ] **Step 4.4 — Create DynamicFormSection**

```typescript
// app/src/components/inspection/DynamicFormSection.tsx
"use client";
import { FieldRenderer } from "./FieldRenderer";
import { EvidenceCapture } from "./EvidenceCapture";
import type { MockInspectionSection, EvidenceItem } from "@/types/inspection";

interface DynamicFormSectionProps {
  section: MockInspectionSection;
  answers: Record<string, unknown>;
  evidences: Record<string, EvidenceItem[]>;
  onAnswerChange: (fieldKey: string, value: unknown) => void;
  onEvidenceAdd: (fieldKey: string, url: string) => void;
  onEvidenceRemove: (fieldKey: string, index: number) => void;
}

export function DynamicFormSection({
  section, answers, evidences,
  onAnswerChange, onEvidenceAdd, onEvidenceRemove,
}: DynamicFormSectionProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Section header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-slate-100">{section.name}</h2>
          {section.is_universal && (
            <span className="text-[9px] px-2 py-0.5 bg-blue-900/40 border border-blue-800 rounded-full text-blue-400 uppercase tracking-wider">
              Universal
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{section.code}</p>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {section.fields.map((field, idx) => {
          // Textarea after a FALLA/NO checkbox becomes required
          const prevField = idx > 0 ? section.fields[idx - 1] : null;
          const prevValue = prevField ? answers[prevField.key] : undefined;
          const forceRequired =
            field.type === "textarea" &&
            (prevValue === "FALLA" || prevValue === "NO" || prevValue === "RECHAZADO");

          return (
            <div
              key={field.key}
              className="bg-slate-900 rounded-xl p-4 border border-slate-800"
            >
              <FieldRenderer
                field={field}
                value={answers[field.key]}
                evidences={evidences[field.key] ?? []}
                onChange={onAnswerChange}
                onEvidenceAdd={onEvidenceAdd}
                onEvidenceRemove={onEvidenceRemove}
                forceRequired={forceRequired}
              />
            </div>
          );
        })}
      </div>

      {/* Section-level evidence capture */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
          Evidencias de la sección
        </p>
        <EvidenceCapture
          fieldKey={`__section__${section.code}`}
          items={evidences[`__section__${section.code}`] ?? []}
          onAdd={url => onEvidenceAdd(`__section__${section.code}`, url)}
          onRemove={idx => onEvidenceRemove(`__section__${section.code}`, idx)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4.5 — Verify TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -v node_modules | grep -E "FieldRenderer|DynamicFormSection|CheckboxField|SignatureField" | head -20
```

Expected: errors only for `EvidenceCapture` (not yet created).

- [ ] **Step 4.6 — Commit**

```bash
git add app/src/components/inspection/
git commit -m "feat(inspection): FieldRenderer y DynamicFormSection con todos los tipos de campo"
```

---

## Task 5: EvidenceCapture

**Files:**
- Create: `app/src/components/inspection/EvidenceCapture.tsx`

- [ ] **Step 5.1 — Create EvidenceCapture**

```typescript
// app/src/components/inspection/EvidenceCapture.tsx
"use client";
import { useRef, useState } from "react";
import { Camera, Upload, X, ZoomIn } from "lucide-react";
import type { EvidenceItem } from "@/types/inspection";

interface EvidenceCaptureProps {
  fieldKey: string;
  items: EvidenceItem[];
  onAdd: (url: string) => void;
  onRemove: (index: number) => void;
}

export function EvidenceCapture({ fieldKey, items, onAdd, onRemove }: EvidenceCaptureProps) {
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const maxReached = items.length >= 5;

  function handleFile(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAdd(url);
  }

  return (
    <div>
      {/* Thumbnails */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.map((item, idx) => (
            <div key={idx} className="relative group">
              <img
                src={item.url}
                alt={`Evidencia ${idx + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-slate-700 cursor-pointer"
                onClick={() => setPreview(item.url)}
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-white" />
              </button>
              <button
                type="button"
                onClick={() => setPreview(item.url)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
              >
                <ZoomIn size={14} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Capture buttons */}
      {!maxReached && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
          >
            <Camera size={13} /> Cámara
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
          >
            <Upload size={13} /> Galería
          </button>
          {items.length > 0 && (
            <span className="text-[10px] text-slate-600 self-center">{items.length}/5</span>
          )}
        </div>
      )}
      {maxReached && (
        <p className="text-[10px] text-slate-600">Máximo 5 fotos por campo (prototipo)</p>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {/* Fullscreen preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white hover:bg-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5.2 — Verify build**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -v node_modules | grep -E "EvidenceCapture" | head -10
```

Expected: no errors on EvidenceCapture itself.

- [ ] **Step 5.3 — Commit**

```bash
git add app/src/components/inspection/EvidenceCapture.tsx
git commit -m "feat(inspection): EvidenceCapture con cámara, galería y preview modal"
```

---

## Task 6: InspectionSummary + summary route

**Files:**
- Create: `app/src/components/inspection/InspectionSummary.tsx`
- Create: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary/page.tsx`

- [ ] **Step 6.1 — Create InspectionSummary**

```typescript
// app/src/components/inspection/InspectionSummary.tsx
"use client";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockInspectionTemplate } from "@/types/inspection";
import type { InspectionState } from "@/types/inspection";

interface InspectionSummaryProps {
  template: MockInspectionTemplate;
  state: InspectionState;
  onClose: () => void;          // "Generar Certificado" CTA
}

export function InspectionSummary({ template, state, onClose }: InspectionSummaryProps) {
  const failures: { sectionName: string; fieldLabel: string; observation: string }[] = [];

  for (const section of template.sections) {
    for (const field of section.fields) {
      const v = state.answers[field.key];
      if (v === "FALLA" || v === "NO" || v === "RECHAZADO") {
        // Find the observation key (next textarea field after this one)
        const nextField = section.fields[section.fields.indexOf(field) + 1];
        const obs = nextField?.type === "textarea"
          ? (state.answers[nextField.key] as string | undefined) ?? ""
          : "";
        failures.push({ sectionName: section.name, fieldLabel: field.label, observation: obs });
      }
    }
  }

  const isApproved  = failures.length === 0;
  const totalFields = template.sections.flatMap(s => s.fields).length;
  const answered    = Object.keys(state.answers).filter(k => {
    const v = state.answers[k];
    return v !== undefined && v !== null && v !== "";
  }).length;
  const totalEvidences = Object.values(state.evidences).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Result banner */}
      <div className={cn(
        "rounded-xl p-4 mb-6 flex items-center gap-3",
        isApproved ? "bg-green-900/30 border border-green-800" : "bg-red-900/30 border border-red-800"
      )}>
        {isApproved
          ? <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
          : <XCircle    size={24} className="text-red-400   flex-shrink-0" />
        }
        <div>
          <p className={cn("font-bold", isApproved ? "text-green-300" : "text-red-300")}>
            {isApproved ? "INSPECCIÓN APROBADA" : "INSPECCIÓN CON OBSERVACIONES"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {answered}/{totalFields} campos respondidos · {totalEvidences} evidencias · {failures.length} fallas
          </p>
        </div>
      </div>

      {/* Failures list */}
      {failures.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Fallos detectados ({failures.length})
          </p>
          <div className="space-y-2">
            {failures.map((f, i) => (
              <div key={i} className="bg-red-950/20 border border-red-900/40 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-300 font-medium">{f.fieldLabel}</p>
                    <p className="text-[10px] text-slate-500">{f.sectionName}</p>
                    {f.observation && (
                      <p className="text-xs text-slate-400 mt-1 italic">"{f.observation}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section-by-section review */}
      <div className="space-y-4">
        {template.sections.map(section => {
          const sectionAnswers = section.fields
            .filter(f => state.answers[f.key] !== undefined && state.answers[f.key] !== "")
            .map(f => ({ label: f.label, value: String(state.answers[f.key] ?? "") }));
          const sectionEvs = Object.entries(state.evidences)
            .filter(([k]) => k.startsWith(`__section__${section.code}`) || section.fields.some(f => f.key === k))
            .flatMap(([, items]) => items);

          return (
            <div key={section.code} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <p className="text-xs font-semibold text-slate-300 mb-2">{section.name}</p>
              {sectionAnswers.length === 0 ? (
                <p className="text-xs text-slate-600 italic">Sin respuestas</p>
              ) : (
                <dl className="space-y-1">
                  {sectionAnswers.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-[10px] text-slate-500 flex-shrink-0">{label}</dt>
                      <dd className={cn(
                        "text-[10px] font-medium",
                        value === "FALLA" || value === "NO" || value === "RECHAZADO"
                          ? "text-red-400"
                          : value === "OK" || value === "SI" || value === "APROBADO"
                          ? "text-green-400"
                          : "text-slate-300"
                      )}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {sectionEvs.length > 0 && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800">
                  {sectionEvs.map((ev, i) => (
                    <img key={i} src={ev.url} alt="" className="w-10 h-10 rounded object-cover border border-slate-700" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <button
          onClick={onClose}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-sm transition-colors",
            isApproved
              ? "bg-green-700 hover:bg-green-600 text-white"
              : "bg-orange-700 hover:bg-orange-600 text-white"
          )}
        >
          {isApproved ? "✓ Generar Certificado y Cerrar" : "⚠ Cerrar con Observaciones"}
        </button>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Prototipo: el certificado se generará al ejecutar migración 0021
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.2 — Create summary page**

```typescript
// app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEquipmentById, getTemplateById } from "@/lib/inspection-mock-data";
import { InspectionSummary } from "@/components/inspection/InspectionSummary";
import { SectionSidebar } from "@/components/inspection/SectionSidebar";
import { InspectionMiniMap } from "@/components/inspection/InspectionMiniMap";
import type { InspectionState, SectionStatus } from "@/types/inspection";

const STORAGE_KEY = (eqId: string, tplId: string) => `inspection_${eqId}_${tplId}`;

export default function InspectionSummaryPage() {
  const params       = useParams() as { equipmentId: string; templateId: string };
  const searchParams = useSearchParams();
  const router       = useRouter();

  const { equipmentId, templateId } = params;
  const returnTo = searchParams.get("returnTo") ?? "/";

  const equipment = getEquipmentById(equipmentId);
  const template  = getTemplateById(templateId);
  const [state, setState] = useState<InspectionState | null>(null);

  useEffect(() => {
    if (!template) return;
    const key = STORAGE_KEY(equipmentId, templateId);
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) setState(JSON.parse(stored) as InspectionState);
    } catch { /* ignore */ }
  }, [equipmentId, templateId, template]);

  const handleClose = () => {
    // Clear session state + navigate back to plant map
    try { sessionStorage.removeItem(STORAGE_KEY(equipmentId, templateId)); } catch { /* ignore */ }
    router.push(returnTo);
  };

  if (!equipment || !template || !state) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-slate-500">Cargando…</p></div>;
  }

  const allComplete: Record<string, SectionStatus> = {};
  template.sections.forEach(s => { allComplete[s.code] = "complete"; });

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push(`/equipment/${equipmentId}/inspection/${templateId}?returnTo=${encodeURIComponent(returnTo)}`)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Formulario
        </button>
        <span className="text-slate-700">|</span>
        <span className="text-sm font-mono font-bold text-blue-400">{equipment.tag}</span>
        <span className="text-slate-600 text-sm">—</span>
        <span className="text-sm text-green-400 font-semibold">Resumen de Inspección</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar
          sections={template.sections}
          activeSectionIndex={template.sections.length - 1}
          sectionStatus={state.sectionStatus}
          answers={state.answers}
          onSectionSelect={() => {}}
        />
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <InspectionSummary template={template} state={state} onClose={handleClose} />
        </main>
        <InspectionMiniMap equipmentId={equipmentId} equipmentTag={equipment.tag} />
      </div>
    </>
  );
}
```

- [ ] **Step 6.3 — Verify TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -v node_modules | grep -E "InspectionSummary|summary" | head -10
```

Expected: no errors.

- [ ] **Step 6.4 — Commit**

```bash
git add app/src/components/inspection/InspectionSummary.tsx "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary"
git commit -m "feat(inspection): InspectionSummary con fallos, evidencias y CTA certificado"
```

---

## Task 7: InspectionMiniMap

**Files:**
- Create: `app/src/components/inspection/InspectionMiniMap.tsx`

- [ ] **Step 7.1 — Create InspectionMiniMap**

```typescript
// app/src/components/inspection/InspectionMiniMap.tsx
"use client";
import { useEffect, useState } from "react";
import { Map } from "lucide-react";

interface InspectionMiniMapProps {
  equipmentId: string;
  equipmentTag: string;
}

interface MapContext {
  imageUrl: string;
  overlayX: number;      // 0-1 normalized position
  overlayY: number;
}

const CONTEXT_KEY = "plantmap_inspection_context";

export function InspectionMiniMap({ equipmentId, equipmentTag }: InspectionMiniMapProps) {
  const [ctx, setCtx] = useState<MapContext | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(CONTEXT_KEY);
      if (stored) setCtx(JSON.parse(stored) as MapContext);
    } catch { /* ignore */ }
  }, [equipmentId]);

  return (
    <aside className="w-20 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col items-center py-3 gap-2 overflow-hidden">
      <p className="text-[8px] text-slate-600 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 select-none">
        Plano
      </p>

      <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-md overflow-hidden relative flex-shrink-0">
        {ctx?.imageUrl ? (
          <>
            <img
              src={ctx.imageUrl}
              alt="Plano"
              className="w-full h-full object-cover opacity-60"
            />
            {/* Equipment marker */}
            <div
              className="absolute w-3 h-3 bg-yellow-400 rounded-sm border border-yellow-300 shadow-[0_0_6px_#facc15]"
              style={{
                left: `${ctx.overlayX * 100}%`,
                top:  `${ctx.overlayY * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Map size={16} className="text-slate-600" />
          </div>
        )}
      </div>

      <p className="text-[8px] text-slate-500 font-mono text-center break-all px-1 leading-tight">
        {equipmentTag}
      </p>
    </aside>
  );
}
```

- [ ] **Step 7.2 — Commit**

```bash
git add app/src/components/inspection/InspectionMiniMap.tsx
git commit -m "feat(inspection): InspectionMiniMap franja contextual con imagen del plano"
```

---

## Task 8: FloatingEquipmentPanel + plant-map wiring

**Files:**
- Modify: `app/src/components/plant-map/visual/EquipmentOverlay.tsx`
- Modify: `app/src/components/plant-map/visual/PlantVisualMap.tsx`
- Create: `app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx`
- Modify: `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx`

- [ ] **Step 8.1 — Update EquipmentOverlay** to pass click position

Replace the `onClick` signature from `(id: string) => void` to `(id: string, event: React.MouseEvent) => void`:

In `app/src/components/plant-map/visual/EquipmentOverlay.tsx`, change lines 22-27 and 47:

```typescript
// Old:
interface EquipmentOverlayProps {
  overlay: PlantMapAreaOverlay;
  equipment: Equipment;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}
// ...
onClick={() => onClick(equipment.id)

// New:
interface EquipmentOverlayProps {
  overlay: PlantMapAreaOverlay;
  equipment: Equipment;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string, event: React.MouseEvent) => void;
}
// ...
onClick={(e) => onClick(equipment.id, e)
```

Full updated `EquipmentOverlay.tsx`:

```typescript
"use client";
import { useState } from "react";
import type { Equipment, PlantMapAreaOverlay } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pendiente:          "#3b82f6",
  en_ejecucion:       "#f59e0b",
  aprobado:           "#22c55e",
  revisado:           "#eab308",
  listo_energizacion: "#06b6d4",
  listo_arranque:     "#84cc16",
  operativo:          "#22c55e",
  rechazado:          "#ef4444",
  bloqueado:          "#475569",
};

export function equipmentStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#3b82f6";
}

interface EquipmentOverlayProps {
  overlay: PlantMapAreaOverlay;
  equipment: Equipment;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string, event: React.MouseEvent) => void;
}

export function EquipmentOverlay({
  overlay, equipment, selected, onHover, onClick,
}: EquipmentOverlayProps) {
  const [hovered, setHovered] = useState(false);
  const color = equipmentStatusColor(equipment.status);

  const fillOpacity   = selected ? 0.35 : hovered ? 0.2 : 0.08;
  const strokeOpacity = selected ? 1 : hovered ? 0.9 : 0.6;
  const strokeWidth   = selected ? 2.5 : hovered ? 2 : 1.5;

  const tooltipX = overlay.x + overlay.width + 6;
  const tooltipY = overlay.y;

  // Badge position: top-right corner of the overlay rect
  const badgeX = overlay.x + overlay.width - 6;
  const badgeY = overlay.y + 6;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => { setHovered(true); onHover(equipment.id); }}
      onMouseLeave={() => { setHovered(false); onHover(null); }}
      onClick={(e) => onClick(equipment.id, e)}
    >
      <rect
        x={overlay.x} y={overlay.y}
        width={overlay.width} height={overlay.height}
        fill={color} fillOpacity={fillOpacity}
        stroke={color} strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth} rx={3}
        style={{ transition: "all 0.15s ease" }}
      />
      {/* TAG label */}
      <text
        x={overlay.x + overlay.width / 2}
        y={overlay.y + overlay.height / 2 + 4}
        textAnchor="middle"
        fill={color}
        fontSize={Math.max(9, Math.min(12, overlay.height * 0.3))}
        fontWeight={700}
        fontFamily="monospace, system-ui"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {equipment.tag}
      </text>

      {/* Status badge dot — top-right corner */}
      <circle
        cx={badgeX} cy={badgeY} r={5}
        fill={color}
        stroke="#0f172a" strokeWidth={1.5}
        style={{ pointerEvents: "none" }}
      />

      {/* Tooltip on hover */}
      {(hovered || selected) && (
        <>
          <rect
            x={tooltipX} y={tooltipY}
            width={152} height={46}
            fill="rgba(15,23,42,0.92)"
            rx={4}
            stroke={color} strokeWidth={1}
          />
          <text x={tooltipX + 8} y={tooltipY + 15}
            fill="white" fontSize={10} fontWeight={700} fontFamily="monospace">
            {equipment.tag}
          </text>
          <text x={tooltipX + 8} y={tooltipY + 28} fill="#94a3b8" fontSize={9}>
            {equipment.name.length > 22 ? equipment.name.slice(0, 22) + "…" : equipment.name}
          </text>
          <text x={tooltipX + 8} y={tooltipY + 40} fill={color} fontSize={9}>
            {equipment.status.replace(/_/g, " ")}
          </text>
        </>
      )}
    </g>
  );
}
```

- [ ] **Step 8.2 — Update PlantVisualMap** to pass click event

In `app/src/components/plant-map/visual/PlantVisualMap.tsx`, change the `onAreaClick` prop signature and the `EquipmentOverlay` call:

```typescript
// Change interface:
interface PlantVisualMapProps {
  // ... existing props ...
  onAreaClick: (id: string, event?: React.MouseEvent) => void;  // ← add event
  // ... rest unchanged ...
}

// Change EquipmentOverlay call inside the SVG map block (line ~161):
<EquipmentOverlay
  overlay={overlay}
  equipment={eq}
  selected={selectedAreaId === overlay.id}
  onHover={handleHover}
  onClick={onAreaClick}   // ← onAreaClick now has matching (id, event) signature
/>
```

- [ ] **Step 8.3 — Create FloatingEquipmentPanel**

```typescript
// app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx
"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, ExternalLink, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEquipmentById,
  getTemplatesForEquipment,
} from "@/lib/inspection-mock-data";
import { equipmentStatusColor } from "@/components/plant-map/visual/EquipmentOverlay";

interface FloatingEquipmentPanelProps {
  equipmentId: string;
  anchorX: number;      // clientX of the click
  anchorY: number;      // clientY of the click
  projectId: string;
  returnTo: string;     // URL to go back to from the inspection form
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pendiente:          "Pendiente",
  en_ejecucion:       "En ejecución",
  aprobado:           "Aprobado",
  rechazado:          "Rechazado",
  bloqueado:          "Bloqueado",
  listo_energizacion: "Listo para energizar",
  listo_arranque:     "Listo para arranque",
  operativo:          "Operativo",
};

export function FloatingEquipmentPanel({
  equipmentId, anchorX, anchorY, projectId, returnTo, onClose,
}: FloatingEquipmentPanelProps) {
  const router     = useRouter();
  const panelRef   = useRef<HTMLDivElement>(null);
  const equipment  = getEquipmentById(equipmentId);
  const templates  = getTemplatesForEquipment(equipmentId);

  // Position: prefer right of click, fallback left if near right edge
  const panelWidth = 256;
  const viewW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const left  = anchorX + 12 + panelWidth > viewW ? anchorX - panelWidth - 12 : anchorX + 12;
  const top   = Math.min(anchorY, (typeof window !== "undefined" ? window.innerHeight : 800) - 420);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function escHandler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  if (!equipment) return null;

  const color = equipmentStatusColor(equipment.status);

  function handleStartInspection(templateId: string) {
    // Save context for InspectionMiniMap
    try {
      const ctxKey = "plantmap_inspection_context";
      const existing = sessionStorage.getItem(ctxKey);
      if (!existing) {
        // No map context yet — store placeholder (will be populated in Task 9)
        sessionStorage.setItem(ctxKey, JSON.stringify({ imageUrl: "", overlayX: 0.5, overlayY: 0.5 }));
      }
    } catch { /* ignore */ }
    onClose();
    router.push(
      `/equipment/${equipmentId}/inspection/${templateId}?returnTo=${encodeURIComponent(returnTo)}`
    );
  }

  const panel = (
    <div
      ref={panelRef}
      style={{ position: "fixed", left, top, width: panelWidth, zIndex: 9999 }}
      className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 pb-2" style={{ borderBottom: `1px solid ${color}40` }}>
        <div>
          <p className="text-sm font-bold font-mono" style={{ color }}>{equipment.tag}</p>
          <p className="text-xs text-slate-300 leading-tight">{equipment.name}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-slate-400">
              {STATUS_LABELS[equipment.status] ?? equipment.status}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors p-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quick info */}
      <div className="px-3 py-2 border-b border-slate-700 space-y-1">
        {equipment.service && (
          <div className="flex justify-between gap-2">
            <span className="text-[10px] text-slate-500">Servicio</span>
            <span className="text-[10px] text-slate-300 text-right truncate">{equipment.service}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-[10px] text-slate-500">Criticidad</span>
          <span className={cn(
            "text-[10px] font-medium capitalize",
            equipment.criticality === "alta" ? "text-red-400" : "text-slate-300"
          )}>
            {equipment.criticality}
          </span>
        </div>
        {equipment.ccm_panel && (
          <div className="flex justify-between gap-2">
            <span className="text-[10px] text-slate-500">CCM / Panel</span>
            <span className="text-[10px] text-slate-300">{equipment.ccm_panel}</span>
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="px-3 py-2">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">
          Plantillas ({templates.length})
        </p>
        {templates.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">Sin plantillas asignadas</p>
        ) : (
          <div className="space-y-1.5">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleStartInspection(tpl.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-slate-900 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-700 rounded-lg text-left transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-200 group-hover:text-blue-300 truncate">
                    {tpl.code}
                  </p>
                  <p className="text-[9px] text-slate-500 truncate">{tpl.name}</p>
                </div>
                <Play size={11} className="text-slate-600 group-hover:text-blue-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3">
        <button
          onClick={() => { onClose(); router.push(`/projects/${projectId}/equipment`); }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-[10px] rounded-lg border border-slate-600 transition-colors"
        >
          <ExternalLink size={11} /> Ver en Equipos
        </button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(panel, document.body) : null;
}
```

- [ ] **Step 8.4 — Wire FloatingEquipmentPanel into plant-map/page.tsx**

Add `floatingPanel` state and update `handleEquipmentOverlayClick`. The changes are scoped to `page.tsx`:

```typescript
// Add to imports:
import { FloatingEquipmentPanel } from "@/components/plant-map/panel/FloatingEquipmentPanel";

// Add state after existing state declarations:
const [floatingPanel, setFloatingPanel] = useState<{
  equipmentId: string; x: number; y: number;
} | null>(null);

// Replace handleEquipmentOverlayClick:
const handleEquipmentOverlayClick = (equipmentId: string, event?: React.MouseEvent) => {
  setFloatingPanel({
    equipmentId,
    x: event?.clientX ?? 400,
    y: event?.clientY ?? 300,
  });
};

// Also reset floating panel on drill change — add to the existing useEffect:
// setFloatingPanel(null);  ← add this line inside the useEffect that watches drill.level

// Add FloatingEquipmentPanel just before the closing </div> of the page render:
{floatingPanel && (
  <FloatingEquipmentPanel
    equipmentId={floatingPanel.equipmentId}
    anchorX={floatingPanel.x}
    anchorY={floatingPanel.y}
    projectId={projectId}
    returnTo={`/projects/${projectId}/plant-map`}
    onClose={() => setFloatingPanel(null)}
  />
)}
```

Full updated `handleEquipmentOverlayClick` in context (replace the existing function at line 92):

```typescript
const handleEquipmentOverlayClick = (equipmentId: string, event?: React.MouseEvent) => {
  setFloatingPanel({ equipmentId, x: event?.clientX ?? 400, y: event?.clientY ?? 300 });
};
```

Updated `useEffect` for drill change (add `setFloatingPanel(null)` to the existing effect):

```typescript
useEffect(() => {
  setActiveTab('unifilar');
  setPanelState({ open: false });
  setEditMode(false);
  setPendingOverlays(null);
  setFloatingPanel(null);     // ← add this line
}, [drill.level]);
```

- [ ] **Step 8.5 — Verify TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -30
```

Expected: no errors. If there are errors about `onAreaClick` signature in `PlantVisualMap`, ensure the prop is updated to `(id: string, event?: React.MouseEvent) => void`.

- [ ] **Step 8.6 — Test in browser**

```bash
cd app && npm run dev 2>&1 &
```

Navigate to any project plant-map with equipment overlays. Click an equipment → FloatingEquipmentPanel should appear near the click. Click "Iniciar Inspección" → should navigate to `/equipment/[id]/inspection/[templateId]`.

- [ ] **Step 8.7 — Commit**

```bash
git add app/src/components/plant-map/visual/EquipmentOverlay.tsx
git add app/src/components/plant-map/visual/PlantVisualMap.tsx
git add app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx
git add "app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx"
git commit -m "feat(plant-map): FloatingEquipmentPanel con lista de plantillas y navegación a inspección"
```

---

## Task 9: AreaProgressDashboard

**Files:**
- Create: `app/src/components/plant-map/AreaProgressDashboard.tsx`
- Modify: `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx` (wire dashboard)

- [ ] **Step 9.1 — Create AreaProgressDashboard**

```typescript
// app/src/components/plant-map/AreaProgressDashboard.tsx
"use client";
import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area, Equipment, EquipmentStatus } from "@/types";

interface AreaProgressDashboardProps {
  areas: Area[];
  equipment: Equipment[];
  subToSystem: Map<string, string>;
  sysToArea:   Map<string, string>;
}

const STATUS_COLORS: Partial<Record<EquipmentStatus, string>> = {
  pendiente:          "bg-blue-500",
  en_ejecucion:       "bg-yellow-500",
  aprobado:           "bg-green-500",
  rechazado:          "bg-red-500",
  bloqueado:          "bg-slate-500",
  listo_energizacion: "bg-cyan-500",
};

export function AreaProgressDashboard({
  areas, equipment, subToSystem, sysToArea,
}: AreaProgressDashboardProps) {
  const [open, setOpen] = useState(true);

  const areaStats = useMemo(() => {
    const map: Record<string, { total: number; byStatus: Record<string, number> }> = {};
    for (const eq of equipment) {
      const systemId = subToSystem.get(eq.subsystem_id);
      const areaId   = systemId ? sysToArea.get(systemId) : undefined;
      if (!areaId) continue;
      if (!map[areaId]) map[areaId] = { total: 0, byStatus: {} };
      map[areaId].total++;
      map[areaId].byStatus[eq.status] = (map[areaId].byStatus[eq.status] ?? 0) + 1;
    }
    return map;
  }, [equipment, subToSystem, sysToArea]);

  const totalEq    = equipment.length;
  const totalDone  = equipment.filter(e => e.status === "aprobado" || e.status === "rechazado").length;
  const globalPct  = totalEq > 0 ? Math.round((totalDone / totalEq) * 100) : 0;

  const areasWithStats = areas
    .filter(a => areaStats[a.id])
    .map(a => ({ area: a, stats: areaStats[a.id] }));

  if (areasWithStats.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 w-64">
      {/* Collapsed chip */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <span className="font-semibold text-blue-400">{globalPct}%</span>
          <span className="text-slate-500">completado</span>
          <ChevronUp size={12} className="ml-auto" />
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Avance por Área
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400">{globalPct}%</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-white transition-colors"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {areasWithStats.map(({ area, stats }) => {
              const pct = stats.total > 0
                ? Math.round(((stats.byStatus["aprobado"] ?? 0) + (stats.byStatus["rechazado"] ?? 0)) / stats.total * 100)
                : 0;

              return (
                <div key={area.id} className="px-3 py-2.5 border-b border-slate-800/60 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-slate-300 truncate font-medium">{area.name}</p>
                    <p className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                      {stats.byStatus["aprobado"] ?? 0}/{stats.total}
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* Status breakdown */}
                  <div className="flex gap-2 flex-wrap">
                    {(["pendiente","en_ejecucion","aprobado","rechazado"] as const).map(s => {
                      const count = stats.byStatus[s] ?? 0;
                      if (!count) return null;
                      return (
                        <span key={s} className="flex items-center gap-0.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[s])} />
                          <span className="text-[9px] text-slate-500">{count}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9.2 — Wire AreaProgressDashboard into plant-map/page.tsx**

Add to the visual level render block (inside `drill.level === 'visual'`), after the `PlantVisualMap` component:

```typescript
// Add import:
import { AreaProgressDashboard } from "@/components/plant-map/AreaProgressDashboard";

// Add inside the drill.level === 'visual' block, after PlantVisualMap:
<AreaProgressDashboard
  areas={areas}
  equipment={equipment}
  subToSystem={subToSystem}
  sysToArea={sysToArea}
/>
```

The `subToSystem` and `sysToArea` maps are already computed in `page.tsx` — pass them as props.

- [ ] **Step 9.3 — Verify TypeScript**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: no errors.

- [ ] **Step 9.4 — Commit**

```bash
git add app/src/components/plant-map/AreaProgressDashboard.tsx
git add "app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx"
git commit -m "feat(plant-map): AreaProgressDashboard colapsable en esquina inferior izquierda"
```

---

## Task 10: Save map context + end-to-end browser validation

**Files:**
- Modify: `app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx` (save image context)
- Modify: `app/src/components/plant-map/visual/PlantVisualMap.tsx` (expose image URL to parent)
- Modify: `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx` (pass imageUrl to FloatingEquipmentPanel)

- [ ] **Step 10.1 — Pass imageUrl to FloatingEquipmentPanel**

Update `FloatingEquipmentPanel` props to accept `imageUrl?: string`:

```typescript
// Add to FloatingEquipmentPanelProps:
imageUrl?: string;
```

Update `handleStartInspection` to save the context:

```typescript
function handleStartInspection(templateId: string) {
  try {
    sessionStorage.setItem("plantmap_inspection_context", JSON.stringify({
      imageUrl: imageUrl ?? "",
      overlayX: 0.5,
      overlayY: 0.5,
    }));
  } catch { /* ignore */ }
  onClose();
  router.push(
    `/equipment/${equipmentId}/inspection/${templateId}?returnTo=${encodeURIComponent(returnTo)}`
  );
}
```

In `plant-map/page.tsx`, pass `imageUrl={layout.imageUrl ?? undefined}` to `FloatingEquipmentPanel`.

- [ ] **Step 10.2 — Full end-to-end browser test**

With dev server running (`cd app && npm run dev`), verify all 6 spec criteria:

```
1. Plant-map → click equipment overlay → FloatingEquipmentPanel appears (≤ 3 clicks)
2. Click "Iniciar Inspección" → navigates to /equipment/[id]/inspection/[tpl]
3. Form loads: sidebar shows sections, first section = Datos Generales (universal)
4. Fill some fields → sectionStatus updates (sidebar icon changes)
5. Click camera button → file picker opens → select photo → thumbnail appears
6. Navigate to next sections, complete all → "Revisar y Cerrar" button appears
7. Click button → navigates to /summary → shows filled answers and any failures
8. Click CTA → returns to plant-map
9. Status badge color on overlays is correct per EquipmentStatus
10. AreaProgressDashboard chip visible at bottom-left
```

- [ ] **Step 10.3 — Final TypeScript build check**

```bash
cd app && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 10.4 — Final commit**

```bash
git add -A
git commit -m "feat(inspection): Digital Twin MVP completo — plant-map + formulario + evidencias + dashboard"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Plant Map como centro de navegación | Task 8 (FloatingEquipmentPanel) |
| Equipos interactivos con badge de estado | Task 8.1 (EquipmentOverlay badge) |
| Panel flotante de información | Task 8.3 (FloatingEquipmentPanel) |
| Ruta dedicada /equipment/[id]/inspection/[template] | Task 2 |
| Formulario pantalla completa | Task 2.3 (layout full-screen) |
| Soporte evidencias fotográficas | Task 5 (EvidenceCapture) |
| N:M Equipment ↔ Template | Task 1 (MOCK_EQUIPMENT_TEMPLATES) |
| Secciones reutilizables universales | Task 1 (is_universal, injected auto) |
| Dashboard de avance por área | Task 9 (AreaProgressDashboard) |
| InspectionSummary + CTA certificado | Task 6 |
| Mini-mapa contextual | Task 7 (InspectionMiniMap) |

**No placeholders found.**

**Type consistency check:**
- `InspectionState`, `EvidenceItem`, `SectionStatus` defined in Task 1 → used in Tasks 2, 3, 4, 5, 6, 7 ✓
- `MockInspectionTemplate.sections[].fields[].type: FieldType` uses Spanish values from `index.ts` ✓
- `EquipmentOverlay.onClick: (id, event)` updated in Task 8.1 matches `PlantVisualMap.onAreaClick` in Task 8.2 ✓
- `FloatingEquipmentPanel.imageUrl` added in Task 10.1 matches call in `page.tsx` ✓
- `STORAGE_KEY` function defined in Task 2 and reused identically in Task 6 ✓
