"use client";
import { useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PunchImagePickerProps {
  preview: string | null;
  onCapture: (blob: Blob, preview: string) => void;
  onRemove: () => void;
}

export function PunchImagePicker({ preview, onCapture, onRemove }: PunchImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((blob) => onCapture(blob, dataUrl));
    };
    reader.readAsDataURL(file);
  };

  if (preview) {
    return (
      <div className="relative">
        <img src={preview} alt="Evidencia de novedad" className="w-full rounded-xl object-cover max-h-48" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white"
        >
          <X size={14} />
        </button>
        <p className="text-xs text-emerald-600 mt-1">✓ Imagen de novedad capturada</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
        Imagen de la novedad <span className="text-red-500">*</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          icon={<Camera size={18} />}
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.accept = "image/*";
              fileRef.current.setAttribute("capture", "environment");
              fileRef.current.click();
            }
          }}
          fullWidth
        >
          Cámara
        </Button>
        <Button
          type="button"
          variant="secondary"
          icon={<Upload size={18} />}
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.accept = "image/*";
              fileRef.current.removeAttribute("capture");
              fileRef.current.click();
            }
          }}
          fullWidth
        >
          Galería
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
