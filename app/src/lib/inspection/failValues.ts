/** Única fuente de verdad de detección de falla (cliente). No duplicar en SQL. */
export const FAIL_VALUES = new Set(["FALLA", "NO", "RECHAZADO", "No cumple", "No conforme"]);

export function isFailValue(v: unknown): boolean {
  return FAIL_VALUES.has(String(v));
}
