/* eslint-disable */
const { test } = require("node:test");
const assert = require("node:assert");
const { buildModel } = require("../parse-precom-equipos.cjs");
const { genSeed, genAssign } = require("../gen-precom-equipos-sql.cjs");

const { forms } = buildModel();
const seed = genSeed(forms);
const assign = genAssign(forms);

test("seed: transacción y limpieza idempotente", () => {
  assert.match(seed, /^BEGIN;/m);
  assert.match(seed, /COMMIT;\s*$/);
  assert.match(seed, /DELETE FROM public\.form_templates\s+WHERE key IN \(/);
  assert.match(seed, /DELETE FROM public\.template_sections WHERE code LIKE/);
});

test("seed: inserta las 7 plantillas con metadatos", () => {
  for (const f of forms) {
    assert.ok(seed.includes(`'${f.key}'`), `falta key ${f.key}`);
    assert.ok(seed.includes(`'${f.revision}'`), `falta revisión de ${f.key}`);
  }
  // alcance solo en las dos del chiller
  assert.ok(seed.includes("'con_instrumentos'"));
  assert.ok(seed.includes("'sin_instrumentos'"));
});

test("seed: no enlaza secciones universales", () => {
  assert.ok(!/DATOS_GENERALES|FIRMAS/.test(seed));
});

test("seed: usa test_type precomisionamiento", () => {
  assert.match(seed, /'precomisionamiento'/);
});

test("assign: equipment_type_templates por código de tipo", () => {
  assert.match(assign, /INSERT INTO public\.equipment_type_templates/);
  assert.match(assign, /code = 'BOMBA_CENTRIFUGA'/);
  assert.match(assign, /code = 'CHILLER'/);
  assert.match(assign, /code = 'SOPLADOR'/);
  assert.match(assign, /ON CONFLICT .* DO NOTHING/);
});

test("seed: alcance solo en las 2 plantillas de chiller", () => {
  const matches = [...seed.matchAll(/'con_instrumentos'|'sin_instrumentos'/g)];
  assert.strictEqual(matches.length, 2, "alcance debe aparecer exactamente 2 veces");
});
