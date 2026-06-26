"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";
import type { Test, Evidence, PunchItem } from "@/types";
import type { InspectionDetail, InspectionSummaryRow } from "@/lib/inspection/review";

const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

/**
 * Historial de inspecciones ejecutadas de un equipo (solo lectura).
 * Usado por el botón "Ver inspección" y el selector de revisiones.
 * Online: Supabase. Offline: store local sincronizado.
 */
export function useEquipmentInspections(equipmentId: string | undefined) {
  return useQuery({
    queryKey: ["equipment-inspections", equipmentId],
    enabled: !!equipmentId,
    staleTime: 60_000,
    queryFn: async (): Promise<InspectionSummaryRow[]> => {
      if (!equipmentId) return [];
      if (!isOffline()) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tests")
          .select("id, code, revision, result_summary, status, executed_at, executed_by, template_id, created_at")
          .eq("equipment_id", equipmentId)
          .is("deleted_at", null)
          .order("revision", { ascending: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as unknown as InspectionSummaryRow[];
      }
      // Offline: leer del store local
      const rows = await localDB.tests
        .where("equipment_id").equals(equipmentId).toArray() as unknown as (Test & { revision?: number })[];
      return rows
        .filter((t) => !(t as { deleted_at?: string }).deleted_at)
        .sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0) || b.created_at.localeCompare(a.created_at))
        .map((t) => ({
          id: t.id, code: t.code ?? null, revision: t.revision ?? null,
          result_summary: t.result_summary ?? null, status: t.status,
          executed_at: t.executed_at ?? null, executed_by: t.executed_by ?? null,
          template_id: t.template_id ?? null,
        }));
    },
  });
}

/**
 * Detalle completo de UNA inspección para la vista de revisión (solo lectura).
 * Una sola query con embeds (evita N+1): test + inspector + evidencias + punches.
 * SIEMPRE renderiza desde template_snapshot; este hook no reconstruye plantillas.
 */
export function useInspectionDetail(testId: string | undefined) {
  return useQuery({
    queryKey: ["inspection-detail", testId],
    enabled: !!testId,
    staleTime: 60_000,
    queryFn: async (): Promise<InspectionDetail | null> => {
      if (!testId) return null;
      if (!isOffline()) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tests")
          .select(
            "*, inspector:users!executed_by(full_name,email), evidences(*), punch:punch_items!source_test_id(*)",
          )
          .eq("id", testId)
          .is("deleted_at", null)
          .single();
        if (error) throw error;
        if (!data) return null;
        const row = data as unknown as Test & {
          revision?: number;
          inspector?: { full_name?: string; email?: string } | null;
          evidences?: Evidence[];
          punch?: PunchItem[];
        };
        return {
          test: row,
          inspectorName: row.inspector?.full_name ?? null,
          inspectorEmail: row.inspector?.email ?? null,
          evidences: (row.evidences ?? []).filter((e) => !(e as { deleted_at?: string }).deleted_at),
          punches: (row.punch ?? []).filter((p) => !(p as { deleted_at?: string }).deleted_at),
        };
      }
      // Offline: ensamblar desde el store local
      const test = await localDB.tests.get(testId) as (Test & { revision?: number }) | undefined;
      if (!test) return null;
      const evidences = await localDB.evidences.where("test_id").equals(testId).toArray() as Evidence[];
      const punches = (await localDB.punchItems.toArray() as PunchItem[])
        .filter((p) => p.source_test_id === testId);
      return { test, inspectorName: null, inspectorEmail: null, evidences, punches };
    },
  });
}
