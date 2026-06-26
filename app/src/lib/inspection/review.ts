// Lógica pura para la Vista de Revisión de Precomisionamiento (EPIC-003, solo lectura).
// Sin React, sin side-effects: fácilmente testeable.
import type { MockInspectionSection } from "@/types/inspection";
import type { Test, Evidence, PunchItem } from "@/types";

/** Valores que representan una falla en una inspección. */
export const FAIL_VALUES = new Set(["FALLA", "NO", "RECHAZADO"]);

/** Valores que representan conformidad (para colorear en verde). */
export const PASS_VALUES = new Set(["OK", "SI", "SÍ", "APROBADO"]);

export function isFailValue(value: unknown): boolean {
  return FAIL_VALUES.has(String(value));
}
export function isPassValue(value: unknown): boolean {
  return PASS_VALUES.has(String(value));
}

/** Forma del template_snapshot guardado en cada test al ejecutar la inspección. */
export interface TemplateSnapshot {
  template: {
    id: string;
    code: string;
    name: string;
    discipline?: string;
    sections: MockInspectionSection[];
  };
  meta?: {
    template_source?: string;
    app_version?: string;
    schema_version?: number;
    captured_at?: string;
  };
}

/**
 * Extrae las secciones del snapshot de forma defensiva.
 * SIEMPRE desde template_snapshot — nunca reconstruye desde form_templates.
 * Devuelve [] si el snapshot no tiene la forma esperada (inspección antigua/mock).
 */
export function extractSnapshotSections(test: Pick<Test, "template_snapshot">): MockInspectionSection[] {
  const snap = test.template_snapshot as TemplateSnapshot | null | undefined;
  const sections = snap?.template?.sections;
  return Array.isArray(sections) ? sections : [];
}

export function snapshotMeta(test: Pick<Test, "template_snapshot">) {
  const snap = test.template_snapshot as TemplateSnapshot | null | undefined;
  return {
    templateName: snap?.template?.name ?? null,
    templateCode: snap?.template?.code ?? null,
    capturedAt: snap?.meta?.captured_at ?? null,
    source: snap?.meta?.template_source ?? null,
  };
}

export interface ReviewFailure {
  sectionCode: string;
  sectionName: string;
  fieldKey: string;
  fieldLabel: string;
  value: string;
  observation: string;
}

/** Recolecta las fallas (campos con valor NO/FALLA/RECHAZADO) recorriendo el snapshot. */
export function collectFailures(
  sections: MockInspectionSection[],
  data: Record<string, unknown>,
): ReviewFailure[] {
  const failures: ReviewFailure[] = [];
  for (const section of sections) {
    section.fields.forEach((field, idx) => {
      if (isFailValue(data[field.key])) {
        const next = section.fields[idx + 1];
        const observation =
          next?.type === "textarea" ? String(data[next.key] ?? "") : "";
        failures.push({
          sectionCode: section.code,
          sectionName: section.name,
          fieldKey: field.key,
          fieldLabel: field.label,
          value: String(data[field.key]),
          observation,
        });
      }
    });
  }
  return failures;
}

/** Indica si un campo es de firma (no se muestra el valor crudo "signed_..."). */
export function isSignatureField(type: string): boolean {
  return type === "firma";
}

/** Formatea el valor de un campo para mostrar en solo-lectura. */
export function formatFieldValue(value: unknown, unit?: string): string {
  if (value === undefined || value === null || value === "") return "—";
  const base = String(value);
  return unit ? `${base} ${unit}` : base;
}

/** Detalle completo de una inspección para la vista de revisión. */
export interface InspectionDetail {
  test: Test & { revision?: number };
  inspectorName: string | null;
  inspectorEmail: string | null;
  evidences: Evidence[];
  punches: PunchItem[];
}

/** Resumen ligero de una inspección para listados/selector de revisiones. */
export interface InspectionSummaryRow {
  id: string;
  code: string | null;
  revision: number | null;
  result_summary: string | null;
  status: string;
  executed_at: string | null;
  executed_by: string | null;
  template_id: string | null;
}
