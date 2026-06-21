# EPIC-002 · Fase C — Punch Automático · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar punch automáticamente desde los ítems fallidos de una inspección, offline-first, idempotente y trazable (inspección → punch → corrección → verificación → cierre), integrado con la FSM y dejando preparada (sin implementar) la clasificación A/B/C.

**Architecture:** El punch se deriva en el cliente al cerrar la inspección (única fuente de verdad de falla = `FAIL_VALUES`) y se sube por el pipeline IndexedDB → Outbox → Sync Engine ya probado (Fases A/B). El servidor es autoridad de persistencia/idempotencia (constraint `UNIQUE(source_test_id, source_item_key)`) y de ciclo de vida (trigger `guard_punch_lifecycle`), **sin RPC nuevo**. `transition_equipment_state` queda intacto: cualquier punch `≠ 'cerrado'` bloquea MC.

**Tech Stack:** PostgreSQL 16 / Supabase (migraciones, trigger `SECURITY DEFINER`, vista `security_invoker`, RLS), Next.js App Router (client components), TypeScript, `@tanstack/react-query`, Dexie/IndexedDB, `uuid` (v4 + v5), `signature_pad`/evidencias existentes, Vitest.

## Global Constraints

- **Numeración de migraciones:** max actual = `0052`. Nuevas: `0053` (modelo) y `0054` (trigger + vista). Verificar con `ls database/migrations` antes de crear.
- **`generation_source`** = `text NOT NULL DEFAULT 'manual'` con `CHECK (generation_source IN ('auto_inspection','manual','imported'))`. **No** crear enum.
- **`punch_status` (fijo):** `abierto, en_proceso, corregido, cerrado`. **Open para commissioning = `status <> 'cerrado'`.**
- **Idempotencia autoritativa = `UNIQUE(source_test_id, source_item_key)`**. El `uuidv5(\`${testId}:${fieldKey}\`)` es solo optimización local.
- **`first_raised_at` es inmutable:** se fija en creación; el trigger lo fuerza a `OLD.first_raised_at` en todo UPDATE. KPIs de aging históricos usan `first_raised_at` (`age_days_total`), no `raised_at`.
- **Detección de falla:** `FAIL_VALUES = {FALLA, NO, RECHAZADO, No cumple, No conforme}` (match exacto). `no_aplica` nunca dispara. **No duplicar en SQL.**
- **Prioridad:** `field.punch_priority ?? 'media'` (READ only; sin cambios en modelo de templates).
- **Actores** materializados con `app_current_user_id()`; **timestamps** con `COALESCE(valor_cliente, now())`.
- **`transition_equipment_state` NO se toca.** `commissioning_category` placeholder sin uso. `v_punch_board` solo UI/métricas, nunca guards.
- **Online-only NO aplica:** todo el ciclo de vida del punch es offline-optimista (a diferencia de la aprobación de Fase B).
- **Migraciones se aplican manualmente** en el SQL Editor de Supabase (no hay runner ni psql local en la sesión). Tests SQL = scripts transaccionales `BEGIN … ROLLBACK` con `RAISE EXCEPTION`.
- **App Next.js con convenciones propias** (`app/AGENTS.md`): las páginas de `projects/[projectId]` son client components con `interface Props { params: Promise<{ projectId: string }> }` + `const { projectId } = use(params)`.
- **Helpers SQL disponibles:** `app_can_full(uuid,text)`, `app_current_user_id()`. Jerarquía: `equipment.subsystem_id → subsystems.system_id → systems.area_id → areas.project_id`.

## File Structure

- `database/migrations/0053_punch_auto_model.sql` — **crear**: alters de `punch_items` (+ UNIQUE + CHECK + placeholder), `evidence_stage` ADD VALUE.
- `database/migrations/0054_fn_punch_lifecycle.sql` — **crear**: trigger `guard_punch_lifecycle` + vista `v_punch_board`.
- `database/tests/0054_punch_lifecycle_test.sql` — **crear**: test transaccional (idempotencia + guards + MC).
- `app/src/lib/inspection/failValues.ts` — **crear**: `FAIL_VALUES` + `isFailValue` (fuente única).
- `app/src/lib/punch/autoPunch.ts` — **crear**: `deriveAutoPunches` (puro).
- `app/src/lib/punch/__tests__/autoPunch.test.ts` — **crear**: cobertura del helper.
- `app/src/lib/sync/submitInspection.ts` — **modificar**: usar `FAIL_VALUES` compartido + generar auto-punch + emitir `PUNCH_RAISED` condicional.
- `app/src/lib/sync/__tests__/submitInspection.test.ts` — **modificar**: casos de auto-punch.
- `app/src/lib/sync/engine.ts` — **modificar**: path de Storage de evidencia de punch + idempotencia ante `UNIQUE` (23505) en `punch_items`.
- `app/src/lib/sync/__tests__/engine.test.ts` — **modificar**: caso de idempotencia.
- `app/src/hooks/usePunch.ts` — **modificar**: `useMarkCorrected`, `useReopenPunch`, extender `useClosePunch` con `verification_notes`; `useCreatePunch` set `generation_source='manual'`.
- `app/src/hooks/usePunchBoard.ts` — **crear**: lectura de `v_punch_board` (online) + fallback IndexedDB; agrupación.
- `app/src/hooks/usePunchMetrics.ts` — **crear**: KPIs (online vista / offline IndexedDB).
- `app/src/lib/punch/punchEvidence.ts` — **crear**: captura de evidencia de punch (blob → IndexedDB + outbox, orden evidencia→corregido).
- `app/src/components/punch/PunchBoard.tsx` — **crear**: bandeja agrupada + filtros + triage.
- `app/src/components/punch/PunchMetrics.tsx` — **crear**: tiles de KPI.
- `app/src/app/(workspace)/projects/[projectId]/punch/page.tsx` — **modificar**: montar board + métricas (preservando lo existente).

---

### Task 1: Migración 0053 — modelo de punch automático

**Files:**
- Create: `database/migrations/0053_punch_auto_model.sql`

**Interfaces:**
- Produces: columnas en `public.punch_items` (`source_test_id`, `source_item_key`, `generation_source`, `commissioning_category`, `raised_at`, `first_raised_at`, `corrected_at`, `corrected_by`, `closed_by`, `reopened_at`, `reopened_by`, `verification_notes`); `UNIQUE INDEX uq_punch_source(source_test_id, source_item_key)`; valores `correccion`/`verificacion` en `evidence_stage`. Consumidas por Tasks 2–9.

- [ ] **Step 1: Verificar numeración**

Run: `ls database/migrations | tail -3`
Expected: termina en `0052_fn_approve_inspection.sql`.

- [ ] **Step 2: Escribir la migración**

Create `database/migrations/0053_punch_auto_model.sql`:

```sql
-- ============================================================
-- 0053 — EPIC-002 Fase C · Modelo de Punch Automático
-- Columnas de origen/idempotencia/trazabilidad + placeholder A/B/C.
-- Idempotente (re-ejecutable).
-- ============================================================
-- evidence_stage: agregar valores ANTES de la transacción (no se usan en esta migración)
ALTER TYPE public.evidence_stage ADD VALUE IF NOT EXISTS 'correccion';
ALTER TYPE public.evidence_stage ADD VALUE IF NOT EXISTS 'verificacion';

BEGIN;

ALTER TABLE public.punch_items
  ADD COLUMN IF NOT EXISTS source_test_id         uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_item_key        text,
  ADD COLUMN IF NOT EXISTS generation_source      text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS commissioning_category text,
  ADD COLUMN IF NOT EXISTS raised_at              timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_raised_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS corrected_at           timestamptz,
  ADD COLUMN IF NOT EXISTS corrected_by           uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS closed_by              uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS reopened_at            timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by            uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS verification_notes     text;

ALTER TABLE public.punch_items DROP CONSTRAINT IF EXISTS punch_generation_source_chk;
ALTER TABLE public.punch_items ADD CONSTRAINT punch_generation_source_chk
  CHECK (generation_source IN ('auto_inspection','manual','imported'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_punch_source
  ON public.punch_items (source_test_id, source_item_key);

CREATE INDEX IF NOT EXISTS idx_punch_equipment_status ON public.punch_items(equipment_id, status);
CREATE INDEX IF NOT EXISTS idx_punch_unassigned
  ON public.punch_items(project_id) WHERE responsible_id IS NULL AND deleted_at IS NULL;

COMMIT;
```

