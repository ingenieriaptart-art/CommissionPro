"use client";
import { use } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentUploader } from "@/components/engineering/DocumentUploader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtDate } from "@/lib/utils";
import Link from "next/link";
import {
  FileText, FileType2, FileSpreadsheet, Image, File,
  Loader2, CheckCircle, AlertCircle, Clock,
  ChevronRight, FolderOpen, RotateCcw, Trash2,
} from "lucide-react";
import { useReprocessDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { useAuthStore } from "@/stores/auth.store";
import type { Document, DocumentProcessingStatus } from "@/types";

interface Props { params: Promise<{ projectId: string }> }

// ── Helpers visuales ──────────────────────────────────────────

const STATUS_CONFIG: Record<DocumentProcessingStatus, {
  label: string;
  badge: "default" | "info" | "success" | "danger";
  icon: React.ReactNode;
}> = {
  pending:    { label: "En cola",      badge: "default", icon: <Clock size={12} />        },
  processing: { label: "Procesando",   badge: "info",    icon: <Loader2 size={12} className="animate-spin" /> },
  completed:  { label: "Completado",   badge: "success", icon: <CheckCircle size={12} />  },
  failed:     { label: "Error",        badge: "danger",  icon: <AlertCircle size={12} />  },
};

function fileIcon(ext?: string) {
  switch (ext?.toLowerCase()) {
    case "pdf":              return <FileType2 size={20} className="text-red-500" />;
    case "xlsx": case "xls": return <FileSpreadsheet size={20} className="text-green-600" />;
    case "csv":              return <FileSpreadsheet size={20} className="text-emerald-600" />;
    case "jpg": case "jpeg":
    case "png":              return <Image size={20} className="text-purple-500" />;
    case "dxf":              return <File size={20} className="text-blue-500" />;
    default:                 return <FileText size={20} className="text-slate-400" />;
  }
}

function fmtSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Componente documento ──────────────────────────────────────

function DocumentRow({ doc, projectId }: { doc: Document; projectId: string }) {
  const status     = doc.processing_status ?? "pending";
  const cfg        = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const meta       = doc.processing_metadata as { tags_found?: number } | undefined;
  const reprocess  = useReprocessDocument();
  const deleteMut  = useDeleteDocument();
  const canWrite   = useAuthStore((s) => s.canWrite(projectId, "documents"));
  const canDelete  = useAuthStore((s) => s.canFull(projectId, "documents"));

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors rounded-xl">
      {/* Icono formato */}
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        {fileIcon(doc.file_type)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{doc.name}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-400">{fmtDate(doc.uploaded_at)}</span>
          <span className="text-xs text-slate-400">{fmtSize(doc.file_size)}</span>
          {meta?.tags_found !== undefined && (
            <span className="text-xs text-blue-600 font-medium">{meta.tags_found} tag(s) extraídos</span>
          )}
          {doc.processing_error && (
            <span className="text-xs text-red-500 truncate max-w-xs" title={doc.processing_error}>
              {doc.processing_error}
            </span>
          )}
        </div>
      </div>

      {/* Estado */}
      <Badge variant={cfg.badge}>
        <span className="flex items-center gap-1">
          {cfg.icon} {cfg.label}
        </span>
      </Badge>

      {/* Reprocesar */}
      {status === "completed" && canWrite && (
        <button
          title="Reprocesar documento"
          disabled={reprocess.isPending}
          onClick={() => reprocess.mutate({ document: doc, projectId })}
          className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {reprocess.isPending
            ? <Loader2 size={15} className="animate-spin" />
            : <RotateCcw size={15} />}
        </button>
      )}

      {/* Link a revisión */}
      {status === "completed" && (
        <Link
          href={`/projects/${projectId}/engineering?document=${doc.id}`}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
        >
          Ver tags <ChevronRight size={12} />
        </Link>
      )}

      {/* Eliminar */}
      {canDelete && (
        <button
          title="Eliminar documento"
          disabled={deleteMut.isPending}
          onClick={() => {
            if (confirm(`¿Eliminar "${doc.name}"? Esta acción no se puede deshacer.`)) {
              deleteMut.mutate({ document: doc, projectId });
            }
          }}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {deleteMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────

export default function DocumentsPage({ params }: Props) {
  const { projectId } = use(params);
  const { data: docs = [], isLoading } = useDocuments(projectId);
  const canUpload = useAuthStore((s) => s.canWrite(projectId, "documents"));

  const completedCount  = docs.filter((d) => d.processing_status === "completed").length;
  const processingCount = docs.filter((d) => d.processing_status === "processing").length;
  const failedCount     = docs.filter((d) => d.processing_status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Documentos de ingeniería</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sube planos, listados y hojas técnicas para extracción automática de TAGs
        </p>
      </div>

      {/* Upload */}
      {canUpload && (
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Subir documentos</h3>
          <DocumentUploader
            projectId={projectId}
            onUploaded={() => {/* query se auto-refresca con refetchInterval */}}
          />
        </Card>
      )}

      {/* Stats rápidas */}
      {docs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",       value: docs.length,      color: "text-slate-700 dark:text-slate-300" },
            { label: "Procesados",  value: completedCount,   color: "text-emerald-600"  },
            { label: "Procesando",  value: processingCount,  color: "text-blue-600"     },
            { label: "Con error",   value: failedCount,      color: "text-red-500"      },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center py-3">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Lista documentos */}
      <Card>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Documentos del proyecto
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-slate-400">
            <FolderOpen size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Sube el primer documento para comenzar</p>
          </div>
        ) : (
          <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
            {docs.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} projectId={projectId} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
