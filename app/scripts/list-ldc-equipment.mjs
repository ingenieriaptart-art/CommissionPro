import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const LDC_ID = "eba099c0-32ca-4be7-823f-4ab7f3480004";

const { data, error } = await sb
  .from("equipment")
  .select("id, tag, name, service, equipment_type_id")
  .eq("project_id", LDC_ID)
  .is("deleted_at", null)
  .order("tag");

if (error) { console.error(error); process.exit(1); }
console.log(`Total equipos LDC: ${data.length}\n`);
for (const e of data) {
  const typed = e.equipment_type_id ? "✓" : "·";
  console.log(`${typed}  ${e.tag.padEnd(12)} | ${e.name}`);
}
