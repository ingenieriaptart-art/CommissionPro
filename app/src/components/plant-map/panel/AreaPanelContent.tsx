"use client";
import { ArrowRight, CheckSquare, FileText, Camera } from "lucide-react";
import type { Area } from "@/types";

interface AreaPanelContentProps {
  area: Area;
  completionPct: number;
  equipmentCount: number;
  activityCount: number;
  docCount: number;
  onExploreArea: (areaId: string) => void;
  onNavigateTests: (areaId: string) => void;
  onNavigateDocs: (areaId: string) => void;
}

export function AreaPanelContent({
  area, completionPct, equipmentCount, activityCount, docCount,
  onExploreArea, onNavigateTests, onNavigateDocs,
}: AreaPanelContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <p className="text-xs text-slate-400 mb-1">Avance de precomisionamiento</p>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-500">Progreso</span>
          <span className="text-sm font-bold text-green-400">{completionPct}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-slate-700">
        {[
          { label: "Equipos", value: equipmentCount },
          { label: "Actividades", value: activityCount },
          { label: "Documentos", value: docCount },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center border-r border-slate-700 last:border-r-0">
            <p className="text-lg font-bold text-slate-100">{value}</p>
            <p className="text-[10px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <button
          onClick={() => onExploreArea(area.id)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <span>Explorar Área</span>
          <ArrowRight size={16} />
        </button>

        <button
          onClick={() => onNavigateTests(area.id)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-600"
        >
          <CheckSquare size={14} /> Checklists
        </button>

        <button
          onClick={() => onNavigateDocs(area.id)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-600"
        >
          <FileText size={14} /> Documentos
        </button>

        <button
          disabled
          title="Disponible en próxima versión"
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-600 text-xs font-medium rounded-lg border border-slate-700 cursor-not-allowed"
        >
          <Camera size={14} /> Fotografías y observaciones
        </button>
      </div>
    </div>
  );
}
