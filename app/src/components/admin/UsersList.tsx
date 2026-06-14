"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User, Role } from "@/types";

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-blue-900 text-blue-300",
  director:   "bg-purple-900 text-purple-300",
  supervisor: "bg-teal-900 text-teal-300",
  tecnico:    "bg-orange-900 text-orange-300",
  invitado:   "bg-stone-900 text-stone-400",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", director: "Director", supervisor: "Supervisor",
  tecnico: "Técnico", invitado: "Invitado",
};

interface Props {
  users:      User[];
  roles:      Role[];
  selectedId: string | null;
  onSelect:   (user: User) => void;
  onNew:      () => void;
}

export function UsersList({ users, roles, selectedId, onSelect, onNew }: Props) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");

  const filtered = users.filter((u) => {
    const matchSearch =
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const roleKey   = (u.role as Role | undefined)?.key ?? "";
    const matchRole = roleFilter === "todos" || roleKey === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col bg-slate-700 border-r border-slate-600 h-full">
      <div className="p-3 border-b border-slate-600 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-100">
            Usuarios <span className="text-slate-500 font-normal">({users.length})</span>
          </span>
          <button onClick={onNew}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2.5 py-1 rounded-md transition-colors">
            + Nuevo
          </button>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full bg-slate-800 border border-slate-500 rounded-md pl-7 pr-2 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-400" />
        </div>

        <div className="flex gap-1 flex-wrap">
          {["todos", ...roles.map((r) => r.key)].map((key) => (
            <button key={key} onClick={() => setRoleFilter(key)}
              className={cn("text-[10px] px-2 py-0.5 rounded-full transition-colors",
                roleFilter === key
                  ? "bg-blue-700 text-blue-100"
                  : "bg-slate-600 text-slate-200 hover:bg-slate-500")}>
              {key === "todos" ? "Todos" : ROLE_LABELS[key] ?? key}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">Sin resultados</p>
        ) : filtered.map((u) => {
          const roleKey = (u.role as Role | undefined)?.key ?? "";
          return (
            <button key={u.id} onClick={() => onSelect(u)}
              className={cn("w-full text-left rounded-lg px-3 py-2 border transition-colors",
                selectedId === u.id
                  ? "bg-blue-800 border-blue-500"
                  : "bg-slate-800 border-slate-600 hover:border-slate-400")}>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-100 truncate">{u.full_name}</p>
                  <p className="text-[10px] text-slate-300 truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full",
                    ROLE_COLORS[roleKey] ?? "bg-slate-800 text-slate-400")}>
                    {ROLE_LABELS[roleKey] ?? roleKey}
                  </span>
                  <span className={cn("text-[10px]",
                    u.status === "active"   ? "text-green-500"
                    : u.status === "blocked" ? "text-red-500"
                    : "text-yellow-500")}>
                    ● {u.status === "active" ? "activo" : u.status === "blocked" ? "bloqueado" : "inactivo"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
