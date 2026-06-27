# Persistencia por sección + Corrección interina + Tema — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la inspección sea una fila viva en `tests` (borrador desde el inicio, guardada por sección y sincronizada multidispositivo), con corrección interina por sobrescritura para admin/director, y que el formulario y la vista de revisión respeten el tema claro/oscuro.

**Architecture:** Enfoque 1 "borrador-como-fila-en-BD". Se reutiliza el outbox/sync existente (`enqueueSync` + `engine.ts`, que ya soporta `UPDATE` parcial vía `update().eq("id",…)`). La lógica pura de recálculo/gating vive en un módulo testeable; el formulario orquesta INSERT al iniciar, UPDATE por sección, UPDATE al cerrar y UPDATE al corregir. Un trigger de BD impide que no-admin edite inspecciones ya enviadas.

**Tech Stack:** Next.js App Router (webpack), React, TypeScript, Zustand, Dexie (IndexedDB), Supabase (PostgreSQL + RLS), Vitest, Tailwind (dark mode por clase `.dark`).

**Spec:** `docs/superpowers/specs/2026-06-26-precom-persistencia-correccion-tema-design.md`

## Global Constraints

- **No modificar** `app/src/lib/sync/engine.ts` (solo usar su API `enqueueSync`).
- **No cambiar** el enum `test_status` (usar `borrador` y `ejecutado` existentes).
- Excluir SIEMPRE de edición: campos tipo `firma`, y las claves `fecha`/`inspector` (fechas e inspector).
- `executed_by`/`created_by` referencian `public.users(id)` (no `auth.users`); tomar de `useAuthStore.getState().user.id`.
- Corrección de inspección `ejecutado`: **solo admin/director** (UI + trigger BD).
- Auto-punch y FSM se disparan **solo al cerrar** (status → `ejecutado`), no al iniciar el borrador.
- Conflicto multi-dispositivo: **last-write-wins** (interino).
- Migración numerada **0058** (0057 es la última en repo).
- Roles admin/director: `useAuthStore().isRole('admin','director')`.

---

## Task 1: Lógica pura de corrección/recálculo

**Files:**
- Create: `app/src/lib/inspection/correction.ts`
- Test: `app/src/lib/inspection/__tests__/correction.test.ts`

**Interfaces:**
- Produces:
  - `recomputeResultSummary(answers: Record<string, unknown>): "cumple" | "no_cumple"`
  - `isEditableField(field: { key: string; type: string }): boolean`
  - `buildSectionPatch(testId: string, data: Record<string, unknown>, now: string): { id: string; data: Record<string, unknown>; updated_at: string }`

- [ ] **Step 1: Escribir el test que falla**

```typescript
// app/src/lib/inspection/__tests__/correction.test.ts
import { describe, it, expect } from "vitest";
import { recomputeResultSummary, isEditableField, buildSectionPatch } from "@/lib/inspection/correction";

describe("recomputeResultSummary", () => {
  it("devuelve no_cumple si hay algún valor de falla", () => {
    expect(recomputeResultSummary({ a: "OK", b: "NO" })).toBe("no_cumple");
    expect(recomputeResultSummary({ a: "FALLA" })).toBe("no_cumple");
    expect(recomputeResultSummary({ a: "RECHAZADO" })).toBe("no_cumple");
  });
  it("devuelve cumple si no hay fallas", () => {
    expect(recomputeResultSummary({ a: "OK", b: "SI", c: 12 })).toBe("cumple");
    expect(recomputeResultSummary({})).toBe("cumple");
  });
});

describe("isEditableField", () => {
  it("excluye firmas, fecha e inspector", () => {
    expect(isEditableField({ key: "x", type: "firma" })).toBe(false);
    expect(isEditableField({ key: "fecha_inspeccion", type: "fecha" })).toBe(false);
    expect(isEditableField({ key: "inspector", type: "texto" })).toBe(false);
  });
  it("permite campos normales", () => {
    expect(isEditableField({ key: "torque", type: "numero" })).toBe(true);
    expect(isEditableField({ key: "estado_visual", type: "select" })).toBe(true);
  });
});

describe("buildSectionPatch", () => {
  it("arma el patch mínimo de UPDATE", () => {
    const p = buildSectionPatch("t1", { a: 1 }, "2026-06-26T00:00:00.000Z");
    expect(p).toEqual({ id: "t1", data: { a: 1 }, updated_at: "2026-06-26T00:00:00.000Z" });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd app && npx vitest run src/lib/inspection/__tests__/correction.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar el módulo**

```typescript
// app/src/lib/inspection/correction.ts
// Lógica pura para persistencia por sección y corrección interina. Sin React.
import { FAIL_VALUES } from "@/lib/inspection/failValues";

