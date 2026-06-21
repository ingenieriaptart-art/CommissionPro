"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ApprovalQueueLevel {
  level: number;
  levelName: string;
  requiredRoleId: string | null;
  mandatory: boolean;
  approved: boolean;
}
export interface ApprovalQueueItem {
  testId: string;
  equipmentId: string;
  equipmentTag: string;
  templateId: string;
  revision: number;
  code: string | null;
  testStatus: string;
  levels: ApprovalQueueLevel[];
  nextPendingLevel: number | null;
}

interface Row {
  test_id: string; equipment_id: string; equipment_tag: string;
  template_id: string; revision: number; code: string | null; test_status: string;
  level: number; level_name: string; required_role_id: string | null;
  mandatory: boolean; level_approved: boolean | null;
}

export function useApprovalQueue(projectId: string) {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("v_inspection_approval_status")
        .select("*")
        .eq("project_id", projectId)
        .order("equipment_tag", { ascending: true })
        .order("level", { ascending: true });
      if (e) throw e;

      const byTest = new Map<string, ApprovalQueueItem>();
      for (const r of (data ?? []) as Row[]) {
        let item = byTest.get(r.test_id);
        if (!item) {
          item = {
            testId: r.test_id, equipmentId: r.equipment_id, equipmentTag: r.equipment_tag,
            templateId: r.template_id, revision: r.revision, code: r.code, testStatus: r.test_status,
            levels: [], nextPendingLevel: null,
          };
          byTest.set(r.test_id, item);
        }
        item.levels.push({
          level: r.level, levelName: r.level_name, requiredRoleId: r.required_role_id,
          mandatory: r.mandatory, approved: !!r.level_approved,
        });
      }

      const result: ApprovalQueueItem[] = [];
      for (const item of byTest.values()) {
        item.levels.sort((a, b) => a.level - b.level);
        const pending = item.levels.filter((l) => l.mandatory && !l.approved).map((l) => l.level);
        item.nextPendingLevel = pending.length ? Math.min(...pending) : null;
        // Solo mostrar inspecciones con un nivel mandatory pendiente
        if (item.nextPendingLevel !== null) result.push(item);
      }
      setItems(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando aprobaciones");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchData(); }, [fetchData]);

  return { items, loading, error, refetch: fetchData };
}
