import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Ejecutar con: node --env-file=.env.local scripts/validate-stats.mjs");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const before = new Date().toISOString();
console.log(`Timestamp antes del refresco: ${before}`);

// Refresco manual
const { error } = await supabase.rpc("refresh_project_stats");
if (error) { console.error("Error:", error.message); process.exit(1); }

// Leer vista actualizada
const { data: stats } = await supabase
  .from("mv_project_stats")
  .select("project_name, project_status, equipment_total, equipment_aprobado, tests_total, tests_cerrados, punch_total, punch_abierto, calculated_at")
  .order("project_name");

console.log(`\n✓ mv_project_stats actualizada. ${stats.length} proyecto(s):\n`);
stats.forEach((s) => {
  console.log(`  Proyecto  : ${s.project_name} (${s.project_status})`);
  console.log(`  Equipos   : ${s.equipment_total} total / ${s.equipment_aprobado} aprobados`);
  console.log(`  Pruebas   : ${s.tests_total} total / ${s.tests_cerrados} cerradas`);
  console.log(`  Punch     : ${s.punch_total} total / ${s.punch_abierto} abiertos`);
  console.log(`  Calculado : ${s.calculated_at}`);
  console.log();
});
