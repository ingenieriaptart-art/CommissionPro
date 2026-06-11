# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla admin de panel dividido para crear, editar y gestionar usuarios con roles y asignación a proyectos.

**Architecture:** Migración 0025 agrega rol `director` y renombra `cliente→invitado`. Cuatro API routes bajo `/api/admin/` manejan operaciones privilegiadas (creación usa service_role). La página existente `/admin/users` se reescribe como panel dividido con cuatro componentes nuevos y el hook `useUsers`.

**Tech Stack:** Next.js 16, React Query (@tanstack/react-query), Supabase (client + service_role), TypeScript, Tailwind CSS

---

## File Map

| Acción | Ruta |
|--------|------|
| Crear | `database/migrations/0025_roles_director_invitado.sql` |
| Crear | `app/src/lib/adminAuth.ts` |
| Crear | `app/src/app/api/admin/users/route.ts` |
| Crear | `app/src/app/api/admin/users/[id]/route.ts` |
| Crear | `app/src/app/api/admin/users/[id]/projects/route.ts` |
| Crear | `app/src/app/api/admin/users/[id]/projects/[projectId]/route.ts` |
| Modificar | `app/src/types/index.ts` — agregar `ProjectMember` |
| Crear | `app/src/hooks/useUsers.ts` |
| Crear | `app/src/components/admin/UsersList.tsx` |
| Crear | `app/src/components/admin/CreateUserModal.tsx` |
| Crear | `app/src/components/admin/AssignProjectModal.tsx` |
| Crear | `app/src/components/admin/UserDetailPanel.tsx` |
| Reescribir | `app/src/app/(dashboard)/admin/users/page.tsx` |

---

## Task 1: Migración 0025 — roles director e invitado

**Files:**
- Crear: `database/migrations/0025_roles_director_invitado.sql`

- [ ] **Paso 1: Escribir la migración**

Crear `database/migrations/0025_roles_director_invitado.sql`:

```sql
-- ============================================================
-- 0025 — Roles: director + renombrar cliente → invitado
-- ============================================================

BEGIN;

-- 1. Renombrar cliente → invitado
UPDATE public.roles
SET key = 'invitado', name = 'Invitado'
WHERE key = 'cliente';

-- 2. Agregar rol director
INSERT INTO public.roles (key, name, description, is_system)
VALUES ('director', 'Director', 'Supervisión total sin gestión de usuarios', true)
ON CONFLICT (key) DO NOTHING;

-- 3. Permisos del director: todos excepto usuario.*
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'director'
  AND p.key NOT IN ('usuario.create', 'usuario.edit', 'usuario.delete')
ON CONFLICT DO NOTHING;

-- 4. RLS: permitir a admin escribir en project_members
DROP POLICY IF EXISTS "pm_admin_write" ON public.project_members;
CREATE POLICY "pm_admin_write" ON public.project_members
  FOR ALL
  USING  (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

COMMIT;
```

- [ ] **Paso 2: Aplicar en Supabase**

Supabase Dashboard → SQL Editor → pegar y ejecutar.

- [ ] **Paso 3: Verificar**

```sql
SELECT key, name FROM public.roles ORDER BY key;
-- Esperado: admin, director, invitado, supervisor, tecnico
```

- [ ] **Paso 4: Commit**

```bash
git add database/migrations/0025_roles_director_invitado.sql
git commit -m "feat(db): migración 0025 — rol director + renombrar cliente→invitado"
```

---

## Task 2: Auth helper compartido

**Files:**
- Crear: `app/src/lib/adminAuth.ts`

- [ ] **Paso 1: Crear el helper**

```typescript
// app/src/lib/adminAuth.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ServiceClient = ReturnType<typeof createClient>;

export type AdminAuthResult =
  | { ok: true;  serviceClient: ServiceClient; appUserId: string }
  | { ok: false; response: NextResponse };

export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const token = req.headers.get("authorization")?.slice(7) ?? null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const { data: { user: authUser }, error: authErr } = await serviceClient.auth.getUser(token);
  if (authErr || !authUser) {
    return { ok: false, response: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };
  }

  const { data: appUser } = await serviceClient
    .from("users")
    .select("id, role:roles(key)")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!appUser) {
    return { ok: false, response: NextResponse.json({ error: "Sin acceso" }, { status: 403 }) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleKey = ((appUser as any).role as { key: string } | null)?.key;
  if (roleKey !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Se requiere rol admin" }, { status: 403 }) };
  }

  return { ok: true, serviceClient, appUserId: (appUser as { id: string }).id };
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/lib/adminAuth.ts
git commit -m "feat(admin): helper requireAdmin para API routes"
```

