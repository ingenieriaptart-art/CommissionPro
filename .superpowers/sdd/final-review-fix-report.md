# Final Review Fix Report — feat/precom-persistencia-correccion

Date: 2026-06-26

## Fix A — closeInspectionOffline usa state.testId (multi-dispositivo)

**File:** `app/src/lib/sync/submitInspection.ts`, líneas 91-103 (bloque "Asegurar fila borrador")

**Cambio:** Reemplazado el filtro local único por una ramificación trivia:
1. Si `state.testId` está definido → se usa directamente como `testId` sin tocar `db.tests.add`. El `db.tests.update(testId, …)` con 0 filas locales es innocuo; el outbox UPDATE llega al servidor y actualiza la fila correcta.
2. Si no hay `state.testId` → filtro local por `(equipment_id, template_id, status=borrador)`.
3. Si tampoco hay fila local → red de seguridad: `buildDraftTestRow` + INSERT (comportamiento anterior para "close sin startDraft previo").

**Resultado:** Elimina el duplicado/huérfano en el flujo multi-dispositivo.

## Fix B — upsert de fila local en precarga de borrador (device B)

**File:** `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`

**Cambio:** En la rama `else if (latestTest?.status === "borrador")` del init effect, se añade `await localDB.tests.put({...})` con los campos disponibles desde `latestTest` (id, equipment_id, template_id, status, data, template_snapshot, sync_status:"synced"). Se marcó el callback `.then()` como `async` para permitir el `await`. `put()` es idempotente por id → no altera el flujo single-device.

**Columnas utilizadas:** las que devuelve `useLatestTestForInspection`: `id, status, data, template_snapshot` (más `equipmentId`/`templateId` del contexto). Las demás (revision, created_by, etc.) se omiten para no fabricar datos incorrectos.

## Fix C — saveSection fire-and-forget con .catch()

**File:** `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`

**Cambio:** En `handleSectionSelect` y `handleNext`, añadido `?.catch(() => {})` a las llamadas `saveSection(state.testId, state.answers)` para evitar `UnhandledPromiseRejection` sin convertirlas en awaited.

## Tests añadidos

**File:** `app/src/lib/sync/__tests__/persistInspection.test.ts`

Tres casos nuevos en `describe("closeInspectionOffline — Fix A")`:
1. **state.testId presente, sin fila local** → devuelve `state.testId`; `db.tests.add` no se llama; outbox tiene UPDATE (no INSERT) para ese id.
2. **state.testId ausente, borrador local existe** → usa el id local, sin crear fila nueva.
3. **state.testId ausente, sin borrador local** → crea fila nueva con `uuid()`, emite INSERT.

## Verificación

### Tests (vitest run)
```
✓ src/lib/sync/__tests__/persistInspection.test.ts  (5 tests) 26ms
✓ src/lib/sync/__tests__/engine.test.ts             (5 tests) 101ms
Test Files  2 passed (2)
Tests       10 passed (10)
```

### TypeScript (tsc --noEmit)
0 errores.

### Build (npm run build)
Compilación exitosa, 0 errores. Todas las rutas generadas correctamente.
