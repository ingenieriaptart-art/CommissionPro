export interface ApprovalConfigLevel {
  level: number;
  mandatory: boolean;
}
export interface ChainTest {
  testId: string;
  templateId: string;
  revision: number;
  status: string;
}
export interface ChainApproval {
  testId: string;
  level: number;
  status: string;
}

const NON_VIGENTE = new Set(["borrador", "rechazado"]);

/** Inspección vigente por template = la de mayor revision (no borrador, no rechazada). */
export function vigentesByTemplate(tests: ChainTest[]): ChainTest[] {
  const best = new Map<string, ChainTest>();
  for (const t of tests) {
    if (NON_VIGENTE.has(t.status)) continue;
    const cur = best.get(t.templateId);
    if (!cur || t.revision > cur.revision) best.set(t.templateId, t);
  }
  return [...best.values()];
}

/**
 * La cadena del equipo está completa cuando existe ≥1 inspección vigente y
 * cada inspección vigente tiene todos sus niveles `mandatory` aprobados.
 */
export function isApprovalChainComplete(
  tests: ChainTest[],
  config: ApprovalConfigLevel[],
  approvals: ChainApproval[],
): boolean {
  const vigentes = vigentesByTemplate(tests);
  if (vigentes.length === 0) return false;

  const mandatory = config.filter((c) => c.mandatory).map((c) => c.level);
  if (mandatory.length === 0) return false;

  const approved = new Set(
    approvals.filter((a) => a.status === "aprobado").map((a) => `${a.testId}#${a.level}`),
  );

  return vigentes.every((v) => mandatory.every((lvl) => approved.has(`${v.testId}#${lvl}`)));
}
