import { describe, it, expect } from "vitest";
import {
  activeRequiredFields,
  sectionRequiresInput,
  defaultSectionStatus,
  isInspectionComplete,
  reconcileSectionStatus,
} from "@/lib/inspection/completion";
import type { MockInspectionField, MockInspectionSection, SectionStatus } from "@/types/inspection";

function field(over: Partial<MockInspectionField>): MockInspectionField {
  return { key: over.key ?? "f", label: "F", type: "texto" as never, required: false, ...over };
}
function section(code: string, fields: MockInspectionField[], over: Partial<MockInspectionSection> = {}): MockInspectionSection {
  return { id: code, code, name: code, is_universal: false, fields, ...over };
}

describe("completion", () => {
  it("sección sin campos → no exige input → complete por defecto", () => {
    const s = section("VACIA", []);
    expect(sectionRequiresInput(s)).toBe(false);
    expect(defaultSectionStatus(s)).toBe("complete");
  });

  it("sección con SOLO campos opcionales → no exige input → complete (bug PIT-204)", () => {
    const s = section("OBS", [field({ key: "obs", required: false })]);
    expect(activeRequiredFields(s)).toHaveLength(0);
    expect(sectionRequiresInput(s)).toBe(false);
    expect(defaultSectionStatus(s)).toBe("complete");
  });

  it("sección DESACTIVADA con requeridos → no bloquea → complete", () => {
    const s = section("OFF", [field({ key: "x", required: true })], { is_active: false });
    expect(sectionRequiresInput(s)).toBe(false);
    expect(defaultSectionStatus(s)).toBe("complete");
  });

  it("sección con requerido cuyo campo está inactivo → no exige input", () => {
    const s = section("MIX", [field({ key: "x", required: true, is_active: false })]);
    expect(activeRequiredFields(s)).toHaveLength(0);
    expect(sectionRequiresInput(s)).toBe(false);
  });

  it("sección con requerido activo → exige input → pending por defecto", () => {
    const s = section("REQ", [field({ key: "x", required: true })]);
    expect(sectionRequiresInput(s)).toBe(true);
    expect(defaultSectionStatus(s)).toBe("pending");
  });

  it("isInspectionComplete TRUE: requeridas completas + una opcional en 'pending' (escenario exacto del bug)", () => {
    const sections = [
      section("REQ", [field({ key: "x", required: true })]),
      section("OBS", [field({ key: "obs", required: false })]), // opcional, nunca tocada
    ];
    const status: Record<string, SectionStatus> = { REQ: "complete", OBS: "pending" };
    expect(isInspectionComplete(sections, status)).toBe(true);
  });

  it("isInspectionComplete FALSE: una sección con requerido activo sigue pending", () => {
    const sections = [section("REQ", [field({ key: "x", required: true })])];
    expect(isInspectionComplete(sections, { REQ: "pending" })).toBe(false);
    expect(isInspectionComplete(sections, { REQ: "complete" })).toBe(true);
    expect(isInspectionComplete(sections, { REQ: "failed" })).toBe(true);
  });

  it("reconcile conserva estados existentes y completa faltantes por defecto", () => {
    const sections = [
      section("A", [field({ key: "a", required: true })]),
      section("B", [field({ key: "b", required: false })]),
    ];
    const out = reconcileSectionStatus({ A: "complete" }, sections);
    expect(out).toEqual({ A: "complete", B: "complete" }); // B opcional → complete por defecto
  });
});
