import { describe, it, expect } from "vitest";
import {
  isFailValue, isPassValue, isSignatureField, formatFieldValue,
  extractSnapshotSections, snapshotMeta, collectFailures,
} from "@/lib/inspection/review";
import type { MockInspectionField, MockInspectionSection } from "@/types/inspection";

function field(over: Partial<MockInspectionField>): MockInspectionField {
  return { key: over.key ?? "f", label: over.label ?? "F", type: over.type ?? ("texto" as never), required: false, ...over };
}
function section(code: string, fields: MockInspectionField[]): MockInspectionSection {
  return { id: code, code, name: code, is_universal: false, fields };
}

describe("review — valores", () => {
  it("isFailValue detecta NO/FALLA/RECHAZADO", () => {
    expect(isFailValue("NO")).toBe(true);
    expect(isFailValue("FALLA")).toBe(true);
    expect(isFailValue("RECHAZADO")).toBe(true);
    expect(isFailValue("SI")).toBe(false);
    expect(isFailValue(undefined)).toBe(false);
  });
  it("isPassValue detecta SI/OK/APROBADO", () => {
    expect(isPassValue("SI")).toBe(true);
    expect(isPassValue("APROBADO")).toBe(true);
    expect(isPassValue("NO")).toBe(false);
  });
  it("isSignatureField solo para firma", () => {
    expect(isSignatureField("firma")).toBe(true);
    expect(isSignatureField("texto")).toBe(false);
  });
  it("formatFieldValue agrega unidad y maneja vacíos", () => {
    expect(formatFieldValue(150, "kW")).toBe("150 kW");
    expect(formatFieldValue("ABC")).toBe("ABC");
    expect(formatFieldValue("")).toBe("—");
    expect(formatFieldValue(null)).toBe("—");
  });
});

describe("review — snapshot", () => {
  const snap = {
    template_snapshot: {
      template: { id: "t1", code: "P_MEC_010", name: "Motobomba", sections: [section("S1", [field({ key: "a" })])] },
      meta: { template_source: "online", captured_at: "2026-06-26T00:00:00Z" },
    },
  };
  it("extractSnapshotSections lee desde el snapshot", () => {
    expect(extractSnapshotSections(snap).length).toBe(1);
    expect(extractSnapshotSections(snap)[0].code).toBe("S1");
  });
  it("extractSnapshotSections devuelve [] si no hay snapshot válido", () => {
    expect(extractSnapshotSections({ template_snapshot: null }).length).toBe(0);
    expect(extractSnapshotSections({ template_snapshot: { foo: 1 } as never }).length).toBe(0);
  });
  it("snapshotMeta extrae nombre y captured_at", () => {
    expect(snapshotMeta(snap).templateName).toBe("Motobomba");
    expect(snapshotMeta(snap).capturedAt).toBe("2026-06-26T00:00:00Z");
  });
});

describe("review — collectFailures", () => {
  const sections = [
    section("VIS", [
      field({ key: "identificacion", label: "Placa de identificación", type: "checkbox" as never }),
      field({ key: "obs", label: "Obs", type: "textarea" as never }),
      field({ key: "limpieza", label: "Limpieza", type: "checkbox" as never }),
    ]),
  ];
  it("detecta el campo en NO y captura la observación siguiente", () => {
    const fails = collectFailures(sections, { identificacion: "NO", obs: "Falta placa", limpieza: "SI" });
    expect(fails.length).toBe(1);
    expect(fails[0].fieldKey).toBe("identificacion");
    expect(fails[0].value).toBe("NO");
    expect(fails[0].observation).toBe("Falta placa");
  });
  it("sin fallas cuando todo está en SI", () => {
    expect(collectFailures(sections, { identificacion: "SI", limpieza: "SI" }).length).toBe(0);
  });
});
