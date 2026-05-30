"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import type { Test, ChecklistItem } from "@/types";

export function useTests(projectId: string) {
  return useQuery({
    queryKey: ["tests", projectId],
    queryFn: async (): Promise<Test[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tests")
          .select("*, equipment(*), checklist_items(*), approvals(*)")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) await localDB.tests.bulkPut(data as Test[]);
        return (data ?? []) as Test[];
      } else {
        return localDB.tests.where("project_id").equals(projectId).toArray();
      }
    },
  });
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Test, "id" | "created_at" | "updated_at" | "sync_status" | "version">) => {
      const id = uuidv4();
      const now = new Date().toISOString();

      // [A-006 FIX] Capturar snapshot del equipo en el momento de crear la prueba.
      // Si el equipo se modifica o elimina después, la trazabilidad queda intacta.
      let equipment_snapshot: Partial<Test["equipment"]> | undefined;
      if (payload.equipment_id) {
        const eq = await localDB.equipment.get(payload.equipment_id);
        if (eq) {
          // Guardar solo campos técnicos relevantes, no metadatos de sync
          equipment_snapshot = {
            id: eq.id, tag: eq.tag, name: eq.name,
            manufacturer: eq.manufacturer, model: eq.model,
            serial_number: eq.serial_number, power: eq.power,
            voltage: eq.voltage, current: eq.current,
            criticality: eq.criticality,
          };
        }
      }

      const test: Test = {
        ...payload, id, created_at: now, updated_at: now,
        sync_status: "pending", version: 1,
        equipment_snapshot,
      };
      await localDB.tests.add(test);
      await enqueueSync("tests", id, "INSERT", test);

      if (navigator.onLine) {
        const supabase = createClient();
        const { error } = await supabase.from("tests").insert(test);
        if (!error) await localDB.tests.update(id, { sync_status: "synced" });
      }
      return test;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tests"] }),
  });
}

export function useSaveChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, items }: { testId: string; items: Partial<ChecklistItem>[] }) => {
      const now = new Date().toISOString();
      for (const item of items) {
        if (item.id) {
          await localDB.checklistItems.update(item.id, item);
        } else {
          const newItem: ChecklistItem = {
            id: uuidv4(), test_id: testId, sort_order: 0,
            item_key: item.item_key ?? "", description: item.description ?? "",
            ...item, created_at: now,
          } as ChecklistItem;
          await localDB.checklistItems.add(newItem);
        }
      }
      // marcar test como pendiente de sync
      await localDB.tests.update(testId, { sync_status: "pending", updated_at: now });
      await enqueueSync("tests", testId, "UPDATE", { id: testId, updated_at: now });

      if (navigator.onLine) {
        const supabase = createClient();
        await supabase.from("checklist_items").upsert(
          items.map((i) => ({ ...i, test_id: testId })),
          { onConflict: "id" }
        );
      }
    },
    onSuccess: (_, { testId }) => qc.invalidateQueries({ queryKey: ["tests"] }),
  });
}
