import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@supabase/supabase-js";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const serviceClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ equipmentId: string }> }
) {
  const { equipmentId } = await params;

  // Verificar sesión del usuario
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const file         = form.get("file") as File | null;
  const projectId    = form.get("projectId") as string | null;
  const name         = form.get("name") as string | null;
  const documentType = form.get("documentType") as string | null;

  if (!file || !projectId || !name || !documentType) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const allowedTypes = ["unifilar", "catalogo", "fat", "manual", "otro"] as const;
  if (!allowedTypes.includes(documentType as typeof allowedTypes[number])) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  const sc = serviceClient();

  // Verificar que el equipo pertenece al proyecto
  const { data: eq } = await sc
    .from("equipment")
    .select("id, project_id")
    .eq("id", equipmentId)
    .eq("project_id", projectId)
    .single();

  if (!eq) {
    return NextResponse.json({ error: "Equipo no encontrado en el proyecto" }, { status: 404 });
  }

  // Obtener app user id
  const { data: appUser } = await sc
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  // Subir archivo al storage con service role
  const safeName = file.name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `equipment/${equipmentId}/documents/${documentType}/${Date.now()}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await sc.storage
    .from("documents")
    .upload(path, arrayBuffer, { upsert: false, contentType: "application/pdf" });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: { publicUrl } } = sc.storage.from("documents").getPublicUrl(path);

  // Insertar registro con service role (sin RLS)
  const { data, error: insertErr } = await sc
    .from("equipment_documents")
    .insert({
      equipment_id:    equipmentId,
      project_id:      projectId,
      name:            name.trim(),
      document_type:   documentType,
      storage_url:     publicUrl,
      file_size_bytes: file.size,
      created_by:      appUser?.id ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    // Intentar borrar el archivo subido si el insert falló
    await sc.storage.from("documents").remove([path]);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ equipmentId: string }> }
) {
  const { equipmentId } = await params;

  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { documentId } = await req.json().catch(() => ({}));
  if (!documentId) return NextResponse.json({ error: "documentId requerido" }, { status: 400 });

  const sc = serviceClient();

  // Verificar rol del usuario
  const { data: appUser } = await sc
    .from("users")
    .select("id, role:roles(key)")
    .eq("auth_user_id", user.id)
    .single();

  const roleKey = (appUser?.role as { key?: string } | null)?.key;
  if (!["admin", "supervisor"].includes(roleKey ?? "")) {
    return NextResponse.json({ error: "Sin permisos para eliminar" }, { status: 403 });
  }

  // Obtener el documento
  const { data: doc } = await sc
    .from("equipment_documents")
    .select("id, storage_url, equipment_id")
    .eq("id", documentId)
    .eq("equipment_id", equipmentId)
    .single();

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await sc.from("equipment_documents").delete().eq("id", documentId);

  // Borrar del storage (best-effort)
  const storagePath = doc.storage_url.split("/documents/")[1];
  if (storagePath) await sc.storage.from("documents").remove([storagePath]);

  return NextResponse.json({ ok: true });
}
