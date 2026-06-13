import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import { parseExcelEquipment, listSheets } from "@/lib/excel-equipment-parser";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const serviceClient = getServiceClient();
  // ── Auth ─────────────────────────────────────────────────
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user: authUser }, error: authErr } =
    await serviceClient.auth.getUser(token);
  if (authErr || !authUser) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ── Parse multipart ──────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const file       = formData.get("file") as File | null;
  const project_id = formData.get("project_id") as string | null;
  const sheet_name = formData.get("sheet_name") as string | null | undefined;

  if (!file || !project_id) {
    return NextResponse.json(
      { error: "Se requieren los campos 'file' y 'project_id'" },
      { status: 400 }
    );
  }

  // ── Verificar acceso al proyecto vía RLS ─────────────────
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: projectAccess } = await userClient
    .from("projects")
    .select("id")
    .eq("id", project_id)
    .maybeSingle();

  if (!projectAccess) {
    return NextResponse.json({ error: "Sin acceso al proyecto" }, { status: 403 });
  }

  // Resolver app user id para auditoría
  const { data: appUser } = await serviceClient
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!appUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Listado de hojas (modo auxiliar) ─────────────────────
  if (formData.get("list_sheets") === "true") {
    return NextResponse.json({ sheets: listSheets(buffer) });
  }

  // ── Parsear Excel ────────────────────────────────────────
  const parsed = parseExcelEquipment(buffer, sheet_name ?? undefined);

  if (parsed.rows.length === 0) {
    return NextResponse.json({
      error:     `No se encontraron filas válidas. Encabezados detectados: [${parsed.detectedHeaders.join(" | ")}]`,
      sheetType: parsed.sheetType,
      sheetName: parsed.sheetName,
      skipped:   parsed.skipped,
      totalRows: parsed.totalRows,
    }, { status: 422 });
  }

  // ── Obtener subsistema SIN CLASIFICAR ────────────────────
  const { data: subsystemId, error: rpcErr } = await serviceClient
    .rpc("get_or_create_unclassified_subsystem", { p_project_id: project_id });

  if (rpcErr || !subsystemId) {
    return NextResponse.json(
      { error: "No se pudo obtener subsistema SIN CLASIFICAR", detail: rpcErr?.message },
      { status: 500 }
    );
  }

  // ── Deduplicación ────────────────────────────────────────
  // Primero deduplicar dentro del Excel (mismo TAG en múltiples filas → última gana)
  const uniqueRowsMap = new Map<string, typeof parsed.rows[0]>();
  for (const r of parsed.rows) uniqueRowsMap.set(r.tag, r);
  const uniqueRows = Array.from(uniqueRowsMap.values());

  const incomingTags = uniqueRows.map(r => r.tag);

  const { data: existing } = await serviceClient
    .from("equipment")
    .select("tag")
    .eq("project_id", project_id)
    .in("tag", incomingTags)
    .is("deleted_at", null);

  const existingSet = new Set((existing ?? []).map((e: { tag: string }) => e.tag));

  const toInsert = uniqueRows.filter(r => !existingSet.has(r.tag));
  const toUpdate = uniqueRows.filter(r =>  existingSet.has(r.tag));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  // ── Bulk INSERT ──────────────────────────────────────────
  if (toInsert.length > 0) {
    const insertPayload = toInsert.map(r => ({
      project_id,
      subsystem_id:    subsystemId,
      tag:             r.tag,
      name:            r.name,
      service:         r.service         ?? null,
      io_type:         r.io_type         ?? null,
      rtu_destination: r.rtu_destination ?? null,
      location_system: r.location_system ?? null,
      pid_reference:   r.pid_reference   ?? null,
      power_kw:        r.power_kw        ?? null,
      ccm_panel:       r.ccm_panel       ?? null,
      criticality:     "media" as const,
      status:          r.status ?? "pendiente",
      metadata: {
        unclassified: true,
        from_excel:   true,
        sheet_name:   parsed.sheetName,
        sheet_type:   parsed.sheetType,
        ...(r.metadata ?? {}),
      },
      created_by: appUser.id,
      updated_by: appUser.id,
    }));

    const { error: insertErr } = await serviceClient
      .from("equipment")
      .insert(insertPayload);

    if (insertErr) {
      errors.push(`INSERT: ${insertErr.message}`);
    } else {
      created = toInsert.length;
    }
  }

  // ── UPDATE campos de ingeniería en equipos existentes ────
  for (const r of toUpdate) {
    const updateFields: Record<string, unknown> = {};
    if (r.service)          updateFields.service          = r.service;
    if (r.io_type)          updateFields.io_type          = r.io_type;
    if (r.rtu_destination)  updateFields.rtu_destination  = r.rtu_destination;
    if (r.location_system)  updateFields.location_system  = r.location_system;
    if (r.pid_reference)    updateFields.pid_reference    = r.pid_reference;
    if (r.power_kw != null) updateFields.power_kw         = r.power_kw;
    if (r.ccm_panel)        updateFields.ccm_panel        = r.ccm_panel;

    if (Object.keys(updateFields).length === 0) continue;

    const { error: updateErr } = await serviceClient
      .from("equipment")
      .update(updateFields)
      .eq("project_id", project_id)
      .eq("tag", r.tag)
      .is("deleted_at", null);

    if (updateErr) {
      errors.push(`UPDATE ${r.tag}: ${updateErr.message}`);
    } else {
      updated++;
    }
  }

  return NextResponse.json({
    created,
    updated,
    skipped:   parsed.skipped,
    existing:  existingSet.size,
    sheetType: parsed.sheetType,
    sheetName: parsed.sheetName,
    totalRows: parsed.totalRows,
    errors:    errors.length > 0 ? errors : undefined,
  });
}
