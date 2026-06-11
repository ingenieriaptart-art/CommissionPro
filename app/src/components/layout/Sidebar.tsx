"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  LayoutDashboard, FolderKanban, Wrench, CheckSquare,
  AlertTriangle, FileText, Users, Settings, ChevronLeft, Zap, BookOpen,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", permission: null },
  { href: "/projects",  icon: FolderKanban,    label: "Proyectos",  permission: null },
  { href: "/equipment", icon: Wrench,          label: "Equipos",    permission: null },
  { href: "/tests",     icon: CheckSquare,     label: "Pruebas",    permission: "test.create" },
  { href: "/punch",     icon: AlertTriangle,   label: "Punch List", permission: "punch.create" },
  { href: "/documents", icon: FileText,        label: "Documentos", permission: null },
  { href: "/help",      icon: BookOpen,        label: "Manual",     permission: null },
  { href: "/admin/users",icon: Users,          label: "Usuarios",   permission: "user.create" },
  { href: "/admin/forms",icon: Settings,       label: "Formularios",permission: "form.configure" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { hasPermission } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white transition-all duration-300",
      sidebarOpen ? "w-60" : "w-16"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center h-16 px-4 border-b border-slate-700 gap-3",
        !sidebarOpen && "justify-center px-0")}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Zap size={16} />
        </div>
        {sidebarOpen && (
          <span className="font-bold text-sm leading-tight">
            Commission<span className="text-blue-400">Pro</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-0.5 px-2">
        {navItems.map(({ href, icon: Icon, label, permission }) => {
          if (mounted && permission && !hasPermission(permission)) return null;
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
      </nav>

      {/* Toggle */}
      <button onClick={toggleSidebar}
        className="flex items-center justify-center h-12 border-t border-slate-700 hover:bg-slate-800 transition-colors">
        <ChevronLeft size={18} className={cn("transition-transform duration-300", !sidebarOpen && "rotate-180")} />
      </button>
    </aside>
  );
}
