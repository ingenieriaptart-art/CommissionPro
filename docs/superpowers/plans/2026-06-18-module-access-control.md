# Control de Acceso por Módulo — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (ejecución inline en esta sesión). Steps usan checkbox (`- [ ]`).

**Goal:** Permitir que el admin asigne, por usuario y por proyecto, un nivel de acceso (`none`/`read`/`edit`/`full`) a cada módulo, con bloqueo real en UI y en servidor (RLS).

**Architecture:** Columna JSONB `module_access` en `project_members`. Helpers SQL (`app_module_access`, `app_can_write`, `app_can_full`) sobre los `app_*` de 0009. RLS gatea escrituras por módulo (lecturas siguen por pertenencia al proyecto). Frontend: store + hook exponen el acceso del usuario actual; el sidebar oculta módulos `none`, un `ModuleGuard` bloquea rutas, y las acciones se deshabilitan por `canWrite`/`canFull`. Admin = `full` siempre.

**Tech Stack:** Next.js 16 (App Router, build con `--webpack`), React + Zustand + TanStack Query, Supabase (Postgres + RLS), TypeScript.

## Global Constraints
- Este proyecto NO tiene suite de tests; el ciclo de verificación es `tsc --noEmit` + `next build --webpack` + verificación SQL por script + prueba manual.
- Migraciones idempotentes: `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` antes de `CREATE POLICY`.
- Scripts Supabase corren con `node --env-file=.env.local scripts/<n>.mjs`; por Avast usar `NODE_TLS_REJECT_UNAUTHORIZED=0` y `dangerouslyDisableSandbox`.
- Module keys = exactamente: `dashboard, equipment, plant-map, ic02-rtu, tests, punch, reports, documents, engineering, templates, settings, users`.
- Niveles = `none|read|edit|full`. Solo-admin = `templates, settings, users`.
- Proyecto activo de prueba: LDC `eba099c0-32ca-4be7-823f-4ab7f3480004`.
- Deploy: `vercel --prod` desde la raíz del repo (rootDirectory="app").

---

### Task 1: Catálogo de módulos + tipos
**Files:**
- Create: `app/src/lib/modules.ts`
- Modify: `app/src/types/index.ts`

**Produces:** `type Access = 'none'|'read'|'edit'|'full'`; `MODULES: ModuleDef[]` con `{key,label,icon,adminOnly}`; `ACCESS_LEVELS`; `ModuleAccessMap = Record<string,Access>`. En types: `ProjectMember.module_access?: ModuleAccessMap`.

- [ ] **Step 1:** Crear `modules.ts` con el catálogo (12 módulos, iconos lucide alineados al sidebar) y constantes.
- [ ] **Step 2:** Agregar `module_access` a la interfaz `ProjectMember` y exportar `Access`/`ModuleAccessMap` desde types.
- [ ] **Step 3:** `npx tsc --noEmit` → 0 errores. Commit.

---

### Task 2: Migración 0039 — columna + helpers RLS
**Files:**
- Create: `database/migrations/0039_module_access_column.sql`

- [ ] **Step 1:** Escribir SQL:
```sql
BEGIN;
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS module_access jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.app_module_access(p uuid, m text)
RETURNS text AS $$
  SELECT CASE
    WHEN public.app_is_admin() THEN 'full'
    ELSE COALESCE(
      (SELECT module_access->>m FROM public.project_members
        WHERE project_id = p AND user_id = public.app_current_user_id()),
      'none')
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.app_can_write(p uuid, m text) RETURNS boolean AS $$
  SELECT public.app_module_access(p, m) IN ('edit','full');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.app_can_full(p uuid, m text) RETURNS boolean AS $$
  SELECT public.app_module_access(p, m) = 'full';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
COMMIT;
```
- [ ] **Step 2:** Commit del archivo SQL (se aplica en Task 12).

---

### Task 3: Migración 0040 — políticas RLS por módulo
**Files:**
- Create: `database/migrations/0040_module_access_rls.sql`

