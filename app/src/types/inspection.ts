import type { FieldType, EquipmentStatus } from "@/types";

export interface MockInspectionField {
  key: string;
  _db_id?: string;          // UUID from section_fields.id (only set for real Supabase rows)
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  validations?: { unit?: string; min?: number; max?: number };
  hint?: string;
  is_active?: boolean;
}

export interface MockInspectionSection {
  id: string;
  code: string;
  name: string;
  is_universal: boolean;
  fields: MockInspectionField[];
  is_active?: boolean;
}

export interface MockInspectionTemplate {
  id: string;
  code: string;
  name: string;
  discipline: string;
  sections: MockInspectionSection[];
  revision?: string;
  _source?: "online" | "offline";
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
}
