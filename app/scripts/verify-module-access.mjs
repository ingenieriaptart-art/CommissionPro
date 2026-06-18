/**
 * Verifica que las migraciones 0039/0040 estén aplicadas en Supabase.
 * Uso: NODE_TLS_REJECT_UNAUTHORIZED=0 node --env-file=.env.local scripts/verify-module-access.mjs
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

let ok = true;

// 1. Columna module_access en project_members
{
  const { error } = await sb.from("project_members").select("module_access").limit(1);
  if (error) { console.error("❌ columna module_access NO existe:", error.message); ok = false; }
  else console.log("✓ project_members.module_access existe");
}

// 2. Helpers / función corregida vía RPC no expuesta -> probamos indirecta:
//    si la columna existe asumimos 0039 aplicada; para 0040 probamos que las
//    funciones existan llamándolas vía un SELECT a través de PostgREST RPC
//    no es posible directamente; se valida en prueba manual de escritura.
console.log(ok
  ? "\n🎉 0039 aplicada. Verifica 0040 con una prueba de escritura real (usuario read no puede escribir)."
  : "\n⚠ Aplica database/migrations/_APPLY_module_access.sql en el SQL Editor.");

process.exit(ok ? 0 : 1);
