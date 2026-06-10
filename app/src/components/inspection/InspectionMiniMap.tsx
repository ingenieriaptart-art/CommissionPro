"use client";
import { useEffect, useState } from "react";
import { Map } from "lucide-react";

interface InspectionMiniMapProps {
  equipmentId: string;
  equipmentTag: string;
}

interface MapContext {
  imageUrl: string;
  overlayX: number;
  overlayY: number;
}

const CONTEXT_KEY = "plantmap_inspection_context";

export function InspectionMiniMap({ equipmentId, equipmentTag }: InspectionMiniMapProps) {
  const [ctx, setCtx] = useState<MapContext | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(CONTEXT_KEY);
      if (stored) setCtx(JSON.parse(stored) as MapContext);
    } catch { /* ignore */ }
  }, [equipmentId]);

  return (
    <aside className="w-20 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col items-center py-3 gap-2 overflow-hidden">
      <p className="text-[8px] text-slate-600 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 select-none">
        Plano
      </p>

      <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-md overflow-hidden relative flex-shrink-0">
        {ctx?.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ctx.imageUrl}
              alt="Plano"
              className="w-full h-full object-cover opacity-60"
            />
            {/* Equipment marker */}
            <div
              className="absolute w-3 h-3 bg-yellow-400 rounded-sm border border-yellow-300 shadow-[0_0_6px_#facc15]"
              style={{
                left: `${ctx.overlayX * 100}%`,
                top:  `${ctx.overlayY * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Map size={16} className="text-slate-600" />
          </div>
        )}
      </div>

      <p className="text-[8px] text-slate-500 font-mono text-center break-all px-1 leading-tight">
        {equipmentTag}
      </p>
    </aside>
  );
}
