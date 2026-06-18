# Bitácora de Acciones — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (ejecución inline). Steps con checkbox (`- [ ]`).

**Goal:** Página admin-only que muestra quién creó/editó/eliminó qué (sobre el `audit_log` existente), con filtros y diff expandible.

**Architecture:** (1) Migración que arregla `fn_audit()` para atribuir el usuario vía `app_current_user_id()`. (2) API `GET /api/admin/audit` con `requireAdmin` (service role) + filtros + paginación. (3) Página `/admin/bitacora` con tabla y filas expandibles. Helpers de etiquetas/diff en `lib/auditLabels.ts`.

**Tech Stack:** Next.js 16 (App Router, build `--webpack`), React + TanStack Query + Zustand, Supabase (service role en la API), TypeScript.

## Global Constraints
- Sin suite de tests; verificación = `tsc --noEmit` + `next build --webpack` + prueba manual.
- Migración idempotente (`CREATE OR REPLACE FUNCTION`). Aplicar DDL a mano en SQL Editor (no hay connection string en el entorno).
- API admin sigue el patrón de `@/lib/adminAuth` → `requireAdmin(req)` (service role).
- Solo admin: link en Sidebar gateado por `permission: "permission.configure"`; página con guard `isRole("admin")`.
- `audit_log`: `id bigserial, user_id uuid, entity text, entity_id uuid, action text ('INSERT'|'UPDATE'|'DELETE'), before jsonb, after jsonb, created_at timestamptz`.
- Entidades con trigger: companies, users, projects, areas, systems, subsystems, equipment, form_templates, form_versions, tests, checklist_items, evidences, signatures, approvals, punch_items, documents.

---

### Task 1: Migración 0041 — atribuir usuario en fn_audit
**Files:** Create `database/migrations/0041_audit_capture_user.sql`

- [ ] **Step 1:** Escribir SQL (idempotente, mantiene SECURITY DEFINER):
```sql
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_audit() RETURNS trigger AS $$
declare
  v_user uuid;
begin
  begin
    v_user := COALESCE(
      nullif(current_setting('app.current_user', true), '')::uuid,
      public.app_current_user_id()
    );
  exception when others then v_user := null; end;

  if (tg_op = 'INSERT') then
    insert into public.audit_log(user_id, entity, entity_id, action, after)
      values (v_user, tg_table_name, new.id, 'INSERT', to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log(user_id, entity, entity_id, action, before, after)
      values (v_user, tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(user_id, entity, entity_id, action, before)
      values (v_user, tg_table_name, old.id, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end; $$ language plpgsql security definer;
COMMIT;
```
- [ ] **Step 2:** Commit. (Se aplica en Task 6.)

---

### Task 2: Helpers de etiquetas y diff
**Files:** Create `app/src/lib/auditLabels.ts`; Modify `app/src/types/index.ts`

**Produces:** `ENTITY_LABEL`, `ACTION_LABEL`, `actionKind(action): 'create'|'edit'|'delete'`, `extractIdentifier(row): string`, `diffFields(before, after): {field:string; from:unknown; to:unknown}[]`, tipo `AuditRow`.

- [ ] **Step 1:** Crear `auditLabels.ts` con los mapas y funciones puras. Set de ruido a ocultar en diff: `updated_at, created_at, deleted_at, search_vector, tsv, fts, password, must_change_password`. `extractIdentifier` prioriza `tag→name→code→title→full_name→email→short(entity_id)`.
- [ ] **Step 2:** Agregar `AuditRow` a types: `{ id:number; created_at:string; user:{full_name:string;email:string}|null; entity:string; entity_id:string|null; action:'INSERT'|'UPDATE'|'DELETE'; before:Record<string,unknown>|null; after:Record<string,unknown>|null }`.
- [ ] **Step 3:** `tsc --noEmit` → 0. Commit.

---

### Task 3: API GET /api/admin/audit
**Files:** Create `app/src/app/api/admin/audit/route.ts`

