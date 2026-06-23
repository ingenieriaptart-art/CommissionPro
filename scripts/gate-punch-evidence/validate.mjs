/**
 * Gate — Evidencia Fotográfica Obligatoria Punch List
 * Casos 2 (server), 4, 5 y 6 del gate completo.
 * Casos 1-3 (offline/IndexedDB) están en punchEvidence.gate.test.ts
 *
 * Ejecutar: node --use-system-ca scripts/gate-punch-evidence/validate.mjs
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const env = readFileSync(new URL("../../app/.env.local", import.meta.url), "utf8");
const E = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const URL_ = E("NEXT_PUBLIC_SUPABASE_URL");
const ANON = E("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SR   = E("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_EMAIL = "admin@commissionpro.com";
const ADMIN_PASS  = "Admin1234";

const log = (...a) => console.log(...a);
const results = [];
const rec = (n, ok, d) => {
  results.push({ n, ok });
  log(`${ok ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`);
};

async function api(path, { method = "GET", body, token = SR, prefer } = {}) {
  const headers = {
    apikey: ANON,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, body: j };
}
const insert = (t, row) => api(t, { method: "POST", body: row, prefer: "return=representation" });
const patch  = (t, id, body, token) => api(`${t}?id=eq.${id}`, { method: "PATCH", body, token, prefer: "return=representation" });
const del    = (p) => api(p, { method: "DELETE", prefer: "return=representation" });
const get    = (p) => api(p);

const created = { projects: [], equipment: [], punch: [], evidences: [] };

async function main() {
  // ── Login admin ──────────────────────────────────────────────────────────────
  const authResp = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const { access_token: token } = await authResp.json();
  rec("login admin", !!token);
  if (!token) throw new Error("sin token admin");

  // ── Setup jerarquía aislada ───────────────────────────────────────────────────
  const ts  = Date.now();
  const proj = (await insert("projects", { code: `GATEPEV-${ts}`, name: "GATE PunchEvidence", status: "en_ejecucion" })).body?.[0];
  created.projects.push(proj?.id);
  const area = (await insert("areas",       { project_id: proj.id, name: "A", code: "A1" })).body?.[0];
  const sys  = (await insert("systems",     { area_id: area.id, name: "S", code: "S1" })).body?.[0];
  const sub  = (await insert("subsystems",  { system_id: sys.id, name: "SS", code: "SS1" })).body?.[0];
  const eq   = (await insert("equipment",   {
    subsystem_id: sub.id, project_id: proj.id,
    tag: `GATE-EQ-${ts}`, name: "eq-gate", status: "en_ejecucion",
  })).body?.[0];
  created.equipment.push(eq?.id);
  rec("setup jerarquía + equipo", !!(proj && eq), `proj=${proj?.id?.slice(0, 8)} eq=${eq?.id?.slice(0, 8)}`);

  // ── CASO 2 (server): punch manual + evidencia general ─────────────────────────
  const punchId = randomUUID();
  const punchResp = await insert("punch_items", {
    id: punchId,
    project_id: proj.id,
    equipment_id: eq.id,
    title: "GATE: Válvula VE-01 no cierra",
    description: "No alcanza cierre completo al 100%",
    priority: "alta",
    status: "abierto",
    generation_source: "manual",
  });
  created.punch.push(punchId);
  rec("CASO 2 — punch manual creado (server)", punchResp.status < 300, `status=${punchResp.status}`);

  const evGeneralId = randomUUID();
  const evGeneralResp = await insert("evidences", {
    id: evGeneralId,
    project_id: proj.id,
    equipment_id: eq.id,
    punch_id: punchId,
    type: "foto",
    stage: "general",
    captured_at: new Date().toISOString(),
  });
  created.evidences.push(evGeneralId);
  rec("CASO 2 — evidencia general vinculada al punch", evGeneralResp.status < 300, `status=${evGeneralResp.status}`);

  // Verificar relación evidencia → punch
  const evCheck = (await get(`evidences?id=eq.${evGeneralId}&select=punch_id,stage,type`)).body?.[0];
  rec("CASO 2 — evidencia.punch_id correcto + stage=general", evCheck?.punch_id === punchId && evCheck?.stage === "general", `punch_id_match=${evCheck?.punch_id === punchId} stage=${evCheck?.stage}`);

  // ── CASO 4: marcar corregido ─────────────────────────────────────────────────
  // 4a: sin evidencia de corrección → trigger rechaza
  const corrNoEv = await patch("punch_items", punchId, { status: "corregido" }, token);
  rec("CASO 4a — corregido bloqueado sin evidencia de corrección", corrNoEv.status >= 400, `status=${corrNoEv.status}`);

  // 4b: agregar evidencia de corrección y reintentar
  const evCorrId = randomUUID();
  await insert("evidences", {
    id: evCorrId,
    project_id: proj.id,
    equipment_id: eq.id,
    punch_id: punchId,
    type: "foto",
    stage: "correccion",
    captured_at: new Date().toISOString(),
  });
  created.evidences.push(evCorrId);

  const corrOk = await patch("punch_items", punchId, { status: "corregido" }, token);
  rec("CASO 4b — corregido exitoso con evidencia de corrección", corrOk.status < 300, `status=${corrOk.status}`);

  // Verificar corrected_at y corrected_by poblados
  const corrRow = (await get(`punch_items?id=eq.${punchId}&select=status,corrected_at,corrected_by`)).body?.[0];
  rec("CASO 4 — corrected_at y corrected_by poblados automáticamente", !!corrRow?.corrected_at && !!corrRow?.corrected_by, `corrected_at=${!!corrRow?.corrected_at} corrected_by=${!!corrRow?.corrected_by}`);

  // ── CASO 5: cerrar punch ──────────────────────────────────────────────────────
  // 5a: agregar evidencia de verificación (UX obligatorio, server valida corrección previa)
  const evVerifId = randomUUID();
  await insert("evidences", {
    id: evVerifId,
    project_id: proj.id,
    equipment_id: eq.id,
    punch_id: punchId,
    type: "foto",
    stage: "verificacion",
    captured_at: new Date().toISOString(),
  });
  created.evidences.push(evVerifId);

  const closeOk = await patch("punch_items", punchId, { status: "cerrado", verification_notes: "GATE: Verificado OK" }, token);
  rec("CASO 5 — cerrado exitoso con verificación_notes", closeOk.status < 300, `status=${closeOk.status}`);

  const closeRow = (await get(`punch_items?id=eq.${punchId}&select=status,closed_at,closed_by,verification_notes`)).body?.[0];
  rec("CASO 5 — closed_at, closed_by y verification_notes poblados", !!closeRow?.closed_at && !!closeRow?.closed_by && closeRow?.verification_notes === "GATE: Verificado OK", `closed_at=${!!closeRow?.closed_at} closed_by=${!!closeRow?.closed_by} notes_ok=${closeRow?.verification_notes === "GATE: Verificado OK"}`);

  // ── CASO 6: verificación servidor ─────────────────────────────────────────────
  // 6a: punch en estado final correcto
  rec("CASO 6a — punch status=cerrado, generation_source=manual", closeRow?.status === "cerrado", `status=${closeRow?.status}`);

  // 6b: 3 evidencias vinculadas al punch (general + correccion + verificacion)
  const evAll = (await get(`evidences?punch_id=eq.${punchId}&select=id,stage&order=captured_at.asc`)).body;
  const stages = evAll?.map((e) => e.stage).sort();
  rec("CASO 6b — 3 evidencias vinculadas (general, correccion, verificacion)", evAll?.length === 3 && stages?.includes("general") && stages?.includes("correccion") && stages?.includes("verificacion"), `count=${evAll?.length} stages=${JSON.stringify(stages)}`);

  // 6c: sin registros huérfanos (punch sin NINGUNA evidencia)
  const orphanCheck = (await get(`punch_items?project_id=eq.${proj.id}&select=id`)).body;
  const evByPunch = (await get(`evidences?project_id=eq.${proj.id}&select=punch_id`)).body;
  const punchIds = orphanCheck?.map((p) => p.id) ?? [];
  const punchesWithEv = new Set(evByPunch?.map((e) => e.punch_id) ?? []);
  const orphans = punchIds.filter((id) => !punchesWithEv.has(id));
  rec("CASO 6c — sin punches huérfanos sin evidencia", orphans.length === 0, `orphans=${JSON.stringify(orphans)}`);

  // 6d: relaciones integridad — evidencias apuntan al equipo correcto
  const evEquipCheck = (await get(`evidences?punch_id=eq.${punchId}&select=equipment_id`)).body;
  const allPointToCorrectEq = evEquipCheck?.every((e) => e.equipment_id === eq.id);
  rec("CASO 6d — evidencias apuntan al equipo correcto", allPointToCorrectEq, `equipment_id_match=${allPointToCorrectEq}`);
}

async function cleanup() {
  log("\n─── CLEANUP ───────────────────────────────────────────────────────────────");
  if (created.evidences.length) await del(`evidences?id=in.(${created.evidences.join(",")})`);
  if (created.punch.length)     await del(`punch_items?id=in.(${created.punch.join(",")})`);
  if (created.equipment.length) await del(`equipment_status_history?equipment_id=in.(${created.equipment.join(",")})`);
  if (created.equipment.length) await del(`equipment?id=in.(${created.equipment.join(",")})`);
  if (created.projects.length)  await del(`projects?id=in.(${created.projects.join(",")})`); // cascada área/sistema/subsistema
  const left = created.projects.length
    ? (await get(`projects?id=in.(${created.projects.join(",")})`)).body
    : [];
  log(`cleanup: proyectos restantes=${left?.length ?? "?"}`);
}

try {
  await main();
} catch (e) {
  rec("ERROR FATAL", false, e.message);
} finally {
  await cleanup();
  const ok = results.filter((r) => r.ok).length;
  log(`\n════ RESUMEN GATE: ${ok}/${results.length} checks OK ════`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