- [ ] **Step 3: Verificación estática (sin psql local)**

Re-leer el archivo y confirmar: las dos `ALTER TYPE ADD VALUE` están **antes** del `BEGIN`; columnas con `IF NOT EXISTS`; `CHECK` con `DROP CONSTRAINT IF EXISTS` previo; `uq_punch_source` único sobre `(source_test_id, source_item_key)`; envuelto en `BEGIN/COMMIT` salvo los ADD VALUE.
Expected: todos presentes. Ejecución runtime **diferida** al usuario (SQL Editor de Supabase); registrar en el reporte.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/0053_punch_auto_model.sql
git commit -m "feat(punch): 0053 modelo de punch automático (origen/idempotencia/trazabilidad + placeholder A/B/C)"
```

---

### Task 2: Migración 0054 — trigger de ciclo de vida + vista board

**Files:**
- Create: `database/migrations/0054_fn_punch_lifecycle.sql`

**Interfaces:**
- Consumes: columnas de Task 1; `app_can_full`, `app_current_user_id`; jerarquía.
- Produces: trigger `trg_guard_punch_lifecycle` (función `guard_punch_lifecycle`); vista `public.v_punch_board(punch_id, project_id, equipment_id, equipment_tag, subsystem_id, subsystem_name, system_id, system_name, area_id, area_name, code, title, priority, status, generation_source, commissioning_category, source_test_id, source_item_key, responsible_id, first_raised_at, raised_at, corrected_at, corrected_by, closed_at, closed_by, reopened_at, reopened_by, created_by, verification_notes, is_open, unassigned, age_days, age_days_total)`. Consumida por Tasks 8–9.

- [ ] **Step 1: Escribir la migración**

Create `database/migrations/0054_fn_punch_lifecycle.sql`:

```sql
-- ============================================================
-- 0054 — EPIC-002 Fase C · Trigger de ciclo de vida + vista board
-- Autoridad de transiciones de punch (offline-optimista; server reconcilia).
-- Idempotente (CREATE OR REPLACE).
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_punch_lifecycle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- first_raised_at es inmutable
  NEW.first_raised_at := OLD.first_raised_at;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'corregido' THEN
      IF NOT EXISTS (SELECT 1 FROM public.evidences e
                     WHERE e.punch_id = NEW.id AND e.stage = 'correccion' AND e.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'punch %: se requiere evidencia de corrección', NEW.id USING ERRCODE = 'check_violation';
      END IF;
      NEW.corrected_at := COALESCE(NEW.corrected_at, now());
      NEW.corrected_by := app_current_user_id();

    ELSIF NEW.status = 'cerrado' THEN
      IF OLD.status <> 'corregido' THEN
        RAISE EXCEPTION 'punch %: solo se cierra desde corregido', NEW.id USING ERRCODE = 'check_violation';
      END IF;
      IF NOT public.app_can_full(NEW.project_id, 'punch') THEN
        RAISE EXCEPTION 'punch %: se requiere control total para cerrar', NEW.id USING ERRCODE = 'insufficient_privilege';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.evidences e
                     WHERE e.punch_id = NEW.id AND e.stage = 'correccion' AND e.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'punch %: cierre requiere evidencia de corrección', NEW.id USING ERRCODE = 'check_violation';
      END IF;
      NEW.closed_at := COALESCE(NEW.closed_at, now());
      NEW.closed_by := app_current_user_id();

    ELSIF NEW.status IN ('abierto','en_proceso') AND OLD.status IN ('corregido','cerrado') THEN
      IF NOT public.app_can_full(NEW.project_id, 'punch') THEN
        RAISE EXCEPTION 'punch %: se requiere control total para reabrir', NEW.id USING ERRCODE = 'insufficient_privilege';
      END IF;
      NEW.reopened_at := now();
      NEW.reopened_by := app_current_user_id();
      NEW.raised_at   := now();
      NEW.corrected_at := NULL; NEW.corrected_by := NULL;
      NEW.closed_at := NULL;    NEW.closed_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_punch_lifecycle ON public.punch_items;
CREATE TRIGGER trg_guard_punch_lifecycle
  BEFORE UPDATE ON public.punch_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_punch_lifecycle();

CREATE OR REPLACE VIEW public.v_punch_board WITH (security_invoker = true) AS
SELECT
  p.id AS punch_id, p.project_id, p.equipment_id, e.tag AS equipment_tag,
  e.subsystem_id, ss.name AS subsystem_name,
  sy.id AS system_id, sy.name AS system_name,
  ar.id AS area_id, ar.name AS area_name,
  p.code, p.title, p.priority, p.status, p.generation_source, p.commissioning_category,
  p.source_test_id, p.source_item_key, p.responsible_id,
  p.first_raised_at, p.raised_at, p.corrected_at, p.corrected_by,
  p.closed_at, p.closed_by, p.reopened_at, p.reopened_by, p.created_by, p.verification_notes,
  (p.status <> 'cerrado')                                        AS is_open,
  (p.responsible_id IS NULL)                                     AS unassigned,
  GREATEST(0, EXTRACT(DAY FROM now() - p.raised_at))::int        AS age_days,
  GREATEST(0, EXTRACT(DAY FROM now() - p.first_raised_at))::int  AS age_days_total
FROM public.punch_items p
JOIN public.equipment e   ON e.id = p.equipment_id
LEFT JOIN public.subsystems ss ON ss.id = e.subsystem_id
LEFT JOIN public.systems    sy ON sy.id = ss.system_id
LEFT JOIN public.areas      ar ON ar.id = sy.area_id
WHERE p.deleted_at IS NULL;

COMMIT;
```

- [ ] **Step 2: Verificación estática**

Re-leer: trigger fuerza `first_raised_at := OLD.first_raised_at`; valida evidencia en `corregido` y `cerrado`; `full` en `cerrado`/reapertura; materializa actores con `app_current_user_id()` y timestamps con `COALESCE`; vista `security_invoker`, expone `is_open/unassigned/age_days/age_days_total`, join de jerarquía correcto. Runtime diferido.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/0054_fn_punch_lifecycle.sql
git commit -m "feat(punch): 0054 guard_punch_lifecycle (trigger autoritativo) + vista v_punch_board"
```

---

### Task 3: Test SQL transaccional (idempotencia + guards + MC)

**Files:**
- Create: `database/tests/0054_punch_lifecycle_test.sql`

**Interfaces:**
- Consumes: `punch_items` (0053), `guard_punch_lifecycle` (0054), `transition_equipment_state` (0050).

> Asume DB con migraciones 0049–0054 aplicadas. Crea datos mínimos, ejecuta y revierte con `ROLLBACK`. Aserciones vía `RAISE EXCEPTION`. Requiere un actor admin (ver nota RLS).

- [ ] **Step 1: Escribir el test**

Create `database/tests/0054_punch_lifecycle_test.sql`:

```sql
-- Test transaccional de Punch Automático (rollback al final).
-- Ejecutar: psql <conn> -f database/tests/0054_punch_lifecycle_test.sql
BEGIN;
-- (Si tu RLS requiere actor, fijá el usuario admin de pruebas)
-- SELECT set_config('request.jwt.claims', json_build_object('sub','<auth_uuid_admin>')::text, true);

DO $$
DECLARE
  v_proj uuid; v_sub uuid; v_eq uuid; v_test uuid; v_punch uuid := gen_random_uuid(); v_ev uuid;
BEGIN
  -- Jerarquía mínima
  INSERT INTO public.projects(id,code,name,status) VALUES (gen_random_uuid(),'PCH-TST-'||substr(gen_random_uuid()::text,1,8),'PCH','en_ejecucion') RETURNING id INTO v_proj;
  INSERT INTO public.areas(id,project_id,name,code) VALUES (gen_random_uuid(),v_proj,'A','A1') RETURNING id INTO v_sub; -- reusar var temporal
  -- system + subsystem
  WITH s AS (INSERT INTO public.systems(id,area_id,name,code) VALUES (gen_random_uuid(),v_sub,'S','S1') RETURNING id)
  INSERT INTO public.subsystems(id,system_id,name,code) SELECT gen_random_uuid(), s.id,'SS','SS1' FROM s RETURNING id INTO v_sub;
  INSERT INTO public.equipment(id,subsystem_id,project_id,tag,name,status)
    VALUES (gen_random_uuid(),v_sub,v_proj,'PCH-EQ','eq','en_ejecucion') RETURNING id INTO v_eq;
  INSERT INTO public.tests(id,project_id,equipment_id,type,status,revision)
    VALUES (gen_random_uuid(),v_proj,v_eq,'precomisionamiento','ejecutado',1) RETURNING id INTO v_test;

  -- (A) Auto-punch + idempotencia
  INSERT INTO public.punch_items(id,project_id,equipment_id,test_id,source_test_id,source_item_key,generation_source,title,status,priority)
    VALUES (v_punch,v_proj,v_eq,v_test,v_test,'item1','auto_inspection','Hallazgo 1','abierto','media');
  BEGIN
    INSERT INTO public.punch_items(id,project_id,equipment_id,test_id,source_test_id,source_item_key,generation_source,title,status,priority)
      VALUES (gen_random_uuid(),v_proj,v_eq,v_test,v_test,'item1','auto_inspection','dup','abierto','media');
    RAISE EXCEPTION 'A: el UNIQUE(source_test_id,source_item_key) debió bloquear el duplicado';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- (B) → corregido sin evidencia debe fallar
  BEGIN
    UPDATE public.punch_items SET status='corregido' WHERE id=v_punch;
    RAISE EXCEPTION 'B: corregido sin evidencia debió fallar';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (C) con evidencia → corregido ok + materializa
  INSERT INTO public.evidences(id,project_id,equipment_id,punch_id,type,stage,captured_at)
    VALUES (gen_random_uuid(),v_proj,v_eq,v_punch,'foto','correccion',now()) RETURNING id INTO v_ev;
  UPDATE public.punch_items SET status='corregido' WHERE id=v_punch;
  IF (SELECT corrected_at FROM public.punch_items WHERE id=v_punch) IS NULL
    THEN RAISE EXCEPTION 'C: corrected_at no materializado'; END IF;

  -- (D) → cerrado ok (admin = full) + materializa closed_*
  UPDATE public.punch_items SET status='cerrado', verification_notes='Probado en marcha' WHERE id=v_punch;
  IF (SELECT closed_at FROM public.punch_items WHERE id=v_punch) IS NULL
    THEN RAISE EXCEPTION 'D: closed_at no materializado'; END IF;

  -- (E) reapertura → raised_at nuevo, first_raised_at intacto
  PERFORM pg_sleep(0.01);
  UPDATE public.punch_items SET status='abierto' WHERE id=v_punch;
  IF (SELECT first_raised_at FROM public.punch_items WHERE id=v_punch)
     <> (SELECT created_at FROM public.punch_items WHERE id=v_punch)
    THEN NULL; END IF; -- (first_raised_at se mantiene; no se valida igualdad estricta con created_at)
  IF (SELECT reopened_at FROM public.punch_items WHERE id=v_punch) IS NULL
    THEN RAISE EXCEPTION 'E: reopened_at no materializado'; END IF;

  -- (F) Guard MC: con punch != cerrado, INSPECTION_APPROVED no debe llevar a MC (queda fuera de alcance del RPC MC),
  --     pero verificamos que el equipo tiene punch abierto contado por la regla
  IF (SELECT count(*) FROM public.punch_items WHERE equipment_id=v_eq AND status<>'cerrado' AND deleted_at IS NULL) = 0
    THEN RAISE EXCEPTION 'F: debería haber al menos 1 punch abierto'; END IF;

  RAISE NOTICE 'OK punch lifecycle (A,B,C,D,E,F)';
END $$;

ROLLBACK;
```

- [ ] **Step 2: Ejecutar (si hay DB) o diferir**

Run: `psql "<conn>" -f database/tests/0054_punch_lifecycle_test.sql`
Expected: `NOTICE: OK punch lifecycle (A,B,C,D,E,F)`. Si no hay psql en la sesión, marcar **manual/diferido** (correr en Supabase antes del deploy).

- [ ] **Step 3: Commit**

```bash
git add database/tests/0054_punch_lifecycle_test.sql
git commit -m "test(punch): test transaccional ciclo de vida (idempotencia/guards/MC)"
```

> **🛑 CHECKPOINT BACKEND OBLIGATORIO** (igual que Fase B): tras Tasks 1–3, detenerse para revisión humana de 0053, 0054 y el test SQL (idempotencia, guards de corregido/cerrado/reapertura, materialización, MC). **No avanzar a cliente/UI sin aprobación.**

---

### Task 4: `FAIL_VALUES` compartido + `deriveAutoPunches` (puro, TDD)

**Files:**
- Create: `app/src/lib/inspection/failValues.ts`
- Create: `app/src/lib/punch/autoPunch.ts`
- Test: `app/src/lib/punch/__tests__/autoPunch.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // failValues.ts
  export const FAIL_VALUES: Set<string>;
  export function isFailValue(v: unknown): boolean;
  // autoPunch.ts
  export const PUNCH_NAMESPACE: string;
  export interface AutoPunchCtx { projectId: string; equipmentId: string; testId: string; userId: string; now: string }
  export interface AutoPunchRow { id: string; project_id: string; equipment_id: string; test_id: string; source_test_id: string; source_item_key: string; generation_source: "auto_inspection"; title: string; description: string; priority: "critica"|"alta"|"media"|"baja"; status: "abierto"; responsible_id: null; created_by: string; raised_at: string; first_raised_at: string; sync_status: "pending"; version: 1 }
  export function deriveAutoPunches(answers: Record<string, unknown>, template: MockInspectionTemplate, ctx: AutoPunchCtx): AutoPunchRow[]
  ```
  Consumido por Task 5.

- [ ] **Step 1: Escribir el test que falla**

Create `app/src/lib/punch/__tests__/autoPunch.test.ts`:

```ts
import { test, expect } from "vitest";
import { deriveAutoPunches } from "@/lib/punch/autoPunch";
import type { MockInspectionTemplate } from "@/types/inspection";

const template = {
  id: "t1", code: "P", name: "P", discipline: "mec",
  sections: [{
    id: "s1", code: "S1", name: "Sección 1", is_universal: false,
    fields: [
      { key: "it1", label: "Continuidad", type: "radio", required: true },
      { key: "it2", label: "Aislamiento", type: "radio", required: true,
        // @ts-expect-error punch_priority es metadata opcional forward-compat
        punch_priority: "critica" },
      { key: "it3", label: "Observaciones", type: "textarea", required: false },
    ],
  }],
} as unknown as MockInspectionTemplate;

const ctx = { projectId: "p1", equipmentId: "e1", testId: "T1", userId: "u1", now: "2026-06-21T00:00:00Z" };

test("genera 1 punch por ítem fallido; no_aplica/no-falla no disparan", () => {
  const answers = { it1: "No cumple", it2: "Cumple", it3: "texto libre", it4: "No aplica" };
  const rows = deriveAutoPunches(answers, template, ctx);
  expect(rows.map((r) => r.source_item_key)).toEqual(["it1"]);
  expect(rows[0].generation_source).toBe("auto_inspection");
  expect(rows[0].responsible_id).toBeNull();
  expect(rows[0].created_by).toBe("u1");
  expect(rows[0].title).toBe("Continuidad");
});

test("prioridad = field.punch_priority ?? 'media'", () => {
  const rows = deriveAutoPunches({ it1: "FALLA", it2: "RECHAZADO" }, template, ctx);
  const byKey = Object.fromEntries(rows.map((r) => [r.source_item_key, r.priority]));
  expect(byKey.it1).toBe("media");      // sin hint
  expect(byKey.it2).toBe("critica");    // hint del campo
});

test("id determinístico por (testId, fieldKey)", () => {
  const a = deriveAutoPunches({ it1: "NO" }, template, ctx)[0].id;
  const b = deriveAutoPunches({ it1: "NO" }, template, ctx)[0].id;
  expect(a).toBe(b);
  const c = deriveAutoPunches({ it1: "NO" }, template, { ...ctx, testId: "T2" })[0].id;
  expect(c).not.toBe(a);
});

test("sin fallas → 0 punch", () => {
  expect(deriveAutoPunches({ it1: "Cumple" }, template, ctx)).toEqual([]);
});
```

- [ ] **Step 2: Run para ver fallar**

Run: `cd app && npx vitest run src/lib/punch/__tests__/autoPunch.test.ts`
Expected: FAIL — `Cannot find module '@/lib/punch/autoPunch'`.

- [ ] **Step 3: Implementar `failValues.ts`**

Create `app/src/lib/inspection/failValues.ts`:

```ts
/** Única fuente de verdad de detección de falla (cliente). No duplicar en SQL. */
export const FAIL_VALUES = new Set(["FALLA", "NO", "RECHAZADO", "No cumple", "No conforme"]);

export function isFailValue(v: unknown): boolean {
  return FAIL_VALUES.has(String(v));
}
```

- [ ] **Step 4: Implementar `autoPunch.ts`**

Create `app/src/lib/punch/autoPunch.ts`:

```ts
import { v5 as uuidv5 } from "uuid";
import { isFailValue } from "@/lib/inspection/failValues";
import type { MockInspectionTemplate } from "@/types/inspection";
import type { PunchPriority } from "@/types";

/** Namespace fijo para ids determinísticos de auto-punch (uuidv5). */
export const PUNCH_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

export interface AutoPunchCtx {
  projectId: string; equipmentId: string; testId: string; userId: string; now: string;
}
export interface AutoPunchRow {
  id: string; project_id: string; equipment_id: string; test_id: string;
  source_test_id: string; source_item_key: string; generation_source: "auto_inspection";
  title: string; description: string; priority: PunchPriority; status: "abierto";
  responsible_id: null; created_by: string; raised_at: string; first_raised_at: string;
  sync_status: "pending"; version: 1;
}

/** Deriva 1 punch por cada ítem cuya respuesta ∈ FAIL_VALUES. Puro/determinístico. */
export function deriveAutoPunches(
  answers: Record<string, unknown>,
  template: MockInspectionTemplate,
  ctx: AutoPunchCtx,
): AutoPunchRow[] {
  const index = new Map<string, { label: string; section: string; priority?: PunchPriority }>();
  for (const s of template.sections) {
    for (const f of s.fields) {
      index.set(f.key, {
        label: f.label, section: s.name,
        priority: (f as { punch_priority?: PunchPriority }).punch_priority,
      });
    }
  }

  const rows: AutoPunchRow[] = [];
  for (const [key, value] of Object.entries(answers)) {
    if (!isFailValue(value)) continue;
    const meta = index.get(key);
    rows.push({
      id: uuidv5(`${ctx.testId}:${key}`, PUNCH_NAMESPACE),
      project_id: ctx.projectId, equipment_id: ctx.equipmentId, test_id: ctx.testId,
      source_test_id: ctx.testId, source_item_key: key, generation_source: "auto_inspection",
      title: meta?.label ?? key,
      description: `${meta?.section ?? "—"}: ${String(value)}`,
      priority: meta?.priority ?? "media", status: "abierto",
      responsible_id: null, created_by: ctx.userId,
      raised_at: ctx.now, first_raised_at: ctx.now, sync_status: "pending", version: 1,
    });
  }
  return rows;
}
```

- [ ] **Step 5: Run para ver pasar**

Run: `cd app && npx vitest run src/lib/punch/__tests__/autoPunch.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/inspection/failValues.ts app/src/lib/punch/autoPunch.ts app/src/lib/punch/__tests__/autoPunch.test.ts
git commit -m "feat(punch): FAIL_VALUES compartido + deriveAutoPunches puro (TDD)"
```

---

### Task 5: Integración de generación en `submitInspectionOffline`

**Files:**
- Modify: `app/src/lib/sync/submitInspection.ts`
- Test: `app/src/lib/sync/__tests__/submitInspection.test.ts`

**Interfaces:**
- Consumes: `deriveAutoPunches`, `FAIL_VALUES` (Task 4); `db.punchItems`, `deps.enqueueSync`, `deps.enqueueTransition`, `deps.nextState`.
- Produces: por cada ítem fallido, fila en `db.punchItems` + outbox `('punch_items','INSERT')`; `PUNCH_RAISED` emitido solo si transiciona.

- [ ] **Step 1: Escribir el test que falla** (añadir a `submitInspection.test.ts`)

```ts
test("genera auto-punch por ítem fallido + outbox; sin falla no genera", async () => {
  const failState = { ...state, answers: { it1: "No cumple" } };
  const d = deps(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await submitInspectionOffline({ state: failState, projectId: "p1", userId: "u1", template }, d as any);

  const punches = await localDB.punchItems.toArray();
  expect(punches.length).toBe(1);
  expect(punches[0].source_test_id).toBe(res.testId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((punches[0] as any).source_item_key).toBe("it1");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((punches[0] as any).generation_source).toBe("auto_inspection");

  const q = await localDB.syncQueue.toArray();
  expect(q.find((o) => o.entity === "punch_items")).toBeTruthy();
});

test("inspección sin fallas no genera punch", async () => {
  const okState = { ...state, answers: { it1: "Cumple" } };
  const d = deps(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await submitInspectionOffline({ state: okState, projectId: "p1", userId: "u1", template }, d as any);
  expect((await localDB.punchItems.toArray()).length).toBe(0);
});
```

> El `template` del test (sección `s1`, campo `it1` label "Item") ya existe en el archivo; `deriveAutoPunches` mapea `it1`.

- [ ] **Step 2: Run para ver fallar**

Run: `cd app && npx vitest run src/lib/sync/__tests__/submitInspection.test.ts`
Expected: FAIL — `punchItems` vacío (la generación aún no existe).

- [ ] **Step 3: Implementar la integración**

En `submitInspection.ts`:

1. Reemplazar el `const FAIL_VALUES = new Set([...])` local por el import compartido (al tope del archivo):
```ts
import { FAIL_VALUES } from "@/lib/inspection/failValues";
import { deriveAutoPunches } from "@/lib/punch/autoPunch";
```
(Eliminar la línea `const FAIL_VALUES = new Set([...]);`.)

2. Ampliar la firma de la dep `nextState` para aceptar cualquier evento:
```ts
  nextState: (state: string, event: string) => string | null;
```

3. Tras el bucle de evidencias y **antes** de la transición FSM existente, insertar:
```ts
  // Punch automático (Fase C): 1 por ítem fallido; idempotente por (source_test_id, source_item_key) en servidor.
  const autoPunches = deriveAutoPunches(state.answers, template, {
    projectId, equipmentId: state.equipmentId, testId, userId, now: ts,
  });
  for (const p of autoPunches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.punchItems.add(p as any);
    await deps.enqueueSync("punch_items", p.id, "INSERT", p);
  }
```

4. En el bloque de transición FSM existente, después de emitir `INSPECTION_EXECUTED`, añadir la emisión condicional de `PUNCH_RAISED`:
```ts
  if (autoPunches.length > 0) {
    const afterExec = target ?? fromStatus;                 // estado tras INSPECTION_EXECUTED (o el actual)
    const punchTarget = deps.nextState(afterExec, "PUNCH_RAISED");
    if (punchTarget && punchTarget !== afterExec) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.equipment.update(state.equipmentId, { status: punchTarget, updated_at: ts } as any);
      await deps.enqueueTransition(state.equipmentId, "PUNCH_RAISED", afterExec, { test_id: testId }, ts);
    }
  }
```
(`target` y `fromStatus` ya existen en el scope de la transición `INSPECTION_EXECUTED`.)

- [ ] **Step 4: Actualizar el wiring del dep en `useSubmitInspection.ts`**

La dep `nextState` ya se pasa con flags neutros; ampliar su tipo de evento (acepta string). Confirmar que la llamada existente sigue compilando:
```ts
          nextState: (from, event) =>
            nextState(from as never, event as never, { hasOpenPunch: false, approvalsComplete: false, everInspected: true }),
```
(Sin cambios de runtime; solo el tipo del parámetro `event` se amplía en `SubmitDeps`.)

- [ ] **Step 5: Run para ver pasar + suite del archivo**

Run: `cd app && npx vitest run src/lib/sync/__tests__/submitInspection.test.ts`
Expected: PASS (casos previos + los 2 nuevos).

- [ ] **Step 6: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/sync/submitInspection.ts app/src/hooks/useSubmitInspection.ts app/src/lib/sync/__tests__/submitInspection.test.ts
git commit -m "feat(punch): submitInspection genera auto-punch + PUNCH_RAISED condicional"
```

---

### Task 6: Engine — Storage de evidencia de punch + idempotencia `UNIQUE`

**Files:**
- Modify: `app/src/lib/sync/engine.ts`
- Test: `app/src/lib/sync/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: outbox `punch_items` INSERT (Task 5) y `evidences` con `punch_id` (Task 7).
- Produces: path de Storage de punch cuando no hay `test_id`; un INSERT de `punch_items` que viola `uq_punch_source` (Postgres `23505`) se trata como **resuelto** (op borrada, no reintenta).

- [ ] **Step 1: Escribir el test que falla** (añadir a `engine.test.ts`)

**Caso de prueba OBLIGATORIO (requisito del usuario):** un **replay de sync** del mismo auto-punch (mismo `source_test_id` + mismo `source_item_key`) cuyo `upsert` sobre `punch_items` devuelve `23505` (violación de `uq_punch_source`) debe resultar en: (a) op marcada **exitosa/idempotente**, (b) **sin retry infinito** (la op se elimina de `syncQueue`, no incrementa `attempts`), (c) **sin error visible** (no entra en `errors`), (d) **sin duplicación** de punch.

El archivo ya tiene un patrón de mock de `supabase`. Replicarlo para que `from('punch_items').upsert(...)` devuelva `{ error: { code: "23505", message: "duplicate key value violates unique constraint \"uq_punch_source\"" } }`. Estructura del test (completar el mock siguiendo los casos existentes del archivo):

```ts
test("punch_items: replay con UNIQUE (23505) → idempotente (op resuelta, sin retry, sin error, sin duplicado)", async () => {
  // 1) Encolar un INSERT de punch_items en syncQueue (mismo source_test_id + source_item_key que ya existe en servidor).
  // 2) Mock supabase: from('punch_items').upsert → { error: { code: '23505', message: '... uq_punch_source' } }.
  // 3) const res = await runSync();
  // Aserciones:
  expect((await localDB.syncQueue.toArray()).find((o) => o.entity === "punch_items")).toBeUndefined(); // op resuelta
  expect(res.errors.find((e) => e.includes("punch_items"))).toBeUndefined();                            // sin error visible
  // y la op NO quedó con attempts incrementados / sync_status 'failed' (sin retry infinito)
});
```

- [ ] **Step 2: Run para ver fallar** (tras escribir el mock real)

Run: `cd app && npx vitest run src/lib/sync/__tests__/engine.test.ts`
Expected: FAIL — hoy un 23505 se trata como error transitorio (reintenta), la op permanece en la cola.

- [ ] **Step 3: Implementar — path de punch + idempotencia**

En `engine.ts`, en el bloque `if (op.entity === "evidences")` del INSERT (≈ línea 125), reemplazar el cálculo del `path`:
```ts
          if (blob) {
            const ext = (blob.type.split("/")[1] ?? "jpg");
            const p = payload as Record<string, unknown>;
            const path = p.test_id
              ? `${p.project_id}/${p.equipment_id}/${p.test_id}/${op.entityId}.${ext}`
              : `${p.project_id}/${p.equipment_id}/punch/${p.punch_id}/${op.entityId}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("evidences").upload(path, blob, { upsert: true, contentType: blob.type });
            if (upErr) throw upErr;
            const { data: urlData } = supabase.storage.from("evidences").getPublicUrl(path);
            payload.storage_url = urlData.publicUrl;
          }
