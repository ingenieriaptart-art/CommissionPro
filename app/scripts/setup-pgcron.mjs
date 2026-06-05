import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nkjunkolsmjledzwuxgn.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY_REDACTED"
);

// ── Paso 1: Verificar extensión pg_cron ──────────────────────
console.log("── Paso 1: Verificando extensión pg_cron ──");
const { data: ext, error: extErr } = await supabase
  .from("pg_extension")
  .select("extname, extversion")
  .eq("extname", "pg_cron")
  .single();

if (extErr || !ext) {
  console.log("⚠️  pg_cron no encontrada en pg_extension.");
  console.log("   Verificando vía información de schema...");
  const { data: schema } = await supabase
    .rpc("query_pg_cron_status");
  console.log("   Resultado RPC:", schema);
} else {
  console.log(`✓  pg_cron habilitada — versión ${ext.extversion}`);
}

// ── Paso 2: Crear el job de refresco ─────────────────────────
console.log("\n── Paso 2: Creando job pg_cron ──");
const { data: job, error: jobErr } = await supabase.rpc("schedule_stats_refresh");
if (jobErr) {
  // Intentar directamente con cron.schedule vía SQL
  console.log("   RPC schedule_stats_refresh no disponible:", jobErr.message);
  console.log("   El job debe crearse manualmente desde el SQL Editor de Supabase.");
  console.log("\n   SQL a ejecutar en Supabase Dashboard → SQL Editor:");
  console.log(`
SELECT cron.schedule(
  'refresh-project-stats',
  '*/5 * * * *',
  'SELECT refresh_project_stats()'
);
  `);
} else {
  console.log("✓  Job creado con ID:", job);
}

// ── Paso 3: Verificar jobs existentes ────────────────────────
console.log("\n── Paso 3: Verificando jobs en cron.job ──");
const { data: jobs, error: jobsErr } = await supabase
  .from("cron.job")
  .select("jobid, jobname, schedule, command, active")
  .order("jobid");

if (jobsErr) {
  console.log("   No se puede leer cron.job directamente:", jobsErr.message);
  console.log("   Verificar desde SQL Editor: SELECT * FROM cron.job;");
} else {
  console.log("   Jobs activos:", JSON.stringify(jobs, null, 2));
}

// ── Paso 4: Validar refresco manual ──────────────────────────
console.log("\n── Paso 4: Ejecutando refresco manual de mv_project_stats ──");
const { error: refreshErr } = await supabase.rpc("refresh_project_stats");
if (refreshErr) {
  console.log("❌ Error en refresco:", refreshErr.message);
} else {
  console.log("✓  mv_project_stats refrescada correctamente");
}

// ── Paso 5: Leer datos actuales de la vista ──────────────────
console.log("\n── Paso 5: Datos actuales en mv_project_stats ──");
const { data: stats, error: statsErr } = await supabase
  .from("mv_project_stats")
  .select("project_id, project_name, equipment_total, tests_total, punch_total, calculated_at")
  .order("project_name");

if (statsErr) {
  console.log("❌ Error leyendo mv_project_stats:", statsErr.message);
} else if (!stats || stats.length === 0) {
  console.log("   Vista vacía — sin proyectos en el sistema todavía.");
} else {
  console.log("   Proyectos en mv_project_stats:");
  stats.forEach((s) => {
    console.log(`   • ${s.project_name}`);
    console.log(`     Equipos: ${s.equipment_total}  Pruebas: ${s.tests_total}  Punch: ${s.punch_total}`);
    console.log(`     Calculado: ${s.calculated_at}`);
  });
}
