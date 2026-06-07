"use client";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrillLevel } from "@/types";

interface PlantMapBreadcrumbProps {
  drill: DrillLevel;
  projectName: string;
  onNavigateTo: (level: DrillLevel) => void;
}

export function PlantMapBreadcrumb({
  drill, projectName, onNavigateTo,
}: PlantMapBreadcrumbProps) {
  const isVisual = drill.level === 'visual';

  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-1">
      {!isVisual && (
        <button
          onClick={() => {
            if (drill.level === 'system') {
              onNavigateTo({ level: 'area', areaId: drill.areaId, areaName: drill.areaName });
            } else {
              onNavigateTo({ level: 'visual' });
            }
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 backdrop-blur-sm transition-colors mr-1"
        >
          <ArrowLeft size={12} /> Volver
        </button>
      )}

      <div className="flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700">
        <button
          onClick={() => onNavigateTo({ level: 'visual' })}
          className={cn(
            "text-xs transition-colors",
            isVisual
              ? "text-slate-200 font-semibold cursor-default"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          {projectName}
        </button>

        {(drill.level === 'area' || drill.level === 'system') && (
          <>
            <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
            <button
              onClick={() => {
                if (drill.level === 'system') {
                  onNavigateTo({ level: 'area', areaId: drill.areaId, areaName: drill.areaName });
                }
              }}
              className={cn(
                "text-xs transition-colors",
                drill.level === 'area'
                  ? "text-slate-200 font-semibold cursor-default"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {drill.areaName}
            </button>
          </>
        )}

        {drill.level === 'system' && (
          <>
            <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
            <span className="text-xs text-slate-200 font-semibold">
              {drill.systemName}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
