"use client";
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useExtractedTags, useTagStats } from "@/hooks/useEngineering";
import { useDocuments } from "@/hooks/useDocuments";
import { TagReviewTable } from "@/components/engineering/TagReviewTable";
import { ExcelImportPanel } from "@/components/engineering/ExcelImportPanel";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  CheckCircle, XCircle, Clock, GitMerge, Tag, Layers, ScanSearch,
} from "lucide-react";
import { TagSearchModal } from "@/components/shared/TagSearchModal";

interface Props { params: Promise<{ projectId: string }> }

export default function EngineeringPage({ params }: Props) {
  const { projectId }   = use(params);
  const searchParams    = useSearchParams();
  const docIdFromQuery  = searchParams.get("document") ?? undefined;
  const tagFromQuery    = searchParams.get("tag") ?? "";

  const [selectedDoc, setSelectedDoc] = useState<string>(docIdFromQuery ?? "");
  const [tagFilter, setTagFilter]         = useState<string>(tagFromQuery);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);

  // Sincronizar si cambia el query param (ej: navegar desde Documents page)
  useEffect(() => {
    if (docIdFromQuery) setSelectedDoc(docIdFromQuery); // eslint-disable-line react-hooks/set-state-in-effect
  }, [docIdFromQuery]);

  useEffect(() => {
    if (tagFromQuery) setTagFilter(tagFromQuery); // eslint-disable-line react-hooks/set-state-in-effect
  }, [tagFromQuery]);

  const { data: tags = [], isLoading } = useExtractedTags(
    projectId,
    selectedDoc || undefined
  );
  const { stats }                     = useTagStats(projectId);
  const { data: docs = [] }           = useDocuments(projectId);

  const completedDocs = docs.filter((d) => d.processing_status === "completed");

  const filteredTags = tagFilter
    ? tags.filter((t) => t.tag.toUpperCase().includes(tagFilter.toUpperCase()))
    : tags;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Bandeja de Revisión de Ingeniería
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Revisa, aprueba o rechaza los TAGs extraídos de los documentos del proyecto
          </p>
          {tagFilter && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Filtro: {tagFilter}
              </span>
              <button
                onClick={() => setTagFilter("")}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setTagSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg transition"
        >
          <ScanSearch size={15} />
          Buscar TAG
        </button>
      </div>

      {/* Stats de la bandeja */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Clock size={18} />}
          label="Pendientes"
          value={stats.pending_review}
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<CheckCircle size={18} />}
          label="Aprobados"
          value={stats.approved}
          color="text-emerald-600"
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          icon={<XCircle size={18} />}
          label="Rechazados"
          value={stats.rejected}
          color="text-red-500"
          bg="bg-red-50 dark:bg-red-900/20"
        />
        <StatCard
          icon={<GitMerge size={18} />}
          label="Fusionados"
          value={stats.merged}
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
      </div>

      {/* Filtro por documento */}
      {completedDocs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Layers size={15} className="text-slate-400 flex-shrink-0" />
          <Select
            options={completedDocs.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Todos los documentos"
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
          />
          {selectedDoc && (
            <button
              onClick={() => setSelectedDoc("")}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Ver todos
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <Tag size={11} /> {stats.total} tag(s) en total
          </span>
        </div>
      )}

      {/* Sin documentos procesados */}
      {completedDocs.length === 0 && !isLoading && (
        <Card className="text-center py-10">
          <Tag size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Sin tags extraídos todavía</p>
          <p className="text-sm text-slate-400 mt-1">
            Sube documentos en la sección <strong>Documentos</strong> para iniciar la extracción
          </p>
        </Card>
      )}

      {/* Importación de Instrument Index */}
      <div className="mb-6">
        <ExcelImportPanel projectId={projectId} />
      </div>

      {/* Tabla de revisión */}
      {(completedDocs.length > 0 || tags.length > 0) && (
        <TagReviewTable
          tags={filteredTags}
          projectId={projectId}
          loading={isLoading}
        />
      )}
      <TagSearchModal
        projectId={projectId}
        isOpen={tagSearchOpen}
        onClose={() => setTagSearchOpen(false)}
      />
    </div>
  );
}

function StatCard({
  icon, label, value, color, bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <Card className="flex items-center gap-3 py-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </Card>
  );
}
