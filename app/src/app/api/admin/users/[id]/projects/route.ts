import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { sanitizeModuleAccess } from "@/lib/sanitizeModuleAccess";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

/** ¿El usuario destino tiene rol global admin? (para el saneo de módulos solo-admin) */
async function targetIsAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  userId: string
): Promise<boolean> {
  const { data } = await serviceClient
    .from("users")
    .select("role:roles(key)")
    .eq("id", userId)
    .maybeSingle();
  return data?.role?.key === "admin";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { project_id, role_id, module_access } = body ?? {};
  if (!project_id || !role_id) {
    return NextResponse.json({ error: "project_id y role_id son requeridos" }, { status: 400 });
  }

  const isAdminTarget = await targetIsAdmin(serviceClient, id);
  const cleanAccess = sanitizeModuleAccess(module_access, isAdminTarget);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (serviceClient as any)
    .from("project_members")
    .insert({ user_id: id, project_id, role_id, module_access: cleanAccess })
    .select("*, project:projects(id,name), role:roles(id,key,name)")
    .single();

  if (error) {
    const is409 = error.code === "23505";
    return NextResponse.json(
      { error: is409 ? "El usuario ya pertenece a este proyecto" : error.message },
      { status: is409 ? 409 : 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
