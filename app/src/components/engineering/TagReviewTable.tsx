"use client";
import { useState, useMemo } from "react";
import { useApproveTag, useRejectTag, useMergeTag, useBulkReviewTags } from "@/hooks/useEngineering";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
  CheckCircle, XCircle, GitMerge, ChevronDown, ChevronRight,
  CheckSquare, Square, AlertTriangle,
} from "lucide-react";
import type { EngineeredTag, TagStatus } from "@/types";

// ── Helpers visuales ──────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  motor: "Motor", valvula: "Válvula", sensor: "Sensor",
  instrumento: "Instrumento", panel: "Panel", transformador: "Trafo", cable: "Cable",
};

const STATUS_BADGE: Record<TagStatus, "default" | "success" | "danger" | "info"> = {
  pending_review: "default",
  approved:       "success",
  rejected:       "danger",
  merged:         "info",
};

const STATUS_LABEL: Record<TagStatus, string> = {
  pending_review: "Pendiente",
  approved:       "Aprobado",
  rejected:       "Rechazado",
  merged:         "Fusionado",
};

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 85 ? "bg-emerald-500" :
    pct >= 65 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] text-slate-400 w-10 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-slate-500 w-7 text-right flex-shrink-0">
        {pct}%
      </span>
    </div>
  );
}

// ── Fila expandible ───────────────────────────────────────────

