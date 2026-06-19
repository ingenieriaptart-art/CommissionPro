"use client";
import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { useSyncStore } from "@/stores/sync.store";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const { pendingCount } = useSyncStore();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2 text-sm font-semibold flex-shrink-0">
      <WifiOff size={15} className="flex-shrink-0" />
      <span>Sin conexión — trabajando en modo offline</span>
      {pendingCount > 0 && (
        <span className="ml-auto bg-white/25 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
          {pendingCount} cambio{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
