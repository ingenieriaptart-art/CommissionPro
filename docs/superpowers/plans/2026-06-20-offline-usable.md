# Mini-épica "Offline Usable" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar las tres limitaciones que impiden capturar y guardar una inspección 100% offline (guardado atado a la ruta `/summary`, error `evidences 400` en cada sync, y rutas que no cargan sin red), para poder mergear PR #2 como "offline usable" de verdad.

**Architecture:** (1) El guardado deja de depender de navegar a `/summary`: el resumen se renderiza **inline** como overlay dentro de la ruta del formulario ya cargada, y "Revisar y Cerrar" guarda ahí mismo vía `submitInspectionOffline`. (2) Se agrega la columna `updated_at` + trigger a `evidences` (migración 0048) para que el cursor de pull (`.gt("updated_at", …)`) deje de devolver 400. (3) Se reemplaza `next-pwa@5.6` (sin mantenimiento, era Next 12-13) por **`@serwist/next`** para precachear el app-shell + cachear navegaciones/RSC, y `prepareProjectOffline` se extiende para **warmear** los documentos de ruta de los equipos preparados, garantizando que una inspección nunca visitada abra sin red.

**Tech Stack:** Next.js 16.2.6 (App Router, `--webpack`), React 19.2.4, Dexie 4 (IndexedDB), Supabase JS 2, `@serwist/next`, Vitest 3 + fake-indexeddb, Playwright 1.60.

## Global Constraints

- **Next.js NO es el estándar que conocés.** `app/AGENTS.md`: antes de tocar `next.config.ts`, metadata, manifest o cualquier API de Next, leer la guía correspondiente en `app/node_modules/next/dist/docs/`. Heed deprecation notices.
- **Numeración de migraciones auto-detectada:** el máximo actual es `0047`. La nueva migración es `0048`. Verificar con `ls database/migrations/ | sort | tail -1` antes de crear el archivo; usar `maxN + 1` a 4 dígitos.
- **No modificar el enum `record_sync_status`** del servidor (`'synced'|'pending'|'conflict'`). Los 4 estados (`pending|syncing|synced|failed`) y `last_sync_error` viven **solo en Dexie/UI**.
- **Migraciones aditivas, idempotentes, retrocompatibles** (`IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`). No tocar RLS salvo que el cambio lo requiera.
- **TDD:** test que falla → mínima implementación → test verde → commit. Commits frecuentes y atómicos.
- **Comandos** se ejecutan desde `app/` salvo los SQL/migraciones (desde la raíz del repo).
- **No iniciar Mechanical Completion** hasta que esta mini-épica esté completa y validada.

---

## File Structure

- `database/migrations/0048_evidences_updated_at.sql` — **crear**: columna `updated_at` + trigger en `evidences`.
- `app/src/lib/sync/engine.ts` — **modificar**: aislar el fallo de pull por entidad (defensa) sin abortar las demás.
- `app/src/components/inspection/InspectionSummary.tsx` — **reutilizar** (ya es presentacional; sin cambios funcionales salvo que falte algo para inline).
- `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx` — **modificar**: resumen inline + guardado sin navegar.
- `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary/page.tsx` — **modificar**: degradar a redirect legacy al formulario.
- `app/next.config.ts` — **modificar**: reemplazar `next-pwa` por `@serwist/next`.
- `app/src/app/sw.ts` — **crear**: service worker (defaultCache + navegación + warm cache).
- `app/src/app/layout.tsx` — **modificar**: metadata `manifest` + (si aplica) registro del SW según docs de `@serwist/next`.
- `app/public/manifest.json` — **verificar/ajustar**: ya existe.
- `app/src/lib/sync/prefetch.ts` — **modificar**: warmear documentos de ruta de inspección de los equipos preparados.
- `app/src/lib/sync/prefetch.test.ts` — **modificar/crear**: cobertura del warming.
- `app/e2e/offline-inspection.spec.ts` — **modificar**: e2e offline completo (ruta nunca visitada → llenar → guardar inline → reconectar → sync).
- `app/package.json` — **modificar**: quitar `next-pwa`, agregar `@serwist/next` + `serwist`.