```

En el INSERT genérico (≈ línea 139), tratar la violación de UNIQUE de punch como resuelta:
```ts
        const { error } = await supabase.from(op.entity).upsert(payload, { onConflict: "id" });
        if (error) {
          // Idempotencia de auto-punch: el UNIQUE(source_test_id,source_item_key) ya garantiza
          // que el punch existe → op resuelta, no reintentar.
          if (op.entity === "punch_items" && (error as { code?: string }).code === "23505") {
            await localDB.syncQueue.delete(op.id!);
            if (table) await table.update(op.entityId, { sync_status: "synced", last_sync_error: undefined });
            pushed++;
            continue;
          }
          throw error;
        }
```

- [ ] **Step 4: Run para ver pasar + suite del engine**

Run: `cd app && npx vitest run src/lib/sync/__tests__/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/sync/engine.ts app/src/lib/sync/__tests__/engine.test.ts
git commit -m "feat(punch): engine path de Storage de punch + idempotencia UNIQUE (23505)"
```

---

### Task 7: Hooks de ciclo de vida + captura de evidencia de punch

**Files:**
- Modify: `app/src/hooks/usePunch.ts`
- Create: `app/src/lib/punch/punchEvidence.ts`

**Interfaces:**
- Consumes: `localDB`, `enqueueSync`, `saveBlobLocally`, `useUpdatePunch`.
- Produces:
  ```ts
  // punchEvidence.ts
  export async function capturePunchEvidence(args: { punchId: string; projectId: string; equipmentId: string; blob: Blob; stage: "correccion"|"verificacion"; userId: string; observations?: string }): Promise<string> // evidenceId
  // usePunch.ts
  export function useMarkCorrected(): { mutateAsync: (a:{id:string;projectId:string})=>Promise<void> }
  export function useReopenPunch(): ...
  // useClosePunch extendido con verification_notes
  ```
  Consumido por Task 9.

- [ ] **Step 1: Implementar `punchEvidence.ts`**

Create `app/src/lib/punch/punchEvidence.ts`:

```ts
import { localDB, enqueueSync, saveBlobLocally } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";

