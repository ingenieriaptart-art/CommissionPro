"use client";
import { useEffect, useState } from "react";
import { FolderOpen, SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateUser, useUserProjects, useRemoveProject, useRoles, useUpdateMembership } from "@/hooks/useUsers";
import { AssignProjectModal } from "./AssignProjectModal";
import { ModuleAccessMatrix } from "./ModuleAccessMatrix";
import type { User, UserStatus, Role, ModuleAccessMap } from "@/types";

const inputCls = "w-full bg-slate-800 border border-slate-500 rounded-md px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-400";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-900 text-blue-300", director: "bg-purple-900 text-purple-300",
  supervisor: "bg-teal-900 text-teal-300", tecnico: "bg-orange-900 text-orange-300",
  invitado: "bg-stone-900 text-stone-400",
};

interface Props {
  user:      User;
  onUpdated: (user: User) => void;
  onBack?:   () => void;
}

export function UserDetailPanel({ user, onUpdated, onBack }: Props) {
  const { data: roles = [] }                           = useRoles();
  const { data: members = [], isLoading: loadingProj } = useUserProjects(user.id);
  const updateUser       = useUpdateUser(user.id);
  const removeProject    = useRemoveProject(user.id);
  const updateMembership = useUpdateMembership(user.id);

  const isAdminTarget = user.role?.key === "admin";
  const [expandedProj, setExpandedProj] = useState<string | null>(null);
  const [draftAccess,  setDraftAccess]  = useState<ModuleAccessMap>({});

  const [form, setForm] = useState({
    full_name: user.full_name,
    position:  user.position ?? "",
    phone:     user.phone    ?? "",
    role_id:   user.role_id  ?? "",
    status:    user.status   as UserStatus,
  });
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const toggleAccess = (projectId: string, current: ModuleAccessMap | undefined) => {
    if (expandedProj === projectId) {
      setExpandedProj(null);
    } else {
      setExpandedProj(projectId);
      setDraftAccess({ ...(current ?? {}) });
    }
  };

  const saveAccess = async (projectId: string) => {
    try {
      await updateMembership.mutateAsync({ projectId, module_access: draftAccess });
      setExpandedProj(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar acceso");
    }
  };

  useEffect(() => {
    setForm({
      full_name: user.full_name,
      position:  user.position ?? "",
      phone:     user.phone    ?? "",
      role_id:   user.role_id  ?? "",
      status:    user.status,
    });
    setSaveError(null);
  }, [user.id, user.updated_at]);

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
    try {
      await removeProject.mutateAsync(projectId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al remover proyecto");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-800 min-w-0">
      {/* Volver a la lista — solo móvil */}
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-700 border-b border-slate-600 px-5 py-2.5 text-left"
        >
          ← Volver a usuarios
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-2 p-5 pb-0 md:p-0 md:mb-5">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-100 break-words">{user.full_name}</h2>
          <p className="text-xs text-slate-300 break-all">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.status !== "active" && (
            <button onClick={() => handleStatusChange("active")}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-900 text-green-300 border border-green-700 hover:bg-green-800 transition-colors">
              Reactivar
            </button>
          )}
          {user.status === "active" && (
            <>
              <button onClick={() => handleStatusChange("inactive")}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-600 text-slate-200 border border-slate-500 hover:border-slate-300 transition-colors">
                Desactivar
              </button>
              <button onClick={() => handleStatusChange("blocked")}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-red-300 border border-red-700 hover:border-red-500 transition-colors">
                Bloquear
              </button>
            </>
          )}
        </div>
      </div>

    <div className="flex-1 overflow-y-auto p-5">
      <form id="user-detail-form" onSubmit={handleSave} className="bg-slate-700 border border-slate-600 rounded-xl p-4 mb-4">
        <p className="text-[10px] text-slate-300 uppercase tracking-wider mb-3">Información del usuario</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] text-slate-300 mb-1">Nombre completo</label>
            <input value={form.full_name} onChange={set("full_name")} required className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-300 mb-1">Email</label>
            <input value={user.email} disabled className={cn(inputCls, "opacity-50 cursor-not-allowed")} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-300 mb-1">Cargo</label>
            <input value={form.position} onChange={set("position")} className={inputCls} placeholder="Jefe de Proyecto" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-300 mb-1">Teléfono</label>
            <input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+57 300 000 0000" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-300 mb-1">Rol del sistema</label>
            <select value={form.role_id} onChange={set("role_id")} className={inputCls}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-300 mb-1">Estado</label>
            <select value={form.status} onChange={set("status")} className={inputCls}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>
        </div>

        {saveError && (
          <p className="text-xs text-red-400 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2">{saveError}</p>
        )}
      </form>

      <div className="bg-slate-700 border border-slate-600 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-300 uppercase tracking-wider">Proyectos asignados</p>
          <button onClick={() => setShowAssign(true)}
            className="text-[10px] px-2.5 py-1 rounded-md bg-slate-600 text-blue-300 border border-blue-700 hover:border-blue-500 transition-colors">
            + Asignar proyecto
          </button>
        </div>

        {loadingProj ? (
          <p className="text-xs text-slate-400 py-2">Cargando…</p>
        ) : members.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-slate-400">
            <FolderOpen size={16} />
            <p className="text-xs">Sin proyectos asignados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const projectName = m.project?.name ?? m.project_id;
              const roleName    = m.role?.name    ?? "";
              const roleKey     = m.role?.key     ?? "";
              const isOpen = expandedProj === m.project_id;
              return (
                <div key={m.project_id}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-200 break-words">📁 {projectName}</p>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block",
                        ROLE_COLORS[roleKey] ?? "bg-slate-800 text-slate-400")}>
                        {roleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleAccess(m.project_id, m.module_access)}
                        className={cn(
                          "flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors",
                          isOpen
                            ? "bg-blue-900 text-blue-200 border-blue-600"
                            : "bg-slate-700 text-slate-300 border-slate-500 hover:border-blue-500"
                        )}>
                        <SlidersHorizontal size={11} />
                        Acceso por módulo
                        <ChevronDown size={11} className={cn("transition-transform", isOpen && "rotate-180")} />
                      </button>
                      <button onClick={() => handleRemoveProject(m.project_id, projectName)}
                        className="text-[10px] text-red-500 hover:text-red-400 transition-colors">
                        Remover ✕
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      {isAdminTarget && (
                        <p className="text-[10px] text-purple-300 bg-purple-950/40 border border-purple-800 rounded-md px-2 py-1.5 mb-2">
                          Este usuario es <b>Admin global</b>: tiene control total en todo el sistema
                          sin importar esta matriz.
                        </p>
                      )}
                      <ModuleAccessMatrix
                        value={draftAccess}
                        onChange={setDraftAccess}
                        isAdminTarget={isAdminTarget}
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => setExpandedProj(null)}
                          className="text-[10px] px-3 py-1.5 rounded-md bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600">
                          Cancelar
                        </button>
                        <button onClick={() => saveAccess(m.project_id)} disabled={updateMembership.isPending}
                          className="text-[10px] px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-60">
                          {updateMembership.isPending ? "Guardando…" : "Guardar acceso"}
                        </button>
                      </div>
                    </div>
                  )}
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

    {/* Barra de acciones fija */}
    <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-700 border-t border-slate-600">
      <div className="text-xs text-slate-400">
        Última actualización: {new Date(user.updated_at ?? "").toLocaleDateString("es", { day:"2-digit", month:"short", year:"numeric" })}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs px-4 py-2 rounded-lg bg-slate-600 text-slate-200 border border-slate-500 hover:bg-slate-500 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="user-detail-form"
          disabled={updateUser.isPending}
          className="text-xs px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-60 transition-colors"
        >
          {updateUser.isPending ? "Guardando…" : "💾 Guardar cambios"}
        </button>
      </div>
    </div>
  </div>
  );
}
