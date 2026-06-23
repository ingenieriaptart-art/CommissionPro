"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink, Play, Loader2, Activity, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { equipmentStatusColor } from "@/components/plant-map/visual/EquipmentOverlay";
import { useEquipmentInspectionTemplates } from "@/hooks/useInspectionData";
import { useEquipmentDocuments } from "@/hooks/useEquipmentDocuments";

import { createClient } from "@/lib/supabase/client";
import type { Equipment } from "@/types";
import { EquipmentProgressBadge } from "@/components/equipment/EquipmentProgressBadge";

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

  // Fetch fresco del equipo desde Supabase — ignora el prop del padre que puede ser stale
  const isTag = equipmentId.startsWith("__tag__");
  const { data: freshEquipment } = useQuery<Equipment | null>({
    queryKey: ["equipment-panel", equipmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("equipment").select("*").eq("id", equipmentId).maybeSingle();
      return data as Equipment | null;
    },
    enabled: !isTag,
    staleTime: 0,
  });
  const equipment = freshEquipment ?? equipmentProp;

  const { data: templates = [], isLoading: templatesLoading } =
    useEquipmentInspectionTemplates(equipmentId);

  const { data: documents = [], isLoading: docsLoading } =
    useEquipmentDocuments(isTag ? null : equipmentId);

  const panelWidth = 256;
  const viewW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewH = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = viewW < 640;
  const left  = anchorX + 12 + panelWidth > viewW ? anchorX - panelWidth - 12 : anchorX + 12;
  const top   = Math.min(anchorY, viewH - 420);

  // En móvil: hoja inferior a ancho completo con scroll. En desktop: panel anclado.
  const panelStyle: React.CSSProperties = isMobile
    ? { position: "fixed", left: 8, right: 8, bottom: 8, maxHeight: "70vh", overflowY: "auto", zIndex: 9999 }
    : { position: "fixed", left, top, width: panelWidth, zIndex: 9999 };

  useEffect(() => {
    function escHandler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [onClose]);

  // Equipo no encontrado en Supabase — mostrar mini panel de "pendiente de registro"
  if (!equipment) {
    const tag = equipmentId.startsWith('__tag__') ? equipmentId.slice(7) : equipmentId;
    return createPortal(
      <div
        ref={panelRef}
        style={panelStyle}
        className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between p-3 pb-2 border-b border-slate-700">
          <div>
            <p className="text-sm font-bold font-mono text-amber-400">{tag}</p>
            <p className="text-xs text-slate-400 leading-tight mt-0.5">Equipo eléctrico</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-0.5">
            <X size={14} />
          </button>
        </div>
        <div className="px-3 py-3">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Este equipo aún no está registrado en el sistema. Registralo en{" "}
            <span className="text-amber-400 font-medium">Equipos</span> para poder iniciar el precomisionamiento.
          </p>
        </div>
      </div>,
      document.body
    );
  }

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
    <>
      {/* Backdrop: cierra el panel al tocar fuera — funciona en móvil y desktop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
        onMouseDown={onClose}
        onTouchStart={onClose}
      />
    <div
      ref={panelRef}
      style={panelStyle}
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
          <div className="mt-1 pr-1">
            <EquipmentProgressBadge
              status={equipment.status}
              formPct={typeof equipment.metadata?.form_pct === "number" ? equipment.metadata.form_pct : undefined}
            />
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

      {/* Documentos / Planos */}
      <div className="px-3 py-2 border-b border-slate-700">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
          {docsLoading ? "Cargando documentos…" : `Documentos (${documents.length})`}
        </p>
        {docsLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 size={12} className="text-slate-600 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">Sin planos ni documentos cargados</p>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => window.open(doc.storage_url, "_blank", "noopener,noreferrer")}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-800/50 hover:border-blue-600 rounded-lg text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                <FileText size={11} className="flex-shrink-0" />
                <span className="truncate">{doc.name}</span>
                <ExternalLink size={9} className="flex-shrink-0 ml-auto" />
              </button>
            ))}
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
      <div className="px-3 pb-3 space-y-1.5">
        <button
          onClick={() => { onClose(); router.push(`/projects/${projectId}/equipment`); }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-[10px] rounded-lg border border-slate-600 transition-colors"
        >
          <ExternalLink size={11} /> Ver en Equipos
        </button>
        <button
          onClick={() => { onClose(); router.push(`/projects/${projectId}/ic02-rtu`); }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 hover:text-emerald-300 text-[10px] rounded-lg border border-emerald-800/50 hover:border-emerald-600 transition-colors"
        >
          <Activity size={11} /> Instrumentos IC02
        </button>
      </div>
    </div>
    </>
  );

  return (
    <>
      {typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </>
  );
}