**Notas:** Antes de escribir, leer las policies existentes de cada tabla (`grep -n "policy" database/migrations/0007_rls.sql 0009_*.sql 0005_*.sql`) para hacer `DROP POLICY IF EXISTS <nombre>` exacto y recrear. Patrón:
- SELECT: `using (app_in_project(project_id))` (sin cambio de módulo).
- INSERT/UPDATE: `with check (app_in_project(project_id) AND app_can_write(project_id,'<mod>'))`.
- DELETE: `using (app_can_full(project_id,'<mod>'))`.
- Tablas sin `project_id` directo (`checklist_items`, `evidences`, `signatures`, `approvals`, `document_versions`): resolver project_id vía la FK a `tests`/`documents` con subselect, o usar `app_can_write` con el project del padre.
- `tests.status` → trigger BEFORE UPDATE que rechaza pasar a `aprobado`/`rechazado` sin `app_can_full(project_id,'tests')`.
- Tablas solo-admin (`form_templates, template_sections, section_fields, form_template_sections, app_config`): escritura `with check (app_is_admin())`, delete `using (app_is_admin())`.

- [ ] **Step 1:** Mapear policies existentes (lectura de los .sql).
- [ ] **Step 2:** Escribir 0040 con DROP+CREATE por tabla (equipment, tests, checklist_items, evidences, signatures, approvals, punch_items, documents, document_versions, plant_map_layouts) + trigger de aprobación + tablas solo-admin.
- [ ] **Step 3:** Commit (se aplica en Task 12).

---

### Task 4: API — sanear module_access (POST + PATCH membresía)
**Files:**
- Modify: `app/src/app/api/admin/users/[id]/projects/route.ts`
- Create: `app/src/app/api/admin/users/[id]/projects/[projectId]/route.ts` (agregar `PATCH`; ya existe `DELETE`)
- Create: `app/src/lib/sanitizeModuleAccess.ts`

**Produces:** `sanitizeModuleAccess(raw, {isAdminTarget:boolean}): ModuleAccessMap` — descarta claves fuera del catálogo, valores inválidos, y fuerza módulos solo-admin a `none`.

- [ ] **Step 1:** Crear `sanitizeModuleAccess.ts`.
- [ ] **Step 2:** POST projects: aceptar `module_access`, sanear, guardar en upsert de `project_members`.
- [ ] **Step 3:** PATCH `[projectId]/route.ts`: `requireAdmin`, body `{role_id?, module_access?}`, sanear, update de la membresía. Mantener el `DELETE` existente.
- [ ] **Step 4:** `tsc --noEmit` → 0. Commit.

---

### Task 5: Hooks de usuarios
**Files:**
- Modify: `app/src/hooks/useUsers.ts`

**Produces:** `useUpdateMembership(userId)` → `mutateAsync({projectId, role_id?, module_access?})` (PATCH); `useAssignProject` acepta `module_access?`.

- [ ] **Step 1:** Agregar `useUpdateMembership` + tipo en `useAssignProject`. Invalida `["user-projects", userId]`.
- [ ] **Step 2:** `tsc --noEmit` → 0. Commit.

---

### Task 6: Componente ModuleAccessMatrix
**Files:**
- Create: `app/src/components/admin/ModuleAccessMatrix.tsx`

**Consumes:** `MODULES`, `Access` de `lib/modules.ts`.
**Produces:** `<ModuleAccessMatrix value onChange isAdminTarget />` — filas por módulo, selector segmentado [Sin acceso·Lectura·Edición·Control total]; solo-admin bloqueado a máx. Lectura con badge "Solo admin"; botones rápidos "Todo sin acceso/lectura/edición".

- [ ] **Step 1:** Implementar componente presentacional (estado controlado).
- [ ] **Step 2:** `tsc --noEmit` → 0. Commit.

---

### Task 7: Integrar matriz en UserDetailPanel
**Files:**
- Modify: `app/src/components/admin/UserDetailPanel.tsx`

- [ ] **Step 1:** Cada proyecto asignado: botón "Acceso por módulo" que expande `ModuleAccessMatrix` con el `module_access` de la membresía; guarda con `useUpdateMembership`.
- [ ] **Step 2:** `tsc --noEmit` → 0. Build webpack OK. Commit.

---

### Task 8: AssignProjectModal default
**Files:**
- Modify: `app/src/components/admin/AssignProjectModal.tsx`

- [ ] **Step 1:** Pasar `module_access: {}` por defecto (rol jerarquía sigue obligatorio). Opcional: incluir `ModuleAccessMatrix` colapsable.
- [ ] **Step 2:** `tsc --noEmit` → 0. Commit.

---

### Task 9: auth.store + useMyModuleAccess
**Files:**
- Modify: `app/src/stores/auth.store.ts`
- Create: `app/src/hooks/useMyModuleAccess.ts`

