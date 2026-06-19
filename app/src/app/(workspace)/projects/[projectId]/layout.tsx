import { ProjectSidebar } from "@/components/layout/ProjectSidebar";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Topbar } from "@/components/layout/Topbar";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

export default function ProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />
      <DashboardShell>
        <Topbar />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ModuleGuard>{children}</ModuleGuard>
        </main>
      </DashboardShell>
    </div>
  );
}
