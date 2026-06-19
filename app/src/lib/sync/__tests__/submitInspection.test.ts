import { test, expect, beforeEach, vi } from "vitest";
import { submitInspectionOffline } from "@/lib/sync/submitInspection";
import { localDB } from "@/lib/db/local";
import type { InspectionState, MockInspectionTemplate } from "@/types/inspection";

beforeEach(async () => {
  await Promise.all([
    localDB.tests.clear(), localDB.evidences.clear(), localDB.equipment.clear(),
    localDB.syncQueue.clear(), localDB.blobStore.clear(), localDB.inspectionDrafts.clear(),
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

function deps(online: boolean) {
  let n = 0;
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
  expect(q.find((o) => o.entity === "equipment")).toBeTruthy();
  expect(d.runSync).not.toHaveBeenCalled();
  expect(d.deleteInspectionDraft).toHaveBeenCalled();

  const eq = await localDB.equipment.get("e1");
  expect(eq?.status).toBe("en_ejecucion");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((eq?.metadata as any)?.form_pct).toBe(100);
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
