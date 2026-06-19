"use client";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { useAppUIPrefs, useSetAppUIPrefs } from "@/hooks/useAppConfig";
import { useProject } from "@/hooks/useProject";
import { useMyModuleAccess } from "@/hooks/useMyModuleAccess";
import {
  LayoutDashboard, Wrench, CheckSquare, AlertTriangle,
  FileText, Settings, ChevronLeft, ArrowLeft, Zap, Cpu, Map, ClipboardList, Activity, Home, Printer, ChevronRight, Eye, EyeOff,
} from "lucide-react";

const navItems = [
  { segment: "dashboard",   icon: LayoutDashboard, label: "Dashboard LDC"    },
  { segment: "equipment",   icon: Wrench,          label: "Equipos", toggleable: true },
  { segment: "plant-map",   icon: Map,             label: "Mapa de Planta"    },
  { segment: "ic02-rtu",    icon: Activity,        label: "Instrumentos IC02" },
  { segment: "tests",       icon: CheckSquare,     label: "Pruebas"           },
  { segment: "punch",       icon: AlertTriangle,   label: "Punch List"        },
  { segment: "reports",     icon: Printer,         label: "Informes"          },
  { segment: "documents",   icon: FileText,        label: "Documentos"        },
  { segment: "templates",   icon: ClipboardList,   label: "Templates"         },
  { segment: "engineering", icon: Cpu,             label: "Ing. Digital"      },
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
  const { sidebarOpen, toggleSidebar, setSidebarOpen, sidebarAutoCloseMs } = useUIStore();
  const { isRole, getAccess } = useAuthStore();
  const { data: uiPrefs } = useAppUIPrefs();
  const setUIPrefs = useSetAppUIPrefs();
  const showEquipmentNav = uiPrefs?.showEquipmentNav ?? false;
  const isAdmin = isRole("admin");
  const { data: project } = useProject(projectId);
  useMyModuleAccess(projectId);

  // El dashboard es la landing y siempre es accesible para un miembro del proyecto.
  const canSeeModule = (segment: string) =>
    isAdmin || segment === "dashboard" || getAccess(projectId, segment) !== "none";
  const canSeeSettings = isAdmin || getAccess(projectId, "settings") !== "none";

  const base = `/projects/${projectId}`;

  // En módulos full-screen (plant-map, ic02-rtu) el sidebar actúa como drawer
  // flotante encima del overlay (z-index 9999) del módulo
  const isFullscreen =
    pathname.includes('/plant-map') || pathname.includes('/ic02-rtu');

  // Auto-cierre en módulos fullscreen: se cierra solo después de sidebarAutoCloseMs
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isFullscreen || !sidebarOpen) return;
    autoCloseTimer.current = setTimeout(() => setSidebarOpen(false), sidebarAutoCloseMs);
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [isFullscreen, sidebarOpen, sidebarAutoCloseMs, setSidebarOpen]);

  // Móvil: arrancar con el drawer cerrado y cerrarlo al navegar.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Cuando el módulo es full-screen y el sidebar está cerrado,
  // mostramos solo un botón ▶ flotante en el borde izquierdo
  if (isFullscreen && !sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        title="Abrir menú"
        aria-label="Abrir menú lateral"
        className="fixed top-1/2 left-0 -translate-y-1/2 z-[10001]
          flex items-center justify-center
          w-9 h-20 md:w-7 md:h-16 rounded-r-xl
          bg-blue-600 md:bg-slate-800 border border-l-0 border-blue-500 md:border-slate-700
          text-white md:text-slate-300 hover:bg-blue-500 md:hover:bg-slate-700 hover:text-white
          transition-colors shadow-lg"
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <>
    {/* Backdrop móvil: cierra el drawer al tocar fuera */}
    {sidebarOpen && (
      <div
        className={cn("fixed inset-0 bg-black/50 md:hidden", isFullscreen ? "z-[10000]" : "z-30")}
        onClick={() => setSidebarOpen(false)}
      />
    )}
    <aside className={cn(
      "fixed inset-y-0 left-0 flex flex-col bg-slate-900 text-white transition-transform duration-300 md:transition-all",
      isFullscreen ? "z-[10001]" : "z-40",
      "w-60",
      // Móvil: el drawer entra/sale con translate; desktop siempre visible.
      sidebarOpen ? "translate-x-0" : "-translate-x-full",
      "md:translate-x-0",
      sidebarOpen ? "md:w-60" : "md:w-16"
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

      {/* Back navigation */}
      <div className="px-2 pt-3 pb-1 space-y-0.5">
        <Link
          href="/dashboard"
          title={!sidebarOpen ? "Ir al Dashboard" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <Home size={14} className="flex-shrink-0" />
          {sidebarOpen && <span>Dashboard Principal</span>}
        </Link>
        <Link
          href="/projects"
          title={!sidebarOpen ? "Todos los proyectos" : undefined}
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
        {navItems.map(({ segment, icon: Icon, label, toggleable }) => {
          if (toggleable && !showEquipmentNav) return null;
          if (!canSeeModule(segment)) return null;
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

        {/* Toggle visibilidad de Equipos — solo admin */}
        {isAdmin && (
          <button
            onClick={() => setUIPrefs.mutate({ showEquipmentNav: !showEquipmentNav })}
            title={!sidebarOpen ? (showEquipmentNav ? "Ocultar Equipos" : "Mostrar Equipos") : undefined}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors",
              "text-slate-600 hover:bg-slate-800 hover:text-slate-300",
              !sidebarOpen && "justify-center px-0"
            )}
          >
            {showEquipmentNav
              ? <EyeOff size={15} className="flex-shrink-0" />
              : <Eye size={15} className="flex-shrink-0" />
            }
            {sidebarOpen && (
              <span>{showEquipmentNav ? "Ocultar Equipos" : "Mostrar Equipos"}</span>
            )}
          </button>
        )}
      </nav>

      {/* Config */}
      {canSeeSettings && (
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
      )}

      {/* Biotec logo */}
      <div className={cn(
        "flex items-center justify-center px-3 py-2 border-t border-slate-800",
        !sidebarOpen && "px-0"
      )}>
        <div className={cn(
          "bg-white rounded-lg overflow-hidden flex items-center justify-center",
          sidebarOpen ? "w-32 h-8 px-2" : "w-9 h-9"
        )}>
          <Image
            src="/logo-biotec.png"
            alt="Biotec"
            width={sidebarOpen ? 112 : 32}
            height={sidebarOpen ? 28 : 32}
            className="object-contain"
          />
        </div>
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
    </>
  );
}
