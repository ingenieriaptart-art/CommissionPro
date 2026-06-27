import type { localDB as LocalDB } from "@/lib/db/local";
import type { InspectionState, MockInspectionTemplate } from "@/types/inspection";
import { deriveAutoPunches } from "@/lib/punch/autoPunch";
import { recomputeResultSummary } from "@/lib/inspection/correction";

export interface SubmitParams {
  state: InspectionState;
  projectId: string;
  userId: string;
  template: MockInspectionTemplate;
}

export interface SubmitDeps {
  db: typeof LocalDB;
  enqueueSync: (entity: string, entityId: string, op: "INSERT" | "UPDATE" | "DELETE", payload: unknown) => Promise<void>;
  saveBlobLocally: (evidenceId: string, blob: Blob) => Promise<number>;
  deleteInspectionDraft: (equipmentId: string, templateId: string) => Promise<void>;
  computeTemplateHash: (t: MockInspectionTemplate) => Promise<string>;
  fetchBlob: (url: string) => Promise<Blob>;
  runSync: () => Promise<unknown>;
  uuid: () => string;
  now: () => string;
  /** Max revisión previa de un (equipment_id, template_id) en el store local (0 si no hay). */
  getMaxRevision: (equipmentId: string, templateId: string) => Promise<number>;
  isOnline: () => boolean;
  appVersion: string;
  schemaVersion: number;
  /** FSM: estado destino de un evento desde el estado actual (o null). */
  nextState: (state: string, event: string) => string | null;
  /** Encola la transición de estado en el outbox (se aplica vía RPC en el push). */
  enqueueTransition: (equipmentId: string, event: string, fromStatus: string, context?: unknown, occurredAt?: string) => Promise<void>;
}

export interface TestRow {
  id: string; project_id: string; equipment_id: string; type: string;
  code: string; status: "borrador" | "ejecutado"; executed_by?: string; executed_at?: string;
  data: Record<string, unknown>; result_summary?: "cumple" | "no_cumple";
  created_by: string; created_at: string; updated_at: string; version: number; revision: number;
  sync_status: "pending"; last_sync_error?: string;
  template_id: string; template_revision?: string; template_hash: string; template_snapshot: unknown;
}

export async function buildDraftTestRow(
  params: SubmitParams,
  deps: Pick<SubmitDeps, "uuid" | "now" | "computeTemplateHash" | "appVersion" | "schemaVersion" | "getMaxRevision">,
): Promise<TestRow> {
  const { state, projectId, userId, template } = params;
  const testId = deps.uuid();
  const ts = deps.now();
  const revision = (await deps.getMaxRevision(state.equipmentId, template.id)) + 1;
  const template_hash = await deps.computeTemplateHash(template);
  const definition = { id: template.id, code: template.code, name: template.name, discipline: template.discipline, sections: template.sections };
  return {
    id: testId, project_id: projectId, equipment_id: state.equipmentId, type: "precomisionamiento",
    code: `PRE-${template.code}-${ts.slice(0, 10)}`, status: "borrador",
    data: state.answers ?? {}, created_by: userId, created_at: ts, updated_at: ts,
    version: 1, revision, sync_status: "pending", template_id: template.id,
    template_revision: template.revision, template_hash,
    template_snapshot: { template: definition, meta: { template_source: template._source ?? "online", app_version: deps.appVersion, schema_version: deps.schemaVersion, captured_at: ts } },
  };
}

export async function startDraftOffline(params: SubmitParams, deps: SubmitDeps): Promise<{ testId: string }> {
  const row = await buildDraftTestRow(params, deps);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await deps.db.tests.add(row as any);
  await deps.enqueueSync("tests", row.id, "INSERT", row);
  if (deps.isOnline()) void deps.runSync();
  return { testId: row.id };
}

