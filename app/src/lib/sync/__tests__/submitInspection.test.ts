import { test, expect, beforeEach, vi } from "vitest";
import { submitInspectionOffline } from "@/lib/sync/submitInspection";
import { localDB } from "@/lib/db/local";
import type { InspectionState, MockInspectionTemplate } from "@/types/inspection";

beforeEach(async () => {
  await Promise.all([
    localDB.tests.clear(), localDB.evidences.clear(), localDB.equipment.clear(),
    localDB.syncQueue.clear(), localDB.blobStore.clear(), localDB.inspectionDrafts.clear(),
    localDB.punchItems.clear(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.equipment.put({ id: "e1", project_id: "p1", tag: "B1", status: "pendiente", metadata: {}, sync_status: "synced" } as any);
});

const template: MockInspectionTemplate = {
  id: "t1", code: "P_X", name: "X", discipline: "mec", revision: "Rev0", _source: "offline",
  sections: [{ id: "s1", code: "S1", name: "Sec", is_universal: false,
    fields: [{ key: "it1", label: "Item", type: "checkbox", required: false }] }],
};

const state: InspectionState = {
  equipmentId: "e1", templateId: "t1", activeSectionIndex: 0,
  answers: { it1: "Cumple" }, evidences: {}, sectionStatus: { s1: "complete" },
  savedAt: null, isDirty: true,
};

function deps(online: boolean, startN = 0) {
  let n = startN;
  return {
    db: localDB,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enqueueSync: async (entity: string, entityId: string, op: string, payload: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await localDB.syncQueue.add({ entity, entityId, operation: op as any, payload, createdAt: "t", attempts: 0 });
    },
    saveBlobLocally: vi.fn(async () => 1),
    deleteInspectionDraft: vi.fn(async () => {}),
    computeTemplateHash: async () => "HASH123",
    fetchBlob: async () => new Blob(["x"], { type: "image/jpeg" }),
    runSync: vi.fn(async () => ({ pushed: 0, pulled: 0, conflicts: 0, errors: [] })),
    uuid: () => `id-${++n}`,
    now: () => "2026-06-19T00:00:00Z",
    isOnline: () => online,
    appVersion: "1.0.0", schemaVersion: 5,
    nextState: (from: string) => (from === "pendiente" ? "en_ejecucion" : null),
    enqueueTransition: async (equipmentId: string, event: string, fromStatus: string, context: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: equipmentId, operation: "INSERT", payload: { equipment_id: equipmentId, event, from_status: fromStatus, context, occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
    },
    getMaxRevision: async (equipmentId: string, templateId: string) => {
      const rows = await localDB.tests
        .filter((r: any) => r.equipment_id === equipmentId && r.template_id === templateId) // eslint-disable-line @typescript-eslint/no-explicit-any
        .toArray();
      return rows.reduce((m: number, r: any) => Math.max(m, r.revision ?? 1), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  };
}

test("guarda test local + outbox con snapshot y sync_status pending", async () => {
  const d = deps(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await submitInspectionOffline({ state, projectId: "p1", userId: "u1", template }, d as any);
  expect(res.testId).toBe("id-1");

  const t = await localDB.tests.get("id-1");
  expect(t?.template_id).toBe("t1");
  expect(t?.template_revision).toBe("Rev0");
  expect(t?.template_hash).toBe("HASH123");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((t as any)?.template_snapshot.meta.template_source).toBe("offline");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((t as any)?.template_snapshot.meta.app_version).toBe("1.0.0");
  expect(t?.sync_status).toBe("pending");
  expect(t?.result_summary).toBe("cumple");

  const q = await localDB.syncQueue.toArray();
  expect(q.find((o) => o.entity === "tests")).toBeTruthy();
  // El estado del equipo viaja como transición FSM (no como UPDATE de equipment)
  expect(q.find((o) => o.entity === "__equipment_transition")).toBeTruthy();
  expect(d.runSync).not.toHaveBeenCalled();
  expect(d.deleteInspectionDraft).toHaveBeenCalled();

  const eq = await localDB.equipment.get("e1");
  expect(eq?.status).toBe("en_ejecucion");
});

test("executed_by/created_by/captured_by usan el userId provisto (public.users.id, no el auth id)", async () => {
  const withEvidence: InspectionState = {
    ...state,
    evidences: {
      it1: [{ fieldKey: "it1", url: "blob:x", caption: "", stage: "general", timestamp: "2026-06-19T00:00:00Z" }],
    },
  };
  const d = deps(false);
  const res = await submitInspectionOffline(
    { state: withEvidence, projectId: "p1", userId: "APP-USER-13e88926", template },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d as any,
  );

  const t = await localDB.tests.get(res.testId);
  expect(t?.executed_by).toBe("APP-USER-13e88926");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((t as any)?.created_by).toBe("APP-USER-13e88926");

  const evs = await localDB.evidences.toArray();
  expect(evs.length).toBe(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((evs[0] as any).captured_by).toBe("APP-USER-13e88926");
});

test("online → dispara runSync; result_summary no_cumple si hay falla", async () => {
  const failState = { ...state, answers: { it1: "No cumple", x: "RECHAZADO" } };
  const d = deps(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await submitInspectionOffline({ state: failState, projectId: "p1", userId: "u1", template }, d as any);
  const t = await localDB.tests.get("id-1");
  expect(t?.result_summary).toBe("no_cumple");
  expect(d.runSync).toHaveBeenCalledOnce();
});

test("genera auto-punch por ítem fallido + outbox; sin falla no genera", async () => {
  const failState = { ...state, answers: { it1: "No cumple" } };
  const d = deps(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await submitInspectionOffline({ state: failState, projectId: "p1", userId: "u1", template }, d as any);

  const punches = await localDB.punchItems.toArray();
  expect(punches.length).toBe(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((punches[0] as any).source_test_id).toBe(res.testId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((punches[0] as any).source_item_key).toBe("it1");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((punches[0] as any).generation_source).toBe("auto_inspection");

  const q = await localDB.syncQueue.toArray();
  expect(q.find((o) => o.entity === "punch_items")).toBeTruthy();
});

test("inspección sin fallas no genera punch", async () => {
  const okState = { ...state, answers: { it1: "Cumple" } };
  const d = deps(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await submitInspectionOffline({ state: okState, projectId: "p1", userId: "u1", template }, d as any);
  expect((await localDB.punchItems.toArray()).length).toBe(0);
});

test("revision = max(prev) + 1 por (equipment, template); 1 si no hay previa", async () => {
  // Inspección previa rechazada del mismo equipo+template, revision 2
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.tests.put({ id: "prev", project_id: "p1", equipment_id: "e1", template_id: "t1",
    revision: 2, status: "rechazado", sync_status: "synced" } as any);

  const d = deps(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await submitInspectionOffline({ state, projectId: "p1", userId: "u1", template }, d as any);
  const t = await localDB.tests.get(res.testId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((t as any)?.revision).toBe(3);

  // Otro template sin previa → revision 1
  const d2 = deps(false, 10);
  const res2 = await submitInspectionOffline(
    { state: { ...state, templateId: "t9" }, projectId: "p1", userId: "u1",
      template: { ...template, id: "t9" } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d2 as any,
  );
  const t2 = await localDB.tests.get(res2.testId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((t2 as any)?.revision).toBe(1);
});
