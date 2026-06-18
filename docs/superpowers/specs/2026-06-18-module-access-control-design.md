# Control de Acceso por Módulo — Diseño

**Fecha:** 2026-06-18
**Estado:** Aprobado (decisiones confirmadas por el usuario en brainstorming)

## Problema

Hoy el sistema tiene roles (`admin`, `director`, `supervisor`, `tecnico`, `invitado`) pero
**no hay control de acceso real por módulo**: el sidebar muestra todos los módulos a todos los
usuarios y la única protección de servidor es `requireAdmin` en `/api/admin/*`. El `hasPermission`
del auth store existe pero no se usa para ocultar/bloquear nada.

Se requiere que el admin pueda asignar, **por usuario y por proyecto**, un nivel de acceso a cada
módulo, y que los usuarios **no puedan afectar el programa** (escrituras/configuración) más allá de
lo que se les concede — con bloqueo real de servidor, no solo de interfaz.

## Decisiones (confirmadas)

1. **Alcance:** por usuario **y por proyecto** (un usuario puede ser "Control total" en un proyecto y "Solo lectura" en otro).
2. **Niveles de acceso (4):**
   - `none` — Sin acceso: el módulo ni aparece en el menú y la ruta se bloquea.
   - `read` — Solo lectura: ve datos, no puede modificar.
   - `edit` — Edición: crea / ejecuta / llena / sube evidencias, pero **no aprueba ni borra**.
   - `full` — Control total: todo, incluido **aprobar** y **borrar**.
3. **Rol ≠ acceso.** El rol es solo **jerarquía/título** dentro del proyecto (para firmas, informes y
   contexto). El acceso lo define el admin **a mano**, módulo por módulo. Asignar "Supervisor" no
   otorga ningún permiso por sí mismo.
4. **Admin es superusuario** por su rol global (`users.role_id` = admin) → `full` en todo, siempre.
5. **Módulos solo-admin** (nunca asignables a usuarios normales por encima de lectura):
   **Templates/Formularios, Configuración del proyecto, Gestión de Usuarios.**
   (Ing. Digital **sí** es asignable a usuarios normales.)
6. **Enforcement:** UI **+** servidor. Las escrituras se validan en Supabase vía RLS; la UI además
   oculta/deshabilita según la matriz.
7. **Almacenamiento:** columna **JSONB** `module_access` en `project_members` (Opción A).

## Catálogo de módulos

| Módulo (key)   | Etiqueta UI          | Solo-admin | Tablas que toca (escritura)                                  |
|----------------|----------------------|:----------:|--------------------------------------------------------------|
| `dashboard`    | Dashboard            | no         | — (solo lectura/agregados)                                   |
| `equipment`    | Equipos              | no         | `equipment`                                                  |
| `plant-map`    | Mapa de Planta       | no         | `plant_map_layouts` (posiciones)                            |
| `ic02-rtu`     | Instrumentos IC02    | no         | — (vista)                                                    |
| `tests`        | Pruebas              | no         | `tests`, `checklist_items`, `evidences`, `signatures`, `approvals` |
| `punch`        | Punch List           | no         | `punch_items`                                                |
| `reports`      | Informes             | no         | — (genera/exporta; lectura)                                  |
| `documents`    | Documentos           | no         | `documents`, `document_versions`                             |
| `engineering`  | Ing. Digital         | no         | `equipment` (import masivo), tags                            |
| `templates`    | Templates/Formularios| **sí**     | `form_templates`, `template_sections`, `section_fields`, `form_template_sections` |
| `settings`     | Configuración        | **sí**     | `app_config`, ajustes de proyecto                            |
| `users`        | Usuarios             | **sí**     | `users`, `roles`, `project_members` (vía `/api/admin/*`)     |

Los `module_access` keys usan exactamente estos identificadores (alineados a los `segment` del
`ProjectSidebar`).

## Modelo de datos

### Migración 0039 — `module_access` + helpers RLS

```sql
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS module_access jsonb NOT NULL DEFAULT '{}'::jsonb;
```

