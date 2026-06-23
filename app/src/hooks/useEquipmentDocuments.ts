"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import type { EquipmentDocument, EquipmentDocumentType } from "@/types";

export function useEquipmentDocuments(equipmentId: string | null | undefined) {
  return useQuery({
    queryKey: ["equipment-documents", equipmentId],
    queryFn: async (): Promise<EquipmentDocument[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("equipment_documents")
        .select("*")
        .eq("equipment_id", equipmentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EquipmentDocument[];
    },
    enabled: !!equipmentId,
  });
}

export function useUploadEquipmentDocument() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (payload: {
      equipmentId: string;
      projectId: string;
      name: string;
      documentType: EquipmentDocumentType;
      file: File;
    }): Promise<EquipmentDocument> => {
      const { equipmentId, projectId, name, documentType, file } = payload;
      const supabase = createClient();

      const safeName = file.name
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `equipment/${equipmentId}/documents/${documentType}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false, contentType: "application/pdf" });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);

      const record = {
        equipment_id: equipmentId,
        project_id: projectId,
        name: name.trim(),
        document_type: documentType,
        storage_url: publicUrl,
        file_size_bytes: file.size,
        created_by: user?.id ?? null,
      };

      const { data, error } = await supabase
        .from("equipment_documents")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as EquipmentDocument;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["equipment-documents", doc.equipment_id] });
    },
    onError: (err) => {
      console.error("[EquipmentDocuments] upload error:", err);
    },
  });
}

export function useDeleteEquipmentDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: EquipmentDocument): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from("equipment_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;

      // Borrar del storage (best-effort, no bloquea si falla)
      const path = doc.storage_url.split("/documents/")[1];
      if (path) {
        await supabase.storage.from("documents").remove([path]);
      }
    },
    onSuccess: (_, doc) => {
      qc.invalidateQueries({ queryKey: ["equipment-documents", doc.equipment_id] });
    },
  });
}
