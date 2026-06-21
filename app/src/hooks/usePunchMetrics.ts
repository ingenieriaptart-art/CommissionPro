"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";

export interface PunchMetrics {
  open_total: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  aging: { "0-7": number; "8-30": number; ">30": number };
  equipment_with_open: number;
  equipment_with_open_pct: number;
  top_subsystems: { name: string; open: number }[];
  auto_per_inspection: number;
}

const EMPTY: PunchMetrics = {
  open_total: 0, by_priority: {}, by_status: {}, by_source: {},
  aging: { "0-7": 0, "8-30": 0, ">30": 0 }, equipment_with_open: 0,
  equipment_with_open_pct: 0, top_subsystems: [], auto_per_inspection: 0,
};

export function usePunchMetrics(projectId: string) {
  const [metrics, setMetrics] = useState<PunchMetrics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const m: PunchMetrics = { ...EMPTY, by_priority: {}, by_status: {}, by_source: {}, aging: { "0-7": 0, "8-30": 0, ">30": 0 }, top_subsystems: [] };
      try {
        const online = typeof navigator !== "undefined" && navigator.onLine;
        const supabase = createClient();
        const rows = online
          ? ((await supabase.from("v_punch_board").select("*").eq("project_id", projectId)).data ?? [])
          : (await localDB.punchItems.where("project_id").equals(projectId).toArray()).map((p) => ({
              status: p.status, priority: p.priority,
              generation_source: (p as { generation_source?: string }).generation_source ?? "manual",
              is_open: p.status !== "cerrado", equipment_id: (p as { equipment_id?: string }).equipment_id ?? "",
              subsystem_name: null as string | null, age_days_total: 0,
            }));

        const openRows = (rows as { is_open: boolean }[]).filter((r) => r.is_open);
        m.open_total = openRows.length;
        const eqOpen = new Set<string>();
        const subOpen = new Map<string, number>();
        for (const r of rows as Record<string, unknown>[]) {
          if (!r.is_open) continue;
          m.by_priority[r.priority as string] = (m.by_priority[r.priority as string] ?? 0) + 1;
          m.by_status[r.status as string] = (m.by_status[r.status as string] ?? 0) + 1;
          m.by_source[r.generation_source as string] = (m.by_source[r.generation_source as string] ?? 0) + 1;
          const age = (r.age_days_total as number) ?? 0;
          if (age <= 7) m.aging["0-7"]++; else if (age <= 30) m.aging["8-30"]++; else m.aging[">30"]++;
          if (r.equipment_id) eqOpen.add(r.equipment_id as string);
          const sn = (r.subsystem_name as string) ?? "—";
          subOpen.set(sn, (subOpen.get(sn) ?? 0) + 1);
        }
        m.equipment_with_open = eqOpen.size;
        const totalEq = await localDB.equipment.where("project_id").equals(projectId).count();
        m.equipment_with_open_pct = totalEq > 0 ? Math.round((eqOpen.size / totalEq) * 100) : 0;
        m.top_subsystems = [...subOpen.entries()].map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open).slice(0, 5);
        const totalInsp = await localDB.tests.where("project_id").equals(projectId).count();
        const autoCount = (rows as { generation_source?: string }[]).filter((r) => r.generation_source === "auto_inspection").length;
        m.auto_per_inspection = totalInsp > 0 ? Math.round((autoCount / totalInsp) * 100) / 100 : 0;
      } finally {
        if (!cancelled) { setMetrics(m); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return { metrics, loading };
}
