import { describe, it, expect } from "vitest";
import { recomputeResultSummary, isEditableField, buildSectionPatch } from "@/lib/inspection/correction";

describe("recomputeResultSummary", () => {
  it("devuelve no_cumple si hay algún valor de falla", () => {
    expect(recomputeResultSummary({ a: "OK", b: "NO" })).toBe("no_cumple");
    expect(recomputeResultSummary({ a: "FALLA" })).toBe("no_cumple");
    expect(recomputeResultSummary({ a: "RECHAZADO" })).toBe("no_cumple");
  });
  it("devuelve cumple si no hay fallas", () => {
    expect(recomputeResultSummary({ a: "OK", b: "SI", c: 12 })).toBe("cumple");
    expect(recomputeResultSummary({})).toBe("cumple");
  });
});

describe("isEditableField", () => {
  it("excluye firmas, fecha e inspector", () => {
    expect(isEditableField({ key: "x", type: "firma" })).toBe(false);
    expect(isEditableField({ key: "fecha_inspeccion", type: "fecha" })).toBe(false);
    expect(isEditableField({ key: "inspector", type: "texto" })).toBe(false);
  });
  it("permite campos normales", () => {
    expect(isEditableField({ key: "torque", type: "numero" })).toBe(true);
    expect(isEditableField({ key: "estado_visual", type: "select" })).toBe(true);
  });
});

describe("buildSectionPatch", () => {
  it("arma el patch mínimo de UPDATE", () => {
    const p = buildSectionPatch("t1", { a: 1 }, "2026-06-26T00:00:00.000Z");
    expect(p).toEqual({ id: "t1", data: { a: 1 }, updated_at: "2026-06-26T00:00:00.000Z" });
  });
});
