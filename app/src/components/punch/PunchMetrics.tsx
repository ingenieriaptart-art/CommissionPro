"use client";
import { usePunchMetrics } from "@/hooks/usePunchMetrics";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export function PunchMetrics({ projectId }: { projectId: string }) {
  const { metrics: m, loading } = usePunchMetrics(projectId);
  if (loading) return <p className="text-sm text-slate-500">Cargando métricas…</p>;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile label="Punch abiertos" value={m.open_total} />
      <Tile label="Equipos con punch" value={`${m.equipment_with_open} (${m.equipment_with_open_pct}%)`} />
      <Tile label="Aging >30d" value={m.aging[">30"]} />
      <Tile label="Auto/Inspección" value={m.auto_per_inspection} />
      <Tile label="Críticos abiertos" value={m.by_priority["critica"] ?? 0} />
      <Tile label="Auto-generados" value={m.by_source["auto_inspection"] ?? 0} />
      <Tile label="0–7d / 8–30d" value={`${m.aging["0-7"]} / ${m.aging["8-30"]}`} />
      <Tile label="Top subsistema" value={m.top_subsystems[0]?.name ?? "—"} />
    </div>
  );
}
