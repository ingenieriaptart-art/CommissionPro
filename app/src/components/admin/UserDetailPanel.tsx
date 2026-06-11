"use client";
import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateUser, useUserProjects, useRemoveProject, useRoles } from "@/hooks/useUsers";
import { AssignProjectModal } from "./AssignProjectModal";
import type { User, UserStatus, Role } from "@/types";

const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-900 text-blue-300", director: "bg-purple-900 text-purple-300",
  supervisor: "bg-teal-900 text-teal-300", tecnico: "bg-orange-900 text-orange-300",
  invitado: "bg-stone-900 text-stone-400",
};

interface Props {
  user:      User;
  onUpdated: (user: User) => void;
}

export function UserDetailPanel({ user, onUpdated }: Props) {
  const { data: roles = [] }                           = useRoles();
  const { data: members = [], isLoading: loadingProj } = useUserProjects(user.id);
  const updateUser    = useUpdateUser(user.id);
  const removeProject = useRemoveProject(user.id);

  const [form, setForm] = useState({
    full_name: user.full_name,
    position:  user.position ?? "",
    phone:     user.phone    ?? "",
    role_id:   user.role_id  ?? "",
    status:    user.status   as UserStatus,
  });
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    setForm({
      full_name: user.full_name,
      position:  user.position ?? "",
      phone:     user.phone    ?? "",
      role_id:   user.role_id  ?? "",
      status:    user.status,
    });
    setSaveError(null);
  }, [user.id]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      const updated = await updateUser.mutateAsync(form);
      onUpdated(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleStatusChange = async (newStatus: UserStatus) => {
    const action = newStatus === "blocked" ? "bloquear" : newStatus === "inactive" ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Confirmar ${action} a ${user.full_name}?`)) return;
    setSaveError(null);
    try {
      const updated = await updateUser.mutateAsync({ status: newStatus });
      onUpdated(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al cambiar estado");
    }
  };

  const handleRemoveProject = async (projectId: string, projectName: string) => {
    if (!window.confirm(`¿Remover a ${user.full_name} de ${projectName}?`)) return;
    await removeProject.mutateAsync(projectId);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-100">{user.full_name}</h2>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.status !== "active" && (
            <button onClick={() => handleStatusChange("active")}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-900 text-green-300 border border-green-700 hover:bg-green-800 transition-colors">
              Reactivar
            </button>
          )}
          {user.status === "active" && (
            <>
              <button onClick={() => handleStatusChange("inactive")}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500 transition-colors">
                Desactivar
              </button>
              <button onClick={() => handleStatusChange("blocked")}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-red-400 border border-red-900 hover:border-red-700 transition-colors">
                Bloquear
              </button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Información del usuario</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Nombre completo</label>
            <input value={form.full_name} onChange={set("full_name")} required className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Email</label>
            <input value={user.email} disabled className={cn(inputCls, "opacity-50 cursor-not-allowed")} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Cargo</label>
            <input value={form.position} onChange={set("position")} className={inputCls} placeholder="Jefe de Proyecto" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Teléfono</label>
            <input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+57 300 000 0000" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Rol del sistema</label>
            <select value={form.role_id} onChange={set("role_id")} className={inputCls}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Estado</label>
            <select value={form.status} onChange={set("status")} className={inputCls}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>
        </div>

        {saveError && (
          <p className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2 mb-3">{saveError}</p>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={updateUser.isPending}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 transition-colors">
            {updateUser.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Proyectos asignados</p>
          <button onClick={() => setShowAssign(true)}
            className="text-[10px] px-2.5 py-1 rounded-md bg-slate-800 text-blue-400 border border-blue-900 hover:border-blue-700 transition-colors">
            + Asignar proyecto
          </button>
        </div>

        {loadingProj ? (
          <p className="text-xs text-slate-600 py-2">Cargando…</p>
        ) : members.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-slate-600">
            <FolderOpen size={16} />
            <p className="text-xs">Sin proyectos asignados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const projectName = (m.project as { name: string } | undefined)?.name ?? m.project_id;
              const roleName    = (m.role    as { name: string; key: string } | undefined)?.name ?? "";
              const roleKey     = (m.role    as { name: string; key: string } | undefined)?.key  ?? "";
              return (
                <div key={m.project_id}
                  className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-200">📁 {projectName}</p>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block",
                      ROLE_COLORS[roleKey] ?? "bg-slate-800 text-slate-400")}>
                      {roleName}
                    </span>
                  </div>
                  <button onClick={() => handleRemoveProject(m.project_id, projectName)}
                    className="text-[10px] text-red-500 hover:text-red-400 transition-colors">
                    Remover ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAssign && (
        <AssignProjectModal userId={user.id} existingMembers={members} onClose={() => setShowAssign(false)} />
      )}
    </div>
  );
}
