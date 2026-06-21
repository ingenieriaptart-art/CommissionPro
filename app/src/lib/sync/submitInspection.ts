import type { localDB as LocalDB } from "@/lib/db/local";
import type { InspectionState, MockInspectionTemplate } from "@/types/inspection";

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
  /** FSM: estado destino de INSPECTION_EXECUTED desde el estado actual (o null). */
  nextState: (state: string, event: "INSPECTION_EXECUTED") => string | null;
  /** Encola la transición de estado en el outbox (se aplica vía RPC en el push). */
  enqueueTransition: (equipmentId: string, event: string, fromStatus: string, context?: unknown, occurredAt?: string) => Promise<void>;
}

const FAIL_VALUES = new Set(["FALLA", "NO", "RECHAZADO", "No cumple", "No conforme"]);

/** Escribe la inspección a IndexedDB + outbox (local-first). Optimista. */
export async function submitInspectionOffline(
  params: SubmitParams,
  deps: SubmitDeps,
): Promise<{ testId: string }> {
  const { state, projectId, userId, template } = params;
  const { db } = deps;
  const testId = deps.uuid();
  const ts = deps.now();

  const prevRevision = await deps.getMaxRevision(state.equipmentId, template.id);
  const revision = prevRevision + 1;

  const hasFailures = Object.values(state.answers).some((v) => FAIL_VALUES.has(String(v)));
  const template_hash = await deps.computeTemplateHash(template);
  const definition = {
    id: template.id, code: template.code, name: template.name,
    discipline: template.discipline, sections: template.sections,
  };

  const test = {
    id: testId,
    project_id: projectId,
    equipment_id: state.equipmentId,
    type: "precomisionamiento",
    code: `PRE-${template.code}-${ts.slice(0, 10)}`,
    status: "ejecutado",
    executed_by: userId,
    executed_at: ts,
    data: state.answers,
    result_summary: hasFailures ? "no_cumple" : "cumple",
    created_by: userId,
    created_at: ts,
    updated_at: ts,
    version: 1,
    revision,
    sync_status: "pending" as const,
    last_sync_error: undefined,
    template_id: template.id,
    template_revision: template.revision,
    template_hash,
    template_snapshot: {
      template: definition,
      meta: {
        template_source: template._source ?? "online",
        app_version: deps.appVersion,
        schema_version: deps.schemaVersion,
        captured_at: ts,
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.tests.add(test as any);
  await deps.enqueueSync("tests", testId, "INSERT", test);

  // Evidencias: blob local + fila evidences (sin storage_url) + outbox
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

  // Estado del equipo vía FSM (emite INSPECTION_EXECUTED; el servidor re-valida)
  const eq = await db.equipment.get(state.equipmentId);
  const fromStatus = (eq?.status as string) ?? "pendiente";
  const target = deps.nextState(fromStatus, "INSPECTION_EXECUTED");
  if (target && target !== fromStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.equipment.update(state.equipmentId, { status: target, updated_at: ts } as any);
    await deps.enqueueTransition(state.equipmentId, "INSPECTION_EXECUTED", fromStatus, { test_id: testId }, ts);
  }

  await deps.deleteInspectionDraft(state.equipmentId, template.id);

  if (deps.isOnline()) void deps.runSync();

  return { testId };
}
