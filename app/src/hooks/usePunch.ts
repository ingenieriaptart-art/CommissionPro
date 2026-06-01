"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import type { PunchItem, PunchPriority, PunchStatus } from "@/types";

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
    mutationFn: async ({
      id,
      projectId,
      ...updates
    }: Partial<PunchItem> & { id: string; projectId: string }) => {
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
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      updatePunch.mutateAsync({ id, projectId, status: "cerrado" as PunchStatus }),
  });
}
