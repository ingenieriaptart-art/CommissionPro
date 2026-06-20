import type { MockInspectionSection, SectionStatus } from "@/types/inspection";

/**
 * Lógica de completitud de una inspección, alineada con cómo el sidebar mide el
 * progreso (`SectionSidebar`): solo cuentan secciones y campos ACTIVOS, y solo
 * los campos REQUERIDOS son obligatorios.
 *
 * Esto resuelve el desfase "barra 100% pero no aparece 'Revisar y Cerrar'":
 * una sección sin campos requeridos activos (solo opcionales) o una sección
 * desactivada NO debe bloquear el cierre de la inspección.
 */

/** Campos requeridos y activos de una sección (los únicos obligatorios). */
export function activeRequiredFields(section: MockInspectionSection) {
  return section.fields.filter((f) => f.is_active !== false && f.required);
}

/**
 * ¿La sección exige que el inspector complete algo? Solo si está activa y tiene
 * al menos un campo requerido activo. Las secciones desactivadas o sin
 * requeridos activos NO exigen input (cuentan como completas por defecto).
 */
export function sectionRequiresInput(section: MockInspectionSection): boolean {
  if (section.is_active === false) return false;
  return activeRequiredFields(section).length > 0;
}

/**
 * Estado inicial de una sección. Una sección que no exige input arranca como
 * "complete" (no hay nada obligatorio que responder); el resto, "pending".
 */
export function defaultSectionStatus(section: MockInspectionSection): SectionStatus {
  return sectionRequiresInput(section) ? "pending" : "complete";
}

/**
 * ¿La inspección está completa? Toda sección que exige input debe estar en
 * "complete" o "failed". Secciones desactivadas o sin requeridos activos se
 * consideran resueltas sin importar su estado guardado.
 */
export function isInspectionComplete(
  sections: MockInspectionSection[],
  sectionStatus: Record<string, SectionStatus>,
): boolean {
  return sections.every((s) => {
    if (!sectionRequiresInput(s)) return true;
    const st = sectionStatus[s.code];
    return st === "complete" || st === "failed";
  });
}

/** Valores que marcan una sección como "failed" (mismo criterio que el formulario). */
const FAIL_VALUES = new Set(["FALLA", "NO", "RECHAZADO"]);

function isFilled(v: unknown): boolean {
  return v !== undefined && v !== null && v !== "";
}

/**
 * Deriva el estado de una sección a partir de las respuestas actuales (misma
 * lógica que `handleAnswerChange` en el formulario). Es la fuente de verdad: el
 * check SIEMPRE refleja lo realmente respondido, evitando estados guardados
 * desincronizados (p. ej. borradores legados → "completado pero sin check").
 */
export function deriveSectionStatus(
  section: MockInspectionSection,
  answers: Record<string, unknown>,
): SectionStatus {
  if (section.is_active === false) return "complete"; // desactivada: no bloquea
  const required = activeRequiredFields(section);
  const allFilled = required.every((f) => isFilled(answers[f.key]));
  const hasFail = section.fields.some((f) => FAIL_VALUES.has(String(answers[f.key])));

  if (!allFilled) {
    // Si la sección no tiene requeridos activos, allFilled es true y no entra acá.
    const anyAnswered = section.fields.some((f) => isFilled(answers[f.key]));
    return anyAnswered ? "in_progress" : "pending";
  }
  return hasFail ? "failed" : "complete";
}

/**
 * Re-deriva el estado de TODAS las secciones desde las respuestas. Se usa al
 * cargar un borrador: descarta el `sectionStatus` guardado (que puede estar
 * desincronizado) y lo recalcula desde `answers`, garantizando que los checks
 * coincidan con lo respondido.
 */
export function deriveSectionStatuses(
  sections: MockInspectionSection[],
  answers: Record<string, unknown>,
): Record<string, SectionStatus> {
  const out: Record<string, SectionStatus> = {};
  for (const s of sections) out[s.code] = deriveSectionStatus(s, answers);
  return out;
}
