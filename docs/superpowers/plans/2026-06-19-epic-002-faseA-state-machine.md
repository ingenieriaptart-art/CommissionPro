# EPIC-002 · Fase A — Máquina de Estados del Equipo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la máquina de estados canónica del equipo (FSM cliente + motor autoritativo en servidor + audit trail), reemplazando el flag `form_pct`, con re-validación de transiciones en sync.

**Architecture:** La FSM se define como módulo TS puro (cliente, para UX y aplicación optimista offline) y como RPC `transition_equipment_state` en Postgres (autoritativo: valida guards + G-OFFLINE y escribe el historial). Las transiciones viajan por el outbox offline existente; el push las aplica vía RPC. Cada transición aplicada/rechazada queda en `equipment_status_history` (append-only).

**Tech Stack:** Next.js 16 / TypeScript, Dexie (IndexedDB), Supabase (Postgres, RPC SECURITY DEFINER), Vitest + fake-indexeddb.

## Global Constraints

- **Base de rama:** `feat/offline-inspections` (PR #2). Fase A **apila sobre PR #2** porque toca `lib/sync/submitInspection.ts` y `lib/sync/engine.ts`. (Si PR #2 se mergea a `master` antes, ramificar Fase A desde `master` — mismos archivos.)
- Estados canónicos (enum `equipment_status`): `pendiente, en_ejecucion, aprobado, mechanical_completion*, listo_energizacion, listo_arranque, operativo, rechazado, bloqueado`. **Único valor nuevo: `mechanical_completion`.**
- Estados derivados (`hasOpenPunch`, `approvalsComplete`, `everInspected`) **no** son estados de la FSM: son flags que alimentan guards.
- `PUNCH_RAISED` sobre `mechanical_completion` ⇒ auto-revoca a `aprobado` (invariante MC ⇒ sin punch). Sobre RFC/RFSU no auto-revoca.
- **G-OFFLINE:** toda transición se re-valida en el servidor; una transición contra estado obsoleto se **rechaza** (no LWW ciego) y se registra.
- **Audit trail:** `equipment_status_history` append-only; registra transiciones `applied` **y** `rejected`, con `context` (test_id/punch_id) para trazabilidad.
- Migraciones: auto-detectar siguiente número (`max(NNNN)+1`; en esta rama max=0047 → 0048/0049). No tocar otras RLS.
- `equipment_status` es columna existente (`equipment.status`). RFC=`listo_energizacion`, RFSU=`listo_arranque` ya existen.
- Trabajar desde `C:\Users\USUARIO\Documents\CodigoIA\PrecomisionamientoProjects`; app en `app/`; tests `cd app && npm test`.
- Spec: `docs/superpowers/specs/2026-06-19-epic-002-faseA-state-machine-design.md`.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `database/migrations/<NNNN>_equipment_state_machine.sql` | enum `+mechanical_completion` + tabla `equipment_status_history` + índices + RLS |
| `database/migrations/<NNNN+1>_fn_transition_equipment_state.sql` | RPC autoritativo `transition_equipment_state` + vista `v_equipment_timeline` |
| `app/src/lib/state/equipmentFsm.ts` | FSM pura: `nextState`, `allowedEvents`, `equipmentColor`, tipos |
| `app/src/lib/db/local.ts` | `enqueueTransition(...)` (outbox de transición) |
| `app/src/lib/sync/engine.ts` | push maneja op `__equipment_transition` vía RPC (drop si `rejected`) |
| `app/src/lib/sync/submitInspection.ts` | emite `INSPECTION_EXECUTED` por la FSM en vez del status hardcodeado |
| `app/src/lib/state/__tests__/equipmentFsm.test.ts` | matriz completa + invariantes |
| `app/src/lib/sync/__tests__/engine.transition.test.ts` | push de transición (rpc mock) |

---

### Task 1: Migración — enum + tabla de historial

**Files:**
- Create: `database/migrations/<NNNN>_equipment_state_machine.sql` (NNNN = siguiente nº libre)

- [ ] **Step 1: Detectar el número de migración**

Run (raíz): `ls database/migrations | grep -oE '^[0-9]{4}' | sort -n | tail -1`
Usar `NNNN = printf "%04d" $((10#<max>+1))` (en esta rama: 0048).

- [ ] **Step 2: Escribir la migración**

```sql
-- ============================================================
-- <NNNN> — Máquina de estados del equipo: enum + historial
-- ============================================================
-- ALTER TYPE ADD VALUE no puede usarse en la misma tx que lo consume,
-- por eso el valor nuevo va aquí y el RPC en la migración siguiente.
ALTER TYPE public.equipment_status ADD VALUE IF NOT EXISTS 'mechanical_completion' AFTER 'aprobado';

BEGIN;

CREATE TABLE IF NOT EXISTS public.equipment_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_status  public.equipment_status,
  to_status    public.equipment_status,
  event        text NOT NULL,
  guard_result text NOT NULL CHECK (guard_result IN ('applied','rejected')),
  reason       text,
  actor_id     uuid REFERENCES public.users(id),
  source       text NOT NULL DEFAULT 'online' CHECK (source IN ('online','offline_sync')),
  context      jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  applied_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eq_status_hist_eq   ON public.equipment_status_history(equipment_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_eq_status_hist_proj ON public.equipment_status_history(project_id, applied_at);

ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;

-- Append-only: lectura por miembros del proyecto; insert por miembros; sin update/delete.
CREATE POLICY "esh_select" ON public.equipment_status_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = public.app_current_user_id() AND pm.project_id = equipment_status_history.project_id
  ) OR public.app_is_admin());

CREATE POLICY "esh_insert" ON public.equipment_status_history
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = public.app_current_user_id() AND pm.project_id = equipment_status_history.project_id
  ) OR public.app_is_admin());

COMMENT ON TABLE public.equipment_status_history IS
  'Audit trail append-only de transiciones de estado del equipo (applied/rejected).';

COMMIT;
```

- [ ] **Step 3: Verificar forma**

Run: `grep -c "IF NOT EXISTS" database/migrations/<NNNN>_equipment_state_machine.sql`
Expected: ≥4. Confirmar que `ADD VALUE` está **fuera** del `BEGIN/COMMIT`.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/<NNNN>_equipment_state_machine.sql
git commit -m "db: enum mechanical_completion + equipment_status_history (audit trail)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: RPC autoritativo `transition_equipment_state`

**Files:**
- Create: `database/migrations/<NNNN+1>_fn_transition_equipment_state.sql`

**Interfaces:**
- Produces: `transition_equipment_state(p_equipment_id uuid, p_event text, p_from_status text, p_reason text, p_context jsonb, p_occurred_at timestamptz, p_source text) RETURNS jsonb` → `{ applied: bool, status: <equipment_status>, reason: text }`.

- [ ] **Step 1: Escribir la migración del RPC**

```sql
-- ============================================================
-- <NNNN+1> — RPC autoritativo de transición de estado + timeline
-- Valida la FSM (mismas reglas que lib/state/equipmentFsm.ts) y G-OFFLINE.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.transition_equipment_state(
  p_equipment_id uuid,
  p_event        text,
  p_from_status  text,
  p_reason       text DEFAULT NULL,
  p_context      jsonb DEFAULT NULL,
  p_occurred_at  timestamptz DEFAULT now(),
  p_source       text DEFAULT 'online'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cur     public.equipment_status;
  v_proj    uuid;
  v_to      public.equipment_status;
  v_open    int;
  v_appr    boolean;
  v_ever    boolean;
  v_reason  text := NULL;
BEGIN
  SELECT status, project_id INTO v_cur, v_proj
    FROM public.equipment WHERE id = p_equipment_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'status', NULL, 'reason', 'equipment_not_found');
  END IF;

  -- G-OFFLINE: la transición se calculó contra un estado que ya cambió en servidor
  IF p_from_status IS NOT NULL AND p_from_status <> v_cur::text THEN
    INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
    VALUES (p_equipment_id, v_proj, v_cur, NULL, p_event, 'rejected', 'stale_state', app_current_user_id(), p_source, p_context, p_occurred_at);
    RETURN jsonb_build_object('applied', false, 'status', v_cur, 'reason', 'stale_state');
  END IF;

  -- Flags derivados
  SELECT count(*) INTO v_open FROM public.punch_items
    WHERE equipment_id = p_equipment_id AND deleted_at IS NULL AND status NOT IN ('verificado','cerrado');
  SELECT EXISTS(SELECT 1 FROM public.tests t WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
                AND t.status IN ('aprob_supervisor','aprob_qaqc','aprob_cliente','cerrado')) INTO v_appr;
  SELECT EXISTS(SELECT 1 FROM public.tests t WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
                AND t.status <> 'borrador') INTO v_ever;

  -- Matriz de transición (espejo de equipmentFsm.ts)
  v_to := NULL;
  IF p_event = 'BLOCK' AND v_cur <> 'operativo' AND v_cur <> 'bloqueado' THEN
    v_to := 'bloqueado';
  ELSIF p_event = 'UNBLOCK' AND v_cur = 'bloqueado' THEN
    v_to := CASE WHEN v_ever THEN 'en_ejecucion' ELSE 'pendiente' END;
  ELSIF p_event = 'PUNCH_RAISED' AND v_cur = 'mechanical_completion' THEN
    v_to := 'aprobado';
  ELSE
    v_to := CASE
      WHEN v_cur = 'pendiente'    AND p_event = 'INSPECTION_EXECUTED' THEN 'en_ejecucion'
      WHEN v_cur = 'pendiente'    AND p_event = 'EQUIPMENT_REJECTED'  THEN 'rechazado'
      WHEN v_cur = 'en_ejecucion' AND p_event = 'INSPECTION_APPROVED' AND v_appr THEN 'aprobado'
      WHEN v_cur = 'en_ejecucion' AND p_event = 'EQUIPMENT_REJECTED'  THEN 'rechazado'
      WHEN v_cur = 'aprobado'     AND p_event = 'MC_COMPLETED' AND v_open = 0 THEN 'mechanical_completion'
      WHEN v_cur = 'aprobado'     AND p_event = 'INSPECTION_REJECTED' THEN 'en_ejecucion'
      WHEN v_cur = 'aprobado'     AND p_event = 'INSPECTION_EXECUTED' THEN 'en_ejecucion'
      WHEN v_cur = 'aprobado'     AND p_event = 'EQUIPMENT_REJECTED'  THEN 'rechazado'
      WHEN v_cur = 'mechanical_completion' AND p_event = 'RFC_GRANTED' THEN 'listo_energizacion'
      WHEN v_cur = 'mechanical_completion' AND p_event = 'MC_REVOKED'  THEN 'aprobado'
      WHEN v_cur = 'mechanical_completion' AND p_event = 'EQUIPMENT_REJECTED' THEN 'rechazado'
      WHEN v_cur = 'listo_energizacion' AND p_event = 'RFSU_GRANTED' THEN 'listo_arranque'
      WHEN v_cur = 'listo_energizacion' AND p_event = 'RFC_REVOKED'  THEN 'mechanical_completion'
      WHEN v_cur = 'listo_arranque' AND p_event = 'COMMISSIONED'  THEN 'operativo'
      WHEN v_cur = 'listo_arranque' AND p_event = 'RFSU_REVOKED'  THEN 'listo_energizacion'
      WHEN v_cur = 'rechazado'   AND p_event = 'EQUIPMENT_REOPENED' THEN 'en_ejecucion'
      ELSE NULL
    END;
  END IF;

  IF v_to IS NULL THEN
    IF p_event = 'INSPECTION_APPROVED' AND v_cur = 'en_ejecucion' AND NOT v_appr THEN v_reason := 'approvals_incomplete';
    ELSIF p_event = 'MC_COMPLETED' AND v_cur = 'aprobado' AND v_open > 0 THEN v_reason := 'open_punch';
    ELSE v_reason := 'not_allowed'; END IF;
    INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
    VALUES (p_equipment_id, v_proj, v_cur, NULL, p_event, 'rejected', v_reason, app_current_user_id(), p_source, p_context, p_occurred_at);
    RETURN jsonb_build_object('applied', false, 'status', v_cur, 'reason', v_reason);
  END IF;

  UPDATE public.equipment SET status = v_to, updated_at = now() WHERE id = p_equipment_id;
  INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
  VALUES (p_equipment_id, v_proj, v_cur, v_to, p_event, 'applied', p_reason, app_current_user_id(), p_source, p_context, p_occurred_at);
  RETURN jsonb_build_object('applied', true, 'status', v_to, 'reason', NULL);
END $$;

CREATE OR REPLACE VIEW public.v_equipment_timeline AS
  SELECT h.equipment_id, h.occurred_at, h.from_status, h.to_status, h.event, h.guard_result,
         h.reason, h.actor_id, h.source, h.context
  FROM public.equipment_status_history h
  ORDER BY h.equipment_id, h.occurred_at;

COMMIT;
```

- [ ] **Step 2: Inspección de forma**

Run: `grep -c "WHEN v_cur" database/migrations/<NNNN+1>_fn_transition_equipment_state.sql`
Expected: 16 (las 16 reglas de la matriz, sin contar BLOCK/UNBLOCK/PUNCH que van aparte).

- [ ] **Step 3: Commit**

```bash
git add database/migrations/<NNNN+1>_fn_transition_equipment_state.sql
git commit -m "db: RPC transition_equipment_state (FSM autoritativa + G-OFFLINE) + v_equipment_timeline

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Módulo FSM cliente (puro) + tests

**Files:**
- Create: `app/src/lib/state/equipmentFsm.ts`, `app/src/lib/state/__tests__/equipmentFsm.test.ts`

**Interfaces:**
- Produces: `EquipmentState`, `EquipmentEvent`, `DerivedFlags`, `TwinColor`; `nextState(state,event,flags): EquipmentState|null`; `allowedEvents(state,flags): EquipmentEvent[]`; `equipmentColor(state, hasOpenPunch): TwinColor`; `TERMINAL: ReadonlySet<EquipmentState>`.

- [ ] **Step 1: Test (RED) `equipmentFsm.test.ts`**

```ts
import { test, expect } from "vitest";
import { nextState, allowedEvents, equipmentColor, TERMINAL } from "@/lib/state/equipmentFsm";
import type { DerivedFlags } from "@/lib/state/equipmentFsm";

const F = (p: Partial<DerivedFlags> = {}): DerivedFlags =>
  ({ hasOpenPunch: false, approvalsComplete: false, everInspected: false, ...p });

test("pendiente → en_ejecucion con INSPECTION_EXECUTED", () => {
  expect(nextState("pendiente", "INSPECTION_EXECUTED", F())).toBe("en_ejecucion");
});

test("G1: en_ejecucion→aprobado solo si approvalsComplete", () => {
  expect(nextState("en_ejecucion", "INSPECTION_APPROVED", F({ approvalsComplete: false }))).toBeNull();
  expect(nextState("en_ejecucion", "INSPECTION_APPROVED", F({ approvalsComplete: true }))).toBe("aprobado");
});

test("G2: aprobado→MC solo si sin punch abierto", () => {
  expect(nextState("aprobado", "MC_COMPLETED", F({ hasOpenPunch: true }))).toBeNull();
  expect(nextState("aprobado", "MC_COMPLETED", F({ hasOpenPunch: false }))).toBe("mechanical_completion");
});

test("auto-revocación: PUNCH_RAISED en MC → aprobado; en aprobado → null", () => {
  expect(nextState("mechanical_completion", "PUNCH_RAISED", F())).toBe("aprobado");
  expect(nextState("aprobado", "PUNCH_RAISED", F())).toBeNull();
});

test("saltos prohibidos → null", () => {
  expect(nextState("pendiente", "MC_COMPLETED", F({ hasOpenPunch: false }))).toBeNull();
  expect(nextState("en_ejecucion", "RFC_GRANTED", F())).toBeNull();
  expect(nextState("aprobado", "RFC_GRANTED", F())).toBeNull();
});

test("avance de hitos MC→RFC→RFSU→operativo", () => {
  expect(nextState("mechanical_completion", "RFC_GRANTED", F())).toBe("listo_energizacion");
  expect(nextState("listo_energizacion", "RFSU_GRANTED", F())).toBe("listo_arranque");
  expect(nextState("listo_arranque", "COMMISSIONED", F())).toBe("operativo");
});

test("operativo es terminal", () => {
  expect(TERMINAL.has("operativo")).toBe(true);
  for (const e of ["INSPECTION_EXECUTED","MC_REVOKED","BLOCK"] as const) {
    expect(nextState("operativo", e, F())).toBeNull();
  }
});

test("BLOCK/UNBLOCK", () => {
  expect(nextState("en_ejecucion", "BLOCK", F())).toBe("bloqueado");
  expect(nextState("bloqueado", "UNBLOCK", F({ everInspected: true }))).toBe("en_ejecucion");
  expect(nextState("bloqueado", "UNBLOCK", F({ everInspected: false }))).toBe("pendiente");
});

test("colores del Twin", () => {
  expect(equipmentColor("pendiente", false)).toBe("gris");
  expect(equipmentColor("en_ejecucion", false)).toBe("amarillo");
  expect(equipmentColor("en_ejecucion", true)).toBe("naranja");
  expect(equipmentColor("aprobado", true)).toBe("naranja");
  expect(equipmentColor("aprobado", false)).toBe("azul");
  expect(equipmentColor("mechanical_completion", false)).toBe("verde");
  expect(equipmentColor("rechazado", false)).toBe("rojo");
  expect(equipmentColor("bloqueado", false)).toBe("rojo");
});

test("allowedEvents en aprobado depende de punch", () => {
  expect(allowedEvents("aprobado", F({ hasOpenPunch: false }))).toContain("MC_COMPLETED");
  expect(allowedEvents("aprobado", F({ hasOpenPunch: true }))).not.toContain("MC_COMPLETED");
});
```

- [ ] **Step 2: Verificar RED**

Run (app/): `npm test -- src/lib/state/__tests__/equipmentFsm.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `equipmentFsm.ts`**

```ts
export type EquipmentState =
  | "pendiente" | "en_ejecucion" | "aprobado" | "mechanical_completion"
  | "listo_energizacion" | "listo_arranque" | "operativo" | "rechazado" | "bloqueado";

export type EquipmentEvent =
  | "INSPECTION_EXECUTED" | "INSPECTION_APPROVED" | "INSPECTION_REJECTED"
  | "PUNCH_RAISED" | "PUNCH_CLEARED" | "MC_COMPLETED" | "MC_REVOKED"
  | "RFC_GRANTED" | "RFC_REVOKED" | "RFSU_GRANTED" | "RFSU_REVOKED"
  | "COMMISSIONED" | "EQUIPMENT_REJECTED" | "EQUIPMENT_REOPENED" | "BLOCK" | "UNBLOCK";

export interface DerivedFlags {
  hasOpenPunch: boolean;
  approvalsComplete: boolean;
  everInspected: boolean;
}

export type TwinColor = "gris" | "amarillo" | "naranja" | "azul" | "verde" | "rojo";

export const TERMINAL: ReadonlySet<EquipmentState> = new Set<EquipmentState>(["operativo"]);

const ALL_EVENTS: EquipmentEvent[] = [
  "INSPECTION_EXECUTED","INSPECTION_APPROVED","INSPECTION_REJECTED","PUNCH_RAISED","PUNCH_CLEARED",
  "MC_COMPLETED","MC_REVOKED","RFC_GRANTED","RFC_REVOKED","RFSU_GRANTED","RFSU_REVOKED",
  "COMMISSIONED","EQUIPMENT_REJECTED","EQUIPMENT_REOPENED","BLOCK","UNBLOCK",
];

type Rule = { from: EquipmentState; event: EquipmentEvent; to: EquipmentState; guard?: (f: DerivedFlags) => boolean };
const RULES: Rule[] = [
  { from: "pendiente",    event: "INSPECTION_EXECUTED", to: "en_ejecucion" },
  { from: "pendiente",    event: "EQUIPMENT_REJECTED",  to: "rechazado" },
  { from: "en_ejecucion", event: "INSPECTION_APPROVED", to: "aprobado", guard: (f) => f.approvalsComplete },
  { from: "en_ejecucion", event: "EQUIPMENT_REJECTED",  to: "rechazado" },
  { from: "aprobado",     event: "MC_COMPLETED",        to: "mechanical_completion", guard: (f) => !f.hasOpenPunch },
  { from: "aprobado",     event: "INSPECTION_REJECTED", to: "en_ejecucion" },
  { from: "aprobado",     event: "INSPECTION_EXECUTED", to: "en_ejecucion" },
  { from: "aprobado",     event: "EQUIPMENT_REJECTED",  to: "rechazado" },
  { from: "mechanical_completion", event: "RFC_GRANTED", to: "listo_energizacion" },
  { from: "mechanical_completion", event: "MC_REVOKED",  to: "aprobado" },
  { from: "mechanical_completion", event: "EQUIPMENT_REJECTED", to: "rechazado" },
  { from: "listo_energizacion", event: "RFSU_GRANTED", to: "listo_arranque" },
  { from: "listo_energizacion", event: "RFC_REVOKED",  to: "mechanical_completion" },
  { from: "listo_arranque", event: "COMMISSIONED", to: "operativo" },
  { from: "listo_arranque", event: "RFSU_REVOKED", to: "listo_energizacion" },
  { from: "rechazado",    event: "EQUIPMENT_REOPENED", to: "en_ejecucion" },
];

/** Estado destino si la transición es válida (con guards), o null si es no-op/prohibida. */
export function nextState(state: EquipmentState, event: EquipmentEvent, flags: DerivedFlags): EquipmentState | null {
  if (TERMINAL.has(state)) return null;
  if (event === "BLOCK") return state === "bloqueado" ? null : "bloqueado";
  if (state === "bloqueado") return event === "UNBLOCK" ? (flags.everInspected ? "en_ejecucion" : "pendiente") : null;
  if (event === "PUNCH_RAISED") return state === "mechanical_completion" ? "aprobado" : null;
  if (event === "PUNCH_CLEARED") return null;
  const rule = RULES.find((r) => r.from === state && r.event === event && (r.guard ? r.guard(flags) : true));
  return rule ? rule.to : null;
}

/** Eventos que producen una transición desde el estado dado (para gating de UI). */
export function allowedEvents(state: EquipmentState, flags: DerivedFlags): EquipmentEvent[] {
  return ALL_EVENTS.filter((e) => nextState(state, e, flags) !== null);
}

/** Color del Digital Twin (estado canónico + punch abierto). */
export function equipmentColor(state: EquipmentState, hasOpenPunch: boolean): TwinColor {
  if (state === "rechazado" || state === "bloqueado") return "rojo";
  if (hasOpenPunch && (state === "en_ejecucion" || state === "aprobado")) return "naranja";
  switch (state) {
    case "pendiente": return "gris";
    case "en_ejecucion": return "amarillo";
    case "aprobado": return "azul";
    default: return "verde"; // mechanical_completion / RFC / RFSU / operativo
  }
}
```

- [ ] **Step 4: Verificar GREEN**

Run (app/): `npm test -- src/lib/state/__tests__/equipmentFsm.test.ts`
Expected: todos los `test(...)` PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/state/equipmentFsm.ts app/src/lib/state/__tests__/equipmentFsm.test.ts
git commit -m "feat(mc): FSM cliente del estado del equipo (pura, testeada)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Outbox de transición + manejo en el motor

**Files:**
- Modify: `app/src/lib/db/local.ts` (helper `enqueueTransition`)
- Modify: `app/src/lib/sync/engine.ts` (manejar op `__equipment_transition`)
- Test: `app/src/lib/sync/__tests__/engine.transition.test.ts`

**Interfaces:**
- Consumes: `enqueueSync` existente.
- Produces: `enqueueTransition(equipmentId, event, fromStatus, context?, occurredAt?)`; el push llama `supabase.rpc('transition_equipment_state', {...})`; op `rejected` se **descarta** (resuelta) reconciliando `localDB.equipment.status` al estado servidor; error transitorio → reintenta.

- [ ] **Step 1: Helper en `local.ts`**

Tras `enqueueSync`, agregar:
```ts
export async function enqueueTransition(
  equipmentId: string,
  event: string,
  fromStatus: string,
  context?: unknown,
  occurredAt?: string,
): Promise<void> {
  await enqueueSync("__equipment_transition", equipmentId, "INSERT", {
    equipment_id: equipmentId, event, from_status: fromStatus,
    context: context ?? null, occurred_at: occurredAt ?? new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Test (RED) `engine.transition.test.ts`**

```ts
import { test, expect, beforeEach } from "vitest";
import { pushPendingOps } from "@/lib/sync/engine";
import { localDB } from "@/lib/db/local";

beforeEach(async () => {
  await Promise.all([localDB.syncQueue.clear(), localDB.equipment.clear()]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.equipment.put({ id: "e1", project_id: "p1", tag: "B1", status: "en_ejecucion", sync_status: "synced" } as any);
});

function mockRpc(result: { applied: boolean; status: string; reason: string | null }, opts: { fail?: boolean } = {}) {
  const calls: { fn: string; args: unknown }[] = [];
  return {
    _calls: calls,
    from() { return { upsert: async () => ({ error: null }), update() { return { eq: async () => ({ error: null }) }; } }; },
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      if (opts.fail) return { data: null, error: { message: "net" } };
      return { data: result, error: null };
    },
    storage: { from() { return { upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "x" } }) }; } },
  };
}

