"use client";
import { Loader2 } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { EquipmentStatusBadge } from "@/components/ui/StatusBadge";
import type { Equipment } from "@/types";

interface EquipmentListContentProps {
  projectId: string;
  subsystemId: string;
  onEquipmentClick: (equipmentId: string) => void;
}

export function EquipmentListContent({
  projectId, subsystemId, onEquipmentClick,
}: EquipmentListContentProps) {
  const { data: equipment = [], isLoading } = useEquipment(projectId, subsystemId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-slate-500 text-sm">No hay equipos en este subsistema</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-700">
      {equipment.map((eq: Equipment) => (
        <button
          key={eq.id}
          onClick={() => onEquipmentClick(eq.id)}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-400 font-mono">{eq.tag}</p>
            <p className="text-xs text-slate-300 truncate mt-0.5">{eq.name}</p>
            {eq.service && (
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{eq.service}</p>
            )}
          </div>
          <EquipmentStatusBadge status={eq.status} />
        </button>
      ))}
    </div>
  );
}
