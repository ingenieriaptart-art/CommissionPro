"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAssignProject, useRoles } from "@/hooks/useUsers";
import type { Project, ProjectMember } from "@/types";

const selectCls = "w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500";

interface Props {
  userId:          string;
  existingMembers: ProjectMember[];
  onClose:         () => void;
}

export function AssignProjectModal({ userId, existingMembers, onClose }: Props) {
  const { data: roles = [] }  = useRoles();
  const assignProject = useAssignProject(userId);

  const [allProjects,       setAllProjects]       = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedRoleId,    setSelectedRoleId]    = useState("");
  const [error,             setError]             = useState<string | null>(null);
  const [loadingProjects,   setLoadingProjects]   = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingProjects(true);
    createClient()
      .from("projects")
      .select("id, name, code")
      .is("deleted_at", null)
      .order("name")
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) setError(error.message);
        else setAllProjects((data as Project[]) ?? []);
        setLoadingProjects(false);
      });
    return () => { isMounted = false; };
  }, []);

  const assignedIds = new Set(existingMembers.map((m) => m.project_id));
  const available   = allProjects.filter((p) => !assignedIds.has(p.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await assignProject.mutateAsync({ project_id: selectedProjectId, role_id: selectedRoleId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100">Asignar proyecto</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Proyecto *</label>
            <select required disabled={loadingProjects} value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={selectCls}>
              <option value="">Seleccioná un proyecto…</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!loadingProjects && available.length === 0 && (
              <p className="text-[10px] text-slate-600 mt-1">El usuario ya está en todos los proyectos</p>
            )}
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Rol en el proyecto *</label>
            <select required value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className={selectCls}>
              <option value="">Seleccioná un rol…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={assignProject.isPending || available.length === 0}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 transition-colors">
              {assignProject.isPending ? "Asignando…" : "Asignar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