---

## Task 3: API route — crear usuario

**Files:**
- Crear: `app/src/app/api/admin/users/route.ts`

- [ ] **Paso 1: Crear la ruta**

```typescript
// app/src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const body = await req.json().catch(() => null);
  const { email, password, full_name, role_id, position, phone } = body ?? {};

  if (!email || !password || !full_name || !role_id) {
    return NextResponse.json(
      { error: "email, password, full_name y role_id son requeridos" },
      { status: 400 }
    );
  }

  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) {
    const is409 = authErr.message.toLowerCase().includes("already");
    return NextResponse.json(
      { error: is409 ? "Este email ya está registrado" : authErr.message },
      { status: is409 ? 409 : 500 }
    );
  }

  const { data: newUser, error: insertErr } = await serviceClient
    .from("users")
    .insert({
      auth_user_id:         authData.user.id,
      email,
      full_name,
      role_id,
      position:             position ?? null,
      phone:                phone    ?? null,
      status:               "active",
      must_change_password: false,
    })
    .select("*, role:roles(id,key,name)")
    .single();

  if (insertErr) {
    await serviceClient.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json(newUser, { status: 201 });
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/app/api/admin/users/route.ts
git commit -m "feat(admin): POST /api/admin/users — crear usuario con contraseña"
```

---

## Task 4: API route — editar usuario

**Files:**
- Crear: `app/src/app/api/admin/users/[id]/route.ts`

- [ ] **Paso 1: Crear la ruta**

```typescript
// app/src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient, appUserId } = auth;

  const { id } = params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  if (id === appUserId && (body.status === "blocked" || body.status === "inactive")) {
    return NextResponse.json({ error: "No podés bloquear tu propia cuenta" }, { status: 400 });
  }

  const allowed = ["full_name", "position", "phone", "role_id", "status"] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const { data, error } = await serviceClient
    .from("users")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*, role:roles(id,key,name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Paso 2: Commit**

```bash
git add "app/src/app/api/admin/users/[id]/route.ts"
git commit -m "feat(admin): PATCH /api/admin/users/[id] — editar usuario"
```

---

## Task 5: API routes — project_members

**Files:**
- Crear: `app/src/app/api/admin/users/[id]/projects/route.ts`
- Crear: `app/src/app/api/admin/users/[id]/projects/[projectId]/route.ts`

- [ ] **Paso 1: POST — asignar proyecto**

```typescript
// app/src/app/api/admin/users/[id]/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const body = await req.json().catch(() => null);
  const { project_id, role_id } = body ?? {};
  if (!project_id || !role_id) {
    return NextResponse.json({ error: "project_id y role_id son requeridos" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("project_members")
    .insert({ user_id: params.id, project_id, role_id })
    .select("*, project:projects(id,name), role:roles(id,key,name)")
    .single();

  if (error) {
    const is409 = error.code === "23505";
    return NextResponse.json(
      { error: is409 ? "El usuario ya pertenece a este proyecto" : error.message },
      { status: is409 ? 409 : 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Paso 2: DELETE — remover proyecto**

```typescript
// app/src/app/api/admin/users/[id]/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; projectId: string } }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const { error } = await serviceClient
    .from("project_members")
    .delete()
    .eq("user_id",    params.id)
    .eq("project_id", params.projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Paso 3: Commit**

```bash
git add "app/src/app/api/admin/users/[id]/projects/route.ts" "app/src/app/api/admin/users/[id]/projects/[projectId]/route.ts"
git commit -m "feat(admin): rutas project_members — asignar y remover proyectos"
```

---

## Task 6: Tipos + hook useUsers

**Files:**
- Modificar: `app/src/types/index.ts`
- Crear: `app/src/hooks/useUsers.ts`

- [ ] **Paso 1: Agregar ProjectMember a types**

En `app/src/types/index.ts`, después de la interfaz `User` (~línea 81), agregar:

```typescript
export interface ProjectMember {
  project_id: string;
  user_id:    string;
  role_id:    string;
  added_at:   string;
  project?:   Pick<Project, "id" | "name">;
  role?:      Pick<Role,    "id" | "key" | "name">;
}
```

- [ ] **Paso 2: Crear el hook**

```typescript
// app/src/hooks/useUsers.ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User, Role, ProjectMember } from "@/types";

async function getToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...init.headers,
    },
  });
}

export function useUserList() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("*, role:roles(id,key,name), company:companies(name)")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as User[];
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async (): Promise<Role[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("roles")
        .select("id, key, name")
        .eq("is_system", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Role[];
    },
  });
}

