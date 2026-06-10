"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useProject } from "@/hooks/useProject";
import {
  LayoutDashboard, Wrench, CheckSquare, AlertTriangle,
  FileText, Settings, ChevronLeft, ArrowLeft, Zap, Cpu, Map, ClipboardList,
} from "lucide-react";

const navItems = [
  { segment: "dashboard",   icon: LayoutDashboard, label: "Dashboard"    },
  { segment: "equipment",   icon: Wrench,          label: "Equipos"      },
  { segment: "plant-map",   icon: Map,             label: "Mapa de Planta" },
  { segment: "tests",       icon: CheckSquare,     label: "Pruebas"      },
  { segment: "punch",       icon: AlertTriangle,   label: "Punch List"   },
  { segment: "documents",   icon: FileText,        label: "Documentos"   },
  { segment: "templates",   icon: ClipboardList,   label: "Templates"    },
  { segment: "engineering", icon: Cpu,             label: "Ing. Digital" },
];

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600",
  "bg-amber-500", "bg-rose-600",   "bg-cyan-600",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function ProjectSidebar() {
  const params    = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const pathname  = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { data: project } = useProject(projectId);

  const base = `/projects/${projectId}`;

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white transition-all duration-300",
      sidebarOpen ? "w-60" : "w-16"
    )}>
      {/* Project header */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-slate-700 gap-3",
        !sidebarOpen && "justify-center px-0"
      )}>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold",
          project ? avatarColor(project.name) : "bg-blue-600"
        )}>
          {project ? project.name.charAt(0).toUpperCase() : <Zap size={14} />}
        </div>
        {sidebarOpen && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {project?.name ?? "Cargando…"}
            </p>
            {project?.client_company && (
              <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                {(project.client_company as { name: string }).name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Back to projects */}
      <div className="px-2 pt-3 pb-1">
        <Link
          href="/projects"
          title={!sidebarOpen ? "Volver a proyectos" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <ArrowLeft size={14} className="flex-shrink-0" />
          {sidebarOpen && <span>Todos los proyectos</span>}
        </Link>
      </div>

      <div className="mx-2 border-b border-slate-800 mb-2" />

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto space-y-0.5 px-2">
        {navItems.map(({ segment, icon: Icon, label }) => {
          const href   = `${base}/${segment}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={segment}
              href={href}
              title={!sidebarOpen ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                !sidebarOpen && "justify-center px-0"
              )}
            >
              <Icon size={20} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Config */}
      <div className="px-2 pb-2 border-t border-slate-800 pt-2">
        <Link
          href={`${base}/settings`}
          title={!sidebarOpen ? "Configuración" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <Settings size={20} className="flex-shrink-0" />
          {sidebarOpen && <span>Configuración</span>}
        </Link>
      </div>

      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-12 border-t border-slate-700 hover:bg-slate-800 transition-colors"
      >
        <ChevronLeft size={18} className={cn(
          "transition-transform duration-300",
          !sidebarOpen && "rotate-180"
        )} />
      </button>
    </aside>
  );
}
