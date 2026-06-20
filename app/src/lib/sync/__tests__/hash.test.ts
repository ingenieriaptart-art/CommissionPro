import { test, expect } from "vitest";
import { canonicalJSON, sha256Hex, computeTemplateHash } from "@/lib/sync/hash";
import type { MockInspectionTemplate } from "@/types/inspection";

test("canonicalJSON ordena claves de forma estable", () => {
  expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
  expect(canonicalJSON({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
});

test("sha256Hex es determinista y hex de 64 chars", async () => {
  const h = await sha256Hex("hola");
  expect(h).toMatch(/^[0-9a-f]{64}$/);
  expect(await sha256Hex("hola")).toBe(h);
});

const baseTpl: MockInspectionTemplate = {
  id: "t1", code: "P_X", name: "X", discipline: "mec",
  sections: [{ id: "s1", code: "S1", name: "Sec", is_universal: false,
    fields: [{ key: "it1", label: "Item", type: "checkbox", required: false }] }],
};

test("computeTemplateHash ignora _source y revision (meta volátil)", async () => {
  const a = await computeTemplateHash({ ...baseTpl, _source: "online", revision: "Rev0" });
  const b = await computeTemplateHash({ ...baseTpl, _source: "offline", revision: "Rev9" });
  expect(a).toBe(b);
});

test("computeTemplateHash cambia si cambia la definición", async () => {
  const a = await computeTemplateHash(baseTpl);
  const mutated = structuredClone(baseTpl);
  mutated.sections[0].fields[0].label = "Otro";
  expect(await computeTemplateHash(mutated)).not.toBe(a);
});
