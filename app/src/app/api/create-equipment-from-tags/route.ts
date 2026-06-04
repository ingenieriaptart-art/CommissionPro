// app/src/app/api/create-equipment-from-tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

// Mapeo detected_type (extractor de TAGs) → io_type (estándar ingeniería)
const IO_TYPE_MAP: Record<string, string> = {
  motor:         "DO",
  valvula:       "DO",
  sensor:        "AI",
  instrumento:   "AI",
  panel:         "COMM",
  transformador: "DO",
  cable:         "",
};

// Extrae código RTU/PLC del texto de contexto del tag
function extractRtu(context: string | null): string | null {
  if (!context) return null;
  const m = context.match(/\bRTU-\d+\b|\bPLC-\d+\b/i);
  return m ? m[0].toUpperCase() : null;
}

export async function POST(req: NextRequest) {
  // ── Validar body ────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  if (!body?.project_id || !Array.isArray(body?.tag_ids) || body.tag_ids.length === 0) {
    return NextResponse.json(
      { error: "project_id y tag_ids[] requeridos" },
      { status: 400 }
    );
  }
  const { project_id, tag_ids } = body as { project_id: string; tag_ids: string[] };

  // ── Autenticación (patrón Sprint 1) ─────────────────────────
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const token = req.headers.get("authorization")?.slice(7) ?? null;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user: authUser }, error: authErr } = await serviceClient.auth.getUser(token);
  if (authErr || !authUser) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  // ── Verificar membresía al proyecto ─────────────────────────
  const { data: appUser } = await serviceClient
    .from("users")
    .select("id, roles(key)")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!appUser) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = ((appUser as any).roles as Array<{ key: string }> | null)?.[0]?.key === "admin";

  if (!isAdmin) {
    const { count } = await serviceClient
      .from("project_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project_id)
      .eq("user_id", appUser.id);
    if ((count ?? 0) === 0) return NextResponse.json({ error: "Sin acceso al proyecto" }, { status: 403 });
  }

  // ── Cargar tags solicitados ──────────────────────────────────
  const { data: tags, error: tagsErr } = await serviceClient
    .from("engineering_extracted_tags")
    .select("id, tag, description, detected_type, extracted_data_json, document_id, status")
    .in("id", tag_ids)
    .eq("project_id", project_id)
    .in("status", ["approved", "merged"]);

  if (tagsErr) return NextResponse.json({ error: tagsErr.message }, { status: 500 });
  if (!tags || tags.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, existing: [], errors: [] });
  }

  // ── Obtener/crear subsistema SIN CLASIFICAR ──────────────────
  const { data: subsystemId, error: rpcErr } = await serviceClient.rpc(
    "get_or_create_unclassified_subsystem",
    { p_project_id: project_id }
  );
  if (rpcErr || !subsystemId) {
    return NextResponse.json({ error: "No se pudo obtener subsistema destino" }, { status: 500 });
  }

  // ── Check de TAGs que ya tienen equipo ──────────────────────
  const tagCodes = tags.map((t) => t.tag as string);
  const { data: existingRows } = await serviceClient
    .from("equipment")
    .select("tag")
    .eq("project_id", project_id)
    .in("tag", tagCodes)
    .is("deleted_at", null);

  const existingSet = new Set((existingRows ?? []).map((r) => r.tag as string));

  // ── Construir payload ────────────────────────────────────────
  const now      = new Date().toISOString();
  const toInsert: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const t of tags) {
    const tagCode = t.tag as string;
    if (existingSet.has(tagCode)) continue;

    const detectedType = (t.detected_type as string) ?? "";
    const context      = (t.extracted_data_json as Record<string, unknown> | null)
      ?.context as string | null ?? null;

    const name = (t.description as string | null) || tagCode;
    if (!name) { skipped.push(tagCode); continue; }

    toInsert.push({
      project_id,
      subsystem_id:    subsystemId as string,
      tag:             tagCode,
      name,
      io_type:         IO_TYPE_MAP[detectedType] || null,
      rtu_destination: extractRtu(context),
      criticality:     "media",
      status:          "pendiente",
      created_at:      now,
      updated_at:      now,
      metadata: {
        unclassified:       true,
        from_tag:           true,
        source_document_id: t.document_id,
      },
    });
  }

  // ── Bulk INSERT ──────────────────────────────────────────────
  let created = 0;
  const errors: { tag: string; reason: string }[] = [];

  if (toInsert.length > 0) {
    const { error: insertErr } = await serviceClient
      .from("equipment")
      .insert(toInsert);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    created = toInsert.length;
  }

  // ── Marcar tags approved → merged tras crear equipo ─────────
  const newTagCodes = toInsert.map((r) => r.tag as string);
  const toMergeIds  = tags
    .filter((t) => newTagCodes.includes(t.tag as string) && t.status === "approved")
    .map((t) => t.id as string);

  if (toMergeIds.length > 0) {
    await serviceClient
      .from("engineering_extracted_tags")
      .update({ status: "merged", updated_at: now })
      .in("id", toMergeIds)
      .eq("project_id", project_id);
  }

  return NextResponse.json({
    created,
    skipped:  skipped.length,
    existing: Array.from(existingSet),
    errors,
  });
}
