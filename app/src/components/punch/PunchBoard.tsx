"use client";
import { useMemo, useState } from "react";
import { usePunchBoard, type PunchBoardFilters, type PunchBoardRow } from "@/hooks/usePunchBoard";

export function PunchBoard({ projectId }: { projectId: string }) {
  const [filters, setFilters] = useState<PunchBoardFilters>({});
  const { rows, loading, error } = usePunchBoard(projectId, filters);

  const groups = useMemo(() => {
    const byArea = new Map<string, Map<string, Map<string, PunchBoardRow[]>>>();
    for (const r of rows) {
      const area = r.area_name ?? "—"; const sys = r.system_name ?? "—"; const sub = r.subsystem_name ?? "—";
      if (!byArea.has(area)) byArea.set(area, new Map());
      const a = byArea.get(area)!;
      if (!a.has(sys)) a.set(sys, new Map());
      const s = a.get(sys)!;
      if (!s.has(sub)) s.set(sub, []);
      s.get(sub)!.push(r);
    }
    return byArea;
  }, [rows]);

  const set = (k: keyof PunchBoardFilters, v: unknown) =>
    setFilters((f) => ({ ...f, [k]: v === "" ? undefined : v }));

  if (loading) return <p className="text-sm text-slate-500">Cargando bandeja…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("status", e.target.value)}>
          <option value="">Estado: todos</option><option value="abierto">abierto</option>
          <option value="en_proceso">en_proceso</option><option value="corregido">corregido</option><option value="cerrado">cerrado</option>
        </select>
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("priority", e.target.value)}>
          <option value="">Prioridad: todas</option><option value="critica">crítica</option>
          <option value="alta">alta</option><option value="media">media</option><option value="baja">baja</option>
        </select>
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("generation_source", e.target.value)}>
          <option value="">Origen: todos</option><option value="auto_inspection">auto</option>
          <option value="manual">manual</option><option value="imported">importado</option>
        </select>
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("aging", e.target.value)}>
          <option value="">Aging: todo</option><option value="0-7">0–7d</option><option value="8-30">8–30d</option><option value=">30">&gt;30d</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" onChange={(e) => set("unassigned", e.target.checked || undefined)} /> Sin asignar (triage)
        </label>
      </div>

      {rows.length === 0 && <p className="text-sm text-slate-500">No hay punch para los filtros aplicados.</p>}

      {[...groups.entries()].map(([area, systems]) => (
        <div key={area}>
          <h3 className="text-sm font-semibold text-slate-700">{area}</h3>
          {[...systems.entries()].map(([sys, subs]) => (
            <div key={sys} className="ml-3">
              <h4 className="text-sm text-slate-600">{sys}</h4>
              {[...subs.entries()].map(([sub, items]) => (
                <div key={sub} className="ml-3 mb-2">
                  <div className="text-xs font-medium text-slate-500">Subsistema: {sub} ({items.length})</div>
                  <ul className="ml-2">
                    {items.map((r) => (
                      <li key={r.punch_id} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm">
                        <span>{r.equipment_tag} — {r.title}</span>
                        <span className="text-xs text-slate-500">
                          {r.priority} · {r.status} · {r.generation_source} · {r.age_days_total}d
                          {r.unassigned ? " · sin asignar" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
