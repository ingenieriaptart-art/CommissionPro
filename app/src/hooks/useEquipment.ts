"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import type { Equipment } from "@/types";

const PAGE_LIMIT = 500;

// [A-005 FIX] projectId es SIEMPRE obligatorio para garantizar aislamiento multi-tenant
export function useEquipment(projectId: string, subsystemId?: string) {
  return useQuery({
    queryKey: ["equipment", projectId, subsystemId],
    queryFn: async (): Promise<Equipment[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        // SIEMPRE filtrar por project_id primero
        let q = supabase
          .from("equipment")
          .select("*")
          .eq("project_id", projectId)   // ← A-005: filtro obligatorio
          .is("deleted_at", null)
          .order("tag")
          .limit(PAGE_LIMIT);
        if (subsystemId) q = q.eq("subsystem_id", subsystemId);
        const { data, error } = await q;
        if (error) throw error;
        if (data) await localDB.equipment.bulkPut(data as Equipment[]);
        return (data ?? []) as Equipment[];
      } else {
        // Offline: filtrar por project_id en IndexedDB
        if (subsystemId) {
          return localDB.equipment
            .where("subsystem_id").equals(subsystemId)
            .toArray();
        }
        return localDB.equipment
          .where("project_id").equals(projectId)
          .toArray();
      }
    },
    enabled: !!projectId,  // No ejecutar sin projectId
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Equipment, "id" | "created_at" | "updated_at" | "sync_status" | "version">) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const equipment: Equipment = {
        ...payload, id,
        created_at: now, updated_at: now,
        sync_status: "pending", version: 1,
      };
      // Guardar localmente SIEMPRE primero
      await localDB.equipment.add(equipment);
      await enqueueSync("equipment", id, "INSERT", equipment);

      // Si hay red, intentar sincronizar inmediatamente
      if (navigator.onLine) {
        const supabase = createClient();
        const { error } = await supabase.from("equipment").insert(equipment);
        if (!error) {
          await localDB.equipment.update(id, { sync_status: "synced" });
        }
      }
      return equipment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Equipment> & { id: string }) => {
      const now = new Date().toISOString();
      const patch = { ...updates, updated_at: now, sync_status: "pending" as const };
      await localDB.equipment.update(id, patch);
      await enqueueSync("equipment", id, "UPDATE", { id, ...patch });

      if (navigator.onLine) {
        const supabase = createClient();
        const { error } = await supabase.from("equipment").update(patch).eq("id", id);
        if (!error) await localDB.equipment.update(id, { sync_status: "synced" });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}
