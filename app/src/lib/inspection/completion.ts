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

/**
 * Reconcilia el sectionStatus de un borrador guardado contra las secciones
 * reales de la plantilla actual: conserva el estado de las que existen, descarta
 * claves obsoletas y agrega las faltantes con su estado por defecto.
 */
export function reconcileSectionStatus(
  saved: Record<string, SectionStatus>,
  sections: MockInspectionSection[],
): Record<string, SectionStatus> {
  const out: Record<string, SectionStatus> = {};
  for (const s of sections) out[s.code] = saved[s.code] ?? defaultSectionStatus(s);
  return out;
}
