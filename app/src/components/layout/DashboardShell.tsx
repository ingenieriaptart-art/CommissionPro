"use client";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore();
  return (
    <div className={cn(
      "flex-1 flex flex-col overflow-hidden transition-all duration-300 min-w-0",
      // Móvil: contenido a ancho completo (el sidebar es drawer superpuesto).
      // Desktop (md+): el sidebar empuja el contenido.
      "ml-0",
      sidebarOpen ? "md:ml-60" : "md:ml-16"
    )}>
      {children}
    </div>
  );
}
