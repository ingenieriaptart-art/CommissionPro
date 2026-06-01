"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fmtDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, MapPin, Calendar, Building2, ArrowRight,
  FolderKanban, Zap, Sun, Moon, LogOut,
} from "lucide-react";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import type { Project } from "@/types";

const statusColor: Record<string, "default" | "info" | "warning" | "success"> = {
  planificacion: "default",
  en_ejecucion:  "info",
  suspendido:    "warning",
  cerrado:       "success",
};
const statusLabel: Record<string, string> = {
  planificacion: "Planificación",
  en_ejecucion:  "En ejecución",
  suspendido:    "Suspendido",
  cerrado:       "Cerrado",
};

const AVATAR_COLORS = [
  { bg: "bg-blue-600"    },
  { bg: "bg-emerald-600" },
  { bg: "bg-violet-600"  },
  { bg: "bg-amber-500"   },
  { bg: "bg-rose-600"    },
  { bg: "bg-cyan-600"    },
];
function projectColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function ProjectsPage() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const { user, clear }    = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const router              = useRouter();

  useEffect(() => {
    const load = async () => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data } = await supabase
          .from("projects")
          .select("*, client_company:companies(name)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (data) {
          await localDB.projects.bulkPut(data as Project[]);
          setProjects(data as Project[]);
        }
      } else {
        const data = await localDB.projects.toArray();
        setProjects(data);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clear();
    router.push("/login");
  };

  const active = projects.filter((p) => p.status === "en_ejecucion");
  const others = projects.filter((p) => p.status !== "en_ejecucion");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-14 flex items-center px-6 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Commission<span className="text-blue-500">Pro</span>
          </span>
        </div>

        <div className="flex-1" />

        {/* Theme */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user.full_name?.charAt(0) ?? "?"}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
              {user.full_name}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">

        {/* Heading */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Workspaces
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {projects.length} proyecto(s) disponible(s) — selecciona uno para entrar
            </p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Nuevo proyecto
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center py-32 text-slate-400">
            <FolderKanban size={60} className="mb-4 opacity-25" />
            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
              No hay proyectos aún
            </p>
            <p className="text-sm mt-1">Crea el primer proyecto para comenzar</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mb-8">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  En ejecución
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {active.map((p) => <WorkspaceCard key={p.id} project={p} />)}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Otros proyectos
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {others.map((p) => <WorkspaceCard key={p.id} project={p} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => setProjects((prev) => [p, ...prev])}
        />
      )}
    </div>
  );
}

function WorkspaceCard({ project: p }: { project: Project }) {
  const color      = projectColor(p.name);
  const clientName = (p.client_company as { name: string } | undefined)?.name;

  return (
    <Link href={`/projects/${p.id}/dashboard`} className="group block">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200 h-full flex flex-col">

        {/* Avatar + status */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${color.bg}`}>
            {p.name.charAt(0).toUpperCase()}
          </div>
          <Badge variant={statusColor[p.status] ?? "default"}>
            {statusLabel[p.status] ?? p.status}
          </Badge>
        </div>

        {/* Name */}
        <p className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
          {p.name}
        </p>
        <p className="text-xs font-mono text-blue-600 mt-0.5">{p.code}</p>

        {/* Meta */}
        <div className="mt-3 space-y-1.5 flex-1">
          {clientName && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 size={11} className="flex-shrink-0" />
              <span className="truncate">{clientName}</span>
            </p>
          )}
          {p.location && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={11} className="flex-shrink-0" />
              <span className="truncate">{p.location}</span>
            </p>
          )}
          {(p.start_date || p.end_date) && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar size={11} className="flex-shrink-0" />
              {fmtDate(p.start_date)} — {fmtDate(p.end_date)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Abrir workspace</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Entrar <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
