import { test, expect } from "vitest";
import Dexie from "dexie";

test("fake-indexeddb opera con Dexie", async () => {
  const db = new Dexie("smoke");
  db.version(1).stores({ t: "id" });
  await db.table("t").put({ id: "a", v: 1 });
  const row = await db.table("t").get("a");
  expect(row).toEqual({ id: "a", v: 1 });
  await db.delete();
});
