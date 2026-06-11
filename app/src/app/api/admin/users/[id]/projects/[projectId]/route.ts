import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

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
