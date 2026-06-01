"use client";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore();
  return (
    <div className={cn(
      "flex-1 flex flex-col overflow-hidden transition-all duration-300",
      sidebarOpen ? "ml-60" : "ml-16"
    )}>
      {children}
    </div>
  );
}
