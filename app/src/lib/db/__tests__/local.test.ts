import { test, expect, beforeEach } from "vitest";
import { localDB } from "@/lib/db/local";

beforeEach(async () => {
  await localDB.offlineTemplates.clear();
  await localDB.equipmentTemplateRefs.clear();
});

test("v5: guarda y lee offlineTemplates", async () => {
  const tpl = { id: "t1", code: "P_X", name: "X", discipline: "", sections: [] };
  await localDB.offlineTemplates.put({ id: "t1", template: tpl, updatedAt: "2026-06-19T00:00:00Z" });
  const row = await localDB.offlineTemplates.get("t1");
  expect(row?.template.code).toBe("P_X");
});

test("v5: guarda y lee equipmentTemplateRefs", async () => {
  await localDB.equipmentTemplateRefs.put({
    equipmentId: "e1",
    refs: [{ id: "t1", code: "P_X", name: "X", discipline: "" }],
    updatedAt: "2026-06-19T00:00:00Z",
  });
  const row = await localDB.equipmentTemplateRefs.get("e1");
  expect(row?.refs[0].id).toBe("t1");
});
