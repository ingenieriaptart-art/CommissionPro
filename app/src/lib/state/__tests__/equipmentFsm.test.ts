import { test, expect } from "vitest";
import { nextState, allowedEvents, equipmentColor, TERMINAL } from "@/lib/state/equipmentFsm";
import type { DerivedFlags } from "@/lib/state/equipmentFsm";

const F = (p: Partial<DerivedFlags> = {}): DerivedFlags =>
  ({ hasOpenPunch: false, approvalsComplete: false, everInspected: false, ...p });

test("pendiente → en_ejecucion con INSPECTION_EXECUTED", () => {
  expect(nextState("pendiente", "INSPECTION_EXECUTED", F())).toBe("en_ejecucion");
});

test("G1: en_ejecucion→aprobado solo si approvalsComplete", () => {
  expect(nextState("en_ejecucion", "INSPECTION_APPROVED", F({ approvalsComplete: false }))).toBeNull();
  expect(nextState("en_ejecucion", "INSPECTION_APPROVED", F({ approvalsComplete: true }))).toBe("aprobado");
});

test("G2: aprobado→MC solo si sin punch abierto", () => {
  expect(nextState("aprobado", "MC_COMPLETED", F({ hasOpenPunch: true }))).toBeNull();
  expect(nextState("aprobado", "MC_COMPLETED", F({ hasOpenPunch: false }))).toBe("mechanical_completion");
});

test("auto-revocación: PUNCH_RAISED en MC → aprobado; en aprobado → null", () => {
  expect(nextState("mechanical_completion", "PUNCH_RAISED", F())).toBe("aprobado");
  expect(nextState("aprobado", "PUNCH_RAISED", F())).toBeNull();
});

test("saltos prohibidos → null", () => {
  expect(nextState("pendiente", "MC_COMPLETED", F({ hasOpenPunch: false }))).toBeNull();
  expect(nextState("en_ejecucion", "RFC_GRANTED", F())).toBeNull();
  expect(nextState("aprobado", "RFC_GRANTED", F())).toBeNull();
});

test("avance de hitos MC→RFC→RFSU→operativo", () => {
  expect(nextState("mechanical_completion", "RFC_GRANTED", F())).toBe("listo_energizacion");
  expect(nextState("listo_energizacion", "RFSU_GRANTED", F())).toBe("listo_arranque");
  expect(nextState("listo_arranque", "COMMISSIONED", F())).toBe("operativo");
});

test("operativo es terminal", () => {
  expect(TERMINAL.has("operativo")).toBe(true);
  for (const e of ["INSPECTION_EXECUTED", "MC_REVOKED", "BLOCK"] as const) {
    expect(nextState("operativo", e, F())).toBeNull();
  }
});

test("BLOCK/UNBLOCK", () => {
  expect(nextState("en_ejecucion", "BLOCK", F())).toBe("bloqueado");
  expect(nextState("bloqueado", "UNBLOCK", F({ everInspected: true }))).toBe("en_ejecucion");
  expect(nextState("bloqueado", "UNBLOCK", F({ everInspected: false }))).toBe("pendiente");
});

test("colores del Twin", () => {
  expect(equipmentColor("pendiente", false)).toBe("gris");
  expect(equipmentColor("en_ejecucion", false)).toBe("amarillo");
  expect(equipmentColor("en_ejecucion", true)).toBe("naranja");
  expect(equipmentColor("aprobado", true)).toBe("naranja");
  expect(equipmentColor("aprobado", false)).toBe("azul");
  expect(equipmentColor("mechanical_completion", false)).toBe("verde");
  expect(equipmentColor("rechazado", false)).toBe("rojo");
  expect(equipmentColor("bloqueado", false)).toBe("rojo");
});

test("allowedEvents en aprobado depende de punch", () => {
  expect(allowedEvents("aprobado", F({ hasOpenPunch: false }))).toContain("MC_COMPLETED");
  expect(allowedEvents("aprobado", F({ hasOpenPunch: true }))).not.toContain("MC_COMPLETED");
});
