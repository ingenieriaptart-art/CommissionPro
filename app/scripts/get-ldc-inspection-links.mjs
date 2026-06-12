import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const LDC_ID = "eba099c0-32ca-4be7-823f-4ab7f3480004";

// Tomar 5 equipos representativos
const { data: equips } = await sb
  .from("equipment")
  .select("id, tag, name")
  .eq("project_id", LDC_ID)
  .is("deleted_at", null)
  .in("tag", ["B1", "SA1", "SB4", "AGI", "GED"]);

for (const eq of equips ?? []) {
  const { data: tpls } = await sb.rpc("get_equipment_templates", { p_equipment_id: eq.id });
  const first = tpls?.[0];
  if (first) {
    console.log(`\n${eq.tag} — ${eq.name}`);
    console.log(`  → http://localhost:3000/equipment/${eq.id}/inspection/${first.template_id}?returnTo=/`);
    console.log(`  Plantilla: ${first.template_key} (${first.template_name}) [${first.source}]`);
  }
}
