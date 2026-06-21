import { test, expect } from "vitest";
import { deriveAutoPunches } from "@/lib/punch/autoPunch";
import type { MockInspectionTemplate } from "@/types/inspection";

const template = {
  id: "t1", code: "P", name: "P", discipline: "mec",
  sections: [{
    id: "s1", code: "S1", name: "Sección 1", is_universal: false,
    fields: [
      { key: "it1", label: "Continuidad", type: "radio", required: true },
      { key: "it2", label: "Aislamiento", type: "radio", required: true,
        // @ts-expect-error punch_priority es metadata opcional forward-compat
        punch_priority: "critica" },
      { key: "it3", label: "Observaciones", type: "textarea", required: false },
    ],
  }],
} as unknown as MockInspectionTemplate;

const ctx = { projectId: "p1", equipmentId: "e1", testId: "T1", userId: "u1", now: "2026-06-21T00:00:00Z" };

test("genera 1 punch por ítem fallido; no_aplica/no-falla no disparan", () => {
  const answers = { it1: "No cumple", it2: "Cumple", it3: "texto libre", it4: "No aplica" };
  const rows = deriveAutoPunches(answers, template, ctx);
  expect(rows.map((r) => r.source_item_key)).toEqual(["it1"]);
  expect(rows[0].generation_source).toBe("auto_inspection");
  expect(rows[0].responsible_id).toBeNull();
  expect(rows[0].created_by).toBe("u1");
  expect(rows[0].title).toBe("Continuidad");
});

test("prioridad = field.punch_priority ?? 'media'", () => {
  const rows = deriveAutoPunches({ it1: "FALLA", it2: "RECHAZADO" }, template, ctx);
  const byKey = Object.fromEntries(rows.map((r) => [r.source_item_key, r.priority]));
  expect(byKey.it1).toBe("media");      // sin hint
  expect(byKey.it2).toBe("critica");    // hint del campo
});

test("id determinístico por (testId, fieldKey)", () => {
  const a = deriveAutoPunches({ it1: "NO" }, template, ctx)[0].id;
  const b = deriveAutoPunches({ it1: "NO" }, template, ctx)[0].id;
  expect(a).toBe(b);
  const c = deriveAutoPunches({ it1: "NO" }, template, { ...ctx, testId: "T2" })[0].id;
  expect(c).not.toBe(a);
});

test("sin fallas → 0 punch", () => {
  expect(deriveAutoPunches({ it1: "Cumple" }, template, ctx)).toEqual([]);
});
