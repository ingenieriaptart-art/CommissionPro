"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, ExternalLink, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { equipmentStatusColor } from "@/components/plant-map/visual/EquipmentOverlay";
import { useEquipmentInspectionTemplates } from "@/hooks/useInspectionData";
import type { Equipment } from "@/types";

interface FloatingEquipmentPanelProps {
  equipmentId: string;
  equipment?: Equipment;      // pasado desde el padre (real o undefined)
  anchorX: number;
  anchorY: number;
  projectId: string;
  returnTo: string;
  imageUrl?: string;
  onClose: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  equipment:      "Directo",
  subsystem:      "Subsistema",
  system:         "Sistema",
  equipment_type: "Tipo",
  default:        "Default",
};

const SOURCE_COLOR: Record<string, string> = {
  equipment:      "text-blue-400",
  subsystem:      "text-violet-400",
  system:         "text-amber-400",
  equipment_type: "text-emerald-400",
  default:        "text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  pendiente:          "Pendiente",
  en_ejecucion:       "En ejecución",
  aprobado:           "Aprobado",
  rechazado:          "Rechazado",
  bloqueado:          "Bloqueado",
  listo_energizacion: "Listo para energizar",
  listo_arranque:     "Listo para arranque",
  operativo:          "Operativo",
};

export function FloatingEquipmentPanel({
  equipmentId, equipment: equipmentProp,
  anchorX, anchorY, projectId, returnTo, imageUrl, onClose,
}: FloatingEquipmentPanelProps) {
  const router   = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const equipment = equipmentProp;

  const { data: templates = [], isLoading: templatesLoading } =
    useEquipmentInspectionTemplates(equipmentId);

  const panelWidth = 256;
  const viewW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const left  = anchorX + 12 + panelWidth > viewW ? anchorX - panelWidth - 12 : anchorX + 12;
  const top   = Math.min(anchorY, (typeof window !== "undefined" ? window.innerHeight : 800) - 420);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    function escHandler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  if (!equipment) return null;

  const color = equipmentStatusColor(equipment.status);

  function handleStartInspection(templateId: string) {
    try {
      sessionStorage.setItem("plantmap_inspection_context", JSON.stringify({
        imageUrl: imageUrl ?? "",
        overlayX: 0.5,
        overlayY: 0.5,
      }));
    } catch { /* ignore */ }
    onClose();
    router.push(
      `/equipment/${equipmentId}/inspection/${templateId}?returnTo=${encodeURIComponent(returnTo)}`
    );
  }

  const panel = (
    <div
      ref={panelRef}
      style={{ position: "fixed", left, top, width: panelWidth, zIndex: 9999 }}
      className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 pb-2" style={{ borderBottom: `1px solid ${color}40` }}>
        <div>
          <p className="text-sm font-bold font-mono" style={{ color }}>{equipment.tag}</p>
          <p className="text-xs text-slate-300 leading-tight">{equipment.name}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-slate-400">
              {STATUS_LABELS[equipment.status] ?? equipment.status}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-0.5">
          <X size={14} />
        </button>
      </div>

      {/* Quick info */}
      <div className="px-3 py-2 border-b border-slate-700 space-y-1">
        {equipment.service && (
          <div className="flex justify-between gap-2">
            <span className="text-[10px] text-slate-500">Servicio</span>
            <span className="text-[10px] text-slate-300 text-right truncate">{equipment.service}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-[10px] text-slate-500">Criticidad</span>
          <span className={cn(
            "text-[10px] font-medium capitalize",
            equipment.criticality === "alta" ? "text-red-400" : "text-slate-300"
          )}>
            {equipment.criticality ?? "—"}
          </span>
        </div>
        {equipment.ccm_panel && (
          <div className="flex justify-between gap-2">
            <span className="text-[10px] text-slate-500">CCM / Panel</span>
            <span className="text-[10px] text-slate-300">{equipment.ccm_panel}</span>
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="px-3 py-2">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">
          {templatesLoading ? "Cargando plantillas…" : `Plantillas (${templates.length})`}
        </p>
        {templatesLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 size={14} className="text-slate-600 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">Sin plantillas asignadas</p>
        ) : (
          <div className="space-y-1.5">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleStartInspection(tpl.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-slate-900 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-700 rounded-lg text-left transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-medium text-slate-200 group-hover:text-blue-300 truncate font-mono">
                      {tpl.code}
                    </p>
                    {tpl.source && tpl.source !== "equipment" && (
                      <span className={cn("text-[8px] shrink-0", SOURCE_COLOR[tpl.source])}>
                        {SOURCE_LABELS[tpl.source]}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 truncate">{tpl.name}</p>
                </div>
                <Play size={11} className="text-slate-600 group-hover:text-blue-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3">
        <button
          onClick={() => { onClose(); router.push(`/projects/${projectId}/equipment`); }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-[10px] rounded-lg border border-slate-600 transition-colors"
        >
          <ExternalLink size={11} /> Ver en Equipos
        </button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(panel, document.body) : null;
}
