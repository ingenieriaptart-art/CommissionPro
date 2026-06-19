import { test, expect, beforeEach } from "vitest";
import { prepareProjectOffline } from "@/lib/sync/prefetch";
import { localDB } from "@/lib/db/local";

beforeEach(async () => {
  await Promise.all([
    localDB.equipment.clear(),
    localDB.equipmentTemplateRefs.clear(),
    localDB.offlineTemplates.clear(),
  ]);
});

function mockClient() {
  const equipment = [
    { id: "e1", project_id: "p1", tag: "B1", subsystem_id: "s", status: "pendiente" },
    { id: "e2", project_id: "p1", tag: "B2", subsystem_id: "s", status: "pendiente" },
  ];
  const refsByEq: Record<string, unknown[]> = {
    e1: [{ template_id: "t1", template_key: "P_X", template_name: "X", discipline: "mec", source: "equipment_type" }],
    e2: [{ template_id: "t1", template_key: "P_X", template_name: "X", discipline: "mec", source: "equipment_type" }],
  };
  return {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        is() { return Promise.resolve({ data: equipment, error: null }); },
      };
    },
    rpc(_fn: string, args: { p_equipment_id: string }) {
      return Promise.resolve({ data: refsByEq[args.p_equipment_id] ?? [], error: null });
    },
  };
}

test("prepareProjectOffline cachea equipos, refs y plantillas", async () => {
  const progress: number[] = [];
  const deps = {
    client: mockClient(),
    db: localDB,
    assemble: async () => ({ id: "t1", code: "P_X", name: "X", discipline: "mec", sections: [] }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await prepareProjectOffline("p1", deps as any, (done) => progress.push(done));
  expect(res.equipment).toBe(2);
  expect(res.templates).toBe(1); // t1 deduplicado
  expect(res.errors).toEqual([]);
  expect(progress).toEqual([1, 2]);
  expect(await localDB.equipment.count()).toBe(2);
  expect((await localDB.equipmentTemplateRefs.get("e1"))?.refs[0].id).toBe("t1");
  expect((await localDB.offlineTemplates.get("t1"))?.template.code).toBe("P_X");
});
