# Gestión de Usuarios — Diseño

**Fecha:** 2026-06-11  
**Estado:** Aprobado  
**Ruta principal:** `/admin/users`

---

## Contexto

La pantalla `/admin/users` existe pero es solo lectura. El botón "Nuevo usuario" no está implementado. No hay API routes para crear o editar usuarios. Los roles actuales en BD son: `admin`, `supervisor`, `tecnico`, `cliente`.

---

## Objetivos

1. Ajustar los roles del sistema: renombrar `cliente` → `invitado`, agregar `director`.
2. Implementar creación de usuarios desde el admin.
3. Implementar edición de datos del usuario (nombre, cargo, teléfono, rol, estado).
4. Implementar asignación y remoción de proyectos por usuario.
5. Implementar bloqueo y desactivación de usuarios.

---

## Roles del sistema (post-migración)

| Key | Nombre | Descripción |
|-----|--------|-------------|
| `admin` | Administrador | Acceso total incluyendo gestión de usuarios |
| `director` | Director | Igual que admin excepto crear/editar/eliminar usuarios |
| `supervisor` | Supervisor | Asigna, revisa y aprueba pruebas |
| `tecnico` | Técnico | Ejecuta pruebas y sube evidencias |
| `invitado` | Invitado | Solo lectura: dashboards y reportes |

El rol `director` hereda todos los permisos de `admin` **excepto**: `usuario.create`, `usuario.edit`, `usuario.delete`.

---

## Layout — Panel dividido

La página `/admin/users` usa un layout de dos columnas fijas sin cambio de ruta:

```
┌─────────────────────┬──────────────────────────────────────────┐
│  Lista de usuarios  │  Panel de detalle / edición              │
│  (280px fija)       │  (flex-1)                                │
│                     │                                          │
│  [+ Nuevo]          │  Nombre — Email                          │
│  🔍 Buscar…         │  [Bloquear] [Desactivar]                 │
│  [Todos][Admin]…    │                                          │
│                     │  ── Información del usuario ──           │
│  • Juan García      │  Nombre / Email / Cargo / Teléfono       │
│    Admin · activo   │  Rol / Estado                            │
│                     │  [Guardar cambios]                       │
│  • María López      │                                          │
│    Director·activo  │  ── Proyectos asignados ──               │
│                     │  📁 Zipaquirá — Supervisor  [Remover]    │
│  • Carlos Ruiz      │  📁 Bojacá — Técnico        [Remover]    │
│    Técnico · activo │  [+ Asignar proyecto]                    │
└─────────────────────┴──────────────────────────────────────────┘
```

Al hacer clic en "+ Nuevo" aparece `CreateUserModal`. Al hacer clic en un usuario, el panel derecho muestra su detalle.

---

## Base de datos — Migración 0025

Archivo: `app/supabase/migrations/0025_roles_director_invitado.sql`

### Cambios

1. **Renombrar `cliente` → `invitado`**
   ```sql
   UPDATE roles SET key = 'invitado', name = 'Invitado' WHERE key = 'cliente';
   ```
   Los `role_id` en `users` no cambian (FK por UUID).

2. **Insertar rol `director`**
   ```sql
   INSERT INTO roles (key, name, description, is_system)
   VALUES ('director', 'Director', 'Supervisión total sin gestión de usuarios', true);
   ```

3. **Permisos del director** — todos los de admin excepto los tres de usuarios:
   ```sql
   INSERT INTO role_permissions (role_id, permission_id)
   SELECT r.id, p.id FROM roles r, permissions p
   WHERE r.key = 'director'
     AND p.key NOT IN ('usuario.create', 'usuario.edit', 'usuario.delete');
   ```

4. **RLS project_members** — permitir INSERT/DELETE a usuarios con rol admin:
   ```sql
   CREATE POLICY "pm_admin_write" ON project_members
     FOR ALL USING (public.app_is_admin())
     WITH CHECK (public.app_is_admin());
   ```

---

## Backend — API Routes

Todas las rutas validan JWT y verifican que el usuario autenticado sea `admin` antes de continuar. Si no, retornan 403.

### `POST /api/admin/users`

Crea un usuario nuevo.

**Body:** `{ email, password, full_name, role_id, position?, phone? }`

**Flujo:**
1. Verifica auth + rol admin.
2. `supabase.auth.admin.createUser({ email, password, email_confirm: true })` usando `service_role_key`.
3. INSERT en `users` con `auth_user_id` del paso anterior y `status = 'active'`, `must_change_password = false`.
4. Retorna el usuario creado.

