"use client";
import { Bell, Sun, Moon, LogOut, User, Menu } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { SyncIndicator } from "@/components/ui/SyncIndicator";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Topbar() {
  const { theme, setTheme, toggleSidebar } = useUIStore();
  const { user, clear } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clear();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-4 gap-3">
      {/* Hamburguesa — solo móvil: abre/cierra el drawer del sidebar.
          Estilo de botón explícito (borde + fondo) para que se lea claramente
          como acción y tenga buen área táctil. */}
      <button onClick={toggleSidebar}
        aria-label="Abrir menú lateral"
        className="md:hidden flex items-center justify-center -ml-1 h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition">
        <Menu size={22} />
      </button>
      <div className="flex-1" />
      <SyncIndicator />

      {/* Theme toggle */}
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* User */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {user?.full_name?.charAt(0) ?? <User size={14} />}
        </div>
        {user && (
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-none">{user.full_name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.position ?? user.role?.name}</p>
          </div>
        )}
        <button onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
