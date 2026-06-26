// Lógica pura para persistencia por sección y corrección interina. Sin React.
import { FAIL_VALUES } from "@/lib/inspection/failValues";

/** Tipos de campo que NUNCA se editan en corrección. */
const NON_EDITABLE_TYPES = new Set(["firma"]);
/** Sufijos/claves de campo excluidas (fechas e inspector). */
const NON_EDITABLE_KEY_RE = /(^|_)(fecha|inspector|firma)(_|$)/i;

export function recomputeResultSummary(
  answers: Record<string, unknown>,
): "cumple" | "no_cumple" {
  const hasFail = Object.values(answers).some((v) => FAIL_VALUES.has(String(v)));
  return hasFail ? "no_cumple" : "cumple";
}

export function isEditableField(field: { key: string; type: string }): boolean {
  if (NON_EDITABLE_TYPES.has(field.type)) return false;
  if (NON_EDITABLE_KEY_RE.test(field.key)) return false;
  return true;
}

export function buildSectionPatch(
  testId: string,
  data: Record<string, unknown>,
  now: string,
): { id: string; data: Record<string, unknown>; updated_at: string } {
  return { id: testId, data, updated_at: now };
}
