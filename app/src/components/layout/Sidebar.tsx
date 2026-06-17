"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { useAppUIPrefs, useSetAppUIPrefs } from "@/hooks/useAppConfig";
import {
  LayoutDashboard, FolderKanban, Wrench, CheckSquare,
  AlertTriangle, FileText, Users, Settings, ChevronLeft, BookOpen, Eye, EyeOff,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard",   permission: null },
  { href: "/projects",   icon: FolderKanban,    label: "Proyectos",   permission: null },
  { href: "/equipment",  icon: Wrench,          label: "Equipos",     permission: null, toggleable: true },
  { href: "/tests",      icon: CheckSquare,     label: "Pruebas",     permission: "test.create" },
  { href: "/punch",      icon: AlertTriangle,   label: "Punch List",  permission: "punch.create" },
  { href: "/documents",  icon: FileText,        label: "Documentos",  permission: null },
  { href: "/help",       icon: BookOpen,        label: "Manual",      permission: null },
  { href: "/admin/users",icon: Users,           label: "Usuarios",    permission: "user.create" },
  { href: "/admin/forms",icon: Settings,        label: "Formularios", permission: "form.configure" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { hasPermission, isRole } = useAuthStore();
  const { data: uiPrefs } = useAppUIPrefs();
  const setUIPrefs = useSetAppUIPrefs();
  const showEquipmentNav = uiPrefs?.showEquipmentNav ?? false;
  const isAdmin = isRole("admin");
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white transition-all duration-300",
      sidebarOpen ? "w-60" : "w-16"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center h-16 px-3 border-b border-slate-700",
        sidebarOpen ? "gap-2" : "justify-center px-0")}>
        <div className={cn(
          "bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
          sidebarOpen ? "w-8 h-8" : "w-9 h-9"
        )}>
          <Image
            src="/logo-biotec.png"
            alt="Biotec"
            width={sidebarOpen ? 28 : 34}
            height={sidebarOpen ? 28 : 34}
            className="object-contain"
          />
        </div>
        {sidebarOpen && (
          <span className="font-bold text-xs leading-tight text-slate-200 truncate">
            Commission<span className="text-blue-400">Pro</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-0.5 px-2">
        {navItems.map(({ href, icon: Icon, label, permission, toggleable }) => {
          if (mounted && permission && !hasPermission(permission)) return null;
          if (toggleable && !showEquipmentNav) return null;
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              title={!sidebarOpen ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                !sidebarOpen && "justify-center px-0"
              )}>
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

      {/* Toggle */}
      <button onClick={toggleSidebar}
        className="flex items-center justify-center h-12 border-t border-slate-700 hover:bg-slate-800 transition-colors">
        <ChevronLeft size={18} className={cn("transition-transform duration-300", !sidebarOpen && "rotate-180")} />
      </button>
    </aside>
  );
}
