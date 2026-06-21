"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";

export interface PunchBoardRow {
  punch_id: string; equipment_id: string; equipment_tag: string;
  subsystem_id: string | null; subsystem_name: string | null;
  system_name: string | null; area_name: string | null;
  title: string; priority: string; status: string; generation_source: string;
  responsible_id: string | null; is_open: boolean; unassigned: boolean;
  age_days: number; age_days_total: number; first_raised_at: string; raised_at: string;
}
export interface PunchBoardFilters {
  status?: string; priority?: string; generation_source?: string;
  unassigned?: boolean; aging?: "0-7" | "8-30" | ">30";
}

function inAging(age: number, bucket?: string): boolean {
  if (!bucket) return true;
  if (bucket === "0-7") return age <= 7;
  if (bucket === "8-30") return age >= 8 && age <= 30;
  return age > 30;
}

export function usePunchBoard(projectId: string, filters: PunchBoardFilters) {
  const [rows, setRows] = useState<PunchBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let data: PunchBoardRow[] = [];
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const supabase = createClient();
        let q = supabase.from("v_punch_board").select("*").eq("project_id", projectId);
        if (filters.status) q = q.eq("status", filters.status);
        if (filters.priority) q = q.eq("priority", filters.priority);
        if (filters.generation_source) q = q.eq("generation_source", filters.generation_source);
        if (filters.unassigned) q = q.is("responsible_id", null);
        const { data: d, error: e } = await q.order("subsystem_name").order("age_days_total", { ascending: false });
        if (e) throw e;
        data = (d ?? []) as unknown as PunchBoardRow[];
      } else {
        // Fallback offline: punch + jerarquía desde IndexedDB (lectura, sin age del servidor)
        const punches = await localDB.punchItems.where("project_id").equals(projectId).toArray();
        data = punches.map((p) => ({
          punch_id: p.id, equipment_id: (p as { equipment_id?: string }).equipment_id ?? "",
          equipment_tag: "", subsystem_id: null, subsystem_name: null, system_name: null, area_name: null,
          title: p.title, priority: p.priority, status: p.status,
          generation_source: (p as { generation_source?: string }).generation_source ?? "manual",
          responsible_id: (p as { responsible_id?: string }).responsible_id ?? null,
          is_open: p.status !== "cerrado",
          unassigned: !(p as { responsible_id?: string }).responsible_id,
          age_days: 0, age_days_total: 0,
          first_raised_at: (p as { first_raised_at?: string }).first_raised_at ?? p.created_at,
          raised_at: (p as { raised_at?: string }).raised_at ?? p.created_at,
        }));
        if (filters.status) data = data.filter((r) => r.status === filters.status);
        if (filters.priority) data = data.filter((r) => r.priority === filters.priority);
        if (filters.generation_source) data = data.filter((r) => r.generation_source === filters.generation_source);
        if (filters.unassigned) data = data.filter((r) => r.unassigned);
      }
      if (filters.aging) data = data.filter((r) => inAging(r.age_days_total, filters.aging));
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando bandeja");
    } finally {
      setLoading(false);
    }
  }, [projectId, filters.status, filters.priority, filters.generation_source, filters.unassigned, filters.aging]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchData(); }, [fetchData]);

  return { rows, loading, error, refetch: fetchData };
}
