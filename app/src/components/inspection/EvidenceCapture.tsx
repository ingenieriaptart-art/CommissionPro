"use client";
import { useRef, useState } from "react";
import { Camera, Upload, X, ZoomIn } from "lucide-react";
import type { EvidenceItem } from "@/types/inspection";

interface EvidenceCaptureProps {
  fieldKey: string;
  items: EvidenceItem[];
  onAdd: (url: string) => void;
  onRemove: (index: number) => void;
}

export function EvidenceCapture({ fieldKey, items, onAdd, onRemove }: EvidenceCaptureProps) {
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const maxReached = items.length >= 5;

  function handleFile(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAdd(url);
  }

  return (
    <div>
      {/* Thumbnails */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.map((item, idx) => (
            <div key={idx} className="relative group">
              <img
                src={item.url}
                alt={`Evidencia ${idx + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-slate-700 cursor-pointer"
                onClick={() => setPreview(item.url)}
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-white" />
              </button>
              <button
                type="button"
                onClick={() => setPreview(item.url)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
              >
                <ZoomIn size={14} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Capture buttons */}
      {!maxReached && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
          >
            <Camera size={13} /> Cámara
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
          >
            <Upload size={13} /> Galería
          </button>
          {items.length > 0 && (
            <span className="text-[10px] text-slate-600 self-center">{items.length}/5</span>
          )}
        </div>
      )}
      {maxReached && (
        <p className="text-[10px] text-slate-600">Máximo 5 fotos por campo (prototipo)</p>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {/* Fullscreen preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white hover:bg-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
