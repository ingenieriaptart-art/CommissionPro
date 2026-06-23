"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EquipmentDocument, EquipmentDocumentType } from "@/types";

export function useEquipmentDocuments(equipmentId: string | null | undefined) {
  return useQuery({
    queryKey: ["equipment-documents", equipmentId],
    queryFn: async (): Promise<EquipmentDocument[]> => {
      const res = await fetch(`/api/equipment/${equipmentId}/documents`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al cargar documentos" }));
        throw new Error(err.error ?? "Error al cargar documentos");
      }
      return res.json() as Promise<EquipmentDocument[]>;
    },
    enabled: !!equipmentId,
  });
}

export function useUploadEquipmentDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      equipmentId: string;
      projectId: string;
      name: string;
      documentType: EquipmentDocumentType;
      file: File;
    }): Promise<EquipmentDocument> => {
      const { equipmentId, projectId, name, documentType, file } = payload;

      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);
      form.append("name", name.trim());
      form.append("documentType", documentType);

      const res = await fetch(`/api/equipment/${equipmentId}/documents`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al subir el documento" }));
        throw new Error(err.error ?? "Error al subir el documento");
      }

      return res.json() as Promise<EquipmentDocument>;
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
      const res = await fetch(`/api/equipment/${doc.equipment_id}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al eliminar" }));
        throw new Error(err.error ?? "Error al eliminar");
      }
    },
    onSuccess: (_, doc) => {
      qc.invalidateQueries({ queryKey: ["equipment-documents", doc.equipment_id] });
    },
  });
}