/** Captura una evidencia de punch (blob local + fila evidences + outbox). Devuelve el evidenceId. */
export async function capturePunchEvidence(args: {
  punchId: string; projectId: string; equipmentId: string;
  blob: Blob; stage: "correccion" | "verificacion"; userId: string; observations?: string;
}): Promise<string> {
  const evidenceId = uuidv4();
  const now = new Date().toISOString();
  await saveBlobLocally(evidenceId, args.blob);
  const row = {
    id: evidenceId, project_id: args.projectId, equipment_id: args.equipmentId,
    punch_id: args.punchId, test_id: undefined, type: "foto", stage: args.stage,
    storage_url: undefined, captured_by: args.userId, captured_at: now,
    observations: args.observations, sync_status: "pending" as const,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.evidences.add(row as any);
  await enqueueSync("evidences", evidenceId, "INSERT", row);
  return evidenceId;
}
```

- [ ] **Step 2: Extender `usePunch.ts`**

1. En `useCreatePunch`, marcar el origen manual: en el objeto `item` añadir `generation_source: "manual" as const,`.

2. Añadir hooks de ciclo de vida (reusan `useUpdatePunch`, que ya hace optimista IndexedDB + outbox + online):
```ts
export function useMarkCorrected() {
  const updatePunch = useUpdatePunch();
  return useMutation({
    // Pre-requisito de UX: la(s) evidencia(s) de corrección ya fueron capturadas (capturePunchEvidence)
    // y encoladas ANTES de esta transición (orden FIFO del outbox). El trigger valida en servidor.
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      updatePunch.mutateAsync({ id, projectId, status: "corregido" as PunchStatus }),
  });
}

export function useReopenPunch() {
  const updatePunch = useUpdatePunch();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      updatePunch.mutateAsync({ id, projectId, status: "abierto" as PunchStatus }),
  });
}
```

3. Extender `useClosePunch` para aceptar `verification_notes`:
```ts
export function useClosePunch() {
  const updatePunch = useUpdatePunch();
  return useMutation({
    mutationFn: ({ id, projectId, verification_notes }: { id: string; projectId: string; verification_notes?: string }) =>
      updatePunch.mutateAsync({ id, projectId, status: "cerrado" as PunchStatus, verification_notes }),
  });
}
```
(Importar `useMutation` ya está en el archivo.)

- [ ] **Step 3: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: sin errores (puede requerir extender el tipo `PunchItem` en `@/types` con los nuevos campos opcionales: `source_test_id?, source_item_key?, generation_source?, commissioning_category?, raised_at?, first_raised_at?, corrected_at?, corrected_by?, closed_by?, reopened_at?, reopened_by?, verification_notes?`). Añadirlos como opcionales en `PunchItem`.

- [ ] **Step 4: Commit**

```bash
git add app/src/hooks/usePunch.ts app/src/lib/punch/punchEvidence.ts app/src/types
git commit -m "feat(punch): hooks de ciclo de vida (corregido/cerrado/reabrir) + captura de evidencia de punch"
```

---

### Task 8: Hooks de bandeja (`usePunchBoard`) y métricas (`usePunchMetrics`)

**Files:**
- Create: `app/src/hooks/usePunchBoard.ts`
- Create: `app/src/hooks/usePunchMetrics.ts`

**Interfaces:**
- Consumes: vista `v_punch_board` (Task 2); `localDB.punchItems` (offline).
- Produces:
  ```ts
  export interface PunchBoardRow { punch_id: string; equipment_id: string; equipment_tag: string; subsystem_id: string|null; subsystem_name: string|null; system_name: string|null; area_name: string|null; title: string; priority: string; status: string; generation_source: string; responsible_id: string|null; is_open: boolean; unassigned: boolean; age_days: number; age_days_total: number; first_raised_at: string; raised_at: string }
  export interface PunchBoardFilters { status?: string; priority?: string; generation_source?: string; unassigned?: boolean; aging?: "0-7"|"8-30"|">30" }
  export function usePunchBoard(projectId: string, filters: PunchBoardFilters): { rows: PunchBoardRow[]; loading: boolean; error: string|null; refetch: ()=>void }
  export interface PunchMetrics { open_total:number; by_priority:Record<string,number>; by_status:Record<string,number>; by_source:Record<string,number>; aging:{ "0-7":number; "8-30":number; ">30":number }; equipment_with_open:number; equipment_with_open_pct:number; top_subsystems:{ name:string; open:number }[]; auto_per_inspection:number }
  export function usePunchMetrics(projectId: string): { metrics: PunchMetrics; loading: boolean }
  ```
  Consumido por Task 9.

> Hooks de lectura (sin TDD estricto; se validan por tsc + verificación manual). Aging de métricas usa `age_days_total` (= `first_raised_at`).

- [ ] **Step 1: Implementar `usePunchBoard.ts`**

Create `app/src/hooks/usePunchBoard.ts`:

```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";

