"use client";
import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEquipment } from "@/hooks/useEquipment";
import { EquipmentStatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import type { Equipment } from "@/types";

interface EquipmentDetailContentProps {
  projectId: string;
  equipmentId: string;
}

export function EquipmentDetailContent({ projectId, equipmentId }: EquipmentDetailContentProps) {
  const router = useRouter();
  const { data: allEquipment = [], isLoading } = useEquipment(projectId);
  const eq = allEquipment.find((e: Equipment) => e.id === equipmentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (!eq) {
    return (
      <div className="py-6 text-center">
        <p className="text-slate-500 text-sm">Equipo no encontrado</p>
      </div>
    );
  }

  const fields = [
    { label: "Servicio",    value: eq.service },
    { label: "Tipo I/O",    value: eq.io_type },
    { label: "RTU destino", value: eq.rtu_destination },
    { label: "Ubicación",   value: eq.location_system },
    { label: "P&ID Ref.",   value: eq.pid_reference },
    { label: "Potencia",    value: eq.power_kw ? `${eq.power_kw} kW` : undefined },
  ].filter(f => f.value);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-3 border-b border-slate-700">
        <p className="text-base font-bold text-blue-400 font-mono">{eq.tag}</p>
        <p className="text-sm text-slate-200 mt-0.5">{eq.name}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <EquipmentStatusBadge status={eq.status} />
          <Badge variant="default" className="text-[10px] capitalize">{eq.criticality}</Badge>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Datos de ingeniería
          </p>
          <dl className="space-y-1.5">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-[10px] text-slate-500 flex-shrink-0">{label}</dt>
                <dd className="text-[10px] text-slate-300 text-right truncate">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="p-3">
        <button
          onClick={() => router.push(`/projects/${projectId}/equipment`)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg border border-slate-600 transition-colors"
        >
          <ExternalLink size={12} /> Ver ficha completa en Equipos
        </button>
      </div>
    </div>
  );
}
