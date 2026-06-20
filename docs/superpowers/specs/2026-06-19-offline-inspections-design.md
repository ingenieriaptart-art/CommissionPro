# Offline Inspections — Captura Offline-First de Inspecciones

Fecha: 2026-06-19
Estado: En revisión
Rama: `feat/offline-inspections` (desde `master`)

## Objetivo

Permitir **capturar inspecciones completas sin conexión** (abrir plantilla → llenar →
evidencias → guardar) y sincronizarlas al reconectar, reusando el motor offline ya
existente. Dejar una **base offline industrial robusta** sobre la cual construir luego
Mechanical Completion, Punch, Certificados y Dossiers, con **trazabilidad de revisión
por inspección** (snapshot de plantilla) y **ciclo de estado de sincronización** visible.

Resuelve el gap ❌ de la validación funcional (2026-06-19): la captura era online-only
(`useSubmitInspection` escribía directo a Supabase, sin cola; plantillas no cacheadas).

## Contexto del código existente (ya presente, se reutiliza)

- `lib/db/local.ts` (Dexie): stores `tests`, `evidences`, `blobStore`, `inspectionDrafts`,
  `syncQueue` (outbox) + helpers `enqueueSync`, `saveBlobLocally`, `getBlobForEvidence`.
- `lib/sync/engine.ts`: `runSync` (push outbox por upsert `id` + pull paginado + Web Locks
  + `setupAutoSync` al reconectar), backoff ≤5 intentos con `lastError`. `tests` y
  `evidences` ya están en `SYNCABLE_ENTITIES`.
- `hooks/useSubmitInspection.ts`: **online-only** (se reescribe).
- `hooks/useInspectionData.ts`: 3 hooks que cargan equipo + plantillas + plantilla
  ensamblada desde Supabase (se les agrega fallback offline).
- `hooks/useEquipmentStatusSync.ts`: `syncEquipmentStatus` (se hace offline-aware).
- `record_sync_status` enum servidor = `('synced','pending','conflict')` (no se modifica).

## Decisiones (aprobadas por el usuario)

1. **Enfoque A — local-first unificado:** toda escritura de inspección va a Dexie +
   outbox; `runSync()` la empuja (inmediato si hay red, diferido si no). Un solo camino
   para online y offline.
2. **Preparación explícita:** acción "Preparar proyecto offline" que pre-descarga equipos
   + plantillas resueltas (secciones/campos) a IndexedDB.
3. **Conflictos: append-only + LWW.** Inspecciones = filas nuevas con UUID del dispositivo
   (sin duplicados vía upsert `onConflict:id`). Estado/% de equipo y evidencias:
   último-en-escribir gana. Sin merge ni resolución manual.
4. **Snapshot de plantilla por inspección** (trazabilidad de auditoría): cada `tests`
   guarda `template_id`, `template_revision`, `template_hash`, `template_snapshot`.
5. **Ciclo `sync_status` de 4 estados SOLO en el cliente** (Dexie/UI): `pending → syncing →
   synced | failed`, más `last_sync_error` (string) en el registro local para diagnóstico.
   El servidor sigue almacenando `synced`. **No se modifica el enum `record_sync_status`.**
6. **Testing:** Vitest + fake-indexeddb (unitario del motor offline) **y** Playwright
   offline (e2e). No depender solo de e2e.

## Arquitectura

```
[Inspección UI] --submit--> useSubmitInspection
   ├─ genera testId/evidenceId (UUID en dispositivo)
   ├─ arma template_snapshot + template_hash desde la plantilla cacheada
   ├─ localDB.tests.add({...sync_status:'pending'})        + enqueueSync('tests','INSERT')
   ├─ por foto: saveBlobLocally(evidenceId,blob)
   │            localDB.evidences.add({...sin storage_url}) + enqueueSync('evidences','INSERT')
   ├─ localDB.equipment.update(status,form_pct)             + enqueueSync('equipment','UPDATE')
   ├─ deleteInspectionDraft()
   └─ si navigator.onLine → runSync()  (no bloqueante)

[runSync → pushPendingOps]  (motor existente, extendido)
   └─ op evidences/INSERT con blob → subir a Storage → set storage_url → upsert → borrar blob
   └─ marca sync_status local: 'syncing' al iniciar op, 'synced' al ok, 'failed' al agotar 5

[Preparar proyecto offline]  prepareProjectOffline(projectId)  (con red)
   equipos del proyecto → por equipo get_equipment_templates → por templateId ensamblar
   plantilla → guardar en offlineTemplates / equipmentTemplateRefs / equipment
```