export function useUserProjects(userId: string | null) {
  return useQuery({
    queryKey: ["user-projects", userId],
    queryFn: async (): Promise<ProjectMember[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_members")
        .select("*, project:projects(id,name), role:roles(id,key,name)")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as ProjectMember[];
    },
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string; password: string; full_name: string;
      role_id: string; position?: string; phone?: string;
    }): Promise<User> => {
      const res = await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al crear usuario");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<Pick<User, "full_name" | "position" | "phone" | "role_id" | "status">>
    ): Promise<User> => {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al actualizar usuario");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useAssignProject(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { project_id: string; role_id: string }): Promise<ProjectMember> => {
      const res = await adminFetch(`/api/admin/users/${userId}/projects`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al asignar proyecto");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-projects", userId] }),
  });
}

export function useRemoveProject(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const res = await adminFetch(`/api/admin/users/${userId}/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al remover proyecto");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-projects", userId] }),
  });
}
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/types/index.ts app/src/hooks/useUsers.ts
git commit -m "feat(admin): tipo ProjectMember + hook useUsers con queries y mutaciones"
```

---

## Task 7: Componente UsersList

**Files:**
- Crear: `app/src/components/admin/UsersList.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// app/src/components/admin/UsersList.tsx
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
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const roleKey  = (u.role as Role | undefined)?.key ?? "";
    const matchRole = roleFilter === "todos" || roleKey === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 h-full">
      <div className="p-3 border-b border-slate-800 space-y-2">
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
            className="w-full bg-slate-950 border border-slate-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
        </div>

        <div className="flex gap-1 flex-wrap">
          {["todos", ...roles.map((r) => r.key)].map((key) => (
            <button key={key} onClick={() => setRoleFilter(key)}
              className={cn("text-[10px] px-2 py-0.5 rounded-full transition-colors",
                roleFilter === key
                  ? "bg-blue-800 text-blue-200"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
              {key === "todos" ? "Todos" : ROLE_LABELS[key] ?? key}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-8">Sin resultados</p>
        ) : filtered.map((u) => {
          const roleKey = (u.role as Role | undefined)?.key ?? "";
          return (
            <button key={u.id} onClick={() => onSelect(u)}
              className={cn("w-full text-left rounded-lg px-3 py-2 border transition-colors",
                selectedId === u.id
                  ? "bg-blue-950 border-blue-700"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700")}>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-100 truncate">{u.full_name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full",
                    ROLE_COLORS[roleKey] ?? "bg-slate-800 text-slate-400")}>
                    {ROLE_LABELS[roleKey] ?? roleKey}
                  </span>
                  <span className={cn("text-[10px]",
                    u.status === "active" ? "text-green-500"
                    : u.status === "blocked" ? "text-red-500" : "text-yellow-500")}>
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
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/admin/UsersList.tsx
git commit -m "feat(admin): UsersList — lista con búsqueda y filtro de rol"
```

---

## Task 8: Componente CreateUserModal

**Files:**
- Crear: `app/src/components/admin/CreateUserModal.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// app/src/components/admin/CreateUserModal.tsx
"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useCreateUser, useRoles } from "@/hooks/useUsers";
import type { User } from "@/types";

const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  onClose:   () => void;
  onCreated: (user: User) => void;
}

export function CreateUserModal({ onClose, onCreated }: Props) {
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role_id: "", position: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await createUser.mutateAsync({
        email:     form.email.trim(),
        password:  form.password,
        full_name: form.full_name.trim(),
        role_id:   form.role_id,
        position:  form.position.trim() || undefined,
        phone:     form.phone.trim()    || undefined,
      });
      onCreated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100">Nuevo usuario</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <Field label="Nombre completo *">
            <input required value={form.full_name} onChange={set("full_name")} className={inputCls} placeholder="Juan García" />
          </Field>
          <Field label="Email *">
            <input required type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="juan@empresa.com" />
          </Field>
          <Field label="Contraseña *">
            <input required type="password" value={form.password} onChange={set("password")} className={inputCls} placeholder="Mínimo 8 caracteres" minLength={8} />
          </Field>
          <Field label="Rol *">
            <select required value={form.role_id} onChange={set("role_id")} className={inputCls}>
              <option value="">Seleccioná un rol…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Cargo">
            <input value={form.position} onChange={set("position")} className={inputCls} placeholder="Jefe de Proyecto" />
          </Field>
          <Field label="Teléfono">
            <input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+57 300 000 0000" />
          </Field>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createUser.isPending}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 transition-colors">
              {createUser.isPending ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/admin/CreateUserModal.tsx
git commit -m "feat(admin): CreateUserModal — formulario de alta de usuario"
```

---

## Task 9: Componente AssignProjectModal

**Files:**
- Crear: `app/src/components/admin/AssignProjectModal.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// app/src/components/admin/AssignProjectModal.tsx
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

  useEffect(() => {
    createClient()
      .from("projects")
      .select("id, name, code")
      .is("deleted_at", null)
      .order("name")
      .then(({ data }) => setAllProjects((data as Project[]) ?? []));
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
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Proyecto *</label>
            <select required value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={selectCls}>
              <option value="">Seleccioná un proyecto…</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {available.length === 0 && (
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
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/admin/AssignProjectModal.tsx
git commit -m "feat(admin): AssignProjectModal — asignar usuario a proyecto con rol"
```

---

## Task 10: Componente UserDetailPanel

**Files:**
- Crear: `app/src/components/admin/UserDetailPanel.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// app/src/components/admin/UserDetailPanel.tsx
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
  const { data: roles = [] }                          = useRoles();
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
      {/* Encabezado */}
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

      {/* Formulario */}
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

      {/* Proyectos asignados */}
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
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/admin/UserDetailPanel.tsx
git commit -m "feat(admin): UserDetailPanel — edición y gestión de proyectos asignados"
```

---

## Task 11: Reescritura de la página admin/users

**Files:**
- Reescribir: `app/src/app/(dashboard)/admin/users/page.tsx`

- [ ] **Paso 1: Reescribir la página completa**

Reemplazar TODO el contenido de `app/src/app/(dashboard)/admin/users/page.tsx` con:

```typescript
"use client";
import { useState } from "react";
import { Users } from "lucide-react";
import { useUserList, useRoles } from "@/hooks/useUsers";
import { UsersList }       from "@/components/admin/UsersList";
import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import type { User } from "@/types";

export default function UsersPage() {
  const { data: users = [], isLoading } = useUserList();
  const { data: roles = [] }            = useRoles();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);

  const handleCreated = (user: User) => {
    setShowCreate(false);
    setSelectedUser(user);
  };

  const handleUpdated = (updated: User) => {
    if (selectedUser?.id === updated.id) setSelectedUser(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden -m-5">
      <UsersList
        users={users}
        roles={roles}
        selectedId={selectedUser?.id ?? null}
        onSelect={setSelectedUser}
        onNew={() => setShowCreate(true)}
      />

      {selectedUser ? (
        <UserDetailPanel
          key={selectedUser.id}
          user={selectedUser}
          onUpdated={handleUpdated}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
          <Users size={40} />
          <p className="text-sm">Seleccioná un usuario para ver su detalle</p>
          <button onClick={() => setShowCreate(true)}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors">
            + Crear primer usuario
          </button>
        </div>
      )}

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Verificar en browser**

Ir a `http://localhost:3000/admin/users`. Verificar:
1. Panel dividido visible (lista izquierda + estado vacío derecho)
2. Chips de filtro por rol funcionan
3. Búsqueda filtra en tiempo real
4. Clic en usuario → panel detalle con sus datos
5. "+ Nuevo" → abre modal → completar → usuario aparece seleccionado en lista
6. Editar nombre/cargo → "Guardar cambios" → lista se actualiza
7. "Asignar proyecto" → modal → seleccionar proyecto + rol → aparece en lista de proyectos
8. "Remover ✕" → confirmar → desaparece

- [ ] **Paso 3: Commit final**

```bash
git add app/src/app/(dashboard)/admin/users/page.tsx
git commit -m "feat(admin): pantalla gestión de usuarios — panel dividido completo"
```
