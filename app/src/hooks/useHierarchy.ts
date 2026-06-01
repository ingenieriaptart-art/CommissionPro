"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import type { Area, System, Subsystem } from "@/types";

// ─────────────────────── AREAS ───────────────────────

export function useAreas(projectId: string) {
  return useQuery({
    queryKey: ["areas", projectId],
    queryFn: async (): Promise<Area[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("areas")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order");
        if (error) throw error;
        if (data) await localDB.areas.bulkPut(data as Area[]);
        return (data ?? []) as Area[];
      } else {
        return localDB.areas.where("project_id").equals(projectId).sortBy("sort_order");
      }
    },
    enabled: !!projectId,
  });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Area, "id">) => {
      const supabase = createClient();
      const area: Area = { ...payload, id: uuidv4() };
      await localDB.areas.add(area);
      if (navigator.onLine) {
        const { error } = await supabase.from("areas").insert(area);
        if (error) throw error;
      }
      return area;
    },
    onSuccess: (area) => qc.invalidateQueries({ queryKey: ["areas", area.project_id] }),
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: Partial<Area> & { id: string; projectId: string }) => {
      await localDB.areas.update(id, updates);
      if (navigator.onLine) {
        const supabase = createClient();
        const { error } = await supabase.from("areas").update(updates).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: ["areas", projectId] }),
  });
}

// ─────────────────────── SYSTEMS ─────────────────────

export function useSystems(areaId: string) {
  return useQuery({
    queryKey: ["systems", areaId],
    queryFn: async (): Promise<System[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("systems")
          .select("*")
          .eq("area_id", areaId)
          .order("sort_order");
        if (error) throw error;
        if (data) await localDB.systems.bulkPut(data as System[]);
        return (data ?? []) as System[];
      } else {
        return localDB.systems.where("area_id").equals(areaId).sortBy("sort_order");
      }
    },
    enabled: !!areaId,
  });
}

export function useCreateSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<System, "id">) => {
      const supabase = createClient();
      const system: System = { ...payload, id: uuidv4() };
      await localDB.systems.add(system);
      if (navigator.onLine) {
        const { error } = await supabase.from("systems").insert(system);
        if (error) throw error;
      }
      return system;
    },
    onSuccess: (system) => qc.invalidateQueries({ queryKey: ["systems", system.area_id] }),
  });
}

// ─────────────────────── SUBSYSTEMS ──────────────────

export function useSubsystems(systemId: string) {
  return useQuery({
    queryKey: ["subsystems", systemId],
    queryFn: async (): Promise<Subsystem[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("subsystems")
          .select("*")
          .eq("system_id", systemId)
          .order("sort_order");
        if (error) throw error;
        if (data) await localDB.subsystems.bulkPut(data as Subsystem[]);
        return (data ?? []) as Subsystem[];
      } else {
        return localDB.subsystems.where("system_id").equals(systemId).sortBy("sort_order");
      }
    },
    enabled: !!systemId,
  });
}

export function useCreateSubsystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Subsystem, "id">) => {
      const supabase = createClient();
      const subsystem: Subsystem = { ...payload, id: uuidv4() };
      await localDB.subsystems.add(subsystem);
      if (navigator.onLine) {
        const { error } = await supabase.from("subsystems").insert(subsystem);
        if (error) throw error;
      }
      return subsystem;
    },
    onSuccess: (s) => qc.invalidateQueries({ queryKey: ["subsystems", s.system_id] }),
  });
}
