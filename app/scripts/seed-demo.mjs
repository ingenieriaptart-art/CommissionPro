import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nkjunkolsmjledzwuxgn.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY_REDACTED"
);

const { error: e1 } = await supabase
  .from("projects")
  .update({ name: "PTAR Bojacá", code: "PTAR-BOJ-2024", location: "Bojacá, Cundinamarca" })
  .eq("code", "PTAR-SAL-2024");

const { error: e2 } = await supabase
  .from("projects")
  .update({ name: "PTAR Zipaquirá", code: "PTAR-ZIP-2024", location: "Zipaquirá, Cundinamarca" })
  .eq("code", "PTAP-LAG-2024");

if (e1 || e2) { console.error(e1?.message, e2?.message); process.exit(1); }
console.log("✓ Proyectos renombrados: PTAR Bojacá y PTAR Zipaquirá");