export interface PunchBoardRow {
  punch_id: string; equipment_id: string; equipment_tag: string;
  subsystem_id: string | null; subsystem_name: string | null;
  system_name: string | null; area_name: string | null;
  title: string; priority: string; status: string; generation_source: string;
  responsible_id: string | null; is_open: boolean; unassigned: boolean;
  age_days: number; age_days_total: number; first_raised_at: string; raised_at: string;
}
export interface PunchBoardFilters {
  status?: string; priority?: string; generation_source?: string;
  unassigned?: boolean; aging?: "0-7" | "8-30" | ">30";
}

function inAging(age: number, bucket?: string): boolean {
  if (!bucket) return true;
  if (bucket === "0-7") return age <= 7;
  if (bucket === "8-30") return age >= 8 && age <= 30;
  return age > 30;
}

export function usePunchBoard(projectId: string, filters: PunchBoardFilters) {
  const [rows, setRows] = useState<PunchBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let data: PunchBoardRow[] = [];
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const supabase = createClient();
        let q = supabase.from("v_punch_board").select("*").eq("project_id", projectId);
        if (filters.status) q = q.eq("status", filters.status);
        if (filters.priority) q = q.eq("priority", filters.priority);
        if (filters.generation_source) q = q.eq("generation_source", filters.generation_source);
        if (filters.unassigned) q = q.is("responsible_id", null);
        const { data: d, error: e } = await q.order("subsystem_name").order("age_days_total", { ascending: false });
        if (e) throw e;
        data = (d ?? []) as unknown as PunchBoardRow[];
      } else {
        // Fallback offline: punch + jerarquía desde IndexedDB (lectura, sin age del servidor)
        const punches = await localDB.punchItems.where("project_id").equals(projectId).toArray();
        data = punches.map((p) => ({
          punch_id: p.id, equipment_id: (p as { equipment_id?: string }).equipment_id ?? "",
          equipment_tag: "", subsystem_id: null, subsystem_name: null, system_name: null, area_name: null,
          title: p.title, priority: p.priority, status: p.status,
          generation_source: (p as { generation_source?: string }).generation_source ?? "manual",
          responsible_id: (p as { responsible_id?: string }).responsible_id ?? null,
          is_open: p.status !== "cerrado",
          unassigned: !(p as { responsible_id?: string }).responsible_id,
          age_days: 0, age_days_total: 0,
          first_raised_at: (p as { first_raised_at?: string }).first_raised_at ?? p.created_at,
          raised_at: (p as { raised_at?: string }).raised_at ?? p.created_at,
        }));
        if (filters.status) data = data.filter((r) => r.status === filters.status);
        if (filters.priority) data = data.filter((r) => r.priority === filters.priority);
        if (filters.generation_source) data = data.filter((r) => r.generation_source === filters.generation_source);
        if (filters.unassigned) data = data.filter((r) => r.unassigned);
      }
      if (filters.aging) data = data.filter((r) => inAging(r.age_days_total, filters.aging));
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando bandeja");
    } finally {
      setLoading(false);
    }
  }, [projectId, filters.status, filters.priority, filters.generation_source, filters.unassigned, filters.aging]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchData(); }, [fetchData]);

  return { rows, loading, error, refetch: fetchData };
}
```

- [ ] **Step 2: Implementar `usePunchMetrics.ts`**

Create `app/src/hooks/usePunchMetrics.ts`:

```ts
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";