- Forma: `{"tests":"full","punch":"edit","reports":"read","equipment":"none", ...}`.
- Una clave ausente equivale a `none` (lo más restrictivo; el acceso se **concede** explícitamente).

**Helper de acceso** (sobre los `app_*` existentes de 0009):

```sql
-- Nivel de acceso del usuario actual a (proyecto, módulo). Admin => 'full'.
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
```

## Estrategia de enforcement de servidor (RLS)

Principio: **las lecturas siguen acotadas por pertenencia al proyecto** (`app_in_project`), porque
muchas tablas son compartidas entre módulos (p.ej. `equipment` lo necesitan plant-map, tests, ic02,
dashboard; `tests` lo necesitan reports y dashboard). Gatear el SELECT por módulo rompería vistas
cruzadas. La distinción `none` vs `read` de **lectura se aplica en la UI** (ocultar módulo/ruta).

Lo que el usuario llama "afectar el programa" son las **escrituras**, y **esas sí** se bloquean en
servidor por módulo:

- **INSERT / UPDATE** → requiere `app_can_write(project_id, '<modulo>')`.
- **DELETE** → requiere `app_can_full(project_id, '<modulo>')`.
- **Aprobar** (INSERT en `approvals`, y `tests.status='aprobado'`) → requiere `app_can_full(..., 'tests')`.
  - Para `tests.status`: trigger `BEFORE UPDATE` que bloquea pasar a `aprobado`/`rechazado` sin `full`.

Tablas con políticas nuevas/ajustadas (migración 0040):
`equipment` (módulo `equipment`/`engineering`), `tests`, `checklist_items`, `evidences`,
`signatures`, `approvals` (módulo `tests`), `punch_items` (módulo `punch`),
`documents`, `document_versions` (módulo `documents`), `plant_map_layouts` (módulo `plant-map`).

Tablas solo-admin: `form_templates`, `template_sections`, `section_fields`,
`form_template_sections`, `app_config` → escritura solo `app_is_admin()` (refuerza lo que ya hace
`requireAdmin` en API).

> Nota de compatibilidad: las políticas de escritura actuales basadas en rol
> (`app_user_role() in ('admin','supervisor','tecnico')`) se **reemplazan** por las basadas en
> módulo. Así, dejar de depender del rol para permisos es coherente con la decisión 3.

## API

Extender la ruta existente de asignación de proyecto:

- `POST /api/admin/users/[id]/projects` — además de `{project_id, role_id}` acepta
  `module_access?: Record<string,Access>` (default `{}`). (Crea/actualiza la membresía.)
- `PATCH /api/admin/users/[id]/projects/[projectId]` — **nuevo**: body `{ role_id?, module_access? }`
  para editar la jerarquía y/o la matriz de una membresía existente. Protegido por `requireAdmin`.
- El servidor **sanea** la matriz: solo claves del catálogo, solo valores `none|read|edit|full`, y
  fuerza módulos solo-admin a `none` para no-admins (no se pueden conceder vía API).

## Frontend

### Auth store / carga de acceso
- Nuevo: el acceso por módulo del **usuario actual** para el proyecto activo.
  - Hook `useMyModuleAccess(projectId)` → lee `project_members.module_access` del usuario logueado
    (RLS permite leer la propia membresía).
  - Helpers expuestos: `moduleAccess(projectId, key)`, `canRead`, `canWrite`, `canFull`.
  - Admin → siempre `full`.

### Gating de navegación y rutas
- `ProjectSidebar`: oculta cada `navItem` cuyo acceso sea `none`. Admin ve todo. Los módulos
  solo-admin (`templates`, `settings`) ya no se muestran a no-admins.
- Guard de ruta: componente `ModuleGuard` que envuelve el layout de proyecto y redirige a
  `/projects/[id]/dashboard` (o muestra "Sin acceso") si el módulo de la ruta actual es `none`.

