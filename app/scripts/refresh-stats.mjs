import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nkjunkolsmjledzwuxgn.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY_REDACTED"
);

const { error } = await supabase.rpc("refresh_project_stats");
if (error) { console.error("Error:", error.message); process.exit(1); }
console.log("✓ mv_project_stats actualizada");
