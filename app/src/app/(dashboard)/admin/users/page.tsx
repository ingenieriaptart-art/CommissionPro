"use client";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserList, useRoles } from "@/hooks/useUsers";
import { UsersList }       from "@/components/admin/UsersList";
import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import type { User } from "@/types";

export default function UsersPage() {
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
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <p className="text-sm text-red-400">Error al cargar usuarios. Recargá la página.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <UsersList
        users={users}
        roles={roles}
        selectedId={selectedUserId}
        onSelect={handleSelect}
        onNew={handleNew}
      />

      {selectedUser ? (
        <UserDetailPanel
          key={selectedUser.id}
          user={selectedUser}
          onUpdated={handleUpdated}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-950">
          <p className="text-sm text-slate-600">Seleccioná un usuario para ver su detalle</p>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
