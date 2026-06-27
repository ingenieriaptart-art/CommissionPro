"use client";
import { PenLine } from "lucide-react";

interface SignatureFieldProps {
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SignatureField({ value, onChange, disabled }: SignatureFieldProps) {
  if (value) {
    return (
      <div className="relative">
        <div className="bg-slate-800 border border-green-700 rounded-lg p-3 flex items-center gap-2">
          <PenLine size={14} className="text-green-400" />
          <span className="text-xs text-green-300">Firma registrada</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="ml-auto text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Borrar
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(`signed_${Date.now()}`)}
      className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm transition-colors w-full justify-center"
    >
      <PenLine size={16} />
      Toca para firmar (stub — canvas en producción)
    </button>
  );
}
