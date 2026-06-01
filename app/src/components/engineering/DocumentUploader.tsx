"use client";
import { useRef, useState, useCallback } from "react";
import { useUploadDocument } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const ACCEPTED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png", ".dxf"];
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/vnd.dxf",
  "application/dxf",
];
const MAX_SIZE_MB = 50;

interface UploadFile {
  id: string;
  file: File;
  state: "queued" | "uploading" | "done" | "error";
  error?: string;
  tagsFound?: number;
}

interface DocumentUploaderProps {
  projectId: string;
  onUploaded?: () => void;
}

function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const validExt  = ACCEPTED_EXTENSIONS.includes(ext);
  const validMime = ACCEPTED_MIME.includes(file.type) || file.type === "";
  if (!validExt && !validMime) {
    return `Formato no soportado: ${ext}. Aceptados: ${ACCEPTED_EXTENSIONS.join(", ")}`;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Archivo demasiado grande (máx. ${MAX_SIZE_MB} MB)`;
  }
  return null;
}

export function DocumentUploader({ projectId, onUploaded }: DocumentUploaderProps) {
  const [files, setFiles]       = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);
  const upload                  = useUploadDocument();

  const addFiles = useCallback((incoming: File[]) => {
    const validated: UploadFile[] = incoming.map((file) => {
      const err = validateFile(file);
      return {
        id:    crypto.randomUUID(),
        file,
        state: err ? "error" : "queued",
        error: err ?? undefined,
      };
    });
    setFiles((prev) => [...prev, ...validated]);

    // Iniciar upload de los válidos inmediatamente
    for (const item of validated) {
      if (item.state !== "queued") continue;
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, state: "uploading" } : f));

      upload.mutate(
        { file: item.file, projectId },
        {
          onSuccess: () => {
            setFiles((prev) => prev.map((f) =>
              f.id === item.id ? { ...f, state: "done" } : f
            ));
            onUploaded?.();
          },
          onError: (err) => {
            setFiles((prev) => prev.map((f) =>
              f.id === item.id
                ? { ...f, state: "error", error: err instanceof Error ? err.message : "Error al subir" }
                : f
            ));
          },
        }
      );
    }
  }, [projectId, upload, onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) addFiles(dropped);
  }, [addFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) addFiles(selected);
    e.target.value = ""; // reset para permitir re-subida del mismo archivo
  };

  const remove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="space-y-3">
      {/* Zona de drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors",
          dragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
        )}
      >
        <UploadCloud size={36} className={cn("transition-colors", dragging ? "text-blue-500" : "text-slate-400")} />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Arrastra documentos aquí o <span className="text-blue-600">selecciona archivos</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {ACCEPTED_EXTENSIONS.join("  ·  ")} · Máx. {MAX_SIZE_MB} MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {/* Lista de archivos en proceso */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item) => (
            <FileRow key={item.id} item={item} onRemove={() => remove(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ item, onRemove }: { item: UploadFile; onRemove: () => void }) {
  const ext = item.file.name.split(".").pop()?.toUpperCase() ?? "?";

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm",
      item.state === "error"
        ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900"
        : item.state === "done"
        ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900"
        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    )}>
      {/* Icono formato */}
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{ext}</span>
      </div>

      {/* Nombre y tamaño */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-slate-800 dark:text-slate-200">{item.file.name}</p>
        {item.error && <p className="text-xs text-red-500 mt-0.5 truncate">{item.error}</p>}
        {!item.error && (
          <p className="text-xs text-slate-400">
            {(item.file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      {/* Estado */}
      <div className="flex-shrink-0">
        {item.state === "uploading" && <Loader2 size={16} className="text-blue-500 animate-spin" />}
        {item.state === "done"      && <CheckCircle size={16} className="text-emerald-500" />}
        {item.state === "error"     && <AlertCircle size={16} className="text-red-500" />}
        {item.state === "queued"    && <FileText size={16} className="text-slate-400" />}
      </div>

      {/* Quitar de la lista (solo si terminó o error) */}
      {(item.state === "done" || item.state === "error") && (
        <button onClick={onRemove} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
