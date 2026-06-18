import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

// PATCH /api/admin/template-config
// Body:
//   { table: "section_fields", id, is_active }                  → toggle global del campo
//   { table: "template_sections", id, is_active, template_id }  → toggle POR PLANTILLA (override)
//   { table: "template_sections", id, is_active }               → toggle global (compat)
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const body = await req.json().catch(() => null);
  const { table, id, is_active, template_id } = body ?? {};

  if (!table || !id || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "Faltan parámetros: table, id, is_active" }, { status: 400 });
  }

  if (table !== "template_sections" && table !== "section_fields") {
    return NextResponse.json({ error: "Tabla no permitida" }, { status: 400 });
  }

  // Sección + template_id → override POR PLANTILLA en form_template_sections
  if (table === "template_sections" && template_id) {
    const { data: existing, error: selErr } = await serviceClient
      .from("form_template_sections")
      .select("id")
      .eq("template_id", template_id)
      .eq("section_id", id)
      .maybeSingle();
    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

    if (existing) {
      const { error } = await serviceClient
        .from("form_template_sections")
        .update({ is_active })
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // crear override conservando el orden real de la sección
      const { data: sec } = await serviceClient
        .from("template_sections")
        .select("sort_order")
        .eq("id", id)
        .maybeSingle();
      const { error } = await serviceClient
        .from("form_template_sections")
        .insert({
          template_id,
          section_id: id,
          is_active,
          sort_order: sec?.sort_order ?? 0,
          is_required: true,
        });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Caso global (campos, o secciones sin template_id)
  const { error } = await serviceClient
    .from(table)
    .update({ is_active })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