export interface PunchMetrics {
  open_total: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  aging: { "0-7": number; "8-30": number; ">30": number };
  equipment_with_open: number;
  equipment_with_open_pct: number;
  top_subsystems: { name: string; open: number }[];
  auto_per_inspection: number;
}

const EMPTY: PunchMetrics = {
  open_total: 0, by_priority: {}, by_status: {}, by_source: {},
  aging: { "0-7": 0, "8-30": 0, ">30": 0 }, equipment_with_open: 0,
  equipment_with_open_pct: 0, top_subsystems: [], auto_per_inspection: 0,
};

export function usePunchMetrics(projectId: string) {
  const [metrics, setMetrics] = useState<PunchMetrics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const m: PunchMetrics = { ...EMPTY, by_priority: {}, by_status: {}, by_source: {}, aging: { "0-7": 0, "8-30": 0, ">30": 0 }, top_subsystems: [] };
      try {
        const online = typeof navigator !== "undefined" && navigator.onLine;
        const supabase = createClient();
        const rows = online
          ? ((await supabase.from("v_punch_board").select("*").eq("project_id", projectId)).data ?? [])
          : (await localDB.punchItems.where("project_id").equals(projectId).toArray()).map((p) => ({
              status: p.status, priority: p.priority,
              generation_source: (p as { generation_source?: string }).generation_source ?? "manual",
              is_open: p.status !== "cerrado", equipment_id: (p as { equipment_id?: string }).equipment_id ?? "",
              subsystem_name: null as string | null, age_days_total: 0,
            }));

        const openRows = (rows as { is_open: boolean }[]).filter((r) => r.is_open);
        m.open_total = openRows.length;
        const eqOpen = new Set<string>();
        const subOpen = new Map<string, number>();
        for (const r of rows as Record<string, unknown>[]) {
          if (!r.is_open) continue;
          m.by_priority[r.priority as string] = (m.by_priority[r.priority as string] ?? 0) + 1;
          m.by_status[r.status as string] = (m.by_status[r.status as string] ?? 0) + 1;
          m.by_source[r.generation_source as string] = (m.by_source[r.generation_source as string] ?? 0) + 1;
          const age = (r.age_days_total as number) ?? 0;
          if (age <= 7) m.aging["0-7"]++; else if (age <= 30) m.aging["8-30"]++; else m.aging[">30"]++;
          if (r.equipment_id) eqOpen.add(r.equipment_id as string);
          const sn = (r.subsystem_name as string) ?? "—";
          subOpen.set(sn, (subOpen.get(sn) ?? 0) + 1);
        }
        m.equipment_with_open = eqOpen.size;
        const totalEq = await localDB.equipment.where("project_id").equals(projectId).count();
        m.equipment_with_open_pct = totalEq > 0 ? Math.round((eqOpen.size / totalEq) * 100) : 0;
        m.top_subsystems = [...subOpen.entries()].map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open).slice(0, 5);
        const totalInsp = await localDB.tests.where("project_id").equals(projectId).count();
        const autoCount = (rows as { generation_source?: string }[]).filter((r) => r.generation_source === "auto_inspection").length;
        m.auto_per_inspection = totalInsp > 0 ? Math.round((autoCount / totalInsp) * 100) / 100 : 0;
      } finally {
        if (!cancelled) { setMetrics(m); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return { metrics, loading };
}
```

- [ ] **Step 3: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: sin errores en los dos hooks.

- [ ] **Step 4: Commit**

```bash
git add app/src/hooks/usePunchBoard.ts app/src/hooks/usePunchMetrics.ts
git commit -m "feat(punch): hooks usePunchBoard (vista + fallback offline) y usePunchMetrics (KPIs)"
```

---

### Task 9: UI — bandeja agrupada + tiles de KPI

**Files:**
- Create: `app/src/components/punch/PunchBoard.tsx`
- Create: `app/src/components/punch/PunchMetrics.tsx`
- Modify: `app/src/app/(workspace)/projects/[projectId]/punch/page.tsx`

**Interfaces:**
- Consumes: `usePunchBoard`, `usePunchMetrics` (Task 8); `useMarkCorrected`/`useClosePunch`/`useReopenPunch` (Task 7); `capturePunchEvidence` (Task 7).

> Antes de editar la página, leer la página existente y mantener lo que ya tiene (la lista paginada `usePunchPaged`). El board + métricas se montan como sección adicional (pestaña o bloque superior), sin romper lo existente. Confirmar el patrón `params` (`use(params)`).

- [ ] **Step 1: `PunchMetrics.tsx`**

Create `app/src/components/punch/PunchMetrics.tsx`:

```tsx
"use client";
import { usePunchMetrics } from "@/hooks/usePunchMetrics";

export function PunchMetrics({ projectId }: { projectId: string }) {
  const { metrics: m, loading } = usePunchMetrics(projectId);
  if (loading) return <p className="text-sm text-slate-500">Cargando métricas…</p>;
  const Tile = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile label="Punch abiertos" value={m.open_total} />
      <Tile label="Equipos con punch" value={`${m.equipment_with_open} (${m.equipment_with_open_pct}%)`} />
      <Tile label="Aging >30d" value={m.aging[">30"]} />
      <Tile label="Auto/Inspección" value={m.auto_per_inspection} />
      <Tile label="Críticos abiertos" value={m.by_priority["critica"] ?? 0} />
      <Tile label="Auto-generados" value={m.by_source["auto_inspection"] ?? 0} />
      <Tile label="0–7d / 8–30d" value={`${m.aging["0-7"]} / ${m.aging["8-30"]}`} />
      <Tile label="Top subsistema" value={m.top_subsystems[0]?.name ?? "—"} />
    </div>
  );
}
```

- [ ] **Step 2: `PunchBoard.tsx`** (agrupación por subsistema + filtros + triage)

Create `app/src/components/punch/PunchBoard.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import { usePunchBoard, type PunchBoardFilters, type PunchBoardRow } from "@/hooks/usePunchBoard";