test("transición applied: llama rpc, descarta op, reconcilia status", async () => {
  await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: "e1", operation: "INSERT",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { equipment_id: "e1", event: "INSPECTION_EXECUTED", from_status: "pendiente", occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
  const sb = mockRpc({ applied: true, status: "en_ejecucion", reason: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await pushPendingOps(sb as any);
  expect(res.pushed).toBe(1);
  expect(sb._calls[0].fn).toBe("transition_equipment_state");
  expect(await localDB.syncQueue.count()).toBe(0);
  expect((await localDB.equipment.get("e1"))?.status).toBe("en_ejecucion");
});

test("transición rejected (stale): descarta op y reconcilia al estado servidor", async () => {
  await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: "e1", operation: "INSERT",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { equipment_id: "e1", event: "MC_COMPLETED", from_status: "aprobado", occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
  const sb = mockRpc({ applied: false, status: "aprobado", reason: "open_punch" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await pushPendingOps(sb as any);
  expect(res.pushed).toBe(0);
  expect(await localDB.syncQueue.count()).toBe(0); // resuelta, no se reintenta
  expect((await localDB.equipment.get("e1"))?.status).toBe("aprobado");
});

test("error de red: la op permanece para reintento", async () => {
  await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: "e1", operation: "INSERT",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { equipment_id: "e1", event: "INSPECTION_EXECUTED", from_status: "pendiente", occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
  const sb = mockRpc({ applied: true, status: "en_ejecucion", reason: null }, { fail: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pushPendingOps(sb as any);
  expect((await localDB.syncQueue.toArray())[0].attempts).toBe(1);
});
```

- [ ] **Step 3: Verificar RED**

Run (app/): `npm test -- src/lib/sync/__tests__/engine.transition.test.ts`
Expected: FAIL (el motor aún no maneja `__equipment_transition`).

- [ ] **Step 4: Manejar la op en `pushPendingOps` (`engine.ts`)**

Dentro del `for (const op of ops)`, **antes** del bloque `if (op.operation === "INSERT" || ...)`, insertar el caso especial:

```ts
      if (op.entity === "__equipment_transition") {
        const p = op.payload as { equipment_id: string; event: string; from_status: string; context: unknown; occurred_at: string };
        const { data, error } = await supabase.rpc("transition_equipment_state", {
          p_equipment_id: p.equipment_id, p_event: p.event, p_from_status: p.from_status,
          p_reason: null, p_context: p.context, p_occurred_at: p.occurred_at, p_source: "offline_sync",
        });
        if (error) throw error;                        // transitorio → reintento
        const result = data as { applied: boolean; status: string };
        await localDB.equipment.update(p.equipment_id, { status: result.status } as never); // reconciliar
        await localDB.syncQueue.delete(op.id!);        // resuelta (applied o rejected)
        pushed += result.applied ? 1 : 0;
        continue;
      }
```

(El `try { ... } catch` existente envuelve esto; `throw error` cae al catch → backoff. La actualización de `sync_status` syncing/synced no aplica a esta op porque no es una entidad con tabla local — `localTableFor('__equipment_transition')` devuelve undefined, ya manejado.)

- [ ] **Step 5: Verificar GREEN**

Run (app/): `npm test -- src/lib/sync/__tests__/engine.transition.test.ts`
Expected: 3 PASS.
Run (app/): `npm test` (suite completa) → todo verde (no regresión en engine.test.ts).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/db/local.ts app/src/lib/sync/engine.ts app/src/lib/sync/__tests__/engine.transition.test.ts
git commit -m "feat(mc): outbox de transicion + push via RPC autoritativo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Emitir `INSPECTION_EXECUTED` desde el submit

**Files:**
- Modify: `app/src/lib/sync/submitInspection.ts`, `app/src/hooks/useSubmitInspection.ts`
- Modify: `app/src/lib/sync/__tests__/submitInspection.test.ts`

**Interfaces:**
- Consumes: `nextState` (FSM), `enqueueTransition`.
- Produces: en lugar de `enqueueSync("equipment","UPDATE",{status:'en_ejecucion'...})`, el submit calcula `nextState(eq.status,"INSPECTION_EXECUTED",flags)`, actualiza el status local y encola la transición. `SubmitDeps` gana `nextState` y `enqueueTransition`.

- [ ] **Step 1: Actualizar el patch de equipo en `submitInspection.ts`**

Reemplazar el bloque (líneas ~99–108, "Estado del equipo (local + outbox)") por:
```ts
  // Estado del equipo vía FSM (emite INSPECTION_EXECUTED; el servidor re-valida)
  const eq = await db.equipment.get(state.equipmentId);
  const fromStatus = (eq?.status as string) ?? "pendiente";
  const target = deps.nextState(fromStatus, "INSPECTION_EXECUTED");
  if (target && target !== fromStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.equipment.update(state.equipmentId, { status: target, updated_at: ts } as any);
    await deps.enqueueTransition(state.equipmentId, "INSPECTION_EXECUTED", fromStatus, { test_id: testId }, ts);
  }
```

Y en `SubmitDeps` agregar:
```ts
  nextState: (state: string, event: "INSPECTION_EXECUTED") => string | null;
  enqueueTransition: (equipmentId: string, event: string, fromStatus: string, context?: unknown, occurredAt?: string) => Promise<void>;
```

- [ ] **Step 2: Ajustar el test existente `submitInspection.test.ts`**

En `deps(...)`, agregar al objeto:
```ts
    nextState: (from: string) => (from === "pendiente" ? "en_ejecucion" : null),
    enqueueTransition: async (equipmentId: string, event: string, fromStatus: string, context: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await localDB.syncQueue.add({ entity: "__equipment_transition", entityId: equipmentId, operation: "INSERT", payload: { equipment_id: equipmentId, event, from_status: fromStatus, context, occurred_at: "t" }, createdAt: "t", attempts: 0 } as any);
    },
```
Y en el beforeEach poner el equipo en `status: "pendiente"` (ya está). Reemplazar la aserción que esperaba `eq.status === "en_ejecucion"` por: el equipo local pasa a `en_ejecucion` **y** existe una op `__equipment_transition` en la cola:
```ts
  const eq = await localDB.equipment.get("e1");
  expect(eq?.status).toBe("en_ejecucion");
  const q = await localDB.syncQueue.toArray();
  expect(q.find((o) => o.entity === "__equipment_transition")).toBeTruthy();
```
(Quitar la aserción de `metadata.form_pct === 100`: el form_pct se reemplaza por la FSM.)

- [ ] **Step 3: Inyectar deps reales en el hook `useSubmitInspection.ts`**

Agregar imports `import { nextState } from "@/lib/state/equipmentFsm";` y `enqueueTransition` desde `@/lib/db/local`. En el objeto de deps pasado a `submitInspectionOffline`, agregar:
```ts
          nextState: (from, event) => nextState(from as never, event as never, { hasOpenPunch: false, approvalsComplete: false, everInspected: true }),
          enqueueTransition,
```
(`INSPECTION_EXECUTED` no depende de flags; se pasan valores neutros.)

- [ ] **Step 4: Verificar tests + tipos**

Run (app/): `npm test -- src/lib/sync/__tests__/submitInspection.test.ts` → PASS.
Run (app/): `npx tsc --noEmit` → 0 errores.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/sync/submitInspection.ts app/src/hooks/useSubmitInspection.ts app/src/lib/sync/__tests__/submitInspection.test.ts
git commit -m "feat(mc): la inspeccion emite INSPECTION_EXECUTED por la FSM (reemplaza form_pct)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Aplicar en Supabase y verificar

**Files:** ninguno (operación de BD + verificación).

- [ ] **Step 1: Aplicar migraciones en orden**

En el SQL Editor de Supabase: `<NNNN>_equipment_state_machine.sql` y luego `<NNNN+1>_fn_transition_equipment_state.sql`.

- [ ] **Step 2: Verificar enum + tabla**

```sql
SELECT unnest(enum_range(NULL::public.equipment_status))::text AS estado; -- incluye mechanical_completion
SELECT to_regclass('public.equipment_status_history');                    -- no NULL
```

- [ ] **Step 3: Probar el RPC (transición + rechazo)**

```sql
-- Tomar un equipo pendiente del proyecto LDC y ejecutar:
SELECT public.transition_equipment_state('<equipment_id>', 'INSPECTION_EXECUTED', 'pendiente', NULL, NULL, now(), 'online');
-- → { applied:true, status:"en_ejecucion" }
SELECT public.transition_equipment_state('<equipment_id>', 'MC_COMPLETED', 'en_ejecucion', NULL, NULL, now(), 'online');
-- → { applied:false, reason:"not_allowed" } (salto prohibido)
SELECT * FROM public.v_equipment_timeline WHERE equipment_id = '<equipment_id>';
-- → 1 fila applied + 1 rejected
```

- [ ] **Step 4: Verificación en app (manual)**

Ejecutar una inspección de un equipo `pendiente` → al guardar (online), el equipo pasa a `en_ejecucion` y aparece una fila `applied` en `equipment_status_history` con `context.test_id`.

---

## Notas de implementación

- **Doble fuente de la matriz (TS + SQL):** la FSM vive en `equipmentFsm.ts` (testeada) y se
  replica en el RPC. Mantener ambas en sync; el RPC es **autoritativo**. Un cambio futuro de la
  matriz toca los dos. (Aceptado: el offline-first exige aplicación optimista en cliente.)
- **G1 (`approvalsComplete`) en Fase A** usa `test_status ∈ {aprob_*, cerrado}`. **Fase B** lo
  reemplaza por `project_approval_config`.
- **Eventos no emitidos aún:** Fase A solo emite `INSPECTION_EXECUTED`. El resto de la matriz
  queda definida y validada para que Fases B–D solo *emitan* eventos (aprobación, MC, punch).
- **`form_pct`:** queda obsoleto; Fase F (dashboard) lo retira del rollup. No se borra la columna
  `metadata.form_pct` en Fase A (evita romper la UI actual que lo lee hasta Fase F).
- Si `npx next build --webpack` se corre, verificar `git status` por archivos nuevos no trackeados (lección previa: Vercel falla con imports untracked).
