"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fmtDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, FolderKanban, MapPin } from "lucide-react";
import type { Project } from "@/types";

const statusColor: Record<string, "default"|"info"|"warning"|"danger"|"success"> = {
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Proyectos</h1>
          <p className="text-slate-500 text-sm mt-1">{projects.length} proyecto(s) registrado(s)</p>
        </div>
        <Button icon={<Plus size={16} />}>Nuevo proyecto</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-16">
          <FolderKanban size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay proyectos aún</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}/equipment`}>
              <Card className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FolderKanban size={20} className="text-blue-600" />
                  </div>
                  <Badge variant={statusColor[p.status] ?? "default"}>
                    {statusLabel[p.status] ?? p.status}
                  </Badge>
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                <p className="text-xs text-blue-600 font-mono mt-0.5">{p.code}</p>
                {p.location && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <MapPin size={11} />{p.location}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Inicio: {fmtDate(p.start_date)}</p>
                  <p className="text-xs text-slate-400">Fin: {fmtDate(p.end_date)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
