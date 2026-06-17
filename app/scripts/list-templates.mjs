import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await sb.from("form_templates").select("key, name, project_id, deleted_at").order("key");
console.log("Total templates en Supabase:", data.length);
data.forEach(t => console.log(`  ${t.key.padEnd(14)} ${t.project_id ? "PROYECTO" : "GLOBAL  "} ${t.deleted_at ? "[BORRADO]" : "         "} ${t.name}`));