function TagRow({
  tag,
  projectId,
  selected,
  onToggle,
}: {
  tag: EngineeredTag;
  projectId: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const approve = useApproveTag();
  const reject  = useRejectTag();
  const merge   = useMergeTag();

  const isPending = tag.status === "pending_review";
  const overallPct = Math.round(
    ((tag.tag_confidence + tag.type_confidence + tag.description_confidence) / 3) * 100
  );

  const overallColor =
    overallPct >= 85 ? "border-l-emerald-400" :
    overallPct >= 65 ? "border-l-amber-400" : "border-l-red-400";

  return (
    <>
      <tr className={cn(
        "border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors",
        selected && "bg-blue-50 dark:bg-blue-900/10"
      )}>
        {/* Checkbox */}
        <td className="px-3 py-3 w-8">
          <button onClick={onToggle} className="text-slate-400 hover:text-blue-500">
            {selected ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} />}
          </button>
        </td>

        {/* Expander */}
        <td className="px-2 py-3 w-6">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>

        {/* TAG */}
        <td className={cn("px-3 py-3 border-l-2", overallColor)}>
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
            {tag.tag}
          </span>
        </td>

        {/* Tipo */}
        <td className="px-3 py-3">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {TYPE_LABELS[tag.detected_type ?? ""] ?? tag.detected_type ?? "—"}
          </span>
        </td>

        {/* Confianza (3 barras) */}
        <td className="px-3 py-3 w-52">
          <div className="space-y-0.5">
            <ConfidenceBar value={tag.tag_confidence}         label="TAG"  />
            <ConfidenceBar value={tag.type_confidence}        label="Tipo" />
            <ConfidenceBar value={tag.description_confidence} label="Desc" />
          </div>
        </td>

        {/* Documento origen */}
        <td className="px-3 py-3 max-w-[140px]">
          <span className="text-xs text-slate-500 truncate block">
            {(tag.document as { name?: string } | undefined)?.name ?? "—"}
          </span>
        </td>

        {/* Estado */}
        <td className="px-3 py-3">
          <Badge variant={STATUS_BADGE[tag.status]}>
            {STATUS_LABEL[tag.status]}
          </Badge>
        </td>

        {/* Acciones */}
        <td className="px-3 py-3">
          {isPending && (
            <div className="flex items-center gap-1.5">
              <button
                title="Aprobar"
                disabled={approve.isPending}
                onClick={() => approve.mutate({ id: tag.id, projectId })}
                className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={16} />
              </button>
              <button
                title="Rechazar"
                disabled={reject.isPending}
                onClick={() => setShowNoteInput((v) => !v)}
                className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
              >
                <XCircle size={16} />
              </button>
              <button
                title="Fusionar con existente"
                disabled={merge.isPending}
                onClick={() => merge.mutate({ id: tag.id, projectId })}
                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors disabled:opacity-50"
              >
                <GitMerge size={16} />
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Input nota de rechazo */}
      {showNoteInput && isPending && (
        <tr className="bg-red-50 dark:bg-red-900/10">
          <td colSpan={8} className="px-6 py-2">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 text-xs rounded-lg border border-red-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400 dark:bg-slate-800 dark:border-slate-600"
                placeholder="Motivo del rechazo (opcional)..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                autoFocus
              />
              <Button
                size="sm"
                variant="danger"
                loading={reject.isPending}
                onClick={() => {
                  reject.mutate(
                    { id: tag.id, projectId, notes: rejectNote },
                    { onSuccess: () => setShowNoteInput(false) }
                  );
                }}
              >
                Confirmar rechazo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNoteInput(false)}>
                Cancelar
              </Button>
            </div>
          </td>
        </tr>
      )}

      {/* Fila expandida: contexto y datos adicionales */}
      {expanded && (
        <tr className="bg-slate-50 dark:bg-slate-800/30">
          <td colSpan={8} className="px-6 py-3">
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              {/* Texto origen */}
              {tag.entity?.source_text && (
                <div>
                  <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Texto origen</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-lg p-2 leading-relaxed border border-slate-200 dark:border-slate-700">
                    {tag.entity.source_text}
                  </p>
                </div>
              )}

              {/* Datos de extracción */}
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-600 dark:text-slate-400">Extracción</p>
                {tag.description && (
                  <p><span className="text-slate-400">Descripción:</span> {tag.description}</p>
                )}
                {tag.entity?.page_number && (
                  <p><span className="text-slate-400">Página:</span> {tag.entity.page_number}</p>
                )}
                {tag.extracted_data_json?.pattern_name && (
                  <p><span className="text-slate-400">Patrón:</span> {tag.extracted_data_json.pattern_name}</p>
                )}
                {tag.extracted_data_json?.occurrences && (
                  <p><span className="text-slate-400">Ocurrencias:</span> {tag.extracted_data_json.occurrences}x
                    {tag.extracted_data_json.pages?.length
                      ? ` (páginas: ${tag.extracted_data_json.pages.join(", ")})`
                      : ""}
                  </p>
                )}
                {tag.extracted_data_json?.source_format && (
                  <p><span className="text-slate-400">Formato:</span> {tag.extracted_data_json.source_format.toUpperCase()}</p>
                )}
                {tag.review_notes && (
                  <p><span className="text-slate-400">Nota revisión:</span> {tag.review_notes}</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Tabla principal ───────────────────────────────────────────

interface TagReviewTableProps {
  tags: EngineeredTag[];
  projectId: string;
  loading?: boolean;
}

export function TagReviewTable({ tags, projectId, loading }: TagReviewTableProps) {
  const [filterStatus, setFilterStatus] = useState<TagStatus | "">("");
  const [filterType, setFilterType]     = useState("");
  const [filterConf, setFilterConf]     = useState<"all" | "high" | "medium" | "low">("all");
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  const bulkReview = useBulkReviewTags();

  const filtered = useMemo(() => {
    return tags.filter((t) => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterType && t.detected_type !== filterType) return false;
      if (filterConf !== "all") {
        const avg = (t.tag_confidence + t.type_confidence + t.description_confidence) / 3;
        if (filterConf === "high"   && avg < 0.85) return false;
        if (filterConf === "medium" && (avg < 0.65 || avg >= 0.85)) return false;
        if (filterConf === "low"    && avg >= 0.65) return false;
      }
      return true;
    });
  }, [tags, filterStatus, filterType, filterConf]);

  const pendingFiltered = filtered.filter((t) => t.status === "pending_review");

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === pendingFiltered.length
        ? new Set()
        : new Set(pendingFiltered.map((t) => t.id))
    );

  const bulkAction = (status: "approved" | "rejected") => {
    const ids = Array.from(selected).filter((id) =>
      tags.find((t) => t.id === id)?.status === "pending_review"
    );
    bulkReview.mutate(
      { ids, projectId, status },
      { onSuccess: () => setSelected(new Set()) }
    );
  };

  const typeOptions = useMemo(() => {
    const types = [...new Set(tags.map((t) => t.detected_type).filter(Boolean))];
    return types.map((v) => ({ value: v!, label: TYPE_LABELS[v!] ?? v! }));
  }, [tags]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          options={[
            { value: "pending_review", label: "Pendiente" },
            { value: "approved",       label: "Aprobados" },
            { value: "rejected",       label: "Rechazados" },
            { value: "merged",         label: "Fusionados" },
          ]}
          placeholder="Todos los estados"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as TagStatus | ""); setSelected(new Set()); }}
        />
        <Select
          options={typeOptions}
          placeholder="Todos los tipos"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        />
        <Select
          options={[
            { value: "high",   label: "Confianza alta (≥85%)"   },
            { value: "medium", label: "Confianza media (65-84%)" },
            { value: "low",    label: "Confianza baja (<65%)"    },
          ]}
          placeholder="Toda confianza"
          value={filterConf}
          onChange={(e) => setFilterConf(e.target.value as typeof filterConf)}
        />
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} tag(s)</span>
      </div>

      {/* Acciones masivas */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex-1">
            {selected.size} seleccionado(s)
          </span>
          <Button
            size="sm"
            icon={<CheckCircle size={14} />}
            loading={bulkReview.isPending}
            onClick={() => bulkAction("approved")}
          >
            Aprobar seleccionados
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<XCircle size={14} />}
            loading={bulkReview.isPending}
            onClick={() => bulkAction("rejected")}
          >
            Rechazar seleccionados
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Cancelar
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <AlertTriangle size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay tags con los filtros aplicados</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-blue-500">
                    {selected.size === pendingFiltered.length && pendingFiltered.length > 0
                      ? <CheckSquare size={15} className="text-blue-500" />
                      : <Square size={15} />}
                  </button>
                </th>
                <th className="w-6" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">TAG</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 w-52">Confianza</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Documento</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Estado</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  projectId={projectId}
                  selected={selected.has(tag.id)}
                  onToggle={() => toggleSelect(tag.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