export async function saveSectionOffline(
  testId: string,
  data: Record<string, unknown>,
  deps: Pick<SubmitDeps, "db" | "enqueueSync" | "now" | "isOnline" | "runSync">,
): Promise<void> {
  const ts = deps.now();
  const patch = { data, updated_at: ts, sync_status: "pending" as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await deps.db.tests.update(testId, patch as any);
  await deps.enqueueSync("tests", testId, "UPDATE", { id: testId, data, updated_at: ts });
  if (deps.isOnline()) void deps.runSync();
}

/** Cierra una inspección: UPDATE a ejecutado + evidencias + auto-punch + FSM. */
export async function closeInspectionOffline(params: SubmitParams, deps: SubmitDeps): Promise<{ testId: string }> {
  const { state, projectId, userId, template } = params;
  const { db } = deps;
  const ts = deps.now();

  // Asegurar fila (borrador) — soporta cerrar sin haber llamado startDraft antes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let existing = (await (db.tests as any)
    .filter((r: any) => r.equipment_id === state.equipmentId && r.template_id === template.id && r.status === "borrador")
    .first()) ?? null;
  if (!existing) {
    const row = await buildDraftTestRow(params, deps);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.tests.add(row as any);
    await deps.enqueueSync("tests", row.id, "INSERT", row);
    existing = row;
  }
  const testId = existing.id;

  const result_summary = recomputeResultSummary(state.answers);
  const closePatch = { status: "ejecutado" as const, data: state.answers, result_summary, executed_by: userId, executed_at: ts, updated_at: ts, sync_status: "pending" as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.tests.update(testId, closePatch as any);
  await deps.enqueueSync("tests", testId, "UPDATE", { id: testId, ...closePatch });

  // ── Evidencias: blob local + fila evidences (sin storage_url) + outbox ──
  for (const [, items] of Object.entries(state.evidences)) {
    for (const item of items) {
      const evidenceId = deps.uuid();
      try {
        const blob = await deps.fetchBlob(item.url);
        await deps.saveBlobLocally(evidenceId, blob);
      } catch { continue; }
      const row = {
        id: evidenceId, project_id: projectId, test_id: testId, equipment_id: state.equipmentId,
        type: "foto", stage: item.stage, storage_url: undefined,
        captured_by: userId, captured_at: item.timestamp, sync_status: "pending" as const,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.evidences.add(row as any);
      await deps.enqueueSync("evidences", evidenceId, "INSERT", row);
    }
  }

  // ── Punch automático (Fase C): 1 por ítem fallido; idempotente por (source_test_id, source_item_key) en servidor ──
  const autoPunches = deriveAutoPunches(state.answers, template, {
    projectId, equipmentId: state.equipmentId, testId, userId, now: ts,
  });
  for (const p of autoPunches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.punchItems.add(p as any);
    await deps.enqueueSync("punch_items", p.id, "INSERT", p);
  }

  // ── Estado del equipo vía FSM (emite INSPECTION_EXECUTED; el servidor re-valida) ──
  const eq = await db.equipment.get(state.equipmentId);
  const fromStatus = (eq?.status as string) ?? "pendiente";
  const target = deps.nextState(fromStatus, "INSPECTION_EXECUTED");
  if (target && target !== fromStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.equipment.update(state.equipmentId, { status: target, updated_at: ts } as any);
    await deps.enqueueTransition(state.equipmentId, "INSPECTION_EXECUTED", fromStatus, { test_id: testId }, ts);
  }

  if (autoPunches.length > 0) {
    const afterExec = target ?? fromStatus;                 // estado tras INSPECTION_EXECUTED (o el actual)
    const punchTarget = deps.nextState(afterExec, "PUNCH_RAISED");
    if (punchTarget && punchTarget !== afterExec) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.equipment.update(state.equipmentId, { status: punchTarget, updated_at: ts } as any);
      await deps.enqueueTransition(state.equipmentId, "PUNCH_RAISED", afterExec, { test_id: testId }, ts);
    }
  }

  await deps.deleteInspectionDraft(state.equipmentId, template.id);

  if (deps.isOnline()) void deps.runSync();

  return { testId };
}

// Compat: mantener el nombre anterior como alias.
export const submitInspectionOffline = closeInspectionOffline;

/**
 * Corrección interina (admin/director): sobrescribe data + result_summary del test
 * ya ejecutado sin alterar executed_by / executed_at / status ni disparar auto-punch
 * ni transición de FSM.  Solo toca data + result_summary + updated_at.
 */
export async function correctInspectionOffline(
  testId: string,
  answers: Record<string, unknown>,
  deps: Pick<SubmitDeps, "db" | "enqueueSync" | "now" | "isOnline" | "runSync">,
): Promise<void> {
  const ts = deps.now();
  const result_summary = recomputeResultSummary(answers);
  const patch = { data: answers, result_summary, updated_at: ts, sync_status: "pending" as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await deps.db.tests.update(testId, patch as any);
  await deps.enqueueSync("tests", testId, "UPDATE", { id: testId, data: answers, result_summary, updated_at: ts });
  if (deps.isOnline()) void deps.runSync();
}
