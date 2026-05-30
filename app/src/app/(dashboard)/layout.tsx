import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SyncProvider } from "@/components/layout/SyncProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SyncProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300
                        ml-16 [.sidebar-open_&]:ml-60">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SyncProvider>
  );
}