**Errores:**
- `409` si el email ya existe en auth.
- `400` si faltan campos obligatorios.

---

### `PATCH /api/admin/users/[id]`

Actualiza datos del usuario.

**Body (parcial):** `{ full_name?, position?, phone?, role_id?, status? }`

**Flujo:**
1. Verifica auth + rol admin.
2. Rechaza si `id === userId_del_admin_autenticado` y `status` es `blocked` o `inactive` (no puede bloquearse a sí mismo).
3. UPDATE en `users`.
4. Retorna el usuario actualizado.

---

### `POST /api/admin/users/[id]/projects`

Asigna el usuario a un proyecto con un rol.

**Body:** `{ project_id, role_id }`

**Flujo:**
1. Verifica auth + rol admin.
2. INSERT en `project_members`. Si ya existe (PK duplicada), retorna 409.
3. Retorna la fila creada.

---

### `DELETE /api/admin/users/[id]/projects/[projectId]`

Remueve al usuario de un proyecto.

**Flujo:**
1. Verifica auth + rol admin.
2. DELETE en `project_members WHERE user_id = id AND project_id = projectId`.
3. Retorna 204.

---

## Frontend — Componentes

### Hook `useUsers` (`app/src/hooks/useUsers.ts`)

```typescript
useUserList()            // SELECT users con join roles + companies
useUserProjects(userId)  // SELECT project_members con join projects y roles WHERE user_id = userId
useCreateUser()          // POST /api/admin/users
useUpdateUser(id)        // PATCH /api/admin/users/[id]
useAssignProject(id)     // POST /api/admin/users/[id]/projects
useRemoveProject(id)     // DELETE /api/admin/users/[id]/projects/[projectId]
```

`useUserProjects` se activa solo cuando hay un `userId` seleccionado (`enabled: !!userId`). Las mutaciones de proyectos invalidan la query `['user-projects', userId]`. Las mutaciones de usuario invalidan `['users']`.

---

### Componentes (`app/src/components/admin/`)

| Archivo | Responsabilidad |
|---------|----------------|
| `UsersList.tsx` | Lista izquierda. Props: `users`, `selectedId`, `onSelect`. Incluye búsqueda por nombre/email y chips de filtro por rol. Badge de color por rol, indicador de estado (●). |
| `UserDetailPanel.tsx` | Panel derecho. Props: `user`, `onUpdated`. Muestra formulario de edición y sección de proyectos asignados. |
| `CreateUserModal.tsx` | Modal overlay. Campos: email, contraseña, nombre completo, rol. Cierra al crear exitosamente y selecciona el usuario nuevo. |
| `AssignProjectModal.tsx` | Modal overlay. Lista los proyectos a los que el usuario NO pertenece todavía. Selector de rol en el proyecto. |

---

### Página `app/src/app/(dashboard)/admin/users/page.tsx`

Se reescribe completa. Layout:

```tsx
<div className="flex h-full">
  <UsersList ... />
  {selectedUser
    ? <UserDetailPanel user={selectedUser} />
    : <EmptyState message="Seleccioná un usuario" />
  }
</div>
```

El estado `selectedUserId` es local (`useState`). El "+ Nuevo" abre `CreateUserModal` y al crear, hace `setSelectedUserId(nuevoId)`.

---

## Badges de rol — Colores

| Rol | Color |
|-----|-------|
| admin | Azul (`bg-blue-900 text-blue-300`) |
| director | Violeta (`bg-purple-900 text-purple-300`) |
| supervisor | Teal (`bg-teal-900 text-teal-300`) |
| tecnico | Naranja (`bg-orange-900 text-orange-300`) |
| invitado | Gris (`bg-stone-900 text-stone-400`) |

---

## Flujo de errores

- Errores de API → toast o mensaje rojo inline bajo el formulario.
- Bloquear/desactivar → `window.confirm` antes de enviar (sin modal extra).
- Email duplicado al crear → mensaje específico "Este email ya está registrado".
- Admin intentando bloquearse → API retorna 400, mensaje "No podés bloquear tu propia cuenta".

---

## Fuera de scope

- Invitación por email (Supabase invite flow) — queda para sprint futuro.
- Cambio de contraseña desde el admin — queda para sprint futuro.
- Gestión de permisos granulares por usuario — se usa solo el rol del sistema.
- Paginación de la lista — alcanza con búsqueda/filtro para el volumen actual.
