"use client";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area, PanelState } from "@/types";
import { AreaPanelContent } from "./AreaPanelContent";
import { EquipmentListContent } from "./EquipmentListContent";
import { EquipmentDetailContent } from "./EquipmentDetailContent";

interface PlantMapPanelProps {
  panelState: PanelState;
  areas: Area[];
  pctByArea: Record<string, number>;
  equipmentCountByArea: Record<string, number>;
  projectId: string;
  onExploreArea: (areaId: string) => void;
  onPanelNavigate: (state: PanelState) => void;
  onClose: () => void;
  onNavigateTests: (areaId: string) => void;
  onNavigateDocs: (areaId: string) => void;
}

export function PlantMapPanel({
  panelState, areas, pctByArea, equipmentCountByArea, projectId,
  onExploreArea, onPanelNavigate, onClose,
  onNavigateTests, onNavigateDocs,
}: PlantMapPanelProps) {
  if (!panelState.open) return null;

  const titles: Record<string, string> = {
    area: (panelState.view === 'area' ? areas.find(a => a.id === panelState.areaId)?.name : undefined) ?? "Área",
    equipment: "Equipos",
    detail: "Ficha técnica",
  };

  const handleBack = () => {
    if (panelState.view === 'detail') {
      onClose();
    } else if (panelState.view === 'equipment') {
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        "fixed right-6 z-30",
        "top-1/2 -translate-y-1/2",
        "w-72 max-h-[80vh]",
        "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl",
        "flex flex-col overflow-hidden",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          {panelState.view !== 'area' && (
            <button onClick={handleBack} className="text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-sm font-semibold text-slate-100">
            {titles[panelState.view]}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {panelState.view === 'area' && (() => {
          const a = areas.find(x => x.id === panelState.areaId);
          if (!a) return null;
          return (
            <AreaPanelContent
              area={a}
              completionPct={pctByArea[a.id] ?? 0}
              equipmentCount={equipmentCountByArea[a.id] ?? 0}
              activityCount={0}
              docCount={0}
              onExploreArea={onExploreArea}
              onNavigateTests={onNavigateTests}
              onNavigateDocs={onNavigateDocs}
            />
          );
        })()}

        {panelState.view === 'equipment' && (
          <EquipmentListContent
            projectId={projectId}
            subsystemId={panelState.subsystemId}
            onEquipmentClick={(eqId) =>
              onPanelNavigate({ open: true, view: 'detail', equipmentId: eqId })
            }
          />
        )}

        {panelState.view === 'detail' && (
          <EquipmentDetailContent
            projectId={projectId}
            equipmentId={panelState.equipmentId}
          />
        )}
      </div>
    </div>
  );
}
