import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = SupabaseClient<any, any, any>;

export type AdminAuthResult =
  | { ok: true;  serviceClient: ServiceClient; appUserId: string }
  | { ok: false; response: NextResponse };

export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  ) as ServiceClient;

  const token = req.headers.get("authorization")?.slice(7) ?? null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const { data: { user: authUser }, error: authErr } = await serviceClient.auth.getUser(token);
  if (authErr || !authUser) {
    return { ok: false, response: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };
  }

  const { data: appUser, error: userErr } = await serviceClient
    .from("users")
    .select("id, role:roles(key)")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (userErr) {
    return { ok: false, response: NextResponse.json({ error: "Error interno" }, { status: 500 }) };
  }
  if (!appUser) {
    return { ok: false, response: NextResponse.json({ error: "Sin acceso" }, { status: 403 }) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleKey = ((appUser as any).role as { key: string } | null)?.key;
  if (roleKey !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Se requiere rol admin" }, { status: 403 }) };
  }

  return { ok: true, serviceClient, appUserId: (appUser as { id: string }).id };
}
