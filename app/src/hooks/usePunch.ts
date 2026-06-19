"use client";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync } from "@/lib/db/local";
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
