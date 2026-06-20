import { test, expect, beforeEach } from "vitest";
import { pushPendingOps, pullChangesForTest } from "@/lib/sync/engine";
import { localDB, saveBlobLocally } from "@/lib/db/local";

beforeEach(async () => {
  await Promise.all([
    localDB.syncQueue.clear(), localDB.tests.clear(),
    localDB.evidences.clear(), localDB.blobStore.clear(),
    localDB.syncCursors.clear(),
  ]);
});

function mockSupabase(opts: { failTests?: boolean } = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upserts: { table: string; payload: any }[] = [];
  const uploads: { path: string }[] = [];
  return {
    _upserts: upserts, _uploads: uploads,
    from(table: string) {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upsert: async (payload: any) => {
          upserts.push({ table, payload });
          if (table === "tests" && opts.failTests) return { error: { message: "boom" } };
          return { error: null };
        },
        update() { return { eq: async () => ({ error: null }) }; },
      };
    },
    storage: {
      from() {
        return {
          upload: async (path: string) => { uploads.push({ path }); return { error: null }; },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }),
        };
      },
    },
  };
}

test("push: sube blob de evidencia, setea storage_url y marca synced (LWW por id)", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.evidences.add({ id: "ev1", project_id: "p1", test_id: "t1", equipment_id: "e1", type: "foto", stage: "general", captured_at: "t", sync_status: "pending" } as any);
  await saveBlobLocally("ev1", new Blob(["x"], { type: "image/jpeg" }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.syncQueue.add({ entity: "evidences", entityId: "ev1", operation: "INSERT", payload: { id: "ev1", project_id: "p1", test_id: "t1", equipment_id: "e1", type: "foto", stage: "general", captured_at: "t", sync_status: "pending" }, createdAt: "t", attempts: 0 } as any);

  const sb = mockSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await pushPendingOps(sb as any);

  expect(res.pushed).toBe(1);
  expect(sb._uploads.length).toBe(1);
  const up = sb._upserts.find((u) => u.table === "evidences")!;
  expect(up.payload.storage_url).toBe(`https://cdn/${sb._uploads[0].path}`);
  expect(up.payload.sync_status).toBe("synced");
  expect(up.payload.last_sync_error).toBeUndefined();
  expect(await localDB.blobStore.where("evidenceId").equals("ev1").count()).toBe(0);
  expect((await localDB.evidences.get("ev1"))?.sync_status).toBe("synced");
  expect(await localDB.syncQueue.count()).toBe(0);
});

// ── Pull: resiliencia por entidad ──────────────────────────────────────────────
// Builder de pull por entidad: select/gt/order encadenan; range() resuelve.
function mockPullSupabase(perEntity: Record<string, { data?: unknown[]; error?: unknown }>) {
  return {
    from(entity: string) {
      const res = perEntity[entity] ?? { data: [] };
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.gt = () => builder;
      builder.order = () => builder;
      builder.range = async () => res;
      return builder as never;
    },
  };
}

test("pull: una entidad con error no aborta el resto; el error se reporta", async () => {
  const sb = mockPullSupabase({
    tests: { data: [{ id: "t1", updated_at: "2026-06-20T00:00:00Z" }] },
    evidences: { error: { message: "column evidences.updated_at does not exist" } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { pulled, errors } = await pullChangesForTest(sb as any);

  expect(pulled).toBeGreaterThanOrEqual(1);
  expect(await localDB.tests.get("t1")).toBeTruthy();
  expect(errors.some((e) => e.includes("evidences"))).toBe(true);
});

test("push UPDATE parcial de equipment usa update().eq() y NO upsert (evita 400 por NOT NULL)", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.equipment.add({ id: "eq1", project_id: "p1", tag: "B1", status: "pendiente", metadata: {}, sync_status: "pending" } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.syncQueue.add({ entity: "equipment", entityId: "eq1", operation: "UPDATE", payload: { id: "eq1", status: "en_ejecucion", metadata: { form_pct: 100 }, updated_at: "t" }, createdAt: "t", attempts: 0 } as any);

  const calls = { upsert: 0, update: 0, updateEqId: null as string | null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updatePayload: any = null;
  const sb = {
    from() {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upsert: async () => { calls.upsert++; return { error: null }; },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update(payload: any) {
          calls.update++; updatePayload = payload;
          return { eq: async (_col: string, val: string) => { calls.updateEqId = val; return { error: null }; } };
        },
      };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await pushPendingOps(sb as any);

  expect(res.pushed).toBe(1);
  expect(calls.upsert).toBe(0);            // UPDATE no debe usar upsert
  expect(calls.update).toBe(1);            // sí update parcial
  expect(calls.updateEqId).toBe("eq1");    // filtro .eq("id","eq1")
  expect(updatePayload.id).toBeUndefined(); // el id va en el filtro, no en el SET
  expect(updatePayload.status).toBe("en_ejecucion");
  expect((await localDB.equipment.get("eq1"))?.sync_status).toBe("synced");
  expect(await localDB.syncQueue.count()).toBe(0);
});

test("retry/backoff: error incrementa attempts y guarda last_sync_error; a los 5 → failed", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.tests.add({ id: "t1", project_id: "p1", status: "ejecutado", sync_status: "pending" } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.syncQueue.add({ entity: "tests", entityId: "t1", operation: "INSERT", payload: { id: "t1", project_id: "p1", status: "ejecutado", sync_status: "pending" }, createdAt: "t", attempts: 4 } as any);

  const sb = mockSupabase({ failTests: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await pushPendingOps(sb as any);

  expect(res.pushed).toBe(0);
  const op = (await localDB.syncQueue.toArray())[0];
  expect(op.attempts).toBe(5);
  expect(op.lastError).toContain("boom");
  expect((await localDB.tests.get("t1"))?.sync_status).toBe("failed");
  expect((await localDB.tests.get("t1"))?.last_sync_error).toContain("boom");
});
