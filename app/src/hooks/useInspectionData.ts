"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { assembleTemplate } from "@/lib/sync/assembleTemplate";
import { localDB } from "@/lib/db/local";
import type { Equipment } from "@/types";
import type { MockInspectionTemplate } from "@/types/inspection";

// IDs mock empiezan con "eq-" / "tpl-" / "ic02-"; los reales son UUIDs de 36 chars
const isMockId = (id: string) =>
  id.startsWith("eq-") || id.startsWith("tpl-") || id.startsWith("ic02-");

// Carga mock data solo en desarrollo (dynamic import — no incluido en bundle de producción)
async function loadMock() {
  if (process.env.NODE_ENV === "production") return null;
  return import("@/lib/inspection-mock-data");
}

// ── Shapes intermedias ────────────────────────────────────────────────────────

export interface TemplateRef {
  id: string;
  code: string;
  name: string;
  discipline: string;
  source?: "equipment" | "subsystem" | "system" | "equipment_type" | "default";
}

// ── 1. Equipment (mock o Supabase) ────────────────────────────────────────────

export function useEquipmentForInspection(equipmentId: string) {
  return useQuery({
    queryKey: ["equipment-inspection", equipmentId],
    queryFn: async (): Promise<Equipment | null> => {
      if (isMockId(equipmentId)) {
        const mock = await loadMock();
        if (!mock) return null;
        return mock.getEquipmentById(equipmentId) ?? null;
      }
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (!offline) {
        const supabase = createClient();
        const { data } = await supabase
          .from("equipment")
          .select("*")
          .eq("id", equipmentId)
          .is("deleted_at", null)
          .single();
        if (data) {
          await localDB.equipment.put({ ...(data as Record<string, unknown>), sync_status: "synced" } as never);
          return data as Equipment;
        }
      }
      return (await localDB.equipment.get(equipmentId)) ?? null;
    },
    enabled: !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── 2. Templates para FloatingEquipmentPanel ──────────────────────────────────

export function useEquipmentInspectionTemplates(equipmentId: string) {
  return useQuery({
    queryKey: ["equipment-inspection-templates", equipmentId],
    queryFn: async (): Promise<TemplateRef[]> => {
      if (isMockId(equipmentId)) {
        const mock = await loadMock();
        if (!mock) return [];
        return mock.getTemplatesForEquipment(equipmentId).map(t => ({
          id: t.id, code: t.code, name: t.name, discipline: t.discipline,
        }));
      }
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        const row = await localDB.equipmentTemplateRefs.get(equipmentId);
        return row?.refs ?? [];
      }
      const supabase = createClient();

      // Usa el RPC unificado que combina los 4 niveles:
      // tipo de equipo → sistema → subsistema → directo
      const { data: rows, error } = await supabase
        .rpc("get_equipment_templates", { p_equipment_id: equipmentId });

      if (error) {
        const row = await localDB.equipmentTemplateRefs.get(equipmentId);
        if (row) return row.refs;
        throw error;
      }

      // Deduplicar por template_id (pueden aparecer desde varios niveles)
      const seen = new Set<string>();
      const result: TemplateRef[] = [];
      for (const row of (rows ?? [])) {
        if (!seen.has(row.template_id)) {
          seen.add(row.template_id);
          result.push({
            id:         row.template_id,
            code:       row.template_key,
            name:       row.template_name,
            discipline: row.discipline ?? "",
            source:     row.source as TemplateRef["source"],
          });
        }
      }
      await localDB.equipmentTemplateRefs.put({ equipmentId, refs: result, updatedAt: new Date().toISOString() });
      return result;
    },
    enabled: !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── 3. Template completo con secciones + campos ───────────────────────────────

export function useInspectionTemplate(templateId: string) {
  return useQuery({
    queryKey: ["inspection-template", templateId],
    queryFn: async (): Promise<MockInspectionTemplate | null> => {
      if (isMockId(templateId)) {
        const mock = await loadMock();
        if (!mock) return null;
        return mock.getTemplateById(templateId) ?? null;
      }

      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        const row = await localDB.offlineTemplates.get(templateId);
        if (row) { row.template._source = "offline"; return row.template; }
        return null;
      }
      const supabase = createClient();
      const tpl = await assembleTemplate(supabase, templateId);
      if (tpl) {
        tpl._source = "online";
        await localDB.offlineTemplates.put({ id: templateId, template: tpl, updatedAt: new Date().toISOString() });
      }
      return tpl;
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000,
  });
}
