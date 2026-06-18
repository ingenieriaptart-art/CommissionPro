import type { AuditRow } from "@/types";

/** entity (nombre de tabla) → etiqueta amigable de módulo. */
export const ENTITY_LABEL: Record<string, string> = {
  companies:       "Empresas",
  users:           "Usuarios",
  projects:        "Proyectos",
  areas:           "Áreas",
  systems:         "Sistemas",
  subsystems:      "Subsistemas",
  equipment:       "Equipos",
  form_templates:  "Plantillas",
  form_versions:   "Versiones de plantilla",
  tests:           "Pruebas",
  checklist_items: "Ítems de checklist",
  evidences:       "Evidencias",
  signatures:      "Firmas",
  approvals:       "Aprobaciones",
  punch_items:     "Punch List",
  documents:       "Documentos",
};

export function entityLabel(entity: string): string {
  return ENTITY_LABEL[entity] ?? entity;
}

export const ACTION_LABEL: Record<string, string> = {
  INSERT: "Creó",
  UPDATE: "Editó",
  DELETE: "Eliminó",
};

export type ActionKind = "create" | "edit" | "delete";

export function actionKind(action: string): ActionKind {
  if (action === "INSERT") return "create";
  if (action === "DELETE") return "delete";
  return "edit";
}

/** Campos técnicos / ruidosos que no aportan al diff legible. */
const NOISE_FIELDS = new Set([
  "updated_at", "created_at", "deleted_at",
  "search_vector", "tsv", "fts",
  "password", "must_change_password",
]);

function isNoise(field: string): boolean {
  return NOISE_FIELDS.has(field) || field.endsWith("_vector");
}

const IDENTIFIER_KEYS = ["tag", "name", "code", "title", "full_name", "email"];

/** Identificador legible de la fila (qué objeto se tocó). */
export function extractIdentifier(row: Pick<AuditRow, "after" | "before" | "entity_id">): string {
  const src = row.after ?? row.before ?? {};
  for (const k of IDENTIFIER_KEYS) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return row.entity_id ? `#${String(row.entity_id).slice(0, 8)}` : "—";
}

/** Serializa un valor de celda para mostrarlo compacto. */
export function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "∅";
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 77) + "…" : s;
  }
  const s = String(v);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

export interface DiffField { field: string; from: unknown; to: unknown }

/**
 * Devuelve los campos relevantes:
 *  - UPDATE: solo los que cambiaron entre before y after.
 *  - INSERT: campos de after (from = ∅).
 *  - DELETE: campos de before (to = ∅).
 * Excluye campos de ruido. Estable por orden de claves.
 */
export function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): DiffField[] {
  const keys = new Set<string>([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out: DiffField[] = [];
  for (const field of keys) {
    if (isNoise(field)) continue;
    const from = before ? before[field] : undefined;
    const to = after ? after[field] : undefined;
    const changed = JSON.stringify(from ?? null) !== JSON.stringify(to ?? null);
    if (!changed) continue;
    out.push({ field, from, to });
  }
  return out;
}
