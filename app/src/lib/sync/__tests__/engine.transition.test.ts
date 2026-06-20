import { test, expect, beforeEach } from "vitest";
import { pushPendingOps } from "@/lib/sync/engine";
import { localDB } from "@/lib/db/local";

beforeEach(async () => {
  await Promise.all([localDB.syncQueue.clear(), localDB.equipment.clear()]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.equipment.put({ id: "e1", project_id: "p1", tag: "B1", status: "en_ejecucion", sync_status: "synced" } as any);
});

function mockRpc(result: { applied: boolean; status: string; reason: string | null }, opts: { fail?: boolean } = {}) {
  const calls: { fn: string; args: unknown }[] = [];
  return {
    _calls: calls,
    from() { return { upsert: async () => ({ error: null }), update() { return { eq: async () => ({ error: null }) }; } }; },
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      if (opts.fail) return { data: null, error: { message: "net" } };
      return { data: result, error: null };
    },
    storage: { from() { return { upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "x" } }) }; } },
  };
}

test("transición applied: llama rpc, descarta op, reconcilia status", async () => {
  await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: "e1", operation: "INSERT",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { equipment_id: "e1", event: "INSPECTION_EXECUTED", from_status: "pendiente", occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
  const sb = mockRpc({ applied: true, status: "en_ejecucion", reason: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await pushPendingOps(sb as any);
  expect(res.pushed).toBe(1);
  expect(sb._calls[0].fn).toBe("transition_equipment_state");
  expect(await localDB.syncQueue.count()).toBe(0);
  expect((await localDB.equipment.get("e1"))?.status).toBe("en_ejecucion");
});

test("transición rejected (stale): descarta op y reconcilia al estado servidor", async () => {
  await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: "e1", operation: "INSERT",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { equipment_id: "e1", event: "MC_COMPLETED", from_status: "aprobado", occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
  const sb = mockRpc({ applied: false, status: "aprobado", reason: "open_punch" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await pushPendingOps(sb as any);
  expect(res.pushed).toBe(0);
  expect(await localDB.syncQueue.count()).toBe(0); // resuelta, no se reintenta
  expect((await localDB.equipment.get("e1"))?.status).toBe("aprobado");
});

test("error de red: la op permanece para reintento", async () => {
  await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: "e1", operation: "INSERT",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { equipment_id: "e1", event: "INSPECTION_EXECUTED", from_status: "pendiente", occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
  const sb = mockRpc({ applied: true, status: "en_ejecucion", reason: null }, { fail: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pushPendingOps(sb as any);
  expect((await localDB.syncQueue.toArray())[0].attempts).toBe(1);
});
