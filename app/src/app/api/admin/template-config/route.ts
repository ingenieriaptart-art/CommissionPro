import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

// PATCH /api/admin/template-config
// Body: { table: "template_sections" | "section_fields", id: string, is_active: boolean }
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const body = await req.json().catch(() => null);
  const { table, id, is_active } = body ?? {};

  if (!table || !id || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "Faltan parámetros: table, id, is_active" }, { status: 400 });
  }

  if (table !== "template_sections" && table !== "section_fields") {
    return NextResponse.json({ error: "Tabla no permitida" }, { status: 400 });
  }

  const { error } = await serviceClient
    .from(table)
    .update({ is_active })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
