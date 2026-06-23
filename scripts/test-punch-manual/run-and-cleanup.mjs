/**
 * Prueba manual del módulo Punch List en producción.
 *
 * USO:
 *   node --use-system-ca scripts/test-punch-manual/run-and-cleanup.mjs        ← crea el punch
 *   node --use-system-ca scripts/test-punch-manual/run-and-cleanup.mjs clean  ← borra todo
 *
 * El script guarda los IDs creados en test-punch-manual/last-run.json
 * para que el cleanup siempre borre exactamente lo que se creó.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dir, "last-run.json");

const env = readFileSync(new URL("../../app/.env.local", import.meta.url), "utf8");
const E = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const URL_   = E("NEXT_PUBLIC_SUPABASE_URL");
const ANON   = E("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SR     = E("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_EMAIL = "admin@commissionpro.com";
const ADMIN_PASS  = "Admin1234";

const log = (...a) => console.log(...a);

async function api(path, { method = "GET", body, token = SR, prefer } = {}) {
  const headers = { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, body: j };
}
const insert = (t, row) => api(t, { method: "POST", body: row, prefer: "return=representation" });
const del    = (p)       => api(p, { method: "DELETE" });
const get    = (p)       => api(p);

// ─── CLEANUP ──────────────────────────────────────────────────────────────────
async function cleanup() {
  if (!existsSync(STATE_FILE)) {
    log("No hay last-run.json — nada que borrar.");
    return;
  }
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  log("\n🧹 Borrando datos del test...");

  if (state.evidences?.length) {
    await del(`evidences?id=in.(${state.evidences.join(",")})`);
    log(`  ✅ Evidencias eliminadas (${state.evidences.length})`);
  }
  if (state.punch?.length) {
    await del(`punch_items?id=in.(${state.punch.join(",")})`);
    log(`  ✅ Punch eliminado`);
  }
  if (state.equipment?.length) {
    await del(`equipment_status_history?equipment_id=in.(${state.equipment.join(",")})`);
    await del(`equipment?id=in.(${state.equipment.join(",")})`);
    log(`  ✅ Equipo eliminado`);
  }
  if (state.project) {
    await del(`projects?id=eq.${state.project}`);
    log(`  ✅ Proyecto de prueba eliminado (cascada área/sistema/subsistema)`);
  }

  // Verificar que no quedó nada
  if (state.punch?.length) {
    const check = (await get(`punch_items?id=in.(${state.punch.join(",")})`)).body;
    if (!check?.length) log("\n✅ Base de datos limpia — no quedó ningún registro de prueba.");
    else log(`\n⚠️  Aún quedan ${check.length} registros — revisa manualmente.`);
  }
}

// ─── CREAR PUNCH DE PRUEBA ────────────────────────────────────────────────────
async function createTest() {
  log("🔐 Login admin...");
  const authResp = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const { access_token: token } = await authResp.json();
  if (!token) throw new Error("No se pudo obtener token de admin");
  log("  ✅ Token OK");

  // Proyecto de prueba aislado
  const ts = Date.now();
  log("\n📁 Creando proyecto de prueba...");
  const proj = (await insert("projects", {
    code: `TEST-PUNCH-${ts}`,
    name: "TEST Punch Evidencia — BORRAR",
    status: "en_ejecucion",
  })).body?.[0];
  const area = (await insert("areas",      { project_id: proj.id, name: "Área Test", code: "AT1" })).body?.[0];
  const sys  = (await insert("systems",    { area_id: area.id, name: "Sistema Test", code: "ST1" })).body?.[0];
  const sub  = (await insert("subsystems", { system_id: sys.id, name: "Subsistema Test", code: "SS1" })).body?.[0];
  const eq   = (await insert("equipment", {
    subsystem_id: sub.id, project_id: proj.id,
    tag: `EQ-TEST-${ts}`, name: "Equipo de prueba punch", status: "en_ejecucion",
  })).body?.[0];
  log(`  ✅ Proyecto: ${proj.id.slice(0, 8)}... | Equipo: ${eq.tag}`);

  // Punch
  log("\n📋 Creando punch de prueba...");
  const punchId = randomUUID();
  const punchResp = await insert("punch_items", {
    id: punchId,
    project_id: proj.id,
    equipment_id: eq.id,
    title: "🧪 TEST — Válvula de prueba no cierra",
    description: "Punch creado por script de prueba manual. BORRAR después de verificar.",
    priority: "alta",
    status: "abierto",
    generation_source: "manual",
  });
  if (punchResp.status >= 300) throw new Error(`Punch falló: ${JSON.stringify(punchResp.body)}`);
  log(`  ✅ Punch creado: ${punchId.slice(0, 8)}...`);

  // Evidencia general (simula la foto obligatoria al crear)
  log("\n📸 Adjuntando evidencia general (simula foto al crear punch)...");
  const evId = randomUUID();
  const evResp = await insert("evidences", {
    id: evId,
    project_id: proj.id,
    equipment_id: eq.id,
    punch_id: punchId,
    type: "foto",
    stage: "general",
    captured_at: new Date().toISOString(),
  });
  if (evResp.status >= 300) throw new Error(`Evidencia falló: ${JSON.stringify(evResp.body)}`);
  log(`  ✅ Evidencia general: ${evId.slice(0, 8)}...`);

  // Guardar IDs para cleanup
  const state = {
    createdAt: new Date().toISOString(),
    project: proj.id,
    equipment: [eq.id],
    punch: [punchId],
    evidences: [evId],
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  log(`
════════════════════════════════════════════════════════
✅ PUNCH DE PRUEBA CREADO EN PRODUCCIÓN

Proyecto : ${proj.code}
Equipo   : ${eq.tag}
Punch ID : ${punchId}
Estado   : abierto | prioridad: alta

👉 Búscalo en la app bajo el proyecto "${proj.name}"

Cuando termines de verificar, ejecuta:
  node --use-system-ca scripts/test-punch-manual/run-and-cleanup.mjs clean
════════════════════════════════════════════════════════`);
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
const mode = process.argv[2];
if (mode === "clean") {
  await cleanup();
} else {
  await createTest();
}
