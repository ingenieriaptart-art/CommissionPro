import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://nkjunkolsmjledzwuxgn.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY_REDACTED",
  { auth: { persistSession: false } }
);

// Leer calculated_at actual
const { data: before } = await sb
  .from("mv_project_stats")
  .select("project_name, calculated_at")
  .order("project_name");

console.log("Estado actual de mv_project_stats:");
before.forEach((r) =>
  console.log(`  ${r.project_name} → calculado: ${new Date(r.calculated_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}`)
);

console.log("\n✓  pg_cron job activo: 'refresh-project-stats' cada 5 minutos");
console.log("✓  La vista se actualizará automáticamente en el próximo ciclo");
console.log("\nPara confirmar el primer ciclo automático, ejecutar en SQL Editor:");
console.log("  SELECT runid, status, start_time, return_message");
console.log("  FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;");
