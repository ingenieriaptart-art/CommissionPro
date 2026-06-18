import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { sanitizeModuleAccess } from "@/lib/sanitizeModuleAccess";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; projectId: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const { id, projectId } = await params;
  const body = await req.json().catch(() => null);
  const { role_id, module_access } = body ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  if (typeof role_id === "string" && role_id) patch.role_id = role_id;

  if (module_access !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: u } = await (serviceClient as any)
      .from("users").select("role:roles(key)").eq("id", id).maybeSingle();
    const isAdminTarget = u?.role?.key === "admin";
    patch.module_access = sanitizeModuleAccess(module_access, isAdminTarget);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (serviceClient as any)
    .from("project_members")
    .update(patch)
    .eq("user_id", id)
    .eq("project_id", projectId)
    .select("*, project:projects(id,name), role:roles(id,key,name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; projectId: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const { id, projectId } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (serviceClient as any)
    .from("project_members")
    .delete()
    .eq("user_id",    id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
