/**
 * Verifica migración 0028: is_active en template_sections y section_fields
 * Uso: node --env-file=.env.local scripts/verify-0028.mjs
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Leer una fila con is_active de cada tabla
const { data: sec, error: secErr } = await sb
  .from("template_sections")
  .select("id, code, is_active")
  .limit(3);

const { data: fld, error: fldErr } = await sb
  .from("section_fields")
  .select("id, key, is_active")
  .limit(3);

if (secErr) { console.error("❌ template_sections:", secErr.message); process.exit(1); }
if (fldErr) { console.error("❌ section_fields:",    fldErr.message); process.exit(1); }

console.log("✅ template_sections.is_active — OK");
sec.forEach(r => console.log(`   ${r.code}: is_active=${r.is_active}`));

console.log("✅ section_fields.is_active — OK");
fld.forEach(r => console.log(`   ${r.key}: is_active=${r.is_active}`));

console.log("\n🎉  Migración 0028 verificada correctamente.");
