"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useUserList, useRoles } from "@/hooks/useUsers";
import { UsersList }       from "@/components/admin/UsersList";
import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export default function UsersPage() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);

  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError } = useUserList();
  const { data: roles = [] }                     = useRoles();

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  const handleSelect  = useCallback((u: User) => setSelectedUserId(u.id), []);
  const handleNew     = useCallback(() => setShowCreate(true), []);
  const handleCreated = useCallback((user: User) => {
    setShowCreate(false);
    setSelectedUserId(user.id);
  }, []);
  const handleUpdated = useCallback((updated: User) => {
    queryClient.setQueryData<User[]>(["users"], (prev) =>
      prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev
    );
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-800">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-800">
        <p className="text-sm text-red-400">Error al cargar usuarios. Recargá la página.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header con navegación */}
      <div className="flex items-center gap-3 px-5 py-3 bg-slate-700 border-b border-slate-600 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-600 hover:bg-slate-500 border border-slate-500 rounded-md px-3 py-1.5 transition-colors"
        >
          ← Volver
        </button>
        <div className="w-px h-5 bg-slate-600" />
        <h1 className="text-sm font-bold text-slate-100">Gestión de Usuarios</h1>
        <span className="text-xs text-slate-400">({users.length} usuarios)</span>
        <div className="ml-auto">
          <button
            onClick={handleNew}
            className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            + Nuevo usuario
          </button>
        </div>
      </div>

      {/* Contenido principal — patrón maestro/detalle.
          Móvil: se ve la lista O el detalle (no ambos), para no exprimir el panel.
          Desktop (md+): ambos lado a lado. */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lista: full width en móvil; se oculta al abrir un detalle. Siempre visible en desktop. */}
        <div className={cn(
          "w-full md:w-auto md:flex",
          selectedUser ? "hidden md:flex" : "flex"
        )}>
          <UsersList
            users={users}
            roles={roles}
            selectedId={selectedUserId}
            onSelect={handleSelect}
            onNew={handleNew}
          />
        </div>

        {selectedUser ? (
          <UserDetailPanel
            key={selectedUser.id}
            user={selectedUser}
            onUpdated={handleUpdated}
            onBack={() => setSelectedUserId(null)}
          />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-800">
            <p className="text-sm text-slate-400">Selecciona un usuario para ver su detalle</p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