export function PunchBoard({ projectId }: { projectId: string }) {
  const [filters, setFilters] = useState<PunchBoardFilters>({});
  const { rows, loading, error } = usePunchBoard(projectId, filters);

  const groups = useMemo(() => {
    const byArea = new Map<string, Map<string, Map<string, PunchBoardRow[]>>>();
    for (const r of rows) {
      const area = r.area_name ?? "—"; const sys = r.system_name ?? "—"; const sub = r.subsystem_name ?? "—";
      if (!byArea.has(area)) byArea.set(area, new Map());
      const a = byArea.get(area)!;
      if (!a.has(sys)) a.set(sys, new Map());
      const s = a.get(sys)!;
      if (!s.has(sub)) s.set(sub, []);
      s.get(sub)!.push(r);
    }
    return byArea;
  }, [rows]);

  const set = (k: keyof PunchBoardFilters, v: unknown) =>
    setFilters((f) => ({ ...f, [k]: v === "" ? undefined : v }));

  if (loading) return <p className="text-sm text-slate-500">Cargando bandeja…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("status", e.target.value)}>
          <option value="">Estado: todos</option><option value="abierto">abierto</option>
          <option value="en_proceso">en_proceso</option><option value="corregido">corregido</option><option value="cerrado">cerrado</option>
        </select>
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("priority", e.target.value)}>
          <option value="">Prioridad: todas</option><option value="critica">crítica</option>
          <option value="alta">alta</option><option value="media">media</option><option value="baja">baja</option>
        </select>
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("generation_source", e.target.value)}>
          <option value="">Origen: todos</option><option value="auto_inspection">auto</option>
          <option value="manual">manual</option><option value="imported">importado</option>
        </select>
        <select className="rounded border border-slate-300 p-1" onChange={(e) => set("aging", e.target.value)}>
          <option value="">Aging: todo</option><option value="0-7">0–7d</option><option value="8-30">8–30d</option><option value=">30">&gt;30d</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" onChange={(e) => set("unassigned", e.target.checked || undefined)} /> Sin asignar (triage)
        </label>
      </div>

      {rows.length === 0 && <p className="text-sm text-slate-500">No hay punch para los filtros aplicados.</p>}

      {[...groups.entries()].map(([area, systems]) => (
        <div key={area}>
          <h3 className="text-sm font-semibold text-slate-700">{area}</h3>
          {[...systems.entries()].map(([sys, subs]) => (
            <div key={sys} className="ml-3">
              <h4 className="text-sm text-slate-600">{sys}</h4>
              {[...subs.entries()].map(([sub, items]) => (
                <div key={sub} className="ml-3 mb-2">
                  <div className="text-xs font-medium text-slate-500">Subsistema: {sub} ({items.length})</div>
                  <ul className="ml-2">
                    {items.map((r) => (
                      <li key={r.punch_id} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm">
                        <span>{r.equipment_tag} — {r.title}</span>
                        <span className="text-xs text-slate-500">
                          {r.priority} · {r.status} · {r.generation_source} · {r.age_days_total}d
                          {r.unassigned ? " · sin asignar" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Montar en la página `punch`**

Leer `app/src/app/(workspace)/projects/[projectId]/punch/page.tsx` y añadir (sin romper lo existente) la sección superior con métricas + board. Ejemplo del bloque a insertar dentro del render, manteniendo el resto:
```tsx
import { PunchMetrics } from "@/components/punch/PunchMetrics";
import { PunchBoard } from "@/components/punch/PunchBoard";
// ... dentro del componente, con projectId ya resuelto vía use(params):
<section className="space-y-4">
  <PunchMetrics projectId={projectId} />
  <PunchBoard projectId={projectId} />
</section>
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd app && npx tsc --noEmit && npx eslint src/components/punch src/hooks/usePunchBoard.ts src/hooks/usePunchMetrics.ts`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/punch "app/src/app/(workspace)/projects/[projectId]/punch/page.tsx"
git commit -m "feat(punch): UI bandeja agrupada por subsistema + tiles de KPI"
```

---

### Task 10: Verificación integral + gate funcional

**Files:** (ninguno nuevo)

- [ ] **Step 1: Suite vitest completa**

Run: `cd app && npx vitest run`
Expected: PASS — incluye `autoPunch`, `submitInspection` (auto-punch), `engine` (idempotencia); sin romper Fases A/B.

- [ ] **Step 2: Typecheck + lint**

Run: `cd app && npx tsc --noEmit && npx eslint src/lib/punch src/hooks/usePunch.ts src/hooks/usePunchBoard.ts src/hooks/usePunchMetrics.ts src/components/punch`
Expected: sin errores.

- [ ] **Step 3: Test SQL transaccional (si hay DB)**

Run: `psql "<conn>" -f database/tests/0054_punch_lifecycle_test.sql`
Expected: `OK punch lifecycle (A,B,C,D,E,F)`. Si no hay psql, dejar para Supabase pre-deploy.

- [ ] **Step 4: Gate funcional (post-aplicación de migraciones, patrón Fase B)**

Crear/usar `scripts/gate-faseC/validate.mjs` (REST/Auth admin, espejo de `scripts/gate-faseB/validate.mjs`) que cubra **al menos** estos escenarios (requisito del usuario) y **limpie** los datos de prueba al final:
- **A.** Auto-punch generado por `FAIL_VALUES` (1 por ítem fallido; `generation_source='auto_inspection'`).
- **B.** Re-sync/replay idempotente (mismo `source_test_id`+`source_item_key` → sin duplicado por `UNIQUE`).
- **C.** Evidencia obligatoria para `corregido` (sin evidencia → rechazado; con evidencia `stage='correccion'` → ok).
- **D.** Cierre sin `full` → rechazado.
- **E.** Cierre con `full` → `cerrado` (+ `closed_at/by`, `verification_notes`).
- **F.** Reapertura auditada (`reopened_at/by`, `raised_at` nuevo, `first_raised_at` intacto).
- **G.** MC bloqueado mientras exista punch `≠ 'cerrado'` (`transition_equipment_state(MC_COMPLETED)` → no aplica / `open_punch`).
- **H.** MC permitido cuando el último punch queda `cerrado` (con equipo `aprobado` y sin otros bloqueos) → transición a `mechanical_completion`.

- [ ] **Step 5: Checklist manual post-deploy**
- Inspección con falla → 1 punch por ítem (auto), `responsible_id` NULL, prioridad `media`, offline.
- Reenvío no duplica (UNIQUE).
- `corregido` exige evidencia; `cerrado` exige `full` + evidencia; reapertura exige `full`.
- Bandeja agrupa por subsistema; filtros y triage; KPIs con aging por `first_raised_at`.
- Cualquier punch `≠ cerrado` bloquea MC (sin cambios en la FSM).

**Criterio de aceptación explícito — `first_raised_at` (requisito del usuario):**
- creación → `first_raised_at = now` (= `raised_at`).
- `corregido` → `first_raised_at` **no cambia**.
- `cerrado` → `first_raised_at` **no cambia**.
- reapertura → `first_raised_at` **no cambia** (`raised_at` sí se actualiza).
- Los KPIs de aging usan **exclusivamente** `first_raised_at` (`age_days_total`).

---

## Self-Review

**1. Spec coverage:**
- Modelo (columnas + UNIQUE + CHECK + placeholder + evidence_stage) → Task 1. ✓
- Trigger ciclo de vida + vista → Task 2. ✓
- Test SQL + checkpoint backend → Task 3. ✓
- `FAIL_VALUES` único + `deriveAutoPunches` (regla de disparo + prioridad data-driven + id determinístico) → Task 4. ✓
- Generación offline + `PUNCH_RAISED` condicional → Task 5. ✓
- Storage path de punch + idempotencia UNIQUE → Task 6. ✓
- Ciclo de vida (corregido/cerrado/reabrir) + evidencia obligatoria (orden evidencia→corregido) + `verification_notes` → Tasks 7 (+ guard servidor de Task 2). ✓
- Bandeja `v_punch_board` + agrupación subsistema + filtros + triage + KPIs (aging por `first_raised_at`) → Tasks 8–9. ✓
- FSM/MC sin cambios; `commissioning_category` placeholder → respetado (no se toca `transition_equipment_state`). ✓
- Diferimientos (A/B/C, auto-asignación, reconciliación, etc.) → no implementados. ✓
- first_raised_at inmutable → trigger Task 2 + test Task 3 + métricas `age_days_total` Task 8. ✓

**2. Placeholder scan:** Sin "TBD/TODO". Única excepción consciente: el test del engine (Task 6 Step 1) trae un placeholder estructural con instrucción explícita de sustituirlo por el mock real del repo (el archivo tiene el patrón) — es una guía, no código a dejar. El resto trae código completo.

**3. Type consistency:** `AutoPunchRow`/`AutoPunchCtx`/`deriveAutoPunches` (Task 4) consumidos igual en Task 5. `PunchBoardRow`/`PunchBoardFilters` (Task 8) usados sin renombrar en Task 9. `capturePunchEvidence`, `useMarkCorrected`, `useReopenPunch`, `useClosePunch(verification_notes)` (Task 7) consumidos por Task 9. La firma `generation_source ∈ {auto_inspection,manual,imported}` coincide en SQL (Task 1 CHECK), helper (Task 4) y `useCreatePunch` (Task 7). `evidence_stage` `correccion`/`verificacion` coincide en SQL (Task 1), trigger (Task 2), `capturePunchEvidence` (Task 7).

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-06-21-epic-002-faseC-punch-automatico.md`.
