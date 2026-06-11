"use client";
import { useState } from "react";
import { useUserList, useRoles } from "@/hooks/useUsers";
import { UsersList }       from "@/components/admin/UsersList";
import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import type { User } from "@/types";

export default function UsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);

  const { data: users = [], isLoading } = useUserList();
  const { data: roles = [] }            = useRoles();

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <UsersList
        users={users}
        roles={roles}
        selectedId={selectedUserId}
        onSelect={(u: User) => setSelectedUserId(u.id)}
        onNew={() => setShowCreate(true)}
      />

      {selectedUser ? (
        <UserDetailPanel
          key={selectedUser.id}
          user={selectedUser}
          onUpdated={(updated: User) => {
            setSelectedUserId(updated.id);
          }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-950">
          <p className="text-sm text-slate-600">Seleccioná un usuario para ver su detalle</p>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(user: User) => {
            setShowCreate(false);
            setSelectedUserId(user.id);
          }}
        />
      )}
    </div>
  );
}
