"use client";
import { useEffect } from "react";
import { setupAutoSync } from "@/lib/sync/engine";
import { useSyncStore } from "@/stores/sync.store";
import { localDB } from "@/lib/db/local";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { setState, setResult, setPending } = useSyncStore();

  useEffect(() => {
    // Contar pendientes periódicamente
    const countPending = async () => {
      const count = await localDB.syncQueue.count();
      setPending(count);
    };
    countPending();
    const interval = setInterval(countPending, 5000);

    // Auto-sync cuando vuelve la red
    const cleanup = setupAutoSync((result) => {
      setResult(result);
      setState("success");
      countPending();
    });

    // Escuchar estado de red
    const handleOnline  = () => setState("syncing");
    const handleOffline = () => setState("idle");
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cleanup();
      clearInterval(interval);
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setState, setResult, setPending]);

  return <>{children}</>;
}
