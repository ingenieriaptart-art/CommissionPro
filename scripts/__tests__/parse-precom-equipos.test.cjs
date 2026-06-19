/* eslint-disable */
const { test } = require("node:test");
const assert = require("node:assert");
const { buildModel } = require("../parse-precom-equipos.cjs");

// Oráculo: conteos derivados del contenido real de cada .xls.
// items = campos checkbox; secciones = secciones específicas (sin universales).
// sections incluye: Datos de Placa (si la trae) + secciones de checklist +
// la sección "Resultado" (cuando hasResultado).
const EXPECTED = {
  "P_EFL-019": { sections: 6, items: 24, hasResultado: false },
  "P_BIO-006": { sections: 6, items: 19, hasResultado: false },
  "P_BIO-005": { sections: 1, items: 19, hasResultado: false },
  "P_ELE-025": { sections: 9, items: 47, hasResultado: true },
  "P_BIO-020": { sections: 6, items: 25, hasResultado: true },
  "P_BIO-010": { sections: 2, items: 29, hasResultado: true },
  "P_BIO-002": { sections: 5, items: 28, hasResultado: true },
};

const { forms } = buildModel();
const byKey = Object.fromEntries(forms.map((f) => [f.key, f]));

test("se parsean los 7 formatos", () => {
  assert.strictEqual(forms.length, 7);
});

for (const [key, exp] of Object.entries(EXPECTED)) {
  test(`${key}: secciones e ítems`, () => {
    const f = byKey[key];
    assert.ok(f, `falta el formato ${key}`);
    const items = f.sections.reduce(
      (n, s) => n + s.fields.filter((x) => x.type === "checkbox").length, 0);
    assert.strictEqual(f.sections.length, exp.sections, "nº de secciones");
    assert.strictEqual(items, exp.items, "nº de ítems (checkbox)");
    const hasRes = f.sections.some((s) =>
      s.fields.some((x) => x.type === "select" && x.key === "resultado_final"));
    assert.strictEqual(hasRes, exp.hasResultado, "resultado final");
  });

  test(`${key}: cada ítem tiene observación`, () => {
    const f = byKey[key];
    const checks = f.sections.flatMap((s) =>
      s.fields.filter((x) => x.type === "checkbox"));
    for (const c of checks) {
      const obs = f.sections.flatMap((s) => s.fields)
        .find((x) => x.key === c.key + "_obs" && x.type === "textarea");
      assert.ok(obs, `falta observación para ${c.key} en ${key}`);
    }
  });
}
