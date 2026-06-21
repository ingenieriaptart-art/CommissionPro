"use client";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

interface Props {
  onChange: (dataUrl: string | null) => void;
}

export function SignaturePadField({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled || !canvasRef.current) return;
    const pad = new SignaturePad(canvasRef.current, { penColor: "#0f172a" });
    padRef.current = pad;
    pad.addEventListener("endStroke", () => {
      onChange(pad.isEmpty() ? null : pad.toDataURL("image/png"));
    });
    return () => { pad.off(); padRef.current = null; };
  }, [enabled, onChange]);

  if (!enabled) {
    return (
      <button type="button" className="text-sm text-blue-600 underline"
        onClick={() => setEnabled(true)}>
        Añadir firma dibujada (opcional)
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} width={360} height={140}
        className="rounded border border-slate-300 bg-white" />
      <div className="flex gap-3 text-sm">
        <button type="button" className="text-slate-600 underline"
          onClick={() => { padRef.current?.clear(); onChange(null); }}>
          Limpiar
        </button>
      </div>
    </div>
  );
}
