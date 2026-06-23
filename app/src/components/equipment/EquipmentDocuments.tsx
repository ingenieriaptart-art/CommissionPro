"use client";
import { useRef, useState } from "react";
import { FileText, UploadCloud, Trash2, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { useEquipmentDocuments, useUploadEquipmentDocument, useDeleteEquipmentDocument } from "@/hooks/useEquipmentDocuments";
import { useAuthStore } from "@/stores/auth.store";
import type { EquipmentDocumentType } from "@/types";

const TYPE_LABELS: Record<EquipmentDocumentType, string> = {
  unifilar: "Unifilar",
  catalogo: "Catálogo",
  fat:      "FAT",
  manual:   "Manual",
  otro:     "Otro",
};

const TYPE_COLORS: Record<EquipmentDocumentType, string> = {
  unifilar: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  catalogo: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  fat:      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  manual:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  otro:     "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function fmtSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  equipmentId: string;
  projectId: string;
}

export function EquipmentDocuments({ equipmentId, projectId }: Props) {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.user?.role as { key?: string } | undefined);
  const canDelete = role?.key === "admin" || role?.key === "supervisor";

  const { data: docs = [], isLoading } = useEquipmentDocuments(equipmentId);
  const upload = useUploadEquipmentDocument();
  const remove = useDeleteEquipmentDocument();

  const [showForm, setShowForm]   = useState(false);
  const [docName, setDocName]     = useState("");
  const [docType, setDocType]     = useState<EquipmentDocumentType>("unifilar");
  const [file,    setFile]        = useState<File | null>(null);
  const [formErr, setFormErr]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setFormErr("Solo se aceptan archivos PDF"); return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setFormErr("Máximo 50 MB"); return;
    }
    setFormErr("");
    setFile(f);
    if (!docName) setDocName(f.name.replace(/\.pdf$/i, "").replace(/_/g, " "));
  };

  const handleUpload = async () => {
    if (!file || !docName.trim()) { setFormErr("Completa el nombre y selecciona un archivo"); return; }
    setFormErr("");
    try {
      await upload.mutateAsync({ equipmentId, projectId, name: docName, documentType: docType, file });
      setShowForm(false);
      setDocName(""); setDocType("unifilar"); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Error al subir el documento");
    }
  };

  const handleDelete = async (doc: typeof docs[0]) => {
    if (!window.confirm(`¿Eliminar "${doc.name}"?`)) return;
    await remove.mutateAsync(doc);
  };

  return (
    <div className="space-y-2">
      {/* Lista */}
      {isLoading ? (
        <p className="text-xs text-slate-400 py-1">Cargando documentos…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Sin documentos técnicos cargados.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                {doc.file_size_bytes && (
                  <p className="text-[10px] text-slate-400">{fmtSize(doc.file_size_bytes)}</p>
                )}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${TYPE_COLORS[doc.document_type as EquipmentDocumentType]}`}>
                {TYPE_LABELS[doc.document_type as EquipmentDocumentType]}
              </span>
              <a href={doc.storage_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 shrink-0">
                <ExternalLink size={13} />
              </a>
              {canDelete && (
                <button onClick={() => handleDelete(doc)} disabled={remove.isPending}
                  className="text-red-400 hover:text-red-500 shrink-0 disabled:opacity-40">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario de subida */}
      {showForm ? (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2.5 bg-white dark:bg-slate-900">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-slate-500 mb-1">Nombre del documento</label>
              <input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Ej: Unifilar CCM-2 Principal"
                className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Tipo</label>
              <div className="relative">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as EquipmentDocumentType)}
                  className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 pr-6 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  {(Object.keys(TYPE_LABELS) as EquipmentDocumentType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-2 text-slate-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Archivo PDF (máx. 50 MB)</label>
            <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange}
              className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:text-xs file:border-0 file:rounded-lg file:px-3 file:py-1 file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer" />
          </div>

          {formErr && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5">{formErr}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setFile(null); setDocName(""); setFormErr(""); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button onClick={handleUpload} disabled={!file || !docName.trim() || upload.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 flex items-center gap-1.5">
              {upload.isPending ? <><Loader2 size={12} className="animate-spin" /> Subiendo…</> : <><UploadCloud size={12} /> Subir</>}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">
          <UploadCloud size={13} /> + Subir documento
        </button>
      )}
    </div>
  );
}