### Gating de acciones dentro de módulos
- Botones de crear/editar/ejecutar/subir → deshabilitados si `!canWrite(modulo)`.
- Botones de aprobar/borrar → deshabilitados si `!canFull(modulo)`.
- En `read`, el módulo se ve en modo solo-lectura (acciones ocultas/deshabilitadas).

### UI de administración — editor de matriz
- En `UserDetailPanel`, cada proyecto asignado se puede **expandir** para mostrar la matriz:
  - Filas = módulos (con etiqueta e ícono); control = selector segmentado
    **[Sin acceso · Lectura · Edición · Control total]**.
  - Módulos solo-admin se muestran con badge "Solo admin" y selector bloqueado (máx. Lectura).
  - Acciones rápidas: "Todo lectura", "Todo sin acceso", "Todo edición".
  - Guarda vía `PATCH .../projects/[projectId]`.
- `AssignProjectModal`: al asignar, el rol (jerarquía) sigue obligatorio; la matriz arranca en
  "Todo sin acceso" y se edita luego desde el panel (o un paso opcional en el modal).
- Componente reutilizable `ModuleAccessMatrix` (presentacional) usado en el panel.

## Componentes / archivos afectados

**Nuevos**
- `database/migrations/0039_module_access_column.sql`
- `database/migrations/0040_module_access_rls.sql`
- `app/src/lib/modules.ts` — catálogo de módulos (key, label, icon, adminOnly) y tipo `Access`.
- `app/src/hooks/useMyModuleAccess.ts`
- `app/src/components/admin/ModuleAccessMatrix.tsx`
- `app/src/components/auth/ModuleGuard.tsx`
- `app/src/app/api/admin/users/[id]/projects/[projectId]/route.ts` → agregar `PATCH`
- `app/scripts/migrate-0039-0040.mjs` — aplica ambas migraciones en Supabase prod.

**Modificados**
- `app/src/stores/auth.store.ts` — exponer helpers de acceso por módulo.
- `app/src/hooks/useUsers.ts` — `useUpdateMembership` (PATCH) + tipo en `useAssignProject`.
- `app/src/components/admin/UserDetailPanel.tsx` — expandir membresía → matriz.
- `app/src/components/admin/AssignProjectModal.tsx` — default `module_access`.
- `app/src/components/layout/ProjectSidebar.tsx` — ocultar navItems por acceso.
- `app/src/app/(workspace)/projects/[projectId]/layout.tsx` (o equivalente) — `ModuleGuard`.
- `app/src/app/api/admin/users/[id]/projects/route.ts` — aceptar/sanear `module_access`.
- `app/src/types/index.ts` — `module_access` en `ProjectMember`; tipo `ModuleAccess`/`Access`.

## Casos borde y errores
- Usuario sin membresía en el proyecto → todo `none` (no entra al proyecto; ya cubierto por
  `app_in_project`).
- Admin siempre `full` aunque su JSONB esté vacío.
- Saneo de servidor: claves desconocidas o valores inválidos se descartan; solo-admin forzado a
  `none` para no-admins.
- Migración idempotente (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`).
- Reemplazo de políticas: aplicar en transacción; verificar que admin y un técnico de prueba
  siguen pudiendo operar tras el cambio.

## Verificación (antes de declarar hecho)
1. `tsc --noEmit` y `next build --webpack` → 0 errores.
2. Migraciones 0039/0040 aplicadas en Supabase prod (script).
3. Prueba manual con 2 usuarios: admin (ve/hace todo) y un no-admin con matriz parcial
   (módulo `none` no aparece; `read` ve sin botones; `edit` crea pero no aprueba/borra; `full` todo).
4. Intento de escritura vía API directa con un usuario `read` → **rechazado por RLS**.
5. Deploy `vercel --prod` desde la raíz del repo → READY.

## Fuera de alcance (YAGNI)
- Permisos a nivel de campo individual (ya existe config de secciones/campos por plantilla).
- Plantillas de matriz reutilizables / "perfiles de acceso" guardados (se puede agregar luego).
- Auditoría dedicada de cambios de acceso más allá del `audit_log`/`fn_audit` existente.