/** Tipos de campo que NUNCA se editan en corrección. */
const NON_EDITABLE_TYPES = new Set(["firma"]);
/** Sufijos/claves de campo excluidas (fechas e inspector). */
const NON_EDITABLE_KEY_RE = /(^|_)(fecha|inspector|firma)(_|$)/i;

export function recomputeResultSummary(
  answers: Record<string, unknown>,
): "cumple" | "no_cumple" {
  const hasFail = Object.values(answers).some((v) => FAIL_VALUES.has(String(v)));
  return hasFail ? "no_cumple" : "cumple";
}

export function isEditableField(field: { key: string; type: string }): boolean {
  if (NON_EDITABLE_TYPES.has(field.type)) return false;
  if (NON_EDITABLE_KEY_RE.test(field.key)) return false;
  return true;
}

export function buildSectionPatch(
  testId: string,
  data: Record<string, unknown>,
  now: string,
): { id: string; data: Record<string, unknown>; updated_at: string } {
  return { id: testId, data, updated_at: now };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd app && npx vitest run src/lib/inspection/__tests__/correction.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Verificar tipos**

Run: `cd app && npx tsc --noEmit` → 0 errores.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/inspection/correction.ts app/src/lib/inspection/__tests__/correction.test.ts
git commit -m "feat(inspection): lógica pura recálculo resultado + gating de campos editables"
```

---

## Task 2: Persistencia offline — startDraft / saveSection / close

**Files:**
- Modify: `app/src/lib/sync/submitInspection.ts`
- Test: `app/src/lib/sync/__tests__/persistInspection.test.ts` (crear)

**Interfaces:**
- Consumes: `recomputeResultSummary` (Task 1), `enqueueSync`, `localDB`, `deriveAutoPunches` (existente).
- Produces (en `submitInspection.ts`):
  - `buildDraftTestRow(params: SubmitParams, deps: Pick<SubmitDeps,"uuid"|"now"|"computeTemplateHash"|"appVersion"|"schemaVersion"|"getMaxRevision">): Promise<TestRow>` — fila `status:'borrador'`.
  - `startDraftOffline(params, deps): Promise<{ testId: string }>` — INSERT borrador + enqueue INSERT.
  - `saveSectionOffline(testId: string, data: Record<string, unknown>, deps: Pick<SubmitDeps,"db"|"enqueueSync"|"now"|"isOnline"|"runSync">): Promise<void>` — UPDATE local + enqueue UPDATE.
  - `closeInspectionOffline(params, deps): Promise<{ testId: string }>` — UPDATE a `ejecutado` + evidencias + auto-punch + FSM. (Refactor de `submitInspectionOffline`.)

**Nota:** `TestRow` es el tipo del objeto actual construido en `submitInspectionOffline` (líneas 54-84). Se extrae como interface exportada.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// app/src/lib/sync/__tests__/persistInspection.test.ts
import { describe, it, expect, vi } from "vitest";
import { startDraftOffline, saveSectionOffline } from "@/lib/sync/submitInspection";

function makeDeps(overrides = {}) {
  const tests: any[] = [];
  const queue: any[] = [];
  return {
    db: {
      tests: {
        add: async (r: any) => { tests.push(r); },
        update: async (id: string, patch: any) => {
          const t = tests.find((x) => x.id === id); Object.assign(t, patch);
        },
        get: async (id: string) => tests.find((x) => x.id === id),
      },
    } as any,
    enqueueSync: async (entity: string, id: string, op: string, payload: any) => { queue.push({ entity, id, op, payload }); },
    uuid: () => "test-1",
    now: () => "2026-06-26T00:00:00.000Z",
    computeTemplateHash: async () => "hash",
    getMaxRevision: async () => 0,
    isOnline: () => false,
    runSync: async () => {},
    appVersion: "x", schemaVersion: 1,
    _tests: tests, _queue: queue,
    ...overrides,
  };
}

const template = { id: "tpl1", code: "P_X", name: "X", discipline: "mec", revision: "1", sections: [] } as any;

describe("startDraftOffline", () => {
  it("crea fila borrador y encola INSERT", async () => {
    const deps = makeDeps();
    const { testId } = await startDraftOffline({ state: { equipmentId: "e1", templateId: "tpl1", answers: {} } as any, projectId: "p1", userId: "u1", template }, deps as any);
    expect(testId).toBe("test-1");
    expect(deps._tests[0].status).toBe("borrador");
    expect(deps._queue[0]).toMatchObject({ entity: "tests", op: "INSERT" });
  });
});

describe("saveSectionOffline", () => {
  it("hace UPDATE local y encola UPDATE parcial", async () => {
    const deps = makeDeps();
    deps._tests.push({ id: "test-1", data: {} });
    await saveSectionOffline("test-1", { torque: 12 }, deps as any);
    expect(deps._tests[0].data).toEqual({ torque: 12 });
    expect(deps._queue[0]).toMatchObject({ entity: "tests", op: "UPDATE", payload: { id: "test-1", data: { torque: 12 } } });
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd app && npx vitest run src/lib/sync/__tests__/persistInspection.test.ts`
Expected: FAIL (`startDraftOffline` no exportada).

- [ ] **Step 3: Refactor de `submitInspection.ts`**

Extraer la construcción de la fila y separar las tres operaciones. Agregar al inicio el import:

```typescript
import { recomputeResultSummary } from "@/lib/inspection/correction";
```

Reemplazar el cuerpo del archivo (manteniendo `SubmitParams`/`SubmitDeps`) por estas funciones; `closeInspectionOffline` conserva el comportamiento actual de `submitInspectionOffline` (evidencias + auto-punch + FSM) pero hace **UPDATE** del test existente en vez de INSERT, y crea el test si aún no existe (compatibilidad):

```typescript
export interface TestRow {
  id: string; project_id: string; equipment_id: string; type: string;
  code: string; status: "borrador" | "ejecutado"; executed_by?: string; executed_at?: string;
  data: Record<string, unknown>; result_summary?: "cumple" | "no_cumple";
  created_by: string; created_at: string; updated_at: string; version: number; revision: number;
  sync_status: "pending"; last_sync_error?: string;
  template_id: string; template_revision?: string; template_hash: string; template_snapshot: unknown;
}

export async function buildDraftTestRow(
  params: SubmitParams,
  deps: Pick<SubmitDeps, "uuid" | "now" | "computeTemplateHash" | "appVersion" | "schemaVersion" | "getMaxRevision">,
): Promise<TestRow> {
  const { state, projectId, userId, template } = params;
  const testId = deps.uuid();
  const ts = deps.now();
  const revision = (await deps.getMaxRevision(state.equipmentId, template.id)) + 1;
  const template_hash = await deps.computeTemplateHash(template);
  const definition = { id: template.id, code: template.code, name: template.name, discipline: template.discipline, sections: template.sections };
  return {
    id: testId, project_id: projectId, equipment_id: state.equipmentId, type: "precomisionamiento",
    code: `PRE-${template.code}-${ts.slice(0, 10)}`, status: "borrador",
    data: state.answers ?? {}, created_by: userId, created_at: ts, updated_at: ts,
    version: 1, revision, sync_status: "pending", template_id: template.id,
    template_revision: template.revision, template_hash,
    template_snapshot: { template: definition, meta: { template_source: template._source ?? "online", app_version: deps.appVersion, schema_version: deps.schemaVersion, captured_at: ts } },
  };
}

export async function startDraftOffline(params: SubmitParams, deps: SubmitDeps): Promise<{ testId: string }> {
  const row = await buildDraftTestRow(params, deps);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await deps.db.tests.add(row as any);
  await deps.enqueueSync("tests", row.id, "INSERT", row);
  if (deps.isOnline()) void deps.runSync();
  return { testId: row.id };
}

export async function saveSectionOffline(
  testId: string,
  data: Record<string, unknown>,
  deps: Pick<SubmitDeps, "db" | "enqueueSync" | "now" | "isOnline" | "runSync">,
): Promise<void> {
  const ts = deps.now();
  const patch = { data, updated_at: ts, sync_status: "pending" as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await deps.db.tests.update(testId, patch as any);
  await deps.enqueueSync("tests", testId, "UPDATE", { id: testId, data, updated_at: ts });
  if (deps.isOnline()) void deps.runSync();
}
```

Y renombrar la función existente `submitInspectionOffline` a `closeInspectionOffline`, cambiando el bloque que arma/inserta el `test` (líneas 54-88 originales) por: **asegurar la fila** (si no existe, crearla vía `buildDraftTestRow`) y luego hacer UPDATE a `ejecutado`:

```typescript
export async function closeInspectionOffline(params: SubmitParams, deps: SubmitDeps): Promise<{ testId: string }> {
  const { state, projectId, userId, template } = params;
  const { db } = deps;
  const ts = deps.now();

  // Asegurar fila (borrador) — soporta cerrar sin haber llamado startDraft antes.
  let existing = (await db.tests
    .filter((r: any) => r.equipment_id === state.equipmentId && r.template_id === template.id && r.status === "borrador")
    .first?.()) ?? null;
  if (!existing) {
    const row = await buildDraftTestRow(params, deps);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.tests.add(row as any);
    await deps.enqueueSync("tests", row.id, "INSERT", row);
    existing = row;
  }
  const testId = existing.id;

  const result_summary = recomputeResultSummary(state.answers);
  const closePatch = { status: "ejecutado" as const, data: state.answers, result_summary, executed_by: userId, executed_at: ts, updated_at: ts, sync_status: "pending" as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.tests.update(testId, closePatch as any);
  await deps.enqueueSync("tests", testId, "UPDATE", { id: testId, ...closePatch });

  // ── Evidencias / auto-punch / FSM: idénticos a la versión previa ──
  // (mantener exactamente el bloque de evidencias, deriveAutoPunches y transiciones
  //  FSM que estaba en submitInspectionOffline, usando este `testId`.)

  await deps.deleteInspectionDraft(state.equipmentId, template.id);
  if (deps.isOnline()) void deps.runSync();
  return { testId };
}

// Compat: mantener el nombre anterior como alias.
export const submitInspectionOffline = closeInspectionOffline;
```

> Al copiar el bloque de evidencias/punch/FSM, eliminar la construcción del `const test = {...}` y su `db.tests.add`/`enqueueSync INSERT` (ya hechos arriba), y eliminar el `const testId = deps.uuid()` inicial.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `cd app && npx vitest run src/lib/sync/__tests__/persistInspection.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Regresión de sync existente**

Run: `cd app && npx vitest run src/lib/sync/__tests__/engine.test.ts`
Expected: PASS (sin cambios).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/sync/submitInspection.ts app/src/lib/sync/__tests__/persistInspection.test.ts
git commit -m "feat(sync): startDraft/saveSection/close para inspección persistente (Enfoque 1)"
```

---

## Task 3: Hook useSubmitInspection — exponer start/save/close

**Files:**
- Modify: `app/src/hooks/useSubmitInspection.ts`

**Interfaces:**
- Produces (retorno del hook): `{ startDraft, saveSection, close, isSubmitting, error }` con:
  - `startDraft(state, projectId, template): Promise<{testId:string}|null>`
  - `saveSection(testId, data): Promise<void>`
  - `close(state, projectId, template): Promise<{testId:string}|null>` (era `submit`)

- [ ] **Step 1: Implementar**

Extraer la construcción del objeto `deps` a una función local `buildDeps()` (idéntica al objeto actual de líneas 35-55), y exponer las tres operaciones reusándola:

```typescript
import { startDraftOffline, saveSectionOffline, closeInspectionOffline } from "@/lib/sync/submitInspection";
// ...
function buildDeps() {
  return { db: localDB, enqueueSync, saveBlobLocally, deleteInspectionDraft, computeTemplateHash,
    fetchBlob: async (url: string) => (await fetch(url)).blob(), runSync, uuid: uuidv4,
    now: () => new Date().toISOString(),
    getMaxRevision: async (equipmentId: string, templateId: string) => {
      const rows = await localDB.tests.filter((r) => (r as any).equipment_id === equipmentId && (r as any).template_id === templateId).toArray();
      return rows.reduce((m, r) => Math.max(m, (r as any).revision ?? 1), 0);
    },
    isOnline: () => typeof navigator === "undefined" ? true : navigator.onLine,
    appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION,
    nextState: (from: string, event: string) => nextState(from as never, event as never, { hasOpenPunch: false, approvalsComplete: false, everInspected: true }),
    enqueueTransition,
  };
}

const startDraft = async (state, projectId, template) => {
  const appUser = useAuthStore.getState().user;
  if (!appUser?.id) { setError("Sesión expirada"); return null; }
  return startDraftOffline({ state, projectId, userId: appUser.id, template }, buildDeps() as any);
};
const saveSection = (testId, data) => saveSectionOffline(testId, data, buildDeps() as any);
const close = async (state, projectId, template) => { /* igual que el `submit` actual pero llamando closeInspectionOffline */ };
```

Mantener `submit` como alias de `close` para no romper llamadas existentes.

- [ ] **Step 2: Verificar tipos**

Run: `cd app && npx tsc --noEmit` → 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useSubmitInspection.ts
git commit -m "feat(inspection): hook expone startDraft/saveSection/close"
```

---

## Task 4: Formulario — crear borrador al iniciar + autosave por sección a BD + precarga desde BD

**Files:**
- Modify: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`
- Modify: `app/src/hooks/useInspectionData.ts`

**Interfaces:**
- Consumes: `startDraft`, `saveSection`, `close` (Task 3).
- Produces: el form mantiene `state.testId` y persiste por sección en la BD.

- [ ] **Step 1: Cargar `data` desde la fila `tests` existente**

En `useInspectionData.ts`, agregar un fetch que, dado `(equipmentId, templateId)`, devuelva la última fila `tests` (rev desc) con su `id`, `status`, `data`, `template_snapshot`. Online: Supabase; offline: `localDB.tests`. Esto alimenta "Continuar"/"Corregir".

- [ ] **Step 2: En el formulario, asignar `testId` al iniciar**

En el `useEffect` de carga (líneas 82-99), tras `buildInitialState`, si no hay draft local ni fila `tests`, llamar `startDraft(...)` y guardar el `testId` en el estado. Si existe fila `tests`, precargar `answers` desde ella y fijar `testId`.

- [ ] **Step 3: Autosave por sección a BD**

En `handleSectionSelect` y `handleNext` (que ya sincronizan `form_pct`), añadir `if (state.testId) saveSection(state.testId, state.answers)`. Así cada cambio de sección persiste a BD por el outbox.

- [ ] **Step 4: Cerrar usa el `testId` existente**

`handleSaveInline` llama `close(state, project_id, template)` (que ya resuelve el borrador existente).

- [ ] **Step 5: Verificación manual**

1. Iniciar inspección en un equipo de prueba → en Supabase aparece fila `tests status=borrador`.
2. Completar una sección, recargar (F5) → el avance persiste.
3. Abrir en otro navegador/dispositivo (mismo usuario) → "Continuar" muestra el avance.
4. Cerrar → status pasa a `ejecutado`.

- [ ] **Step 6: tsc + commit**

```bash
cd app && npx tsc --noEmit
git add "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx" app/src/hooks/useInspectionData.ts
git commit -m "feat(inspection): borrador en BD al iniciar + autosave por sección + precarga"
```

---

## Task 5: Botón por estado en el panel del equipo

**Files:**
- Modify: `app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx`

**Interfaces:**
- Consumes: `useEquipmentInspections(equipmentId)` (existe, EPIC-003) + `useAuthStore().isRole`.

- [ ] **Step 1: Resolver estado de la última inspección por plantilla**

Para cada plantilla listada, mirar si hay una fila `tests` de ese `(equipment, template)`:
- sin fila → botón **"Iniciar"** (abre `/inspection/<tpl>`).
- `borrador` → **"Continuar"** (abre `/inspection/<tpl>`).
- `ejecutado` + no admin/director → **"Ver inspección"** (abre `/equipment/<id>/review/<testId>`).
- `ejecutado` + admin/director → **"Corregir"** (abre `/inspection/<tpl>?correct=<testId>`).

- [ ] **Step 2: Verificación manual**

B1 (ejecutado) como admin → "Corregir"; como técnico → "Ver inspección". Equipo sin inspección → "Iniciar".

- [ ] **Step 3: tsc + commit**

```bash
cd app && npx tsc --noEmit
git add "app/src/components/plant-map/panel/FloatingEquipmentPanel.tsx"
git commit -m "feat(plant-map): botón por estado (Iniciar/Continuar/Ver/Corregir)"
```

---

## Task 6: Modo corrección en el formulario (admin/director)

**Files:**
- Modify: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`

**Interfaces:**
- Consumes: `correction.ts` (Task 1), `close`/`saveSection` (Task 3), `useAuthStore().isRole`.

- [ ] **Step 1: Detectar modo corrección**

Leer `searchParams.get("correct")`. Si presente y `isRole('admin','director')`: cargar `answers` desde la fila `tests` de ese `testId`, marcar `correctMode=true`, fijar `state.testId=correct`.

- [ ] **Step 2: Gating de campos en corrección**

En `DynamicFormSection` (o el render de campos), cuando `correctMode`, deshabilitar los campos donde `!isEditableField(field)` (firmas/fechas/inspector).

- [ ] **Step 3: Guardar corrección (sobrescribe)**

Botón "Guardar corrección": `UPDATE` del mismo `testId` con `data` + `result_summary = recomputeResultSummary(answers)` vía `saveSection` + un patch de `result_summary`. (Reusar `close` con un flag que NO re-dispare auto-punch/FSM, o un `correctInspection` que solo actualice `data`+`result_summary`+`updated_at`.) No tocar `executed_by`/`executed_at`.

- [ ] **Step 4: Verificación manual**

Como admin, abrir B1 con `?correct=<testId>`, cambiar un valor, guardar → en Supabase la misma fila cambia `data`/`result_summary` (mismo `id`, mismo `executed_at`).

- [ ] **Step 5: tsc + commit**

```bash
cd app && npx tsc --noEmit
git add "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx"
git commit -m "feat(inspection): modo corrección admin/director (sobrescribe, recalcula resultado)"
```

---

## Task 7: Migración 0058 — trigger guard de corrección

**Files:**
- Create: `database/migrations/0058_guard_correccion.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- ============================================================
-- 0058 — Guard de corrección: solo admin/director editan data/result
--        de inspecciones ya enviadas (status >= 'ejecutado').
-- Idempotente (CREATE OR REPLACE).
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_inspection_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  -- Solo nos importa cuando la fila YA estaba enviada y cambian data/result.
  IF OLD.status <> 'borrador'
     AND (NEW.data IS DISTINCT FROM OLD.data
          OR NEW.result_summary IS DISTINCT FROM OLD.result_summary) THEN
    SELECT app_user_role() INTO v_role;
    IF NOT (public.app_is_admin() OR v_role = 'director') THEN
      RAISE EXCEPTION 'Solo admin/director pueden corregir una inspección enviada'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_inspection_correction ON public.tests;
CREATE TRIGGER trg_guard_inspection_correction
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.guard_inspection_correction();

COMMIT;
```

- [ ] **Step 2: Aplicar en Supabase SQL Editor** (prod) y verificar que crea el trigger sin error.

- [ ] **Step 3: Verificar comportamiento**

Como técnico: `UPDATE tests SET data=... WHERE id=<ejecutado>` → debe fallar con `insufficient_privilege`. Como admin/director → OK. Edición de `borrador` por técnico → OK.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/0058_guard_correccion.sql
git commit -m "feat(db): 0058 trigger — corrección de inspección enviada solo admin/director"
```

---

## Task 8: Tema claro/oscuro en formulario + revisión

**Files:**
- Modify: `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx`
- Modify: `app/src/components/inspection/review/ReviewInspection.tsx`
- Modify (según haga falta): `DynamicFormSection.tsx`, `SectionSidebar.tsx`, `InspectionSummary.tsx`

**Interfaces:**
- Consumes: `useUIStore().theme/setTheme` (existe).

- [ ] **Step 1: Toggle en el encabezado del formulario**

En el header del formulario (línea ~234), agregar junto a "Docs" un botón Sol/Luna:
```tsx
import { Sun, Moon } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
// ...
const { theme, setTheme } = useUIStore();
<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
</button>
```

- [ ] **Step 2: Variantes de color en formulario**

Reemplazar los colores fijos `bg-slate-900/950`, `text-slate-300`, etc. del header/body/footer por variantes con `dark:` y su contraparte clara (p. ej. `bg-white dark:bg-slate-950`, `text-slate-700 dark:text-slate-300`, `border-slate-200 dark:border-slate-800`).

- [ ] **Step 3: Variantes de color en `ReviewInspection.tsx`**

Igual tratamiento al de la vista de revisión + toggle Sol/Luna en su barra de controles.

- [ ] **Step 4: Verificación manual**

Alternar tema → formulario y revisión legibles en claro y oscuro (contraste de badges de falla, fotos, firmas).

- [ ] **Step 5: build + commit**

```bash
cd app && npx tsc --noEmit && npm run build
git add "app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx" app/src/components/inspection/
git commit -m "feat(ui): formulario y vista de revisión respetan tema claro/oscuro"
```

---

## Self-Review (cobertura del spec)

- ✅ Persistencia por sección en BD → Tasks 2, 3, 4
- ✅ Multidispositivo / precarga desde BD → Task 4 (step 1-2)
- ✅ Offline (reusa outbox, no toca engine) → Task 2 (enqueueSync UPDATE)
- ✅ Botón por estado (Continuar/Ver/Corregir) → Task 5
- ✅ Corrección por sobrescritura admin/director → Tasks 6 (UI) + 7 (trigger BD)
- ✅ Excluir firmas/fechas/inspector → Task 1 (`isEditableField`) + Task 6 (step 2)
- ✅ Recálculo result_summary → Task 1 + Tasks 2/6
- ✅ Tema claro/oscuro en formulario + revisión → Task 8
- ✅ Conflicto LWW → heredado del engine (sin cambios)
- ✅ Fuera de alcance (historial/auditoría) → EPIC-004, no se implementa aquí

**Consistencia de tipos:** `startDraftOffline`/`saveSectionOffline`/`closeInspectionOffline` (Task 2) usados por el hook (Task 3) y el formulario (Tasks 4/6); `recomputeResultSummary`/`isEditableField` (Task 1) usados en Tasks 2 y 6. Sin placeholders.

**Orden de despliegue independiente:** Task 7 (trigger) puede aplicarse en cualquier momento (inerte hasta que haya correcciones). Tasks 1→2→3→4 habilitan persistencia (desplegable). Tasks 5/6 habilitan corrección. Task 8 (tema) es independiente.
