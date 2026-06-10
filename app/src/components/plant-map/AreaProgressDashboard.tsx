"use client";
import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area, Equipment, EquipmentStatus } from "@/types";

interface AreaProgressDashboardProps {
  areas: Area[];
  equipment: Equipment[];
  subToSystem: Map<string, string>;
  sysToArea:   Map<string, string>;
}

const STATUS_COLORS: Partial<Record<EquipmentStatus, string>> = {
  pendiente:          "bg-blue-500",
  en_ejecucion:       "bg-yellow-500",
  aprobado:           "bg-green-500",
  rechazado:          "bg-red-500",
  bloqueado:          "bg-slate-500",
  listo_energizacion: "bg-cyan-500",
};

export function AreaProgressDashboard({
  areas, equipment, subToSystem, sysToArea,
}: AreaProgressDashboardProps) {
  const [open, setOpen] = useState(true);

  const areaStats = useMemo(() => {
    const map: Record<string, { total: number; byStatus: Record<string, number> }> = {};
    for (const eq of equipment) {
      const systemId = subToSystem.get(eq.subsystem_id);
      const areaId   = systemId ? sysToArea.get(systemId) : undefined;
      if (!areaId) continue;
      if (!map[areaId]) map[areaId] = { total: 0, byStatus: {} };
      map[areaId].total++;
      map[areaId].byStatus[eq.status] = (map[areaId].byStatus[eq.status] ?? 0) + 1;
    }
    return map;
  }, [equipment, subToSystem, sysToArea]);

  const totalEq   = equipment.length;
  const totalDone = equipment.filter(e => e.status === "aprobado" || e.status === "rechazado").length;
  const globalPct = totalEq > 0 ? Math.round((totalDone / totalEq) * 100) : 0;

  const areasWithStats = areas
    .filter(a => areaStats[a.id])
    .map(a => ({ area: a, stats: areaStats[a.id] }));

  if (areasWithStats.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 w-64">
      {/* Collapsed chip */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <span className="font-semibold text-blue-400">{globalPct}%</span>
          <span className="text-slate-500">completado</span>
          <ChevronUp size={12} className="ml-auto" />
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Avance por Área
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400">{globalPct}%</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-white transition-colors"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {areasWithStats.map(({ area, stats }) => {
              const pct = stats.total > 0
                ? Math.round(((stats.byStatus["aprobado"] ?? 0) + (stats.byStatus["rechazado"] ?? 0)) / stats.total * 100)
                : 0;

              return (
                <div key={area.id} className="px-3 py-2.5 border-b border-slate-800/60 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-slate-300 truncate font-medium">{area.name}</p>
                    <p className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                      {stats.byStatus["aprobado"] ?? 0}/{stats.total}
                    </p>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["pendiente", "en_ejecucion", "aprobado", "rechazado"] as const).map(s => {
                      const count = stats.byStatus[s] ?? 0;
                      if (!count) return null;
                      return (
                        <span key={s} className="flex items-center gap-0.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[s])} />
                          <span className="text-[9px] text-slate-500">{count}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
