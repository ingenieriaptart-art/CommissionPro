"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import type { EngineeredTag, TagStatus } from "@/types";

// ── Lectura de tags extraídos ─────────────────────────────────

export function useExtractedTags(projectId: string, documentId?: string) {
  return useQuery({
    queryKey: ["eng-tags", projectId, documentId ?? null],
    queryFn: async (): Promise<EngineeredTag[]> => {
      const supabase = createClient();
      let q = supabase
        .from("engineering_extracted_tags")
        .select([
          "*",
          "document:documents(id, name, file_type)",
          "entity:engineering_document_entities(id, source_text, page_number, raw_value)",
        ].join(", "))
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (documentId) q = q.eq("document_id", documentId);

      const { data, error } = await q;
      if (error) throw error;
      // El tipo inferido por Supabase para queries con JOINs no coincide
      // exactamente con EngineeredTag — se usa double assertion.
      return (data ?? []) as unknown as EngineeredTag[];
    },
    enabled: !!projectId,
  });
}

// ── Stats de la bandeja (query ligera — solo columna status) ──
// D5: query independiente con query key diferente a useExtractedTags.
// Evita la doble carga de todos los tags en engineering/page.tsx.

export function useTagStats(projectId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["eng-tags-stats", projectId],
    queryFn: async () => {
      const supabase = createClient();
      // Solo carga la columna status — payload mínimo
      const { data: rows, error } = await supabase
        .from("engineering_extracted_tags")
        .select("status")
        .eq("project_id", projectId);
      if (error) throw error;
      const r = rows ?? [];
      return {
        total:          r.length,
        pending_review: r.filter((x) => x.status === "pending_review").length,
        approved:       r.filter((x) => x.status === "approved").length,
        rejected:       r.filter((x) => x.status === "rejected").length,
        merged:         r.filter((x) => x.status === "merged").length,
      };
    },
    enabled: !!projectId,
  });

  // Mantener API { stats, isLoading } para compatibilidad con engineering/page.tsx
  return {
    stats: data ?? { total: 0, pending_review: 0, approved: 0, rejected: 0, merged: 0 },
    isLoading,
  };
}

export function useTagPatterns(projectId: string) {
  return useQuery({
    queryKey: ["tag-patterns", projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tag_pattern_rules")
        .select("*")
        .or(`project_id.eq.${projectId},project_id.is.null`)
        .eq("is_active", true)
        .order("priority", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

// ── Mutaciones de revisión ────────────────────────────────────

function useReviewTag() {
  const qc   = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      status,
      notes,
    }: {
      id:        string;
      projectId: string;
      status:    TagStatus;
      notes?:    string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("engineering_extracted_tags")
        .update({
          status,
          reviewed_by:  user?.id ?? null,
          reviewed_at:  new Date().toISOString(),
          review_notes: notes ?? null,
        })
        .eq("id", id)
        .eq("project_id", projectId); // defensa en profundidad
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["eng-tags", projectId] });
      qc.invalidateQueries({ queryKey: ["eng-tags-stats", projectId] });
    },
  });
}

export function useApproveTag() {
  const review = useReviewTag();
  return useMutation({
    mutationFn: ({ id, projectId, notes }: { id: string; projectId: string; notes?: string }) =>
      review.mutateAsync({ id, projectId, status: "approved", notes }),
  });
}

export function useRejectTag() {
  const review = useReviewTag();
  return useMutation({
    mutationFn: ({ id, projectId, notes }: { id: string; projectId: string; notes?: string }) =>
      review.mutateAsync({ id, projectId, status: "rejected", notes }),
  });
}

export function useMergeTag() {
  const review = useReviewTag();
  return useMutation({
    mutationFn: ({ id, projectId, notes }: { id: string; projectId: string; notes?: string }) =>
      review.mutateAsync({ id, projectId, status: "merged", notes }),
  });
}

// ── Operaciones masivas ───────────────────────────────────────

export function useBulkReviewTags() {
  const qc   = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      ids,
      projectId,
      status,
    }: {
      ids:       string[];
      projectId: string;
      status:    TagStatus;
    }) => {
      if (ids.length === 0) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("engineering_extracted_tags")
        .update({
          status,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .in("id", ids)
        .eq("project_id", projectId); // A2: filtro de pertenencia — defensa en profundidad
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["eng-tags", projectId] });
      qc.invalidateQueries({ queryKey: ["eng-tags-stats", projectId] });
    },
  });
}
