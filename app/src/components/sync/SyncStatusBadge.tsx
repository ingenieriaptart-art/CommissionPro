"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { localDB } from "@/lib/db/local";
import { runSync } from "@/lib/sync/engine";

export function SyncStatusBadge() {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await localDB.syncQueue.count());
    setFailed(await localDB.syncQueue.filter((o) => o.attempts >= 5).count());
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try { await runSync(); } finally { setSyncing(false); refresh(); }
  }, [refresh]);

  if (pending === 0 && !syncing) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-2 py-1">
        <CheckCircle2 size={11} className="text-emerald-500" /> Sincronizado
      </div>
    );
  }

  return (
    <button onClick={handleSync} disabled={syncing}
      className="flex items-center gap-1.5 text-[10px] text-slate-300 px-2 py-1 rounded hover:bg-slate-800 w-full">
      {syncing ? <Loader2 size={11} className="animate-spin text-blue-400" />
        : failed > 0 ? <AlertTriangle size={11} className="text-amber-400" />
        : <RefreshCw size={11} className="text-blue-400" />}
      {syncing ? "Sincronizando…" : `${pending} pendiente(s)${failed > 0 ? ` · ${failed} con error` : ""}`}
    </button>
  );
}
