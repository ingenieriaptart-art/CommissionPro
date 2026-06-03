"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import { v4 as uuidv4 } from "uuid";
import type { Document } from "@/types";

const STORAGE_BUCKET = "documents";

// ── Lectura ───────────────────────────────────────────────────

export function useDocuments(projectId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["documents", projectId],
    queryFn: async (): Promise<Document[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Document[];
    },
    enabled: !!projectId,
    // D4: Supabase Realtime es el mecanismo principal (useEffect abajo).
    // refetchInterval como fallback de seguridad: activo si Realtime no está
    // habilitado en Supabase Dashboard → Database → Replication.
    refetchInterval: 30_000,
  });

  // D4: Suscripción Realtime para actualizaciones de processing_status.
  // Requisito previo: habilitar Realtime para la tabla 'documents' en
  // Supabase Dashboard → Database → Replication (Publications).
  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();
    const channel  = supabase
      .channel(`documents:project:${projectId}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "documents",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Invalida la query para refetch al recibir cualquier UPDATE
          qc.invalidateQueries({ queryKey: ["documents", projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, qc]);

  return query;
}

// ── Upload + disparo de procesamiento ─────────────────────────

export function useUploadDocument() {
  const qc   = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      file,
      projectId,
      category = "ingenieria",
    }: {
      file:      File;
      projectId: string;
      category?: string;
    }): Promise<Document> => {
      const supabase   = createClient();
      const documentId = uuidv4();
      const extension  = file.name.split(".").pop()?.toLowerCase() ?? "";
      const safeName   = file.name
        .normalize("NFD").replace(/[̀-ͯ]/g, "")  // quitar tildes
        .replace(/[^a-zA-Z0-9._-]/g, "_");                  // espacios y caracteres especiales → _
      const storagePath = `${projectId}/${documentId}/${safeName}`;

      // 1. Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw new Error(`Upload falló: ${uploadError.message}`);

      // 2. URL pública (para previsualización; el API route usa storage_path)
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // 3. Insertar registro en documents (RLS documents_insert aplica)
      const now: string  = new Date().toISOString();
      const doc: Partial<Document> = {
        id:                documentId,
        project_id:        projectId,
        name:              file.name,
        file_type:         extension,
        mime_type:         file.type || `application/${extension}`,
        category,
        storage_url:       urlData.publicUrl,
        storage_path:      storagePath,
        file_size:         file.size,
        version:           1,
        uploaded_by:       user?.id,
        uploaded_at:       now,
        processing_status: "processing",
      };

      const { error: dbError } = await supabase.from("documents").insert(doc);
      if (dbError) throw new Error(`Error guardando documento: ${dbError.message}`);

      // 4. Disparar procesamiento (fire-and-forget intencional)
      // El API route actualiza processing_status a 'completed' o 'failed'.
      // El Realtime subscription en useDocuments notificará el cambio de estado.
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[upload] session token:", session?.access_token ? session.access_token.substring(0, 30) + "..." : "NULL");
      fetch("/api/process-document", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body:    JSON.stringify({ document_id: documentId, project_id: projectId }),
      }).catch((err) => {
        console.warn("[useUploadDocument] Processing request failed:", err?.message);
      });

      return doc as Document;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["documents", doc.project_id] });
    },
  });
}

// ── Eliminación (soft delete) ─────────────────────────────────

export function useDeleteDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      document,
      projectId,
    }: {
      document:  Document;
      projectId: string;
    }) => {
      const supabase = createClient();

      // Eliminar archivo físico de Storage
      if (document.storage_path) {
        const { error: storageErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([document.storage_path]);
        if (storageErr) console.warn("[useDeleteDocument] Storage remove error:", storageErr.message);
      }

      // Soft delete del registro — RLS documents_update aplica
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() } as unknown as Partial<Document>)
        .eq("id", document.id)
        .eq("project_id", projectId); // defensa en profundidad
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["documents", projectId] });
    },
  });
}
