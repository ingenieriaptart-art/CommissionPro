"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import type { Equipment } from "@/types";

// Carga desde Supabase (cuando hay red) o desde Dexie (offline)
export function useEquipment(subsystemId?: string) {
  return useQuery({
    queryKey: ["equipment", subsystemId],
    queryFn: async (): Promise<Equipment[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        let q = supabase.from("equipment").select("*").is("deleted_at", null).order("tag");
        if (subsystemId) q = q.eq("subsystem_id", subsystemId);
        const { data, error } = await q;
        if (error) throw error;
        // Guardar en local
        if (data) await localDB.equipment.bulkPut(data as Equipment[]);
        return (data ?? []) as Equipment[];
      } else {
        let q = localDB.equipment.where("sync_status").notEqual("deleted");
        if (subsystemId) q = localDB.equipment.where("subsystem_id").equals(subsystemId);
        return q.toArray();
      }
    },
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
