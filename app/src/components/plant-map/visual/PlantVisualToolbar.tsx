"use client";
import { useRef, useState } from "react";
import { Upload, Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface PlantVisualToolbarProps {
  overlayMode: 'area' | 'equipment';
  projectId: string;
  areaId?: string;        // requerido cuando overlayMode='equipment'
  hasImage: boolean;
  editMode: boolean;
  hasPendingOverlays: boolean;
  onEditModeChange: (active: boolean) => void;
  onImageUploaded: (url: string) => void;
  onSaveOverlays: () => void;
  onCancelEdit: () => void;
}

export function PlantVisualToolbar({
  overlayMode, projectId, areaId, hasImage, editMode, hasPendingOverlays,
  onEditModeChange, onImageUploaded, onSaveOverlays, onCancelEdit,
}: PlantVisualToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Formato no soportado. Usá PNG, JPG o SVG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("El archivo no puede superar 10MB.");
      return;
    }

    if (overlayMode === 'equipment' && !areaId) {
      setUploadError("Error interno: falta el ID de área.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'png';
      const folder = areaId ? `${projectId}/${areaId}` : projectId;
      const path = `${folder}/plano.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("plant-maps")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("plant-maps")
        .getPublicUrl(path);

      onImageUploaded(publicUrl);
    } catch (err) {
      setUploadError("Error al subir la imagen. Intentá de nuevo.");
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const editLabel = overlayMode === 'equipment' ? "Editar equipos" : "Editar áreas";
  const saveLabel = overlayMode === 'equipment' ? "Guardar equipos" : "Guardar áreas";

  return (
    <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2 flex-shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          "bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600",
          uploading && "opacity-60 cursor-not-allowed"
        )}
      >
        {uploading ? (
          <><Loader2 size={12} className="animate-spin" /> Subiendo...</>
        ) : (
          <><Upload size={12} /> {hasImage ? "Cambiar imagen" : "Subir imagen"}</>
        )}
      </button>

      {hasImage && !editMode && (
        <button
          onClick={() => onEditModeChange(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors"
        >
          <Pencil size={12} /> {editLabel}
        </button>
      )}

      {editMode && (
        <>
          <button
            onClick={onSaveOverlays}
            disabled={!hasPendingOverlays}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              hasPendingOverlays
                ? "bg-green-700 hover:bg-green-600 text-white border border-green-600"
                : "bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed"
            )}
          >
            <Check size={12} /> {saveLabel}
          </button>
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors"
          >
            <X size={12} /> Cancelar
          </button>
        </>
      )}

      {uploadError && (
        <span className="text-red-400 text-xs ml-2">{uploadError}</span>
      )}
    </div>
  );
}