---

## Task 1: Migración 0048 — `updated_at` en `evidences` (fix `evidences 400`)

**Files:**
- Create: `database/migrations/0048_evidences_updated_at.sql`

**Interfaces:**
- Produces: la tabla `public.evidences` gana columna `updated_at timestamptz not null default now()` con trigger `trg_updated_evidences` que la mantiene en cada UPDATE. Esto permite que `pullChanges` consulte `.gt("updated_at", since)` sin error 400.

**Contexto (causa raíz confirmada):** `evidences` es la única entidad de `SYNCABLE_ENTITIES` sin `updated_at`. El trigger genérico de `0006_audit_sync_triggers.sql` la saltó porque aplica `set_updated_at` "solo donde existe la columna". `pullChanges` (engine.ts) hace `.gt("updated_at", since).order("updated_at")` para **toda** entidad → PostgREST devuelve `400 column evidences.updated_at does not exist` en cada sync. La función `set_updated_at()` ya existe (0006), se reutiliza.

- [ ] **Step 1: Verificar la numeración**

Run: `ls database/migrations/ | sort | tail -1`
Expected: `0047_inspection_template_snapshot.sql` (→ la nueva es `0048`). Si el máximo fuera otro, ajustar el nombre a `maxN+1`.

- [ ] **Step 2: Crear la migración**

Crear `database/migrations/0048_evidences_updated_at.sql`:

```sql
-- 0048_evidences_updated_at.sql
-- Agrega updated_at a evidences para habilitar el cursor de pull del motor offline.
-- evidences fue la única tabla sincronizable sin updated_at: el pull
-- (.gt("updated_at", since)) devolvía 400 en cada ciclo. Aditivo e idempotente.

ALTER TABLE public.evidences
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill: filas existentes toman su created_at como updated_at inicial.
UPDATE public.evidences
  SET updated_at = COALESCE(created_at, now())
  WHERE updated_at IS NULL OR updated_at = now();

-- Trigger: mantener updated_at en cada UPDATE. set_updated_at() existe desde 0006.
DROP TRIGGER IF EXISTS trg_updated_evidences ON public.evidences;
CREATE TRIGGER trg_updated_evidences
  BEFORE UPDATE ON public.evidences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN public.evidences.updated_at IS
  'Cursor de sincronización (pull incremental del motor offline). Añadido en 0048.';
```

- [ ] **Step 3: Aplicar la migración**

Aplicar contra Supabase (SQL editor o el flujo de migraciones del repo). Verificar:

```sql
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'evidences' AND column_name = 'updated_at';
```
Expected: una fila `updated_at`.

```sql
SELECT * FROM public.evidences WHERE updated_at > '1970-01-01' LIMIT 1;
```
Expected: ejecuta **sin error 400** (antes fallaba con "column evidences.updated_at does not exist").

- [ ] **Step 4: Commit**

```bash
git add database/migrations/0048_evidences_updated_at.sql
git commit -m "fix(sync): evidences.updated_at + trigger (resuelve evidences 400 en pull)"
```

---

## Task 2: Aislar fallo de pull por entidad en el motor (defensa en profundidad)

**Files:**
- Modify: `app/src/lib/sync/engine.ts` (función `pullChanges`, ~líneas 156-197)
- Test: `app/src/lib/sync/engine.test.ts` (crear si no existe; si existe, agregar el caso)

**Interfaces:**
- Consumes: `pullChanges(supabase)` interno.
- Produces: si una entidad falla en el pull (p. ej. una columna ausente), `pullChanges` registra el error y **continúa con las demás entidades** en vez de cortar silenciosamente, y `runSyncInternal` lo expone en `result.errors`. La migración 0048 ya elimina la causa; esto evita que un futuro desajuste de esquema vuelva a romper el sync sin dejar rastro.

