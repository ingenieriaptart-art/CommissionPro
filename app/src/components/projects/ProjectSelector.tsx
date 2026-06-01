"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { FolderKanban, MapPin } from "lucide-react";
import type { Project } from "@/types";

const statusColor: Record<string, "default" | "info" | "warning" | "success"> = {
  planificacion: "default",
  en_ejecucion: "info",
  suspendido: "warning",
  cerrado: "success",
};
const statusLabel: Record<string, string> = {
  planificacion: "Planificación",
  en_ejecucion: "En ejecución",
  suspendido: "Suspendido",
  cerrado: "Cerrado",
};

interface Props {
  /** Subruta a abrir: "equipment" | "tests" | "punch" */
  section: string;
  title: string;
  description: string;
}

export function ProjectSelector({ section, title, description }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("projects")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProjects((data as Project[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="text-slate-500 text-sm mt-1">{description} — selecciona un proyecto</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-16">
          <FolderKanban size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay proyectos registrados</p>
          <p className="text-slate-400 text-xs mt-1">Crea uno desde la sección Proyectos</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}/${section}`}>
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
