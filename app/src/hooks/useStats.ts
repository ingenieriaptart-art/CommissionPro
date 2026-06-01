"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";

// Columnas de mv_project_stats (alineado con 0010_materialized_view_stats.sql)
export interface ProjectStats {
  project_id: string;
  project_name: string;
  project_status: string;
  equipment_total: number;
  equipment_aprobado: number;
  equipment_pendiente: number;
  equipment_rechazado: number;
  equipment_en_ejecucion: number;
  equipment_operativo: number;
  equipment_criticos: number;
  tests_total: number;
  tests_cerrados: number;
  tests_rechazados: number;
  tests_precom_total: number;  tests_precom_ok: number;
  tests_fat_total: number;     tests_fat_ok: number;
  tests_sat_total: number;     tests_sat_ok: number;
  tests_loop_total: number;    tests_loop_ok: number;
  tests_energy_total: number;  tests_energy_ok: number;
  tests_functional_total: number; tests_functional_ok: number;
  punch_total: number;
  punch_abierto: number;
  punch_cerrado: number;
  punch_critico_abierto: number;
  calculated_at: string;
}

const ZERO_STATS: Omit<ProjectStats, "project_id" | "project_name" | "project_status" | "calculated_at"> = {
  equipment_total: 0, equipment_aprobado: 0, equipment_pendiente: 0,
  equipment_rechazado: 0, equipment_en_ejecucion: 0, equipment_operativo: 0,
  equipment_criticos: 0,
  tests_total: 0, tests_cerrados: 0, tests_rechazados: 0,
  tests_precom_total: 0, tests_precom_ok: 0,
  tests_fat_total: 0,   tests_fat_ok: 0,
  tests_sat_total: 0,   tests_sat_ok: 0,
  tests_loop_total: 0,  tests_loop_ok: 0,
  tests_energy_total: 0, tests_energy_ok: 0,
  tests_functional_total: 0, tests_functional_ok: 0,
  punch_total: 0, punch_abierto: 0, punch_cerrado: 0, punch_critico_abierto: 0,
};

// Fallback offline: calcula stats aproximadas desde IndexedDB local
async function computeStatsOffline(projectId: string): Promise<ProjectStats> {
  const [equipment, tests, punch] = await Promise.all([
    localDB.equipment.where("project_id").equals(projectId).toArray(),
    localDB.tests.where("project_id").equals(projectId).toArray(),
    localDB.punchItems.where("project_id").equals(projectId).toArray(),
  ]);

  return {
    project_id: projectId,
    project_name: "",
    project_status: "",
    calculated_at: new Date().toISOString(),
    equipment_total:        equipment.length,
    equipment_aprobado:     equipment.filter((e) => e.status === "aprobado").length,
    equipment_pendiente:    equipment.filter((e) => e.status === "pendiente").length,
    equipment_rechazado:    equipment.filter((e) => e.status === "rechazado").length,
    equipment_en_ejecucion: equipment.filter((e) => e.status === "en_ejecucion").length,
    equipment_operativo:    equipment.filter((e) => e.status === "operativo").length,
    equipment_criticos:     equipment.filter((e) => e.criticality === "alta").length,
    tests_total:     tests.length,
    tests_cerrados:  tests.filter((t) => t.status === "cerrado").length,
    tests_rechazados:tests.filter((t) => t.status === "rechazado").length,
    tests_precom_total: tests.filter((t) => t.type === "precomisionamiento").length,
    tests_precom_ok:    tests.filter((t) => t.type === "precomisionamiento" && t.status === "cerrado").length,
    tests_fat_total: tests.filter((t) => t.type === "fat").length,
    tests_fat_ok:    tests.filter((t) => t.type === "fat" && t.status === "cerrado").length,
    tests_sat_total: tests.filter((t) => t.type === "sat").length,
    tests_sat_ok:    tests.filter((t) => t.type === "sat" && t.status === "cerrado").length,
    tests_loop_total: tests.filter((t) => t.type === "loop_check").length,
    tests_loop_ok:    tests.filter((t) => t.type === "loop_check" && t.status === "cerrado").length,
    tests_energy_total: tests.filter((t) => t.type === "energizacion").length,
    tests_energy_ok:    tests.filter((t) => t.type === "energizacion" && t.status === "cerrado").length,
    tests_functional_total: tests.filter((t) => t.type === "funcional").length,
    tests_functional_ok:    tests.filter((t) => t.type === "funcional" && t.status === "cerrado").length,
    punch_total:          punch.length,
    punch_abierto:        punch.filter((p) => p.status === "abierto").length,
    punch_cerrado:        punch.filter((p) => p.status === "cerrado").length,
    punch_critico_abierto: punch.filter((p) => p.priority === "critica" && p.status !== "cerrado").length,
  };
}

export function useProjectStats(projectId: string) {
  return useQuery({
    queryKey: ["stats", projectId],
    queryFn: async (): Promise<ProjectStats> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("mv_project_stats")
          .select("*")
          .eq("project_id", projectId)
          .single();
        // Si no hay fila en la vista aún (proyecto recién creado), devolver ceros
        if (error || !data) {
          return { ...ZERO_STATS, project_id: projectId, project_name: "", project_status: "", calculated_at: new Date().toISOString() };
        }
        return data as ProjectStats;
      } else {
        return computeStatsOffline(projectId);
      }
    },
    enabled: !!projectId,
    staleTime: 2 * 60_000, // 2 min — vista materializada es eventual
  });
}

// Calcula % de avance general del proyecto
export function calcAvance(stats: ProjectStats): number {
  if (!stats.equipment_total) return 0;
  return Math.round((stats.equipment_aprobado / stats.equipment_total) * 100);
}
