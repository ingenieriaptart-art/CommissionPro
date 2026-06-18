# Bitácora de Acciones (audit log viewer) — Diseño

**Fecha:** 2026-06-18
**Estado:** Aprobado por el usuario en brainstorming.

## Problema

El admin necesita ver **quién creó/editó/eliminó qué** en el programa. Ya existe la
infraestructura (`audit_log` + triggers `fn_audit` en las tablas clave), pero:
1. `fn_audit()` lee el usuario de `current_setting('app.current_user')`, GUC que la app **no
   setea** → las filas se guardan con `user_id = NULL` (no se sabe quién).
2. No hay ninguna pantalla para consultar el `audit_log`.

## Decisiones (confirmadas)

- Contenido: **solo acciones sobre datos** (no sesiones/logins, no navegación).
- Detalle: **resumen legible por fila + diff campo-por-campo expandible**.
- Acceso: **solo admin**.
- Fuera de alcance (YAGNI): accesos/login, navegación, exportar a Excel.

## Arquitectura

Tres piezas: (1) fix de captura de usuario en el trigger, (2) API admin de lectura,
(3) página admin de visualización. No se cambia la estructura de `audit_log` (append-only;
ya tiene índices `idx_audit_user`, `idx_audit_created`, `idx_audit_entity`).

### 1. Migración 0041 — captura del usuario en `fn_audit()`

`audit_log` ya tiene: `id bigserial, user_id uuid, entity text, entity_id uuid, action text
('INSERT'|'UPDATE'|'DELETE'), before jsonb, after jsonb, ip inet, device text, created_at`.

Se reescribe `fn_audit()` (mantiene SECURITY DEFINER) para resolver el usuario:

```sql
v_user := COALESCE(
  nullif(current_setting('app.current_user', true), '')::uuid,  -- si alguna ruta lo setea
  public.app_current_user_id()                                   -- usuario del JWT (app)
);
```

Con esto, toda escritura hecha por un usuario autenticado desde la app (cliente con su JWT)
queda atribuida automáticamente, porque `app_current_user_id()` mapea `auth.uid()` → `users.id`.
El trigger ya está activo en: companies, users, projects, areas, systems, subsystems, equipment,
form_templates, form_versions, tests, checklist_items, evidences, signatures, approvals,
punch_items, documents.

> Acciones vía *service role* del panel admin (crear usuario, asignar accesos) corren sin
> `auth.uid()`. Para atribuirlas, esas rutas pueden ejecutar previamente
> `SELECT set_config('app.current_user', '<appUserId>', true)` en la misma conexión. **Limitación
> conocida:** supabase-js no garantiza misma conexión por request; si no se puede, esas filas
> quedan con `user_id = NULL` y se muestran como "Sistema". El foco (acciones de usuarios sobre
> datos: equipos/pruebas/punch/documentos/evidencias) está cubierto por el JWT y no depende de esto.

### 2. API — `GET /api/admin/audit`

- Protegida con `requireAdmin` (service role → bypassa RLS de `audit_log`).
- Query params: `page` (default 1), `pageSize` (default 50, máx 200), `userId?`, `entity?`,
  `action?` (`INSERT|UPDATE|DELETE`), `from?` (ISO date), `to?` (ISO date), `q?` (búsqueda en
  `entity` o en el identificador).
- Query: `audit_log` ordenado por `created_at DESC, id DESC`, con `range()` para paginar.
  Join a `users` (full_name, email) por `user_id` para mostrar el nombre.
- Respuesta: `{ rows: AuditRow[], total: number, page, pageSize }`.
  `AuditRow = { id, created_at, user: {full_name,email}|null, entity, entity_id, action, before, after }`.
- Endpoint auxiliar para poblar el filtro de usuarios: se reutiliza `useUserList` existente.

### 3. UI — `/admin/bitacora` (solo admin)

- Página cliente bajo `app/src/app/(dashboard)/admin/bitacora/page.tsx`, con guard admin igual
  que `/admin/users` (si no es admin, mensaje "Solo administradores").
