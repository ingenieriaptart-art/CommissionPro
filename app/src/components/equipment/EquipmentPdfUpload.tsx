"use client";
import { useRef, useState } from "react";
import { FileText, UploadCloud, ExternalLink, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUpdateEquipment } from "@/hooks/useEquipment";

interface EquipmentPdfUploadProps {
  equipmentId: string;
  field: "catalog_url" | "fat_protocol_url";
  label: string;
  currentUrl?: string;
}

export function EquipmentPdfUpload({ equipmentId, field, label, currentUrl }: EquipmentPdfUploadProps) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [url, setUrl] = useState(currentUrl ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEquipment = useUpdateEquipment();

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo se aceptan archivos PDF");
      setUploadState("error");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Máximo 50 MB");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setError("");
    try {
      const supabase = createClient();
      const safeName = file.name
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `equipment/${equipmentId}/${field}/${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      await updateEquipment.mutateAsync({ id: equipmentId, [field]: urlData.publicUrl });
      setUrl(urlData.publicUrl);
      setUploadState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
      setUploadState("error");
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2 min-w-0">
        {url ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 flex-1 min-w-0"
            >
              <FileText size={12} className="flex-shrink-0" />
              <span className="truncate">Ver PDF</span>
              <ExternalLink size={10} className="flex-shrink-0" />
            </a>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploadState === "uploading"}
              className="text-slate-500 hover:text-slate-300 flex-shrink-0 transition-colors disabled:opacity-40"
              title="Reemplazar PDF"
            >
              {uploadState === "uploading"
                ? <Loader2 size={12} className="animate-spin" />
                : <UploadCloud size={12} />
              }
            </button>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploadState === "uploading"}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] transition-colors disabled:opacity-50"
          >
            {uploadState === "uploading"
              ? <Loader2 size={11} className="animate-spin" />
              : <UploadCloud size={11} />
            }
            {uploadState === "uploading" ? "Subiendo…" : "Subir PDF"}
          </button>
        )}
        {uploadState === "done" && (
          <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
        )}
        {uploadState === "error" && (
          <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
        )}
      </div>
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
