import { test, expect } from "vitest";
import { isApprovalChainComplete, vigentesByTemplate } from "@/lib/state/approvalChain";

const cfg1 = [{ level: 1, mandatory: true }];
const cfg3 = [{ level: 1, mandatory: true }, { level: 2, mandatory: true }, { level: 3, mandatory: false }];

test("vigente = mayor revision no rechazada por template; ignora borrador/rechazado", () => {
  const tests = [
    { testId: "a1", templateId: "T1", revision: 1, status: "rechazado" },
    { testId: "a2", templateId: "T1", revision: 2, status: "ejecutado" },
    { testId: "b1", templateId: "T2", revision: 1, status: "borrador" },
  ];
  const v = vigentesByTemplate(tests).map((t) => t.testId).sort();
  expect(v).toEqual(["a2"]); // a1 rechazada, a2 vigente, b1 borrador no cuenta
});

test("cadena de 1 nivel: completa cuando el L1 está aprobado", () => {
  const tests = [{ testId: "a2", templateId: "T1", revision: 2, status: "ejecutado" }];
  expect(isApprovalChainComplete(tests, cfg1, [])).toBe(false);
  expect(isApprovalChainComplete(tests, cfg1, [{ testId: "a2", level: 1, status: "aprobado" }])).toBe(true);
});

test("cadena de 3 niveles: solo los mandatory bloquean (L3 opcional)", () => {
  const tests = [{ testId: "a2", templateId: "T1", revision: 1, status: "ejecutado" }];
  const ap = [
    { testId: "a2", level: 1, status: "aprobado" },
    { testId: "a2", level: 2, status: "aprobado" },
  ];
  expect(isApprovalChainComplete(tests, cfg3, ap)).toBe(true); // L3 no mandatory
  expect(isApprovalChainComplete(tests, cfg3, [{ testId: "a2", level: 1, status: "aprobado" }])).toBe(false);
});

test("sin inspecciones vigentes → no completa", () => {
  expect(isApprovalChainComplete([], cfg1, [])).toBe(false);
  expect(isApprovalChainComplete([{ testId: "x", templateId: "T1", revision: 1, status: "rechazado" }], cfg1, [])).toBe(false);
});

test("aprobación de una revisión vieja no cuenta para la vigente", () => {
  const tests = [
    { testId: "old", templateId: "T1", revision: 1, status: "ejecutado" },
    { testId: "new", templateId: "T1", revision: 2, status: "ejecutado" },
  ];
  const ap = [{ testId: "old", level: 1, status: "aprobado" }];
  expect(isApprovalChainComplete(tests, cfg1, ap)).toBe(false); // la vigente es "new", sin aprobación
});
