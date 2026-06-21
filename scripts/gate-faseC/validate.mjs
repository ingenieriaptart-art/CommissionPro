import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Gate integral Fase C — Punch Automático (REST/Auth admin, espejo de gate-faseB).
// Escenarios: A auto-punch, B idempotencia, C evidencia→corregido, E cierre con full,
// F reapertura auditada, G MC bloqueado con punch abierto, H MC permitido al cerrar.
// (D cierre SIN full requiere un usuario no-admin; se cubre en el test SQL — ver nota.)
// Limpia todos los datos de prueba al final.

const env = readFileSync(new URL("../../app/.env.local", import.meta.url), "utf8");
const E = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const URL_ = E("NEXT_PUBLIC_SUPABASE_URL");
const ANON = E("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SR = E("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_EMAIL = "admin@commissionpro.com";
const ADMIN_PASS = "Admin1234";

const log = (...a) => console.log(...a);
const results = [];
const rec = (n, ok, d) => { results.push({ n, ok }); log(`${ok ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };

async function api(path, { method = "GET", body, token = SR, prefer } = {}) {
  const headers = { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, body: j };
}
const insert = (t, row) => api(t, { method: "POST", body: row, prefer: "return=representation" });
const del = (p) => api(p, { method: "DELETE", prefer: "return=representation" });
async function rpc(token, fn, args) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}

const created = { projects: [], equipment: [], tests: [], punch: [], evidences: [] };

async function main() {
  const auth = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const token = (await auth.json()).access_token;
  rec("login admin", !!token);
  if (!token) throw new Error("sin token admin");

  // Setup jerarquía aislada
  const ts = Date.now();
  const proj = (await insert("projects", { code: `GATEC-${ts}`, name: "GATE Fase C", status: "en_ejecucion" })).body?.[0];
  created.projects.push(proj.id);
  const area = (await insert("areas", { project_id: proj.id, name: "A", code: "A1" })).body?.[0];
  const sys = (await insert("systems", { area_id: area.id, name: "S", code: "S1" })).body?.[0];
  const sub = (await insert("subsystems", { system_id: sys.id, name: "SS", code: "SS1" })).body?.[0];
  const eq = (await insert("equipment", { subsystem_id: sub.id, project_id: proj.id, tag: `GATEC-EQ-${ts}`, name: "eq", status: "en_ejecucion" })).body?.[0];
  created.equipment.push(eq.id);
  const test = (await insert("tests", { project_id: proj.id, equipment_id: eq.id, type: "precomisionamiento", status: "ejecutado", revision: 1 })).body?.[0];
  created.tests.push(test.id);
  rec("setup jerarquía + equipo + test", !!(proj && eq && test), `eq=${eq?.id?.slice(0,8)}`);

  // (A) auto-punch: insertamos el punch que el cliente generaría (source_test_id + item_key)
  const punchId = randomUUID();
  const pA = await insert("punch_items", {
    id: punchId, project_id: proj.id, equipment_id: eq.id, test_id: test.id,
    source_test_id: test.id, source_item_key: "item1", generation_source: "auto_inspection",
    title: "Hallazgo 1", status: "abierto", priority: "media",
  });
  created.punch.push(punchId);
  rec("A: auto-punch creado (source_test_id+item_key, generation_source)", pA.status < 300, `status=${pA.status}`);

  // (B) idempotencia: segundo insert con mismo (source_test_id, source_item_key) → 23505
  const pB = await insert("punch_items", {
    id: randomUUID(), project_id: proj.id, equipment_id: eq.id, test_id: test.id,
    source_test_id: test.id, source_item_key: "item1", generation_source: "auto_inspection",
    title: "dup", status: "abierto", priority: "media",
  });
  rec("B: replay duplicado bloqueado por UNIQUE", pB.status === 409 && (pB.body?.code === "23503" ? false : true), `status=${pB.status} code=${pB.body?.code}`);

  // (C) corregido sin evidencia → rechazado; con evidencia → ok + corrected_at
  const cNoEv = await api(`punch_items?id=eq.${punchId}`, { method: "PATCH", body: { status: "corregido" }, prefer: "return=representation" });
  const cBlocked = cNoEv.status >= 400;
  const evId = randomUUID();
  await insert("evidences", { id: evId, project_id: proj.id, equipment_id: eq.id, punch_id: punchId, type: "foto", stage: "correccion", captured_at: new Date().toISOString() });
  created.evidences.push(evId);
  const cOk = await api(`punch_items?id=eq.${punchId}`, { method: "PATCH", body: { status: "corregido" }, prefer: "return=representation" });
  const corrected = (await api(`punch_items?id=eq.${punchId}&select=corrected_at,corrected_by`)).body?.[0];
  rec("C: corregido exige evidencia (bloqueo sin ev) + materializa corrected_*", cBlocked && cOk.status < 300 && !!corrected?.corrected_at, `sinEv=${cNoEv.status} conEv=${cOk.status} corrected_at=${!!corrected?.corrected_at}`);

  // (E) cierre con full (admin) → cerrado + closed_*
  const closed = await api(`punch_items?id=eq.${punchId}`, { method: "PATCH", body: { status: "cerrado", verification_notes: "Probado en marcha" }, prefer: "return=representation" });
  const closedRow = (await api(`punch_items?id=eq.${punchId}&select=closed_at,closed_by,verification_notes`)).body?.[0];
  rec("E: cierre con full → cerrado + closed_* + verification_notes", closed.status < 300 && !!closedRow?.closed_at, `status=${closed.status} closed_at=${!!closedRow?.closed_at}`);

  // (F) reapertura → reopened_* + first_raised_at intacto
  const before = (await api(`punch_items?id=eq.${punchId}&select=first_raised_at`)).body?.[0]?.first_raised_at;
  await api(`punch_items?id=eq.${punchId}`, { method: "PATCH", body: { status: "abierto" }, prefer: "return=representation" });
  const after = (await api(`punch_items?id=eq.${punchId}&select=first_raised_at,reopened_at`)).body?.[0];
  rec("F: reapertura auditada (reopened_at) + first_raised_at inmutable", !!after?.reopened_at && after?.first_raised_at === before, `reopened_at=${!!after?.reopened_at} firstRaised inmutable=${after?.first_raised_at === before}`);

  // (G) MC bloqueado con punch abierto: equipo aprobado + punch abierto → MC_COMPLETED no aplica
  await api(`equipment?id=eq.${eq.id}`, { method: "PATCH", body: { status: "aprobado" } });
  const g = await rpc(token, "transition_equipment_state", { p_equipment_id: eq.id, p_event: "MC_COMPLETED", p_from_status: "aprobado" });
  rec("G: MC bloqueado con punch abierto", g.body?.applied === false && g.body?.reason === "open_punch", JSON.stringify(g.body));

  // (H) cerrar el último punch y permitir MC. Re-corregir (ya tiene evidencia) → cerrado, luego MC_COMPLETED aplica.
  await api(`punch_items?id=eq.${punchId}`, { method: "PATCH", body: { status: "corregido" } });
  await api(`punch_items?id=eq.${punchId}`, { method: "PATCH", body: { status: "cerrado" } });
  const h = await rpc(token, "transition_equipment_state", { p_equipment_id: eq.id, p_event: "MC_COMPLETED", p_from_status: "aprobado" });
  rec("H: MC permitido al cerrar el último punch", h.body?.applied === true && h.body?.status === "mechanical_completion", JSON.stringify(h.body));

  rec("nota D (cierre sin full)", true, "requiere usuario no-admin → cubierto por el test SQL 0054 (insufficient_privilege)");
}

async function cleanup() {
  log("\n--- CLEANUP ---");
  for (const id of created.equipment) await del(`equipment_status_history?equipment_id=eq.${id}`);
  if (created.evidences.length) await del(`evidences?id=in.(${created.evidences.join(",")})`);
  if (created.punch.length) await del(`punch_items?id=in.(${created.punch.join(",")})`);
  if (created.tests.length) await del(`tests?id=in.(${created.tests.join(",")})`);
  if (created.equipment.length) await del(`equipment?id=in.(${created.equipment.join(",")})`);
  if (created.projects.length) await del(`projects?id=in.(${created.projects.join(",")})`); // cascada a area/system/subsystem
  const left = created.projects.length ? (await api(`projects?id=in.(${created.projects.join(",")})&select=id`)).body : [];
  log(`cleanup: projects restantes=${left?.length ?? "?"}`);
}

try { await main(); }
catch (e) { rec("ERROR FATAL", false, e.message); }
finally {
  await cleanup();
  const ok = results.filter((r) => r.ok).length;
  log(`\n==== RESUMEN: ${ok}/${results.length} checks OK ====`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
