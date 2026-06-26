import { describe, it, expect, vi } from "vitest";
import { startDraftOffline, saveSectionOffline } from "@/lib/sync/submitInspection";

function makeDeps(overrides = {}) {
  const tests: any[] = [];
  const queue: any[] = [];
  return {
    db: {
      tests: {
        add: async (r: any) => { tests.push(r); },
        update: async (id: string, patch: any) => {
          const t = tests.find((x) => x.id === id); Object.assign(t, patch);
        },
        get: async (id: string) => tests.find((x) => x.id === id),
      },
    } as any,
    enqueueSync: async (entity: string, id: string, op: string, payload: any) => { queue.push({ entity, id, op, payload }); },
    uuid: () => "test-1",
    now: () => "2026-06-26T00:00:00.000Z",
    computeTemplateHash: async () => "hash",
    getMaxRevision: async () => 0,
    isOnline: () => false,
    runSync: async () => {},
    appVersion: "x", schemaVersion: 1,
    _tests: tests, _queue: queue,
    ...overrides,
  };
}

const template = { id: "tpl1", code: "P_X", name: "X", discipline: "mec", revision: "1", sections: [] } as any;

describe("startDraftOffline", () => {
  it("crea fila borrador y encola INSERT", async () => {
    const deps = makeDeps();
    const { testId } = await startDraftOffline({ state: { equipmentId: "e1", templateId: "tpl1", answers: {} } as any, projectId: "p1", userId: "u1", template }, deps as any);
    expect(testId).toBe("test-1");
    expect(deps._tests[0].status).toBe("borrador");
    expect(deps._queue[0]).toMatchObject({ entity: "tests", op: "INSERT" });
  });
});

describe("saveSectionOffline", () => {
  it("hace UPDATE local y encola UPDATE parcial", async () => {
    const deps = makeDeps();
    deps._tests.push({ id: "test-1", data: {} });
    await saveSectionOffline("test-1", { torque: 12 }, deps as any);
    expect(deps._tests[0].data).toEqual({ torque: 12 });
    expect(deps._queue[0]).toMatchObject({ entity: "tests", op: "UPDATE", payload: { id: "test-1", data: { torque: 12 } } });
  });
});