- [ ] **Step 1: Escribir el test que falla**

Crear/editar `app/src/lib/sync/engine.test.ts`. Mock de un cliente Supabase donde la entidad `evidences` devuelve `{ error }` y `tests` devuelve datos. Verificar que `tests` se persiste y que el error de `evidences` queda reportado:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { localDB } from "@/lib/db/local";

// Helper: cliente Supabase mockeado por entidad.
function makeClient(perEntity: Record<string, { data?: unknown[]; error?: unknown }>) {
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    from(entity: string) {
      const res = perEntity[entity] ?? { data: [] };
      const builder: Record<string, unknown> = {};
      for (const m of ["select", "gt", "order", "range", "upsert", "update", "eq"]) {
        builder[m] = () => builder;
      }
      // range() es el último eslabón del pull: resuelve la promesa
      builder.range = async () => res;
      builder.then = undefined;
      return builder as never;
    },
  } as never;
}

describe("pullChanges resiliencia por entidad", () => {
  beforeEach(async () => {
    await localDB.tests.clear();
    await localDB.syncCursors.clear();
  });

  it("persiste entidades sanas aunque una entidad devuelva error", async () => {
    const { pullChangesForTest } = await import("@/lib/sync/engine");
    const client = makeClient({
      tests: { data: [{ id: "t1", updated_at: "2026-06-20T00:00:00Z" }] },
      evidences: { error: { message: "column evidences.updated_at does not exist" } },
    });
    const { pulled, errors } = await pullChangesForTest(client);
    expect(pulled).toBeGreaterThanOrEqual(1);
    expect(await localDB.tests.get("t1")).toBeTruthy();
    expect(errors.some((e) => e.includes("evidences"))).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npm test -- engine.test.ts`
Expected: FAIL — `pullChangesForTest` no existe / `errors` no se devuelve desde `pullChanges`.

- [ ] **Step 3: Implementar el cambio mínimo**

En `app/src/lib/sync/engine.ts`, modificar `pullChanges` para acumular errores por entidad y exportar un wrapper de test. Cambiar la firma de `pullChanges` a `Promise<{ pulled: number; errors: string[] }>` y, dentro del `for (const entity ...)`, envolver en try/catch y al detectar `error` empujar a `errors` y `continue` (no abortar las demás). Reemplazar el bloque actual:

```ts
async function pullChanges(
  supabase: ReturnType<typeof createClient>
): Promise<{ pulled: number; errors: string[] }> {
  let pulled = 0;
  const errors: string[] = [];

  for (const entity of SYNCABLE_ENTITIES) {
    const since = await getPullCursor(entity);
    const table = getLocalTable(entity);
    let offset = 0;
    let hasMore = true;
    let lastTimestamp = since;

    while (hasMore) {
      const { data, error } = await supabase
        .from(entity)
        .select("*")
        .gt("updated_at", since)
        .order("updated_at", { ascending: true })
        .range(offset, offset + PULL_PAGE_SIZE - 1);

      if (error) {
        const msg = (error && typeof error === "object" && "message" in error)
          ? String((error as { message: unknown }).message) : String(error);
        errors.push(`pull ${entity}: ${msg}`);
        break; // corta SOLO esta entidad; sigue con las demás
      }
      if (!data) break;

      for (const record of data) {
        await table.put({ ...record, sync_status: "synced" });
        pulled++;
        lastTimestamp = record.updated_at;
      }
      hasMore = data.length === PULL_PAGE_SIZE;
      offset += PULL_PAGE_SIZE;
      if (data.length > 0) await savePullCursor(entity, lastTimestamp);
    }
  }
  return { pulled, errors };
}

// Wrapper de test (no usar en producción).
export const pullChangesForTest = pullChanges;
```

Y en `runSyncInternal`, fusionar los errores del pull:

```ts
    const { pulled, errors: pullErrors } = await pullChanges(supabase);
    result.pulled = pulled;
    result.errors = [...result.errors, ...pullErrors];
```

- [ ] **Step 4: Ejecutar el test y verificar verde**

Run: `npm test -- engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/sync/engine.ts app/src/lib/sync/engine.test.ts
git commit -m "fix(sync): aislar fallo de pull por entidad (no abortar sync completo)"
```

---

## Task 3: Resumen inline + guardado sin navegar a `/summary`

**Files:**
- Modify: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`
- Reuse: `app/src/components/inspection/InspectionSummary.tsx` (props: `template, state, onClose, onSave, isSaving, saveError`)
- Modify: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary/page.tsx` (redirect legacy)

**Interfaces:**
- Consumes: `useSubmitInspection().submit(state, projectId, template)`, `deleteInspectionDraft`, `InspectionSummary`.
- Produces: el flujo "Revisar y Cerrar" abre el resumen **en la misma ruta** (estado `reviewing`), y guarda con `submit(...)` sin `router.push` a `/summary`. La ruta `/summary` queda como redirect al formulario (compatibilidad de enlaces viejos). Resultado: el guardado no depende de cargar otra ruta → funciona offline aunque el SW falle.

**Contexto:** Hoy `handleComplete` hace `router.push(.../summary)` y el `submit` solo existe en `summary/page.tsx`. Offline, esa navegación a una ruta no precargada falla. `InspectionSummary` ya es presentacional, así que se renderiza inline.

- [ ] **Step 1: Extender el e2e para exigir guardado sin `/summary` (test que falla)**

En `app/e2e/offline-inspection.spec.ts`, dentro del flujo offline, tras completar todas las secciones, hacer click en "Revisar y Cerrar" y afirmar que:
1. **No** hubo navegación a una URL que contenga `/summary` (la URL del formulario se mantiene).
2. Aparece el resumen inline (texto "Resumen de Inspección" o el botón de guardar del `InspectionSummary`).
3. Al guardar, vuelve a `returnTo`.

```ts
// dentro del test offline, después de completar secciones:
const urlBefore = page.url();
await page.getByRole("button", { name: /Revisar y Cerrar/i }).click();
await expect(page).toHaveURL(urlBefore); // NO navega a /summary
await expect(page.getByText(/Resumen de Inspección|Guardar Inspección/i)).toBeVisible();
```

- [ ] **Step 2: Ejecutar el e2e y verificar que falla**

Run: `npx playwright test e2e/offline-inspection.spec.ts -g "offline"`
Expected: FAIL — hoy navega a `/summary` (la URL cambia), assert de URL falla.

- [ ] **Step 3: Implementar el resumen inline en el formulario**

En `page.tsx` del formulario:

1. Importar lo necesario:
```ts
import { InspectionSummary } from "@/components/inspection/InspectionSummary";
import { useSubmitInspection } from "@/hooks/useSubmitInspection";
```
2. Estado y hook:
```ts
  const [reviewing, setReviewing] = useState(false);
  const { submit, isSubmitting, error: saveError } = useSubmitInspection();
```
3. `handleComplete` ya **no navega**, solo abre el resumen:
```ts
  const handleComplete = useCallback(() => {
    setReviewing(true);
  }, []);
```
4. Nuevo `handleSaveInline` (guarda y vuelve al plano):
```ts
  const handleSaveInline = useCallback(async () => {
    if (!state || !equipment?.project_id || !template) return;
    const result = await submit(state, equipment.project_id, template);
    if (!result) return; // error mostrado por saveError
    await deleteInspectionDraft(equipmentId, templateId).catch(() => {});
    router.push(returnTo);
  }, [state, equipment, template, submit, equipmentId, templateId, returnTo, router]);
```
5. En el render, cuando `reviewing` sea true, mostrar el resumen como overlay sobre el `<main>` (reemplazando el `DynamicFormSection`), reutilizando el header existente con un botón "Volver al formulario" que haga `setReviewing(false)`:
```tsx
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {reviewing ? (
            <InspectionSummary
              template={template}
              state={state}
              onClose={() => setReviewing(false)}
              onSave={handleSaveInline}
              isSaving={isSubmitting}
              saveError={saveError}
            />
          ) : (
            <DynamicFormSection
              section={activeSection}
              answers={state.answers}
              evidences={state.evidences}
              onAnswerChange={handleAnswerChange}
              onEvidenceAdd={handleEvidenceAdd}
              onEvidenceRemove={handleEvidenceRemove}
            />
          )}
        </main>
```
6. (Opcional UI) Cuando `reviewing`, mostrar en el header un indicador "Resumen de Inspección" y ocultar/inhabilitar la navegación de secciones del footer. Mínimo: que el botón "Revisar y Cerrar" siga visible y que exista forma de volver (`onClose`).

- [ ] **Step 4: Degradar `/summary` a redirect legacy**

Reemplazar el contenido de `summary/page.tsx` por un redirect al formulario (preserva enlaces antiguos; ya no es donde se guarda):

```tsx
"use client";
import { useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

export default function LegacySummaryRedirect() {
  const params = useParams() as { equipmentId: string; templateId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo") ?? "/";

  useEffect(() => {
    const { equipmentId, templateId } = params;
    router.replace(
      `/equipment/${equipmentId}/inspection/${templateId}?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, [params, returnTo, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-500">Redirigiendo…</p>
    </div>
  );
}
```

- [ ] **Step 5: Ejecutar el e2e y verificar verde**

Run: `npx playwright test e2e/offline-inspection.spec.ts -g "offline"`
Expected: PASS — guarda inline, sin cambiar de URL.

- [ ] **Step 6: Commit**

```bash
git add "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx" \
        "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/summary/page.tsx" \
        app/e2e/offline-inspection.spec.ts
git commit -m "feat(inspection): resumen inline; guardado sin depender de /summary"
```

---

## Task 4: Reemplazar `next-pwa` por `@serwist/next` (service worker)

**Files:**
- Modify: `app/package.json` (quitar `next-pwa`, agregar `@serwist/next` + `serwist`)
- Modify: `app/next.config.ts`
- Create: `app/src/app/sw.ts`
- Modify: `app/src/app/layout.tsx` (metadata `manifest` + registro)
- Verify: `app/public/manifest.json`

**Interfaces:**
- Produces: en build de producción se genera un service worker en `app/public/sw.js` que precachea los assets del build (app-shell) y aplica `defaultCache` (incluye RSC/next-data/estáticos). Base para el warming de rutas de la Task 5.

**Contexto:** `next-pwa@5.6.0` (peer `next>=9`, sin mantenimiento) está **desactivado** (`disable: ENABLE_PWA !== "true"`) y no genera SW. `@serwist/next` es el sucesor mantenido, pensado para App Router. El build usa `next build --webpack`.

- [ ] **Step 1: Instalar dependencias y leer la API instalada**

Run (desde `app/`):
```bash
npm rm next-pwa
npm i -D @serwist/next serwist
```
Luego **leer** `app/node_modules/@serwist/next/README.md` (y, por la nota de `AGENTS.md`, `app/node_modules/next/dist/docs/` para metadata/manifest en App Router). Confirmar el nombre exacto del wrapper (`withSerwistInit`) y opciones de la versión instalada antes de escribir config.

- [ ] **Step 2: Configurar `next.config.ts`**

Reemplazar el bloque `next-pwa` por `@serwist/next`. Mantener el workaround Avast y `images`/`experimental`:

```ts
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Workaround Avast SSL solo en dev (nunca en prod/Vercel).
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // SW activo en prod; en dev se desactiva para no interferir con HMR.
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default withSerwist(nextConfig);
```

> Si la versión instalada expone otras claves (p. ej. `cacheOnNavigation`), ajustarlas según el README leído en Step 1.

- [ ] **Step 3: Crear el service worker `src/app/sw.ts`**

```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Navegaciones (documentos HTML de rutas): NetworkFirst para servir la
    // versión cacheada cuando no hay red. La Task 5 las warmea explícitamente.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
      }),
    },
    ...defaultCache, // RSC, next-data, estáticos, imágenes (incluye Supabase si aplica)
  ],
});

serwist.addEventListeners();
```

- [ ] **Step 4: Enlazar el manifest y registrar el SW en `layout.tsx`**

Según el README de `@serwist/next` (Step 1): agregar el `manifest` a la metadata del root layout y, si la versión NO auto-registra, registrar el SW. Patrón típico con metadata API de App Router:

```ts
// en app/src/app/layout.tsx
export const metadata = {
  // ...lo existente
  manifest: "/manifest.json",
};
```

Verificar `app/public/manifest.json`: debe tener `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `icons`. Ajustar si falta alguno.

- [ ] **Step 5: Build de producción y verificar que se genera el SW**

Run (desde `app/`):
```bash
npm run build
ls public/sw.js
```
Expected: `public/sw.js` existe y el build termina sin error. (Si el build falla por la API de Serwist, corregir según el README; no continuar hasta que el SW se genere.)

- [ ] **Step 6: Verificación manual de registro**

Run: `npm start` y abrir la app. En DevTools → Application → Service Workers: el SW figura **activated**. Recargar y confirmar en la pestaña Network que assets se sirven desde `(ServiceWorker)`.

- [ ] **Step 7: Commit**

```bash
git add app/package.json app/package-lock.json app/next.config.ts \
        app/src/app/sw.ts app/src/app/layout.tsx app/public/manifest.json
git commit -m "feat(offline): service worker con @serwist/next (reemplaza next-pwa)"
```

---

## Task 5: Warmear rutas de inspección en `prepareProjectOffline`

**Files:**
- Modify: `app/src/lib/sync/prefetch.ts`
- Test: `app/src/lib/sync/prefetch.test.ts`

**Interfaces:**
- Consumes: `prepareProjectOffline(projectId, onProgress)` (existente), los `equipment` + `equipmentTemplateRefs` que ya descarga, `caches` (Cache Storage API), `fetch`.
- Produces: además de datos, deja en el Cache Storage (`cacheName: "pages"`, el mismo que sirve el SW en navegaciones) el **documento HTML y el payload RSC** de cada ruta `/equipment/{equipmentId}/inspection/{templateId}` de los equipos preparados. Garantiza que abrir una inspección **nunca visitada** funcione offline. Best-effort (errores no abortan).

**Contexto:** El SW precachea el build, pero los documentos de rutas dinámicas no existen como estáticos. La decisión de diseño es "preparación explícita": al preparar el proyecto (con red) se warmean las rutas concretas que el inspector usará. El nombre de cache `"pages"` debe coincidir con el `runtimeCaching` del SW (Task 4, Step 3).

- [ ] **Step 1: Escribir el test que falla**

En `app/src/lib/sync/prefetch.test.ts`, agregar un caso que verifique el warming: con `caches`/`fetch` mockeados y refs de plantillas para un equipo, `prepareProjectOffline` debe llamar `cache.put` para la URL de la ruta de inspección.

```ts
it("warmea el documento de ruta de inspección por equipo+plantilla", async () => {
  const put = vi.fn(async () => {});
  // @ts-expect-error mock global
  globalThis.caches = { open: async () => ({ put, match: async () => undefined }) };
  const fetchMock = vi.fn(async () => new Response("<html></html>", {
    status: 200, headers: { "content-type": "text/html" },
  }));
  // @ts-expect-error mock global
  globalThis.fetch = fetchMock;

  // ...armar supabase mock con 1 equipo y 1 templateId (igual que tests existentes)...
  await prepareProjectOffline("proj-1");

  const warmedUrls = put.mock.calls.map((c) => String(c[0]?.url ?? c[0]));
  expect(warmedUrls.some((u) => u.includes("/inspection/"))).toBe(true);
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npm test -- prefetch.test.ts`
Expected: FAIL — `prepareProjectOffline` no warmea rutas todavía.

- [ ] **Step 3: Implementar el warming**

En `prefetch.ts`, agregar un helper y llamarlo al final por cada `(equipmentId, templateId)` que se preparó:

```ts
const PAGES_CACHE = "pages"; // debe coincidir con el SW (Task 4)

async function warmInspectionRoute(equipmentId: string, templateId: string): Promise<void> {
  if (typeof caches === "undefined" || typeof fetch === "undefined") return;
  const url = `/equipment/${equipmentId}/inspection/${templateId}?returnTo=/`;
  try {
    const cache = await caches.open(PAGES_CACHE);
    // Documento HTML de la navegación
    const docRes = await fetch(url, { headers: { "x-warm": "1" } });
    if (docRes.ok) await cache.put(url, docRes.clone());
    // Payload RSC (Next App Router): mismo path con header RSC
    const rscRes = await fetch(url, { headers: { RSC: "1" } });
    if (rscRes.ok) await cache.put(new Request(url, { headers: { RSC: "1" } }), rscRes.clone());
  } catch {
    // best-effort: no abortar la preparación
  }
}
```

Y en el cuerpo de `prepareProjectOffline`, después de guardar `equipmentTemplateRefs`/`offlineTemplates`, recorrer cada equipo con sus refs y warmear cada plantilla (idempotente, best-effort, sumando al `onProgress` si corresponde). No incrementar `errors` por fallos de warming (es secundario).

> Nota: el header exacto para forzar la respuesta RSC puede variar según la versión de Next 16 — confirmar en `app/node_modules/next/dist/docs/` (nota de `AGENTS.md`). Si el RSC no se puede warmear de forma fiable, el documento HTML + el precache de assets del SW alcanzan para que el cliente hidrate y lea de Dexie; el RSC es optimización.

- [ ] **Step 4: Ejecutar el test y verificar verde**

Run: `npm test -- prefetch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/sync/prefetch.ts app/src/lib/sync/prefetch.test.ts
git commit -m "feat(offline): warmear rutas de inspección al preparar proyecto"
```

---

## Task 6: E2E offline completo (ruta nunca visitada → guardar → sync)

**Files:**
- Modify: `app/e2e/offline-inspection.spec.ts`
- Reference: `playwright.config.ts` (asegurar que el e2e corre contra el build con SW, no `dev`)

**Interfaces:**
- Consumes: todo lo anterior (migración 0048, resumen inline, SW, warming).
- Produces: una prueba e2e que demuestra el flujo offline de punta a punta sin `evidences 400` y sin depender de `/summary`.

**Contexto:** El SW solo existe en build de producción (`disable` en dev, Task 4). El e2e debe correr contra `npm run build && npm start` (o el webServer de producción en `playwright.config.ts`), no contra `next dev`.

- [ ] **Step 1: Asegurar webServer de producción para el e2e**

En `playwright.config.ts`, configurar (o agregar un proyecto) `webServer` con `command: "npm run build && npm start"` y `url` del puerto de `start`, para que el SW esté activo durante el e2e offline. Verificar el `baseURL`.

- [ ] **Step 2: Escribir/extender el test offline completo**

En `offline-inspection.spec.ts`, el flujo:
1. Online: login + `prepareProjectOffline` del proyecto (vía UI "Preparar para offline" en settings) → esperar a que termine.
2. `await context.setOffline(true)`.
3. Navegar **directo** a una inspección **no visitada** de un equipo preparado (`/equipment/{id}/inspection/{templateId}`) y afirmar que **renderiza** (servida por el SW + Dexie), no el error de navegación del browser.
4. Llenar las secciones requeridas + agregar una foto (input file).
5. Click "Revisar y Cerrar" → afirmar resumen inline (URL no cambia a `/summary`).
6. Guardar → vuelve a `returnTo`.
7. `await context.setOffline(false)` → esperar auto-sync (badge a "sincronizado").
8. Verificar contra Supabase (o vía la UI/IndexedDB) que existe el `tests` y su `evidences` con `storage_url`, `sync_status === "synced"`, y que **no** apareció `evidences 400` en consola/red durante el ciclo.

```ts
const consoleErrors: string[] = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
// ...al final:
expect(consoleErrors.join("\n")).not.toMatch(/evidences.*400|column evidences\.updated_at/i);
```

- [ ] **Step 3: Ejecutar el e2e completo**

Run (desde `app/`): `npx playwright test e2e/offline-inspection.spec.ts`
Expected: PASS de punta a punta. (Primera corrida compila el build; puede tardar.)

- [ ] **Step 4: Commit**

```bash
git add app/e2e/offline-inspection.spec.ts app/playwright.config.ts
git commit -m "test(e2e): flujo offline completo con SW, ruta no visitada y sync sin 400"
```

---

## Task 7: Validación funcional manual + limpieza

**Files:**
- Modify: `docs/superpowers/specs/2026-06-19-offline-inspections-design.md` (nota de cierre: limitaciones resueltas)
- Verify: ausencia de referencias residuales a `next-pwa`

- [ ] **Step 1: Checklist de validación manual (build de producción)**

Run: `npm run build && npm start`. Con un proyecto real:
1. "Preparar para offline" → barra de progreso llega a 100%, conteo cacheado > 0.
2. Cortar la red (DevTools → Network → Offline).
3. Abrir una inspección **no abierta antes** de un equipo preparado → carga.
4. Llenar + foto → "Revisar y Cerrar" → resumen inline → Guardar → vuelve al plano; badge muestra pendientes.
5. Restaurar red → auto-sync → badge "sincronizado"; **sin** `evidences 400` en consola.
6. En Supabase: el `tests` y sus `evidences` (con `storage_url`) están presentes.

- [ ] **Step 2: Verificar que no quedan referencias a `next-pwa`**

Run (desde la raíz): `grep -rin "next-pwa" app/ --include=*.ts --include=*.json | grep -v node_modules`
Expected: sin resultados (salvo, si acaso, el changelog/commit).

- [ ] **Step 3: Anotar cierre en el design doc**

En `2026-06-19-offline-inspections-design.md`, agregar una sección "Cierre 2026-06-20 — Offline Usable" listando las tres limitaciones resueltas (guardado/`/summary`, `evidences 400`/migración 0048, navegación/SW `@serwist/next` + warming).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-06-19-offline-inspections-design.md
git commit -m "docs(offline): cierre Offline Usable — limitaciones resueltas"
```

---

## Verificación (Definition of Done de la mini-épica)

- [ ] `npm test` (Vitest) verde, incluyendo los nuevos tests de `engine` y `prefetch`.
- [ ] `npx playwright test e2e/offline-inspection.spec.ts` verde contra el build de producción (SW activo).
- [ ] Migración 0048 aplicada: `evidences` tiene `updated_at`; un `select * from evidences where updated_at > '1970-01-01'` no devuelve 400; un ciclo de sync completo **no** reporta `evidences 400`.
- [ ] Manual: con red apagada, abrir una inspección nunca visitada de un equipo preparado, llenarla, agregar foto, guardar (resumen inline, sin `/summary`), reconectar y ver que sincroniza con evidencias subidas.
- [ ] `grep -rin "next-pwa"` sin resultados en `app/` (fuera de node_modules).

## Fuera de alcance

- Mechanical Completion / Fase A (rama `feat/mechanical-completion-state-machine`) — se inicia **después** de cerrar esta mini-épica.
- Resolución de conflictos manual (sigue LWW).
- Warming de RSC garantizado si la versión de Next no lo permite de forma fiable (el HTML + assets precacheados son suficientes; el RSC es optimización).
