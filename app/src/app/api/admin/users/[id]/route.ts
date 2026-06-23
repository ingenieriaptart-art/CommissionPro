import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient, appUserId } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  if (id === appUserId && (body.status === "blocked" || body.status === "inactive")) {
    return NextResponse.json({ error: "No podés bloquear tu propia cuenta" }, { status: 400 });
  }

  const allowed = ["full_name", "position", "phone", "role_id", "status"] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = serviceClient as any;

  // Si cambia el status, sincronizar con Supabase Auth
  if ("status" in body) {
    // Necesitamos auth_user_id para la Admin API
    const { data: existing } = await sc
      .from("users")
      .select("auth_user_id")
      .eq("id", id)
      .single();

    if (existing?.auth_user_id) {
      const newStatus = body.status as string;
      const banDuration = newStatus === "active" ? "none" : "876000h";
      await sc.auth.admin.updateUserById(existing.auth_user_id, { ban_duration: banDuration });
    }
  }

  const { data, error } = await sc
    .from("users")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*, role:roles(id,key,name)")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
