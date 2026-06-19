import { test, expect, beforeEach } from "vitest";
import { pushPendingOps } from "@/lib/sync/engine";
import { localDB, saveBlobLocally } from "@/lib/db/local";

beforeEach(async () => {
  await Promise.all([
    localDB.syncQueue.clear(), localDB.tests.clear(),
    localDB.evidences.clear(), localDB.blobStore.clear(),
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
