"use client";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync, saveBlobLocally } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import type { PunchItem, PunchPriority, PunchStatus } from "@/types";

export const PUNCH_PAGE_SIZE = 30;

export interface PunchFilters {
  status?: PunchStatus | "";
  priority?: PunchPriority | "";
  page: number;
  pageSize?: number;
}

export interface PagedPunch {
  data: PunchItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function usePunch(projectId: string) {
  return useQuery({
    queryKey: ["punch", projectId],
    queryFn: async (): Promise<PunchItem[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("punch_items")
          .select("*")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) await localDB.punchItems.bulkPut(data as PunchItem[]);
        return (data ?? []) as PunchItem[];
      } else {
        return localDB.punchItems.where("project_id").equals(projectId).toArray();
      }
    },
    enabled: !!projectId,
  });
}

export function useCreatePunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      project_id: string;
      title: string;
      description?: string;
      priority: PunchPriority;
      equipment_id?: string;
      test_id?: string;
    }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const item: PunchItem = {
        ...payload,
        id,
        status: "abierto",
        generation_source: "manual" as const,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        version: 1,
      };
      await localDB.punchItems.add(item);
      await enqueueSync("punch_items", id, "INSERT", item);

      if (navigator.onLine) {
        const supabase = createClient();
        const { error } = await supabase.from("punch_items").insert(item);
        if (!error) await localDB.punchItems.update(id, { sync_status: "synced" });
      }
      return item;
    },
    onSuccess: (item) => qc.invalidateQueries({ queryKey: ["punch", item.project_id] }),
  });
}

export function useUpdatePunch() {
  const qc = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async ({ id, projectId, ...updates }: Partial<PunchItem> & { id: string; projectId: string }) => {
      const now = new Date().toISOString();
      const patch = { ...updates, updated_at: now, sync_status: "pending" as const };
      await localDB.punchItems.update(id, patch);
      await enqueueSync("punch_items", id, "UPDATE", { id, ...patch });

      if (navigator.onLine) {
        const supabase = createClient();
        const { error } = await supabase
          .from("punch_items")
          .update(patch)
          .eq("id", id);
        if (!error) await localDB.punchItems.update(id, { sync_status: "synced" });
      }
    },
    onSuccess: (_, { projectId }) =>
      qc.invalidateQueries({ queryKey: ["punch", projectId] }),
  });
}

export function useClosePunch() {
  const updatePunch = useUpdatePunch();
  return useMutation({
    mutationFn: ({ id, projectId, verification_notes }: { id: string; projectId: string; verification_notes?: string }) =>
      updatePunch.mutateAsync({ id, projectId, status: "cerrado" as PunchStatus, verification_notes }),
  });
}

export function useMarkCorrected() {
  const updatePunch = useUpdatePunch();
  return useMutation({
    // Pre-requisito de UX: la(s) evidencia(s) de corrección ya fueron capturadas
    // (capturePunchEvidence) y encoladas ANTES de esta transición (orden FIFO del
    // outbox). El trigger guard_punch_lifecycle valida en servidor.
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      updatePunch.mutateAsync({ id, projectId, status: "corregido" as PunchStatus }),
  });
}

export function useReopenPunch() {
  const updatePunch = useUpdatePunch();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      updatePunch.mutateAsync({ id, projectId, status: "abierto" as PunchStatus }),
  });
}

export function useCreatePunchWithEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      project_id: string;
      title: string;
      description?: string;
      priority: PunchPriority;
      equipment_id?: string;
      test_id?: string;
      evidenceBlob: Blob;
      capturedBy: string;
    }) => {
      const { evidenceBlob, capturedBy, ...punchPayload } = payload;
      const id = uuidv4();
      const now = new Date().toISOString();
      const item: PunchItem = {
        ...punchPayload,
        id,
        status: "abierto",
        generation_source: "manual" as const,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        version: 1,
      };

      // Punch to localDB + outbox first (FIFO guarantees punch before evidence on server)
      await localDB.punchItems.add(item);
      await enqueueSync("punch_items", id, "INSERT", item);

      // Evidence linked to the punch — saved second so outbox order is correct
      const evidenceId = uuidv4();
      let evidenceSynced = false;
      try {
        const blobRef = String(await saveBlobLocally(evidenceId, evidenceBlob));
        const evidence = {
          id: evidenceId,
          project_id: payload.project_id,
          equipment_id: payload.equipment_id,
          punch_id: id,
          type: "foto" as const,
          stage: "general" as const,
          storage_url: undefined,
          local_blob_ref: blobRef,
          captured_by: capturedBy,
          captured_at: now,
          sync_status: "pending" as const,
        };
        await localDB.evidences.add(evidence);
        await enqueueSync("evidences", evidenceId, "INSERT", evidence);

        if (navigator.onLine) {
          const supabase = createClient();
          const { error: punchErr } = await supabase.from("punch_items").insert(item);
          if (!punchErr) {
            await localDB.punchItems.update(id, { sync_status: "synced" });
            const ext = evidenceBlob.type.split("/")[1] ?? "jpg";
            const path = `evidences/${evidenceId}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("evidences")
              .upload(path, evidenceBlob, { contentType: evidenceBlob.type });
            if (!uploadErr) {
              const { data: { publicUrl } } = supabase.storage.from("evidences").getPublicUrl(path);
              await supabase.from("evidences").insert({ ...evidence, storage_url: publicUrl, local_blob_ref: null });
              await localDB.evidences.update(evidenceId, { storage_url: publicUrl, sync_status: "synced" });
              evidenceSynced = true;
            }
          }
        }
      } catch (err) {
        // Punch is saved; evidence failed — outbox will retry. Surface error to UI.
        console.error("[punch] evidence save failed for punch", id, err);
        throw new Error(
          "Punch creado pero la evidencia no pudo guardarse. Reintente desde la app cuando haya conexión."
        );
      }

      void evidenceSynced;
      return item;
    },
    onSuccess: (item) => qc.invalidateQueries({ queryKey: ["punch", item.project_id] }),
  });
}

export function usePunchPaged(projectId: string, filters: PunchFilters) {
  const { status, priority, page, pageSize = PUNCH_PAGE_SIZE } = filters;

  return useQuery({
    queryKey: ["punch-paged", projectId, status, priority, page, pageSize],
    queryFn: async (): Promise<PagedPunch> => {
      if (navigator.onLine) {
        const supabase = createClient();
        let q = supabase
          .from("punch_items")
          .select("*", { count: "exact" })
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (status)   q = q.eq("status",   status);
        if (priority) q = q.eq("priority", priority);

        const from = (page - 1) * pageSize;
        q = q.range(from, from + pageSize - 1);

        const { data, error, count } = await q;
        if (error) throw error;
        if (data) await localDB.punchItems.bulkPut(data as PunchItem[]);
        return { data: (data ?? []) as PunchItem[], total: count ?? 0, page, pageSize };
      } else {
        let items = await localDB.punchItems.where("project_id").equals(projectId).toArray();
        if (status)   items = items.filter((i) => i.status   === status);
        if (priority) items = items.filter((i) => i.priority === priority);
        items.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { data: items, total: items.length, page: 1, pageSize: items.length };
      }
    },
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });
}