**Produces:** store: `moduleAccess: Record<projectId, ModuleAccessMap>`, `setModuleAccess(projectId,map)`, `getAccess(projectId,key):Access` (admin→full), `canRead/canWrite/canFull(projectId,key)`. Hook `useMyModuleAccess(projectId)` carga del `project_members` propio y lo guarda en el store.

- [ ] **Step 1:** Extender store con helpers (admin short-circuit por `user.role.key==='admin'`).
- [ ] **Step 2:** Hook que hace `select module_access from project_members where project_id=? and user_id=<me>`.
- [ ] **Step 3:** `tsc --noEmit` → 0. Commit.

---

### Task 10: Gating de navegación (ProjectSidebar)
**Files:**
- Modify: `app/src/components/layout/ProjectSidebar.tsx`

- [ ] **Step 1:** Usar `useMyModuleAccess(projectId)` + `getAccess`; filtrar `navItems` con acceso `none` (admin ve todo). `settings` solo si admin. Mantener toggle Equipos admin-only.
- [ ] **Step 2:** Build OK. Commit.

---

### Task 11: ModuleGuard de ruta
**Files:**
- Create: `app/src/components/auth/ModuleGuard.tsx`
- Modify: layout de proyecto `app/src/app/(workspace)/projects/[projectId]/layout.tsx` (si no existe, envolver en cada page raíz vía el sidebar layout).

- [ ] **Step 1:** `ModuleGuard` deduce el módulo del primer segmento tras `/projects/[id]/`; si acceso `none` → redirige a `dashboard` con aviso "Sin acceso". Admin pasa siempre.
- [ ] **Step 2:** Montar en el layout de proyecto.
- [ ] **Step 3:** Build OK. Commit.

---

### Task 12: Aplicar migraciones en Supabase prod
**Files:**
- Create: `app/scripts/migrate-0039-0040.mjs`

- [ ] **Step 1:** Script que ejecuta ambos .sql vía `pg`/`postgres` o por `supabase` RPC. (Este repo no tiene runner SQL genérico → usar conexión `postgres` con `DATABASE_URL`/connection string del `.env.local`, o ejecutar statement-by-statement con el cliente. Verificar qué hay en `.env.local` primero.)
- [ ] **Step 2:** Correr el script (TLS reject + no sandbox). Verificar: `select column_name from information_schema.columns where table_name='project_members' and column_name='module_access'` y que las funciones existen.
- [ ] **Step 3:** Verificación de RLS: como admin, escribir y leer OK; simular un no-admin `read` (set local) → escritura rechazada. Commit del script.

---

### Task 13: Gating de acciones dentro de módulos clave
**Files:**
- Modify: módulos de escritura más visibles — `tests` (inspección/summary), `punch`, `equipment`, `documents`, `engineering`. Concretamente los componentes con botones crear/editar/aprobar/borrar.

- [ ] **Step 1:** En cada uno, leer `canWrite(projectId, '<mod>')` / `canFull(...)` y deshabilitar/ocultar botones. (Listar archivos exactos al ejecutar, vía grep de botones de acción.)
- [ ] **Step 2:** Build OK. Commit.

---

### Task 14: Verificación final + deploy
- [ ] **Step 1:** `npx tsc --noEmit` y `npx next build --webpack` desde `app/` → 0 errores.
- [ ] **Step 2:** Prueba manual con admin + un no-admin con matriz parcial (none oculto, read sin botones, edit sin aprobar/borrar, full todo). Intento de escritura vía API directa con `read` → rechazado por RLS.
- [ ] **Step 3:** `vercel --prod` desde la raíz → READY. Actualizar memoria.

## Self-Review notes
- Cobertura spec: catálogo (T1), datos+helpers (T2), RLS (T3), API+saneo (T4-5), UI matriz (T6-8), store+hook (T9), gating nav/ruta/acciones (T10-11,13), migración prod (T12), verificación/deploy (T14). ✔
- Riesgo principal: RLS en tablas hijas sin `project_id` directo → resolver vía subselect al padre (detallar al escribir 0040 leyendo el esquema real). El trigger de aprobación cubre el matiz edit-vs-full en `tests.status`.
- Sin placeholders de código en la lógica crítica (SQL helper completo en T2); el resto es mecánico y se completa leyendo el archivo real en ejecución.