**Consumes:** `requireAdmin` de `@/lib/adminAuth`.
**Produces:** `GET` → `{ rows: AuditRow[], total:number, page:number, pageSize:number }`. Query params `page,pageSize,userId,entity,action,from,to,q`.

- [ ] **Step 1:** Implementar: `requireAdmin`; parsear params (pageSize máx 200, default 50; page default 1). Construir query sobre `audit_log` con `select("*, user:users(full_name,email)", { count: "exact" })`, aplicar `.eq` para userId/entity/action, `.gte('created_at',from)`/`.lte('created_at',to)`, `.ilike('entity', %q%)` si `q`. Orden `created_at desc, id desc`. `.range((page-1)*pageSize, page*pageSize-1)`. Devolver `{rows, total: count, page, pageSize}`.
- [ ] **Step 2:** `tsc --noEmit` → 0. Commit.

---

### Task 4: Hook useAuditLog
**Files:** Create `app/src/hooks/useAuditLog.ts`

**Produces:** `useAuditLog(filters: {page,pageSize,userId?,entity?,action?,from?,to?,q?})` → query con `adminFetch` (Authorization Bearer, igual que `useUsers`). queryKey incluye los filtros. Devuelve `{rows,total,...}`.

- [ ] **Step 1:** Implementar hook (reutiliza patrón `getToken()`+fetch de `useUsers.ts`; construye querystring; `keepPreviousData: true` para paginar sin parpadeo).
- [ ] **Step 2:** `tsc --noEmit` → 0. Commit.

---

### Task 5: Componente AuditLogTable + página /admin/bitacora
**Files:** Create `app/src/components/admin/AuditLogTable.tsx`; Create `app/src/app/(dashboard)/admin/bitacora/page.tsx`; Modify `app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1:** `AuditLogTable.tsx`: recibe `rows`; renderiza tabla (Fecha/hora · Usuario · Módulo · Acción badge · Qué). Fila clickeable que togglea un panel con `diffFields(before,after)` (CREATE→listar `after` filtrado; DELETE→`before`; UPDATE→solo cambios). Usuario null → "Sistema".
- [ ] **Step 2:** `bitacora/page.tsx`: `"use client"`; guard `if (!isRole("admin")) return <Solo administradores/>`; estado de filtros; barra de filtros (Usuario via `useUserList`, Módulo via `ENTITY_LABEL`, Acción, Desde, Hasta, Búsqueda, Limpiar); `useAuditLog`; `<AuditLogTable>`; paginación anterior/siguiente con `total`.
- [ ] **Step 3:** `Sidebar.tsx`: agregar al array `navItems` (tras `/admin/users`): `{ href: "/admin/bitacora", icon: ScrollText, label: "Bitácora", permission: "permission.configure" }` e importar `ScrollText` de lucide-react.
- [ ] **Step 4:** `tsc --noEmit` + `next build --webpack` → 0. Commit.

---

### Task 6: Aplicar SQL + verificación + deploy
**Files:** Create `database/migrations/_APPLY_bitacora.sql` (copia de 0041 con encabezado)

- [ ] **Step 1:** Crear `_APPLY_bitacora.sql` (encabezado + contenido de 0041). Commit.
- [ ] **Step 2:** Handoff: el usuario pega `_APPLY_bitacora.sql` en el SQL Editor de Supabase (no hay creds DDL en el entorno).
- [ ] **Step 3:** Tras confirmación, `git push ptart master` → verificar deploy READY vía MCP Vercel. Prueba manual: acción de un usuario aparece atribuida en `/admin/bitacora`.

## Self-Review
- Cobertura spec: fix usuario (T1), labels/diff/tipos (T2), API (T3), hook (T4), UI+nav (T5), SQL+deploy (T6). ✔
- Sin placeholders en lógica crítica (SQL completo en T1; firmas de helpers en T2). ✔
- Consistencia de tipos: `AuditRow` definido en T2 y usado en T3/T5; `diffFields/extractIdentifier/ENTITY_LABEL/actionKind` definidos en T2 y consumidos en T5. ✔
- Riesgo: si `audit_log` SELECT está denegado por RLS, la API usa service role (bypass) → OK.
