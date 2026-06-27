import { describe, it, expect, vi } from "vitest";
import { startDraftOffline, saveSectionOffline, closeInspectionOffline } from "@/lib/sync/submitInspection";

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

// ── Fix A: closeInspectionOffline debe preferir state.testId (multidispositivo) ──

function makeCloseDeps(overrides: Record<string, any> = {}) {
  const tests: any[] = [];
  const queue: any[] = [];
  const addSpy = vi.fn(async (r: any) => { tests.push(r); });
  return {
    db: {
      tests: {
        add: addSpy,
        update: async (id: string, patch: any) => {
          const t = tests.find((x) => x.id === id);
          if (t) Object.assign(t, patch);
        },
        filter: (fn: (r: any) => boolean) => ({
          first: async () => tests.find(fn) ?? undefined,
        }),
        get: async (id: string) => tests.find((x) => x.id === id),
      },
      evidences: { add: vi.fn(async () => {}) },
      equipment: {
        get: async () => ({ id: "e1", status: "pendiente" }),
        update: vi.fn(async () => {}),
      },
      punchItems: { add: vi.fn(async () => {}) },
    } as any,
    enqueueSync: async (entity: string, id: string, op: string, payload: any) => { queue.push({ entity, id, op, payload }); },
    saveBlobLocally: vi.fn(async () => 1),
    deleteInspectionDraft: vi.fn(async () => {}),
    computeTemplateHash: async () => "hash",
    fetchBlob: async () => new Blob(["x"]),
    runSync: vi.fn(async () => {}),
    uuid: () => "new-uuid-should-not-be-used",
    now: () => "2026-06-26T00:00:00.000Z",
    getMaxRevision: async () => 0,
    isOnline: () => false,
    appVersion: "x", schemaVersion: 1,
    nextState: () => null,
    enqueueTransition: vi.fn(async () => {}),
    _tests: tests, _queue: queue, _addSpy: addSpy,
    ...overrides,
  };
}

const tplClose = { id: "tpl1", code: "P_X", name: "X", discipline: "mec", revision: "1", sections: [] } as any;

describe("closeInspectionOffline — Fix A: state.testId multidispositivo", () => {
  it("usa state.testId cuando está presente, sin crear fila nueva ni INSERT", async () => {
    const deps = makeCloseDeps();
    // device B: state.testId apunta a la fila del servidor, pero NO existe en local
    const state: any = {
      equipmentId: "e1", templateId: "tpl1",
      testId: "server-side-id",
      answers: { it1: "Cumple" }, evidences: {},
    };

    const result = await closeInspectionOffline(
      { state, projectId: "p1", userId: "u1", template: tplClose },
      deps as any,
    );

    // El testId devuelto debe ser el de state, no el uuid de makeDeps
    expect(result.testId).toBe("server-side-id");

    // No debe haberse creado ninguna fila nueva en local
    expect(deps._addSpy).not.toHaveBeenCalled();

    // El outbox debe tener exactamente un UPDATE (el close) para el id correcto
    // (no un INSERT de fila nueva)
    const insertOps = deps._queue.filter((q: any) => q.entity === "tests" && q.op === "INSERT");
    const updateOps = deps._queue.filter((q: any) => q.entity === "tests" && q.op === "UPDATE");
    expect(insertOps).toHaveLength(0);
    expect(updateOps.length).toBeGreaterThanOrEqual(1);
    expect(updateOps[0].id).toBe("server-side-id");
    expect(updateOps[0].payload).toMatchObject({ id: "server-side-id", status: "ejecutado" });
  });

  it("fallback a filtro local cuando state.testId no está definido", async () => {
    const deps = makeCloseDeps();
    // Existe un borrador local (flujo single-device normal)
    deps._tests.push({ id: "local-draft", equipment_id: "e1", template_id: "tpl1", status: "borrador" });
    const state: any = {
      equipmentId: "e1", templateId: "tpl1",
      testId: undefined,
      answers: {}, evidences: {},
    };

    const result = await closeInspectionOffline(
      { state, projectId: "p1", userId: "u1", template: tplClose },
      deps as any,
    );

    expect(result.testId).toBe("local-draft");
    expect(deps._addSpy).not.toHaveBeenCalled();
  });

  it("crea fila nueva solo si no hay state.testId NI borrador local", async () => {
    const deps = makeCloseDeps();
    const state: any = {
      equipmentId: "e1", templateId: "tpl1",
      testId: undefined,
      answers: {}, evidences: {},
    };

    const result = await closeInspectionOffline(
      { state, projectId: "p1", userId: "u1", template: tplClose },
      deps as any,
    );

    // Se crea fila nueva con el uuid del factory
    expect(result.testId).toBe("new-uuid-should-not-be-used");
    expect(deps._addSpy).toHaveBeenCalledOnce();
    const insertOps = deps._queue.filter((q: any) => q.entity === "tests" && q.op === "INSERT");
    expect(insertOps).toHaveLength(1);
  });
});
