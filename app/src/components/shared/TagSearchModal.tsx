"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter }    from "next/navigation";
import { Search, X, Loader2, AlertCircle } from "lucide-react";
import { useTagLookup, EquipmentLookup, ExtractedTagLookup } from "@/hooks/useTagLookup";

interface TagSearchModalProps {
  projectId: string;
  isOpen:    boolean;
  onClose:   () => void;
}

const TAG_STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  approved:       "bg-emerald-100 text-emerald-700",
  rejected:       "bg-red-100 text-red-700",
  merged:         "bg-blue-100 text-blue-700",
};

const TAG_STATUS_LABELS: Record<string, string> = {
  pending_review: "Pendiente",
  approved:       "Aprobado",
  rejected:       "Rechazado",
  merged:         "Fusionado",
};

export function TagSearchModal({ projectId, isOpen, onClose }: TagSearchModalProps) {
  const router                            = useRouter();
  const inputRef                          = useRef<HTMLInputElement>(null);
  const [input, setInput]                 = useState("");
  const [submitted, setSubmitted]         = useState("");

  const { data, isLoading, isError } = useTagLookup(projectId, submitted);

  // Focus input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInput("");
      setSubmitted("");
    }
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function handleSearch() {
    if (input.trim().length >= 2) setSubmitted(input.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function navigateTo(path: string) {
    onClose();
    router.push(path);
  }

  const noResults =
    submitted &&
    !isLoading &&
    !isError &&
    data?.equipment.length === 0 &&
    data?.extractedTags.length === 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-base">Consultar TAG</p>
            <p className="text-slate-400 text-xs mt-0.5">Busca en equipos y TAGs pendientes de revisión</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Input de búsqueda */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ej: FT-0101"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={input.trim().length < 2}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Buscar
            </button>
          </div>
          {input.trim().length > 0 && input.trim().length < 2 && (
            <p className="text-xs text-slate-400 mt-1 pl-1">Ingresá al menos 2 caracteres</p>
          )}
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Buscando...</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 text-red-500 text-sm py-4">
              <AlertCircle size={16} />
              Error al buscar. Intentá de nuevo.
            </div>
          )}

          {noResults && (
            <div className="text-center py-8">
              <Search size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                No se encontró <span className="font-mono font-bold text-slate-700">&quot;{submitted}&quot;</span>
              </p>
              <p className="text-slate-400 text-xs mt-1">No existe en equipos ni en bandeja de TAGs</p>
            </div>
          )}

          {/* Sección: Equipos */}
          {(data?.equipment.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  EQUIPO{data!.equipment.length > 1 ? "S" : ""}
                </span>
                <span className="text-slate-400 text-xs">{data!.equipment.length} resultado(s)</span>
              </div>
              <div className="space-y-2">
                {data!.equipment.map((eq) => (
                  <EquipmentCard key={eq.id} eq={eq} />
                ))}
              </div>
            </div>
          )}

          {/* Sección: TAGs extraídos */}
          {(data?.extractedTags.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  TAG{data!.extractedTags.length > 1 ? "S" : ""} EXTRAÍDO{data!.extractedTags.length > 1 ? "S" : ""}
                </span>
                <span className="text-slate-400 text-xs">{data!.extractedTags.length} resultado(s)</span>
              </div>
              <div className="space-y-2">
                {data!.extractedTags.map((t) => (
                  <ExtractedTagCard key={t.id} tag={t} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer con botones de navegación */}
        {submitted && !isLoading && !noResults && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 flex-shrink-0">
            {(data?.equipment.length ?? 0) > 0 && (
              <button
                onClick={() =>
                  navigateTo(
                    `/projects/${projectId}/equipment?tag=${encodeURIComponent(submitted)}`
                  )
                }
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                ↗ Editar Equipo
              </button>
            )}
            {(data?.extractedTags.length ?? 0) > 0 && (
              <button
                onClick={() =>
                  navigateTo(
                    `/projects/${projectId}/engineering?tag=${encodeURIComponent(submitted)}`
                  )
                }
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                ↗ Revisar TAG
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function EquipmentCard({ eq }: { eq: EquipmentLookup }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{eq.tag}</p>
        <div className="flex gap-1">
          {eq.from_excel && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Excel</span>
          )}
          {eq.from_tag && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">TAG</span>
          )}
        </div>
      </div>
      <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">{eq.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Sistema">
          {eq.unclassified ? (
            <span className="text-orange-500 font-medium">Sin clasificar</span>
          ) : (
            <span>{eq.system_name ?? "—"}</span>
          )}
        </Row>
        <Row label="Subsistema">
          <span>{eq.unclassified ? "—" : (eq.subsystem_name ?? "—")}</span>
        </Row>
        {eq.io_type         && <Row label="io_type"><span>{eq.io_type}</span></Row>}
        {eq.rtu_destination && <Row label="RTU"><span>{eq.rtu_destination}</span></Row>}
        {eq.service         && <Row label="Servicio"><span className="truncate">{eq.service}</span></Row>}
      </div>
    </div>
  );
}

function ExtractedTagCard({ tag }: { tag: ExtractedTagLookup }) {
  const statusStyle = TAG_STATUS_STYLES[tag.status] ?? "bg-slate-100 text-slate-600";
  const statusLabel = TAG_STATUS_LABELS[tag.status] ?? tag.status;

  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{tag.tag}</p>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>
      {tag.description && (
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2 truncate">{tag.description}</p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Tipo"><span>{tag.detected_type}</span></Row>
        <Row label="Confianza"><span>{Math.round(tag.tag_confidence * 100)}%</span></Row>
        {tag.document_name && (
          <Row label="Documento"><span className="truncate">{tag.document_name}</span></Row>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-slate-400 font-medium">{label}:</span>
      <span className="text-slate-700 dark:text-slate-300">{children}</span>
    </>
  );
}
