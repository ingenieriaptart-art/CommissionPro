import { describe, it, expect } from "vitest";
import {
  activeRequiredFields,
  sectionRequiresInput,
  defaultSectionStatus,
  isInspectionComplete,
  deriveSectionStatus,
  deriveSectionStatuses,
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

  describe("deriveSectionStatus (desde respuestas)", () => {
    it("requerido activo lleno y sin fallas → complete", () => {
      const s = section("REQ", [field({ key: "x", required: true })]);
      expect(deriveSectionStatus(s, { x: "OK" })).toBe("complete");
    });

    it("requerido activo SIN respuestas → pending", () => {
      const s = section("REQ", [field({ key: "x", required: true })]);
      expect(deriveSectionStatus(s, {})).toBe("pending");
    });

    it("requerido activo a medias (algo respondido pero falta) → in_progress", () => {
      const s = section("REQ", [
        field({ key: "x", required: true }),
        field({ key: "y", required: true }),
      ]);
      expect(deriveSectionStatus(s, { x: "OK" })).toBe("in_progress");
    });

    it("requerido lleno pero con una FALLA → failed", () => {
      const s = section("REQ", [
        field({ key: "x", required: true }),
        field({ key: "y", required: true }),
      ]);
      expect(deriveSectionStatus(s, { x: "OK", y: "FALLA" })).toBe("failed");
    });

    it("sección opcional sin tocar → complete; con FALLA en opcional → failed", () => {
      const s = section("OBS", [field({ key: "obs", required: false })]);
      expect(deriveSectionStatus(s, {})).toBe("complete");
      expect(deriveSectionStatus(s, { obs: "RECHAZADO" })).toBe("failed");
    });

    it("sección desactivada → complete sin importar respuestas", () => {
      const s = section("OFF", [field({ key: "x", required: true })], { is_active: false });
      expect(deriveSectionStatus(s, {})).toBe("complete");
    });

    it("deriveSectionStatuses recupera el check de un borrador legado (bug F5)", () => {
      // Aunque el sectionStatus guardado dijera 'pending', las respuestas mandan.
      const sections = [
        section("VERIF_ELEC", [field({ key: "tension", required: true })]),
        section("OBS", [field({ key: "obs", required: false })]),
      ];
      const answers = { tension: "220" };
      const derived = deriveSectionStatuses(sections, answers);
      expect(derived).toEqual({ VERIF_ELEC: "complete", OBS: "complete" });
      expect(isInspectionComplete(sections, derived)).toBe(true);
    });
  });
});
