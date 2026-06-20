"use client";
import { useState } from "react";
import { DownloadCloud, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";
import { prepareProjectOffline } from "@/lib/sync/prefetch";

export function OfflinePrepCard({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ equipment: number; templates: number; errors: string[] } | null>(null);

  async function handlePrepare() {
    setBusy(true); setResult(null); setProgress({ done: 0, total: 0 });
    try {
      const res = await prepareProjectOffline(
        projectId,
        { client: createClient(), db: localDB },
        (done, total) => setProgress({ done, total }),
      );
      setResult(res);
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <DownloadCloud size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-200">Preparar para offline</h3>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Descarga equipos y plantillas del proyecto a este dispositivo para inspeccionar sin conexión.
      </p>
      <button onClick={handlePrepare} disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <DownloadCloud size={13} />}
        {busy ? "Descargando…" : "Descargar para offline"}
      </button>
      {progress && busy && (
        <p className="text-[11px] text-slate-500 mt-2">Plantillas/equipos: {progress.done}/{progress.total}</p>
      )}
      {result && (
        <div className="mt-3 text-[11px] text-slate-400">
          <p className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size={12} /> {result.equipment} equipos · {result.templates} plantillas cacheadas
          </p>
          {result.errors.length > 0 && (
            <p className="text-amber-400 mt-1">{result.errors.length} con incidencias (revisar conexión)</p>
          )}
        </div>
      )}
    </div>
  );
}