- **Filtros** (barra superior): Usuario (select), Módulo (select de entidades), Acción
  (Todas/Crear/Editar/Eliminar), Desde, Hasta, Búsqueda. Botón "Limpiar".
- **Tabla**: columnas `Fecha/hora · Usuario · Módulo · Acción · Qué`.
  - `Módulo` = etiqueta amigable de `entity` (ver mapa abajo).
  - `Acción` = badge con color: Crear=verde, Editar=azul, Eliminar=rojo.
  - `Qué` = identificador legible extraído de `after`‖`before`: `tag` ‖ `name` ‖ `code` ‖
    `title` ‖ `full_name` ‖ `entity_id` (corto).
  - Fila **expandible**: muestra el **diff** (solo claves que cambiaron entre `before` y `after`),
    con formato `campo: 'antes' → 'después'`. En CREATE muestra el `after` resumido; en DELETE el
    `before` resumido. Se ocultan campos de ruido: `updated_at, created_at, search_vector, tsv,
    *_vector, password*`.
- **Paginación**: anterior/siguiente + total. Página de 50.
- Estados: loading (spinner), vacío ("Sin registros para los filtros"), error.

### Mapas y helpers (en `app/src/lib/auditLabels.ts`)

- `ENTITY_LABEL: Record<string,string>` — companies→Empresas, users→Usuarios, projects→Proyectos,
  areas→Áreas, systems→Sistemas, subsystems→Subsistemas, equipment→Equipos,
  form_templates→Plantillas, form_versions→Versiones de plantilla, tests→Pruebas,
  checklist_items→Ítems de checklist, evidences→Evidencias, signatures→Firmas,
  approvals→Aprobaciones, punch_items→Punch List, documents→Documentos. Fallback: la propia `entity`.
- `ACTION_LABEL`: INSERT→Creó, UPDATE→Editó, DELETE→Eliminó.
- `extractIdentifier(row): string` — prioridad tag→name→code→title→full_name→entity_id.
- `diffFields(before, after): {field, from, to}[]` — claves de la unión cuyo valor difiere,
  excluyendo el set de ruido; valores no escalares se serializan compactos.

## Componentes / archivos

**Nuevos**
- `database/migrations/0041_audit_capture_user.sql`
- `database/migrations/_APPLY_bitacora.sql` (combinado para pegar en SQL Editor)
- `app/src/lib/auditLabels.ts`
- `app/src/app/api/admin/audit/route.ts` (GET)
- `app/src/hooks/useAuditLog.ts` (useAuditLog(filters) con paginación)
- `app/src/components/admin/AuditLogTable.tsx` (tabla + filas expandibles)
- `app/src/app/(dashboard)/admin/bitacora/page.tsx`

**Modificados**
- Navegación admin: agregar enlace "Bitácora" donde está "Usuarios" (solo admin) —
  archivo a confirmar al implementar (Sidebar admin / página `/admin/users` tabs).
- `app/src/types/index.ts`: tipo `AuditRow`.

## Casos borde
- `user_id` NULL → mostrar "Sistema".
- `before`/`after` con muchas claves → diff filtra ruido y serializa compacto; la fila resume.
- Entidad desconocida → usar `entity` cruda como etiqueta.
- audit_log puede ser grande → siempre paginar (range) y ordenar por índice `created_at`.
- Solo admin: API `requireAdmin` + guard en la página.

## Verificación
1. `tsc --noEmit` + `next build --webpack` → 0 errores.
2. Migración 0041 aplicada en Supabase (SQL Editor).
3. Hacer una acción como usuario no-admin (crear/editar un equipo) → aparece en la bitácora con
   su nombre, módulo, acción y diff correctos.
4. Filtrar por usuario/fecha/módulo/acción funciona; expandir muestra el diff.
5. Un no-admin no puede entrar a `/admin/bitacora` ni a la API.
6. Deploy a producción (push → Vercel) READY.