## Componentes

### 1. Migración `<NNNN>_inspection_template_snapshot.sql`

> **Numeración auto-detectada:** antes de generar el archivo, listar `database/migrations/`,
> tomar el prefijo numérico máximo y usar el siguiente (`maxN + 1`, 4 dígitos). No asumir un
> número fijo (PR #1 introduce 0044–0046 aún sin mergear). El plan ejecuta esta detección.

```sql
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS template_id        uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_revision  text,
  ADD COLUMN IF NOT EXISTS template_hash      text,
  ADD COLUMN IF NOT EXISTS template_snapshot  jsonb;

CREATE INDEX IF NOT EXISTS idx_tests_template_id ON public.tests(template_id);
COMMENT ON COLUMN public.tests.template_snapshot IS
  'Copia inmutable de la plantilla (secciones+campos) tal como la vio el inspector.';
```
Aditivo/nullable, idempotente, retrocompatible. No toca RLS (las políticas de `tests`
ya existen). El enum `record_sync_status` **no** se modifica.

### 2. Nuevos stores Dexie v5 — `lib/db/local.ts`

```ts
export interface OfflineTemplate { id: string; template: MockInspectionTemplate; updatedAt: string; }
export interface EquipmentTemplateRefs { equipmentId: string; refs: TemplateRef[]; updatedAt: string; }
// v5:
this.version(5).stores({
  offlineTemplates:      "id, updatedAt",
  equipmentTemplateRefs: "equipmentId, updatedAt",
});
```
`equipment`, `tests`, `evidences`, `blobStore`, `syncQueue` ya existen. En los registros
locales `tests`/`evidences`, `sync_status` (string Dexie, sin constraint) acepta
`'pending'|'syncing'|'synced'|'failed'` y se agrega `last_sync_error?: string`. Estos dos
campos son **solo del cliente** — se eliminan del payload antes del upsert al servidor
(donde `sync_status` se fuerza a `'synced'` y `last_sync_error` no existe como columna).

### 3. `lib/sync/prefetch.ts` — `prepareProjectOffline`

```ts
export async function prepareProjectOffline(
  projectId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ equipment: number; templates: number; errors: string[] }>
```
Con red: trae equipos del proyecto (no borrados) → `localDB.equipment.bulkPut`. Para cada
equipo: `rpc('get_equipment_templates')` → guarda `equipmentTemplateRefs`. Para cada
`templateId` único: ensambla la plantilla (extrae la lógica de `useInspectionTemplate` a
una función pura reutilizable `assembleTemplate(supabase, templateId)`) → `offlineTemplates`.
Reporta progreso e ítems fallidos (best-effort). Idempotente (`put`).

### 4. `assembleTemplate(client, templateId)` — extraído de `useInspectionData.ts`

Función pura que devuelve `MockInspectionTemplate | null` con la **misma** lógica actual
del hook (meta + `get_template_sections` + `is_universal` + `section_fields`). El hook
`useInspectionTemplate` pasa a llamarla (online) y a leer de `offlineTemplates` (offline).
DRY: una sola fuente de ensamblado, usada por el prefetch y por el hook.

### 5. `useSubmitInspection` reescrito → `submitInspectionOffline(...)`

La lógica de escritura se extrae a una función pura testeable
`submitInspectionOffline(state, ctx)` (recibe `localDB`, `enqueueSync`, `saveBlobLocally`,
`runSync`, un `uuid()` y un `now()` inyectables). El hook es un wrapper fino con estado UI.

- `testId = uuid()`; arma fila `tests` con `id`, `template_id`, `template_revision`,
  `template_hash`, `template_snapshot`, `data=answers`, `result_summary`,
  `status='ejecutado'`, `sync_status='pending'`, `last_sync_error=null`, `origin_device_id`.
- `template_snapshot` (jsonb) = `{ template: <MockInspectionTemplate definición>, meta: {
  template_source: 'offline'|'online', app_version, schema_version, captured_at } }`.
  `template_source` = de dónde se obtuvo la plantilla usada (caché Dexie vs fetch online).
  `app_version` = constante de build (`lib/version.ts`, p. ej. de `package.json`).
  `schema_version` = versión del esquema Dexie (5).
- `localDB.tests.add(test)` + `enqueueSync('tests','INSERT', test)`.
- Por evidencia: `evidenceId=uuid()`; `saveBlobLocally(evidenceId, blob)`; fila `evidences`
  (`storage_url=null`, `sync_status='pending'`) → `localDB.evidences.add` +
  `enqueueSync('evidences','INSERT', row)`.
- Equipo: `localDB.equipment.update(equipmentId,{status:'en_ejecucion',metadata.form_pct:100})`
  + `enqueueSync('equipment','UPDATE', patch)`.
- `deleteInspectionDraft(equipmentId, templateId)`.
- Si `navigator.onLine`: `runSync()` (no bloqueante). Retorna `{ testId }` de inmediato
  (optimista).

`template_hash = SHA-256(canonicalJSON(template_snapshot.template))` — se hashea **solo la
definición de la plantilla** (secciones+campos), **excluyendo `meta`** (volátil:
captured_at/app_version cambian por inspección). Así dos inspecciones de la misma revisión
producen el **mismo hash** (huella estable de integridad). Helper `lib/sync/hash.ts`:
`crypto.subtle.digest('SHA-256', ...)` (fallback a una impl JS si no hay subtle);
`canonicalJSON` serializa con claves ordenadas recursivamente para estabilidad.

### 6. Extensión `pushPendingOps` — `lib/sync/engine.ts`

Antes del upsert de cada op:
- Marcar el registro local correspondiente `sync_status='syncing'`.
- Si `op.entity==='evidences' && op.operation==='INSERT'`: buscar blob en `blobStore` por
  `payload.id`; si existe, subir a Storage (`evidences` bucket, ruta
  `${project_id}/${equipment_id}/${test_id}/${id}.${ext}`), fijar `payload.storage_url`,
  hacer upsert, borrar blob (`blobStore` + cleanup). Si falla la subida → op queda en cola.
- Tras upsert OK: `payload.sync_status` se fuerza a `'synced'`; registro local → `'synced'`,
  `last_sync_error=null`.
- En error: registro local guarda `last_sync_error` (mensaje). Al agotar 5 intentos: registro
  local → `'failed'` con su `last_sync_error` (visible en UI). El `sync_status` de 4 estados y
  `last_sync_error` viven **solo en Dexie**; nunca se envían al servidor.

LWW garantizado por `upsert(..., { onConflict:'id' })` (ya en el engine). Append-only:
ids generados en el dispositivo → no se duplican al reintentar.

### 7. Fallback offline en hooks — `useInspectionData.ts` + `useEquipmentStatusSync.ts`

- `useEquipmentForInspection`: si `!navigator.onLine` o falla → `localDB.equipment.get(id)`.
- `useEquipmentInspectionTemplates`: → `localDB.equipmentTemplateRefs.get(equipmentId)`.
- `useInspectionTemplate`: online usa `assembleTemplate` y re-cachea en `offlineTemplates`;
  offline lee `offlineTemplates.get(templateId)`.
- `syncEquipmentStatus`: si offline → `localDB.equipment.update` + `enqueueSync('equipment','UPDATE')`
  en vez de escribir directo. (Hoy es fire-and-forget online.)

### 8. UX

- **Card "Preparar para offline"** en `/projects/[id]/settings`: botón + barra de progreso
  (`done/total`) + fecha de última preparación (de `offlineTemplates`/un meta key) + conteo
  cacheado. Llama `prepareProjectOffline`.
- **Indicador de pendientes**: badge con `count(syncQueue)` + estado (`pending/syncing/failed`)
  en el **footer del `ProjectSidebar`** (mismo lugar del logo Biotec), con acción
  "Sincronizar ahora" (`runSync`). Reusa el contador de `syncQueue` y los `sync_status`
  locales. Componente nuevo `SyncStatusBadge.tsx`.

## Manejo de errores

- Backoff existente (≤5 intentos, `lastError`). Tras agotar → registro `sync_status='failed'`,
  visible; la op permanece para reintento manual ("Sincronizar ahora").
- Subida de blob fallida → la op `evidences` no se completa; el blob permanece en `blobStore`.
- Optimista: si el push final falla, la inspección queda local + en cola; **nunca se pierde**.
- `prepareProjectOffline` es best-effort: ítems fallidos se reportan, no abortan el resto.

## Testing

**Vitest + fake-indexeddb** (nuevo runner unitario del app; `vitest.config.ts`, setup que
registra `fake-indexeddb/auto`, script `"test": "vitest run"`). Cobertura mínima:
- `prepareProjectOffline`: con cliente Supabase mockeado, escribe `equipment`,
  `equipmentTemplateRefs`, `offlineTemplates`; reporta progreso; tolera fallos parciales.
- `submitInspectionOffline`: genera UUID; encola `tests`+`evidences`+`equipment`; guarda
  blobs; arma `template_snapshot` (con `meta.template_source/app_version/schema_version`) y
  `template_hash`; **verifica que el hash es estable** (misma definición → mismo hash; cambiar
  `meta` NO cambia el hash; cambiar un campo de la plantilla SÍ lo cambia); borra draft.
- **last_sync_error**: en fallo de push, el registro local guarda el mensaje; al llegar a
  `failed` el mensaje persiste; `sync_status`/`last_sync_error` se eliminan del payload del
  servidor.
- `pushPendingOps`: sube blob de evidencia (Storage mockeado) y setea `storage_url`;
  upsert con `onConflict:'id'`; marca `sync_status` `syncing→synced`.
- **retry/backoff**: op que falla incrementa `attempts`/`lastError`; a los 5 → `failed` y se
  omite.
- **LWW**: re-encolar/reintentar la misma `id` no duplica (upsert por id); última escritura
  prevalece.

**Playwright offline** (e2e): `context.setOffline(true)` → preparar proyecto (online) →
offline → abrir inspección (render desde caché) → llenar + foto → guardar (queda pendiente)
→ online → auto-sync → verificar `tests`/`evidences` en backend y `sync_status='synced'`.

## Fuera de alcance

- Mechanical Completion / Punch automático / Certificados / Dossiers (este sprint deja la
  base; esos se construyen después).
- Resolución de conflictos manual (se usa LWW).
- Versionamiento/convivencia de revisiones de plantilla (el snapshot da trazabilidad; la
  gestión de revisiones es otro sprint).
- Extender el enum `record_sync_status` del servidor (los estados transitorios son del cliente).

## Verificación

- `npm run test` (vitest) verde con la cobertura mínima listada.
- Smoke Playwright offline pasa end-to-end.
- Migración 0047 aplicada: `tests` tiene las 4 columnas; una inspección nueva guarda
  `template_snapshot`/`template_hash` no nulos.
- Manual: con red apagada, abrir y guardar una inspección de un equipo previamente
  preparado; al reconectar, aparece en backend con evidencias subidas.

## Cierre 2026-06-20 — Offline Usable

Mini-épica que cierra las tres limitaciones que impedían capturar/guardar 100% offline
(ver plan `docs/superpowers/plans/2026-06-20-offline-usable.md`). Decisión del usuario:
opción **B** (cerrar la limitación antes de mergear PR #2).

1. **Guardado dependiente de `/summary`** → el resumen ahora se renderiza **inline** en la
   ruta del formulario (ya cargada) y "Revisar y Cerrar" guarda ahí mismo vía
   `submitInspectionOffline`. `/summary` quedó como redirect legacy. El guardado ya no
   depende de cargar otra ruta. (commit `feat(inspection): resumen inline…`)
2. **`evidences 400`** → `evidences` era la única entidad de `SYNCABLE_ENTITIES` sin
   `updated_at`; el pull (`.gt("updated_at", since)`) devolvía 400 en cada ciclo.
   Migración **0048** agrega la columna + trigger `set_updated_at`. Además `pullChanges`
   ahora aísla el fallo por entidad (no aborta el sync completo).
3. **Navegación offline** → se reemplazó `next-pwa@5.6` (era Next 12-13, sin
   mantenimiento) por **`@serwist/next` 9.5**. SW con precache del app-shell + `defaultCache`
   + caching dedicado de rutas `/inspection/` (clave por pathname). `prepareProjectOffline`
   **warmea** los documentos/RSC de las rutas de los equipos preparados → una inspección
   nunca visitada abre sin red.

**Verificación realizada:** `npm test` 16/16 verde; `npm run build` OK con `public/sw.js`
generado; typecheck/lint limpios. Pendiente de validación manual (gated): aplicar 0048 en
Supabase y correr el flujo offline completo contra el build de producción.
