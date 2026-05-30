"use client";
import { useSyncStore } from "@/stores/sync.store";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncIndicator() {
  const { state, pendingCount } = useSyncStore();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg",
      !isOnline && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
      isOnline && state === "idle" && "text-slate-500 dark:text-slate-400",
      state === "syncing" && "text-blue-600 dark:text-blue-400",
      state === "success" && "text-emerald-600 dark:text-emerald-400",
      state === "error" && "text-red-600 dark:text-red-400",
    )}>
      {!isOnline
        ? <><CloudOff size={13} /> Sin conexión {pendingCount > 0 && `(${pendingCount} pendientes)`}</>
        : state === "syncing"
          ? <><RefreshCw size={13} className="animate-spin" /> Sincronizando...</>
          : state === "success"
            ? <><CheckCircle2 size={13} /> Sincronizado</>
            : state === "error"
              ? <><AlertCircle size={13} /> Error sync</>
              : <><Cloud size={13} /> En línea {pendingCount > 0 && `(${pendingCount} pend.)`}</>
      }
    </div>
  );
}
