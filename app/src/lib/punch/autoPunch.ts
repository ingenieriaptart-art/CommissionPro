import { v5 as uuidv5 } from "uuid";
import { isFailValue } from "@/lib/inspection/failValues";
import type { MockInspectionTemplate } from "@/types/inspection";
import type { PunchPriority } from "@/types";

/** Namespace fijo para ids determinísticos de auto-punch (uuidv5). */
export const PUNCH_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

export interface AutoPunchCtx {
  projectId: string; equipmentId: string; testId: string; userId: string; now: string;
}
export interface AutoPunchRow {
  id: string; project_id: string; equipment_id: string; test_id: string;
  source_test_id: string; source_item_key: string; generation_source: "auto_inspection";
  title: string; description: string; priority: PunchPriority; status: "abierto";
  responsible_id: null; created_by: string; raised_at: string; first_raised_at: string;
  sync_status: "pending"; version: 1;
}

/** Deriva 1 punch por cada ítem cuya respuesta ∈ FAIL_VALUES. Puro/determinístico. */
export function deriveAutoPunches(
  answers: Record<string, unknown>,
  template: MockInspectionTemplate,
  ctx: AutoPunchCtx,
): AutoPunchRow[] {
  const index = new Map<string, { label: string; section: string; priority?: PunchPriority }>();
  for (const s of template.sections) {
    for (const f of s.fields) {
      index.set(f.key, {
        label: f.label, section: s.name,
        priority: (f as { punch_priority?: PunchPriority }).punch_priority,
      });
    }
  }

  const rows: AutoPunchRow[] = [];
  for (const [key, value] of Object.entries(answers)) {
    if (!isFailValue(value)) continue;
    const meta = index.get(key);
    rows.push({
      id: uuidv5(`${ctx.testId}:${key}`, PUNCH_NAMESPACE),
      project_id: ctx.projectId, equipment_id: ctx.equipmentId, test_id: ctx.testId,
      source_test_id: ctx.testId, source_item_key: key, generation_source: "auto_inspection",
      title: meta?.label ?? key,
      description: `${meta?.section ?? "—"}: ${String(value)}`,
      priority: meta?.priority ?? "media", status: "abierto",
      responsible_id: null, created_by: ctx.userId,
      raised_at: ctx.now, first_raised_at: ctx.now, sync_status: "pending", version: 1,
    });
  }
  return rows;
}
