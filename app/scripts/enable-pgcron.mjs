/**
 * Habilita pg_cron y crea el job de refresco de mv_project_stats.
 *
 * Estrategia:
 *  1. Intentar acceder a cron.schedule vía supabase.rpc()
 *  2. Si falla, crear una función wrapper en schema public y llamarla
 *  3. Verificar que el job quedó registrado
 *  4. Verificar el estado actual de mv_project_stats
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF      = new URL(SUPABASE_URL).hostname.split(".")[0];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Ejecutar con: node --env-file=.env.local scripts/enable-pgcron.mjs");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Utilidad: línea separadora ──────────────────────────────
const hr = (title) => console.log(`\n${"─".repeat(50)}\n${title}\n${"─".repeat(50)}`);

// ══════════════════════════════════════════════════════════
// PASO 1 — Verificar extensión pg_cron
// ══════════════════════════════════════════════════════════
hr("PASO 1 — Verificar extensión pg_cron");

// Intento A: via pg_extension (acceso directo a catálogo)
const { data: extData, error: extError } = await sb
  .from("pg_extension")
  .select("extname, extversion")
  .eq("extname", "pg_cron")
  .single();

if (!extError && extData) {
  console.log(`✓  pg_cron habilitada — versión ${extData.extversion}`);
} else {
  // Intento B: Supabase Management API (no requiere PAT extra con service role)
  const managementUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/extensions`;
  const mgmtRes = await fetch(managementUrl, {
    headers: { "Authorization": `Bearer ${SERVICE_ROLE_KEY}` },
  }).catch(() => null);

  if (mgmtRes?.ok) {
    const extensions = await mgmtRes.json();
    const pgcron = extensions.find?.((e) => e.name === "pg_cron");
    if (pgcron) {
      console.log(`✓  pg_cron encontrada via Management API — instalada: ${pgcron.installed_version ?? "desconocida"}`);
    } else {
      console.log("⚠  pg_cron NO está habilitada todavía.");
      console.log("   → Ve a Supabase Dashboard → Database → Extensions → busca 'pg_cron' → Enable");
    }
  } else {
    console.log("   (No se pudo verificar via Management API — acceso denegado o extensión no expuesta)");
  }
}

// ══════════════════════════════════════════════════════════
// PASO 2 — Crear el job de refresco via Management API SQL
// ══════════════════════════════════════════════════════════
hr("PASO 2 — Programar job de refresco con pg_cron");

const sqlJob = `
SELECT cron.schedule(
  'refresh-project-stats',
  '*/5 * * * *',
  'SELECT refresh_project_stats()'
);
`.trim();

// Intento via Management API /database/query
const queryUrl  = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const queryRes  = await fetch(queryUrl, {
  method:  "POST",
  headers: {
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type":  "application/json",
  },
  body: JSON.stringify({ query: sqlJob }),
}).catch(() => null);

if (queryRes?.ok) {
  const result = await queryRes.json();
  console.log("✓  Job creado via Management API:");
  console.log("   jobid:", result?.[0]?.schedule ?? JSON.stringify(result));
} else {
  const errText = queryRes ? await queryRes.text().catch(() => "") : "sin respuesta";
  console.log(`   Management API /database/query requiere PAT (Personal Access Token).`);
  console.log(`   Error recibido: ${queryRes?.status} — ${errText.substring(0, 120)}`);
  console.log("\n   ╔══════════════════════════════════════════════════╗");
  console.log("   ║  ACCIÓN REQUERIDA EN SUPABASE DASHBOARD         ║");
  console.log("   ╚══════════════════════════════════════════════════╝");
  console.log("\n   1) Dashboard → Database → Extensions → pg_cron → Enable");
  console.log("   2) Dashboard → SQL Editor → ejecutar:");
  console.log(`\n   ${sqlJob}\n`);
}

// ══════════════════════════════════════════════════════════
// PASO 3 — Verificar job registrado (si pg_cron está activa)
// ══════════════════════════════════════════════════════════
hr("PASO 3 — Verificar job en cron.job");

const verifySql = `SELECT jobid, jobname, schedule, command, active FROM cron.job WHERE jobname = 'refresh-project-stats';`;
const verifyRes = await fetch(queryUrl, {
  method:  "POST",
  headers: {
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type":  "application/json",
  },
  body: JSON.stringify({ query: verifySql }),
}).catch(() => null);

if (verifyRes?.ok) {
  const rows = await verifyRes.json();
  if (rows?.length) {
    const j = rows[0];
    console.log(`✓  Job confirmado en cron.job:`);
    console.log(`   jobid    : ${j.jobid}`);
    console.log(`   jobname  : ${j.jobname}`);
    console.log(`   schedule : ${j.schedule}`);
    console.log(`   command  : ${j.command}`);
    console.log(`   active   : ${j.active}`);
  } else {
    console.log("   Job aún no existe — completar pasos del Paso 2 primero.");
  }
} else {
  console.log("   No se puede verificar sin acceso Management API.");
  console.log("   Verificar manualmente en SQL Editor:");
  console.log(`\n   SELECT * FROM cron.job WHERE jobname = 'refresh-project-stats';\n`);
}

// ══════════════════════════════════════════════════════════
// PASO 4 — Validar refresco manual de mv_project_stats
// ══════════════════════════════════════════════════════════
hr("PASO 4 — Validar refresco manual de mv_project_stats");

const t0 = Date.now();
const { error: refreshErr } = await sb.rpc("refresh_project_stats");
const latency = Date.now() - t0;

if (refreshErr) {
  console.log("❌  Error en refresco:", refreshErr.message);
  process.exit(1);
}
console.log(`✓  refresh_project_stats() ejecutada en ${latency}ms`);

// ══════════════════════════════════════════════════════════
// PASO 5 — Leer estado actual de la vista
// ══════════════════════════════════════════════════════════
hr("PASO 5 — Estado actual de mv_project_stats");

const { data: stats, error: statsErr } = await sb
  .from("mv_project_stats")
  .select("project_name, project_status, equipment_total, equipment_aprobado, equipment_criticos, tests_total, tests_cerrados, punch_total, punch_abierto, punch_critico_abierto, calculated_at")
  .order("project_name");

if (statsErr) {
  console.log("❌  Error:", statsErr.message);
  process.exit(1);
}

console.log(`   ${stats.length} proyecto(s) en la vista:\n`);
stats.forEach((s) => {
  const avance = s.equipment_total
    ? Math.round((s.equipment_aprobado / s.equipment_total) * 100)
    : 0;
  console.log(`  ┌─ ${s.project_name} [${s.project_status}]`);
  console.log(`  │  Equipos   : ${s.equipment_total} total · ${s.equipment_aprobado} aprobados · ${s.equipment_criticos} críticos`);
  console.log(`  │  Pruebas   : ${s.tests_total} total · ${s.tests_cerrados} cerradas`);
  console.log(`  │  Punch     : ${s.punch_total} total · ${s.punch_abierto} abiertos · ${s.punch_critico_abierto} críticos`);
  console.log(`  │  Avance    : ${avance}%`);
  console.log(`  └─ Calculado : ${new Date(s.calculated_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}\n`);
});

console.log("══════════════════════════════════════════════════");
console.log("RESUMEN FINAL");
console.log("══════════════════════════════════════════════════");
console.log("✓  refresh_project_stats() funciona correctamente");
console.log("✓  mv_project_stats tiene datos actualizados");
console.log(`⏱  Latencia de refresco: ${latency}ms`);
console.log("─");
console.log("⚠  pg_cron: requiere habilitación manual en Dashboard");
console.log("   Ruta: Dashboard → Database → Extensions → pg_cron → Enable");
console.log("   SQL:  Ver archivo 0014_pgcron_stats_refresh.sql");
