# EPIC-002 · Fase B — Cadena de Aprobación Configurable · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalizar la aprobación multinivel de inspecciones con una cadena configurable por proyecto (1–3 niveles), conectada a la FSM de Fase A: cuando todas las inspecciones vigentes de un equipo completan su cadena obligatoria, el equipo pasa a `aprobado`; el rechazo expone rework (`INSPECTION_REJECTED`) y rechazo duro (`EQUIPMENT_REJECTED`).

**Architecture:** El servidor es la única autoridad (igual que Fase A). Un RPC atómico `approve_inspection` valida permiso+rol+orden, escribe `approvals`+`signatures`, actualiza el espejo `tests.status`, recalcula la completitud de la cadena por config y dispara `transition_equipment_state` cuando corresponde. El guard G1 de la FSM deja de mirar el enum y pasa a completitud por config sobre inspecciones **vigentes** (mayor `revision`, no rechazada, por `(equipment_id, template_id)`). El cliente solo invoca el RPC (online-only) y refleja el resultado; un helper puro espeja la completitud para gating de UI.

**Tech Stack:** PostgreSQL 16 / Supabase (SQL migrations, `SECURITY DEFINER` RPC, RLS), Next.js App Router (React Server/Client Components), TypeScript, Supabase JS client, `signature_pad` v5, Vitest, Dexie/IndexedDB (offline submit).

## Global Constraints

- **Numeración de migraciones:** max actual = `0050`. Nuevas: `0051` (modelo) y `0052` (RPC + G1 + vista). Verificar con `ls database/migrations` antes de crear.
- **Roles existentes (`roles.key`):** `admin`, `supervisor`, `tecnico`, `cliente`. NO existen `qaqc`/`director` — la seed default usa `supervisor`. No crear roles nuevos en Fase B.
- **`test_status` enum (fijo, no ampliar):** `borrador, ejecutado, revisado, aprob_supervisor, aprob_qaqc, aprob_cliente, cerrado, rechazado`.
- **`approval_status` enum (fijo):** `pendiente, aprobado, rechazado`.
- **Online-only:** aprobar/rechazar exige conexión; el cliente bloquea si `!navigator.onLine`.
- **Autoridad servidor:** ninguna mutación de estado del equipo ocurre en cliente salvo el optimismo ya existente de Fase A. La aprobación NO es optimista: espera la respuesta del RPC.
- **Idempotencia SQL:** todas las migraciones usan `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS` antes de `CREATE POLICY` (ver `0049` como referencia).
- **App router / Next.js custom:** este Next.js tiene breaking changes; antes de escribir páginas/rutas, leer la guía relevante en `app/node_modules/next/dist/docs/` (regla de `app/AGENTS.md`).
- **Helpers SQL disponibles:** `app_can_full(p uuid, m text)`, `app_current_user_id()`, `transition_equipment_state(...)`, `inet_client_addr()`.
- **Migraciones se aplican manualmente** en el SQL Editor de Supabase (no hay runner automatizado). Los tests SQL son scripts transaccionales (`BEGIN … ROLLBACK`) con `RAISE EXCEPTION` como aserciones.

## File Structure

- `database/migrations/0051_project_approval_config.sql` — **crear**: tabla `project_approval_config` + RLS + seed default idempotente + `ALTER signatures ADD user_agent` + `ALTER tests ADD revision`.
- `database/migrations/0052_fn_approve_inspection.sql` — **crear**: RPC `approve_inspection` + `CREATE OR REPLACE transition_equipment_state` (G1 por config) + vista `v_inspection_approval_status` (alimenta la bandeja).
- `database/tests/0052_approve_inspection_test.sql` — **crear**: test transaccional con rollback (patrón Fase A).
- `app/src/lib/state/approvalChain.ts` — **crear**: `isApprovalChainComplete(...)` puro + tipos.
- `app/src/lib/state/__tests__/approvalChain.test.ts` — **crear**: cobertura del helper.
- `app/src/lib/sync/submitInspection.ts` — **modificar**: calcular `revision` por `(equipment_id, template_id)` y escribirla en la fila `tests`.
- `app/src/hooks/useSubmitInspection.ts` — **modificar**: cablear la dep `getMaxRevision`.
- `app/src/lib/sync/__tests__/submitInspection.test.ts` — **modificar**: caso de `revision`.
- `app/src/hooks/useInspectionApproval.ts` — **crear**: hook que llama al RPC (online-only).
- `app/src/hooks/__tests__/useInspectionApproval.test.ts` — **crear**: payload + online/offline.
- `app/src/hooks/useApprovalQueue.ts` — **crear**: lee `v_inspection_approval_status` y arma la bandeja (next pending level por test).
- `app/src/components/approval/SignaturePadField.tsx` — **crear**: canvas de firma (opcional) → dataURL.
- `app/src/components/approval/ApprovalDetail.tsx` — **crear**: detalle + acciones (aprobar/corrección/rechazar) + firma.
- `app/src/components/approval/ApprovalTray.tsx` — **crear**: lista de inspecciones con nivel pendiente accionable.
- `app/src/app/(workspace)/projects/[projectId]/approvals/page.tsx` — **crear**: ruta de la bandeja.

---

### Task 1: Migración 0051 — modelo (config + alters + seed)

**Files:**
- Create: `database/migrations/0051_project_approval_config.sql`

**Interfaces:**
- Produces: tabla `public.project_approval_config(id, project_id, level, level_name, required_role_id, test_status_on_approve, mandatory, created_at, updated_at, UNIQUE(project_id, level))`; columna `public.signatures.user_agent text`; columna `public.tests.revision int NOT NULL DEFAULT 1`. Consumidas por Tasks 2, 4, 6.

- [ ] **Step 1: Verificar numeración**

Run: `ls database/migrations | tail -3`
Expected: termina en `0050_fn_transition_equipment_state.sql` (confirma que la nueva es `0051`).

- [ ] **Step 2: Escribir la migración completa**

Create `database/migrations/0051_project_approval_config.sql`:

```sql
-- ============================================================
-- 0051 — EPIC-002 Fase B · Modelo de cadena de aprobación
-- Tabla configurable por proyecto + seed default + alters de trazabilidad.
-- Idempotente (re-ejecutable).
-- ============================================================
BEGIN;

-- 1) Tabla de configuración de la cadena (1..3 niveles por proyecto)
CREATE TABLE IF NOT EXISTS public.project_approval_config (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  level            int  NOT NULL,                       -- orden de la cadena (1,2,3)
  level_name       text NOT NULL,                       -- "Supervisor", "QA/QC", "Cliente"
  required_role_id uuid REFERENCES public.roles(id),    -- O3: rol tipado; NULL = cualquiera con 'full'
  test_status_on_approve text,                          -- espejo: aprob_supervisor|aprob_qaqc|aprob_cliente|cerrado (o NULL)
  mandatory        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, level)
);
CREATE INDEX IF NOT EXISTS idx_pac_project ON public.project_approval_config(project_id, level);

-- 2) RLS: SELECT para miembros del proyecto o admin; escritura solo admin
ALTER TABLE public.project_approval_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pac_select ON public.project_approval_config;
CREATE POLICY pac_select ON public.project_approval_config FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.project_members m
            WHERE m.project_id = project_approval_config.project_id
              AND m.user_id = app_current_user_id())
    OR EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
               WHERE u.id = app_current_user_id() AND r.key = 'admin')
  );

DROP POLICY IF EXISTS pac_write ON public.project_approval_config;
CREATE POLICY pac_write ON public.project_approval_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
                 WHERE u.id = app_current_user_id() AND r.key = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
                      WHERE u.id = app_current_user_id() AND r.key = 'admin'));

-- 3) Seed default idempotente: 1 nivel "Supervisor" para cada proyecto sin config
INSERT INTO public.project_approval_config (project_id, level, level_name, required_role_id, test_status_on_approve, mandatory)
SELECT p.id, 1, 'Supervisor',
       (SELECT id FROM public.roles WHERE key = 'supervisor'),
       'aprob_supervisor', true
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_approval_config c WHERE c.project_id = p.id
);

-- 4) O2 — trazabilidad de firma: user_agent
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS user_agent text;

-- 5) O1 — revisión de inspección (ciclo de rework)
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS revision int NOT NULL DEFAULT 1;

COMMIT;
```

- [ ] **Step 3: Verificación transaccional (no aplica de verdad)**

Run (psql local o SQL Editor; envuelto en rollback para no mutar):

```sql
BEGIN;
\i database/migrations/0051_project_approval_config.sql
-- aserciones rápidas
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_name='signatures' AND column_name='user_agent') <> 1
    THEN RAISE EXCEPTION 'signatures.user_agent ausente'; END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_name='tests' AND column_name='revision') <> 1
    THEN RAISE EXCEPTION 'tests.revision ausente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_approval_config WHERE level=1 AND level_name='Supervisor')
    THEN RAISE EXCEPTION 'seed default ausente'; END IF;
  RAISE NOTICE 'OK 0051';
END $$;
ROLLBACK;
```

Expected: `NOTICE: OK 0051`, sin excepciones. (Si no hay DB local, este paso es manual en el SQL Editor de Supabase contra una copia; en producción se aplica sin el `BEGIN/ROLLBACK`.)

- [ ] **Step 4: Re-ejecutar para confirmar idempotencia**

Aplicar el archivo dos veces seguidas (en el mismo `BEGIN; … ROLLBACK;` repetido o en SQL Editor): la segunda corrida no debe lanzar errores (gracias a `IF NOT EXISTS` / `DROP POLICY IF EXISTS` / seed condicional).
Expected: sin errores en la segunda corrida.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/0051_project_approval_config.sql
git commit -m "feat(mc): 0051 modelo cadena de aprobación (config + seed + user_agent + revision)"
```

---

### Task 2: Migración 0052 — RPC approve_inspection + G1 por config + vista

**Files:**
- Create: `database/migrations/0052_fn_approve_inspection.sql`

**Interfaces:**
- Consumes: `project_approval_config`, `signatures.user_agent`, `tests.revision` (Task 1); `transition_equipment_state`, `app_can_full`, `app_current_user_id`.
- Produces:
  - RPC `approve_inspection(p_test_id uuid, p_level int, p_decision text, p_observations text DEFAULT NULL, p_signature_image text DEFAULT NULL, p_user_agent text DEFAULT NULL) RETURNS jsonb` → `{ ok, reason?, test_status, equipment_status, chain_complete, applied_event }`. Consumido por Task 5.
  - `transition_equipment_state` con G1 = completitud por config (mismo nombre/firma).
  - Vista `public.v_inspection_approval_status(test_id, project_id, equipment_id, equipment_tag, template_id, revision, code, test_status, level, level_name, required_role_id, mandatory, level_approved)`. Consumida por Task 6.

- [ ] **Step 1: Escribir la migración completa**

Create `database/migrations/0052_fn_approve_inspection.sql`:

```sql
-- ============================================================
-- 0052 — EPIC-002 Fase B · RPC de aprobación + G1 por config + vista
-- approve_inspection: autoritativo, atómico, online-only (lo llama el cliente).
-- Idempotente (CREATE OR REPLACE).
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1) Vista de estado de cadena por inspección VIGENTE
--    Vigente = mayor revision (no borrador, no rechazada) por (equipment_id, template_id)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_inspection_approval_status
WITH (security_invoker = true) AS
WITH vigentes AS (
  SELECT DISTINCT ON (t.equipment_id, t.template_id)
    t.id AS test_id, t.project_id, t.equipment_id, t.template_id,
    t.revision, t.code, t.status AS test_status
  FROM public.tests t
  WHERE t.deleted_at IS NULL
    AND t.status NOT IN ('borrador','rechazado')
  ORDER BY t.equipment_id, t.template_id, t.revision DESC, t.created_at DESC
)
SELECT
  v.test_id, v.project_id, v.equipment_id, e.tag AS equipment_tag,
  v.template_id, v.revision, v.code, v.test_status,
  c.level, c.level_name, c.required_role_id, c.mandatory,
  (a.status = 'aprobado') AS level_approved
FROM vigentes v
JOIN public.equipment e ON e.id = v.equipment_id
JOIN public.project_approval_config c ON c.project_id = v.project_id
LEFT JOIN public.approvals a ON a.test_id = v.test_id AND a.level = c.level;

-- ------------------------------------------------------------
-- 2) RPC autoritativo de aprobación
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_inspection(
  p_test_id        uuid,
  p_level          int,
  p_decision       text,
  p_observations   text DEFAULT NULL,
  p_signature_image text DEFAULT NULL,
  p_user_agent     text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proj        uuid;
  v_equip       uuid;
  v_status      public.test_status;
  v_level_name  text;
  v_req_role    uuid;
  v_status_on   text;
  v_is_admin    boolean;
  v_has_role    boolean;
  v_seq         boolean;
  v_next_level  int;
  v_chain_done  boolean;
  v_eq_status   text;
  v_applied     text := NULL;
  v_res         jsonb;
BEGIN
  -- (1) Cargar test FOR UPDATE
  SELECT t.project_id, t.equipment_id, t.status
    INTO v_proj, v_equip, v_status
    FROM public.tests t
    WHERE t.id = p_test_id AND t.deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'test_not_found');
  END IF;

  -- (2) Permiso base: full sobre 'tests'
  IF NOT app_can_full(v_proj, 'tests') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_allowed');
  END IF;

  -- Config del nivel solicitado
  SELECT c.level_name, c.required_role_id, c.test_status_on_approve
    INTO v_level_name, v_req_role, v_status_on
    FROM public.project_approval_config c
    WHERE c.project_id = v_proj AND c.level = p_level;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'level_not_configured');
  END IF;

  -- (2b) Rol tipado: si el nivel exige required_role_id, el actor debe tenerlo (o ser admin)
  SELECT (r.key = 'admin') INTO v_is_admin
    FROM public.users u JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = app_current_user_id();
  v_is_admin := COALESCE(v_is_admin, false);

  IF v_req_role IS NOT NULL AND NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.users u
        WHERE u.id = app_current_user_id() AND u.role_id = v_req_role
      UNION
      SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = v_proj AND pm.user_id = app_current_user_id()
          AND pm.role_id = v_req_role
    ) INTO v_has_role;
    IF NOT v_has_role THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_allowed');
    END IF;
  END IF;

  -- (3) Orden secuencial (O4): salvo metadata.approval_sequential = 'false'
  SELECT (COALESCE((SELECT metadata->>'approval_sequential' FROM public.projects WHERE id = v_proj), 'true') <> 'false')
    INTO v_seq;
  IF v_seq THEN
    SELECT min(c.level) INTO v_next_level
      FROM public.project_approval_config c
      WHERE c.project_id = v_proj AND c.mandatory
        AND NOT EXISTS (
          SELECT 1 FROM public.approvals a
          WHERE a.test_id = p_test_id AND a.level = c.level AND a.status = 'aprobado'
        );
    -- Para approve, el nivel debe ser el siguiente mandatory pendiente.
    -- Para rechazos no se exige (se puede rechazar en cualquier nivel pendiente).
    IF p_decision = 'approve' AND (v_next_level IS NULL OR p_level <> v_next_level) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'level_not_next');
    END IF;
  END IF;

  -- (4) Aplicar decisión
  IF p_decision = 'approve' THEN
    INSERT INTO public.approvals (test_id, level, level_name, status, approver_id, approved_at, observations)
    VALUES (p_test_id, p_level, v_level_name, 'aprobado', app_current_user_id(), now(), p_observations)
    ON CONFLICT (test_id, level)
    DO UPDATE SET status='aprobado', approver_id=app_current_user_id(),
                  approved_at=now(), observations=EXCLUDED.observations,
                  level_name=EXCLUDED.level_name;

    INSERT INTO public.signatures (user_id, test_id, role_at_sign, image_url, ip, device, user_agent)
    VALUES (app_current_user_id(), p_test_id, v_level_name, p_signature_image,
            inet_client_addr(), NULL, p_user_agent);

    UPDATE public.tests SET status = COALESCE(v_status_on::public.test_status, status), updated_at = now()
      WHERE id = p_test_id;

  ELSIF p_decision = 'request_correction' THEN
    INSERT INTO public.approvals (test_id, level, level_name, status, approver_id, approved_at, observations)
    VALUES (p_test_id, p_level, v_level_name, 'rechazado', app_current_user_id(), now(), p_observations)
    ON CONFLICT (test_id, level)
    DO UPDATE SET status='rechazado', approver_id=app_current_user_id(),
                  approved_at=now(), observations=EXCLUDED.observations,
                  level_name=EXCLUDED.level_name;

    INSERT INTO public.signatures (user_id, test_id, role_at_sign, image_url, ip, device, user_agent)
    VALUES (app_current_user_id(), p_test_id, v_level_name, p_signature_image,
            inet_client_addr(), NULL, p_user_agent);

    UPDATE public.tests SET status = 'rechazado', updated_at = now() WHERE id = p_test_id;

  ELSIF p_decision = 'reject_equipment' THEN
    INSERT INTO public.approvals (test_id, level, level_name, status, approver_id, approved_at, observations)
    VALUES (p_test_id, p_level, v_level_name, 'rechazado', app_current_user_id(), now(), p_observations)
    ON CONFLICT (test_id, level)
    DO UPDATE SET status='rechazado', approver_id=app_current_user_id(),
                  approved_at=now(), observations=EXCLUDED.observations,
                  level_name=EXCLUDED.level_name;

    INSERT INTO public.signatures (user_id, test_id, role_at_sign, image_url, ip, device, user_agent)
    VALUES (app_current_user_id(), p_test_id, v_level_name, p_signature_image,
            inet_client_addr(), NULL, p_user_agent);

  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_decision');
  END IF;

  -- (5) Estado actual del equipo (para p_from_status de la FSM)
  SELECT status::text INTO v_eq_status FROM public.equipment WHERE id = v_equip;

  -- (6) Transiciones de equipo
  IF p_decision = 'reject_equipment' THEN
    PERFORM public.transition_equipment_state(v_equip, 'EQUIPMENT_REJECTED', v_eq_status,
            p_observations, jsonb_build_object('test_id', p_test_id), now(), 'online');
    v_applied := 'EQUIPMENT_REJECTED';

  ELSIF p_decision = 'request_correction' THEN
    IF v_eq_status = 'aprobado' THEN
      PERFORM public.transition_equipment_state(v_equip, 'INSPECTION_REJECTED', v_eq_status,
              p_observations, jsonb_build_object('test_id', p_test_id), now(), 'online');
      v_applied := 'INSPECTION_REJECTED';
    END IF;

  ELSIF p_decision = 'approve' THEN
    -- ¿La cadena del equipo (todas las inspecciones vigentes) está completa?
    SELECT NOT EXISTS (
      SELECT 1 FROM public.v_inspection_approval_status s
      WHERE s.equipment_id = v_equip AND s.mandatory AND COALESCE(s.level_approved, false) = false
    ) AND EXISTS (
      SELECT 1 FROM public.v_inspection_approval_status s WHERE s.equipment_id = v_equip
    ) INTO v_chain_done;

    IF v_chain_done THEN
      PERFORM public.transition_equipment_state(v_equip, 'INSPECTION_APPROVED', v_eq_status,
              p_observations, jsonb_build_object('test_id', p_test_id), now(), 'online');
      v_applied := 'INSPECTION_APPROVED';
    END IF;
  END IF;

  -- (7) Recolectar resultado
  SELECT t.status::text INTO v_status FROM public.tests t WHERE t.id = p_test_id;
  SELECT status::text INTO v_eq_status FROM public.equipment WHERE id = v_equip;

  v_res := jsonb_build_object(
    'ok', true,
    'test_status', v_status,
    'equipment_status', v_eq_status,
    'chain_complete', COALESCE(v_chain_done, false),
    'applied_event', v_applied
  );
  RETURN v_res;
END $$;

-- ------------------------------------------------------------
-- 3) G1 por config en transition_equipment_state (CREATE OR REPLACE)
--    Solo cambia el cálculo de v_appr; el resto es idéntico a 0050.
-- ------------------------------------------------------------
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

  IF p_from_status IS NOT NULL AND p_from_status <> v_cur::text THEN
    INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
    VALUES (p_equipment_id, v_proj, v_cur, NULL, p_event, 'rejected', 'stale_state', app_current_user_id(), p_source, p_context, p_occurred_at);
    RETURN jsonb_build_object('applied', false, 'status', v_cur, 'reason', 'stale_state');
  END IF;

  SELECT count(*) INTO v_open FROM public.punch_items
    WHERE equipment_id = p_equipment_id AND deleted_at IS NULL AND status <> 'cerrado';

  -- G1 (Fase B): completitud por config sobre inspecciones VIGENTES
  -- vigente = mayor revision (no borrador, no rechazada) por (equipment_id, template_id)
  WITH vigentes AS (
    SELECT DISTINCT ON (t.template_id) t.id, t.project_id
    FROM public.tests t
    WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
      AND t.status NOT IN ('borrador','rechazado')
    ORDER BY t.template_id, t.revision DESC, t.created_at DESC
  )
  SELECT (EXISTS (SELECT 1 FROM vigentes))
     AND NOT EXISTS (
       SELECT 1 FROM vigentes v
       JOIN public.project_approval_config c ON c.project_id = v.project_id AND c.mandatory
       WHERE NOT EXISTS (
         SELECT 1 FROM public.approvals a
         WHERE a.test_id = v.id AND a.level = c.level AND a.status = 'aprobado'
       )
     )
  INTO v_appr;

  SELECT EXISTS(SELECT 1 FROM public.tests t WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
                AND t.status <> 'borrador') INTO v_ever;

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

COMMIT;
```

- [ ] **Step 2: Verificación de compilación (sin tests aún)**

Run (psql local o SQL Editor envuelto en rollback):

```sql
BEGIN;
\i database/migrations/0051_project_approval_config.sql
\i database/migrations/0052_fn_approve_inspection.sql
DO $$ BEGIN
  IF to_regprocedure('public.approve_inspection(uuid,int,text,text,text,text)') IS NULL
    THEN RAISE EXCEPTION 'approve_inspection no creado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname='v_inspection_approval_status')
    THEN RAISE EXCEPTION 'vista ausente'; END IF;
  RAISE NOTICE 'OK 0052 estructura';
END $$;
ROLLBACK;
```

Expected: `NOTICE: OK 0052 estructura`, sin errores de sintaxis.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/0052_fn_approve_inspection.sql
git commit -m "feat(mc): 0052 RPC approve_inspection + G1 por config + vista de cadena"
```

---

### Task 3: Test SQL transaccional de approve_inspection (patrón Fase A)

**Files:**
- Create: `database/tests/0052_approve_inspection_test.sql`

**Interfaces:**
- Consumes: `approve_inspection`, `transition_equipment_state`, vista (Task 2).

> Este test asume DB local con `database/schema_completo.sql` + migraciones `0049/0050/0051/0052` aplicadas. Crea datos mínimos, ejecuta el flujo y revierte con `ROLLBACK`. Las aserciones usan `RAISE EXCEPTION`. **No** depende del actor RLS porque `app_can_full`/`app_current_user_id` pueden requerir sesión: el test setea un usuario admin vía `set_config` si tu helper lo soporta; si no, ajustá el seteo del actor según `0007_rls.sql`.

- [ ] **Step 1: Escribir el test transaccional**

Create `database/tests/0052_approve_inspection_test.sql`:

```sql
-- Test transaccional de approve_inspection (rollback al final, NO muta datos).
-- Ejecutar: psql <conn> -f database/tests/0052_approve_inspection_test.sql
BEGIN;

-- (Si tu RLS requiere actor, fijá aquí el usuario admin de pruebas)
-- SELECT set_config('request.jwt.claims', json_build_object('sub', '<auth_uuid_admin>')::text, true);

DO $$
DECLARE
  v_proj uuid; v_eq uuid; v_tpl uuid := gen_random_uuid();
  v_sup uuid; v_test uuid; v_res jsonb; v_eqs text;
BEGIN
  -- Datos mínimos
  SELECT id INTO v_sup FROM public.roles WHERE key='supervisor';
  INSERT INTO public.projects(id, name, status) VALUES (gen_random_uuid(), 'TEST-FASEB', 'activo') RETURNING id INTO v_proj;
  -- seed default de config la deja en 1 nivel Supervisor (lo creó 0051); asegurarla:
  INSERT INTO public.project_approval_config(project_id, level, level_name, required_role_id, test_status_on_approve, mandatory)
  VALUES (v_proj, 1, 'Supervisor', v_sup, 'aprob_supervisor', true)
  ON CONFLICT (project_id, level) DO NOTHING;

  INSERT INTO public.equipment(id, project_id, tag, status)
  VALUES (gen_random_uuid(), v_proj, 'TST-001', 'en_ejecucion') RETURNING id INTO v_eq;

  INSERT INTO public.tests(id, project_id, equipment_id, type, status, template_id, revision)
  VALUES (gen_random_uuid(), v_proj, v_eq, 'precomisionamiento', 'ejecutado', v_tpl, 1)
  RETURNING id INTO v_test;

  -- (A) approve nivel 1 (único mandatory) → cadena completa → equipo aprobado
  v_res := public.approve_inspection(v_test, 1, 'approve', 'ok', NULL, 'vitest-UA');
  IF (v_res->>'ok') <> 'true' THEN RAISE EXCEPTION 'approve falló: %', v_res; END IF;
  IF (v_res->>'chain_complete') <> 'true' THEN RAISE EXCEPTION 'chain no completa: %', v_res; END IF;
  SELECT status::text INTO v_eqs FROM public.equipment WHERE id=v_eq;
  IF v_eqs <> 'aprobado' THEN RAISE EXCEPTION 'equipo no quedó aprobado: %', v_eqs; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.equipment_status_history
                 WHERE equipment_id=v_eq AND event='INSPECTION_APPROVED' AND guard_result='applied')
    THEN RAISE EXCEPTION 'historial INSPECTION_APPROVED ausente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.signatures WHERE test_id=v_test AND user_agent='vitest-UA')
    THEN RAISE EXCEPTION 'firma con user_agent ausente'; END IF;

  -- (B) request_correction sobre equipo aprobado → tests rechazado + equipo en_ejecucion
  v_res := public.approve_inspection(v_test, 1, 'request_correction', 'rehacer', NULL, 'UA2');
  IF (v_res->>'ok') <> 'true' THEN RAISE EXCEPTION 'request_correction falló: %', v_res; END IF;
  IF (SELECT status::text FROM public.tests WHERE id=v_test) <> 'rechazado'
    THEN RAISE EXCEPTION 'test no quedó rechazado'; END IF;
  IF (SELECT status::text FROM public.equipment WHERE id=v_eq) <> 'en_ejecucion'
    THEN RAISE EXCEPTION 'equipo no volvió a en_ejecucion'; END IF;

  -- (C) Rework: nueva inspección revision 2 (la vieja rechazada NO bloquea)
  INSERT INTO public.tests(id, project_id, equipment_id, type, status, template_id, revision)
  VALUES (gen_random_uuid(), v_proj, v_eq, 'precomisionamiento', 'ejecutado', v_tpl, 2)
  RETURNING id INTO v_test;
  v_res := public.approve_inspection(v_test, 1, 'approve', 'ok2', NULL, 'UA3');
  IF (v_res->>'chain_complete') <> 'true' THEN RAISE EXCEPTION 'rework no completó cadena: %', v_res; END IF;
  IF (SELECT status::text FROM public.equipment WHERE id=v_eq) <> 'aprobado'
    THEN RAISE EXCEPTION 'rework no dejó equipo aprobado'; END IF;

  -- (D) reject_equipment → equipo rechazado
  v_res := public.approve_inspection(v_test, 1, 'reject_equipment', 'no conforme', NULL, 'UA4');
  IF (SELECT status::text FROM public.equipment WHERE id=v_eq) <> 'rechazado'
    THEN RAISE EXCEPTION 'reject_equipment no dejó equipo rechazado'; END IF;

  RAISE NOTICE 'OK approve_inspection (A,B,C,D)';
END $$;

ROLLBACK;
```

- [ ] **Step 2: Ejecutar el test**

Run: `psql "<conn-local>" -f database/tests/0052_approve_inspection_test.sql`
Expected: `NOTICE: OK approve_inspection (A,B,C,D)` y `ROLLBACK`. Si falla una aserción, la corre se aborta con el mensaje de `RAISE EXCEPTION` correspondiente.

> Si no hay DB local disponible en la sesión de ejecución, marcar este paso como **bloqueado/manual** y dejar el archivo listo para correr en el SQL Editor de Supabase contra una rama de pruebas. El test es la verificación de Task 2.

- [ ] **Step 3: Commit**

```bash
git add database/tests/0052_approve_inspection_test.sql
git commit -m "test(mc): test transaccional de approve_inspection (cadena/rework/rechazos)"
```

---

### Task 4: Helper puro `isApprovalChainComplete`

**Files:**
- Create: `app/src/lib/state/approvalChain.ts`
- Test: `app/src/lib/state/__tests__/approvalChain.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ApprovalConfigLevel { level: number; mandatory: boolean }
  export interface ChainTest { testId: string; templateId: string; revision: number; status: string }
  export interface ChainApproval { testId: string; level: number; status: string }
  export function vigentesByTemplate(tests: ChainTest[]): ChainTest[]
  export function isApprovalChainComplete(tests: ChainTest[], config: ApprovalConfigLevel[], approvals: ChainApproval[]): boolean
  ```
  Consumido por Task 6 (gating de UI).

- [ ] **Step 1: Escribir el test que falla**

Create `app/src/lib/state/__tests__/approvalChain.test.ts`:

```ts
import { test, expect } from "vitest";
import { isApprovalChainComplete, vigentesByTemplate } from "@/lib/state/approvalChain";

const cfg1 = [{ level: 1, mandatory: true }];
const cfg3 = [{ level: 1, mandatory: true }, { level: 2, mandatory: true }, { level: 3, mandatory: false }];

test("vigente = mayor revision no rechazada por template; ignora borrador/rechazado", () => {
  const tests = [
    { testId: "a1", templateId: "T1", revision: 1, status: "rechazado" },
    { testId: "a2", templateId: "T1", revision: 2, status: "ejecutado" },
    { testId: "b1", templateId: "T2", revision: 1, status: "borrador" },
  ];
  const v = vigentesByTemplate(tests).map((t) => t.testId).sort();
  expect(v).toEqual(["a2"]); // a1 rechazada, a2 vigente, b1 borrador no cuenta
});

test("cadena de 1 nivel: completa cuando el L1 está aprobado", () => {
  const tests = [{ testId: "a2", templateId: "T1", revision: 2, status: "ejecutado" }];
  expect(isApprovalChainComplete(tests, cfg1, [])).toBe(false);
  expect(isApprovalChainComplete(tests, cfg1, [{ testId: "a2", level: 1, status: "aprobado" }])).toBe(true);
});

test("cadena de 3 niveles: solo los mandatory bloquean (L3 opcional)", () => {
  const tests = [{ testId: "a2", templateId: "T1", revision: 1, status: "ejecutado" }];
  const ap = [
    { testId: "a2", level: 1, status: "aprobado" },
    { testId: "a2", level: 2, status: "aprobado" },
  ];
  expect(isApprovalChainComplete(tests, cfg3, ap)).toBe(true); // L3 no mandatory
  expect(isApprovalChainComplete(tests, cfg3, [{ testId: "a2", level: 1, status: "aprobado" }])).toBe(false);
});

test("sin inspecciones vigentes → no completa", () => {
  expect(isApprovalChainComplete([], cfg1, [])).toBe(false);
  expect(isApprovalChainComplete([{ testId: "x", templateId: "T1", revision: 1, status: "rechazado" }], cfg1, [])).toBe(false);
});

test("aprobación de una revisión vieja no cuenta para la vigente", () => {
  const tests = [
    { testId: "old", templateId: "T1", revision: 1, status: "ejecutado" },
    { testId: "new", templateId: "T1", revision: 2, status: "ejecutado" },
  ];
  const ap = [{ testId: "old", level: 1, status: "aprobado" }];
  expect(isApprovalChainComplete(tests, cfg1, ap)).toBe(false); // la vigente es "new", sin aprobación
});
```

- [ ] **Step 2: Run para ver fallar**

Run: `cd app && npx vitest run src/lib/state/__tests__/approvalChain.test.ts`
Expected: FAIL — `Cannot find module '@/lib/state/approvalChain'`.

- [ ] **Step 3: Implementar el helper**

Create `app/src/lib/state/approvalChain.ts`:

```ts
export interface ApprovalConfigLevel {
  level: number;
  mandatory: boolean;
}
export interface ChainTest {
  testId: string;
  templateId: string;
  revision: number;
  status: string;
}
export interface ChainApproval {
  testId: string;
  level: number;
  status: string;
}

const NON_VIGENTE = new Set(["borrador", "rechazado"]);

/** Inspección vigente por template = la de mayor revision (no borrador, no rechazada). */
export function vigentesByTemplate(tests: ChainTest[]): ChainTest[] {
  const best = new Map<string, ChainTest>();
  for (const t of tests) {
    if (NON_VIGENTE.has(t.status)) continue;
    const cur = best.get(t.templateId);
    if (!cur || t.revision > cur.revision) best.set(t.templateId, t);
  }
  return [...best.values()];
}

/**
 * La cadena del equipo está completa cuando existe ≥1 inspección vigente y
 * cada inspección vigente tiene todos sus niveles `mandatory` aprobados.
 */
export function isApprovalChainComplete(
  tests: ChainTest[],
  config: ApprovalConfigLevel[],
  approvals: ChainApproval[],
): boolean {
  const vigentes = vigentesByTemplate(tests);
  if (vigentes.length === 0) return false;

  const mandatory = config.filter((c) => c.mandatory).map((c) => c.level);
  if (mandatory.length === 0) return false;

  const approved = new Set(
    approvals.filter((a) => a.status === "aprobado").map((a) => `${a.testId}#${a.level}`),
  );

  return vigentes.every((v) => mandatory.every((lvl) => approved.has(`${v.testId}#${lvl}`)));
}
```

- [ ] **Step 4: Run para ver pasar**

Run: `cd app && npx vitest run src/lib/state/__tests__/approvalChain.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/state/approvalChain.ts app/src/lib/state/__tests__/approvalChain.test.ts
git commit -m "feat(mc): helper puro isApprovalChainComplete (completitud por config)"
```

---

### Task 5: `revision` en submitInspectionOffline (O1)

**Files:**
- Modify: `app/src/lib/sync/submitInspection.ts`
- Modify: `app/src/hooks/useSubmitInspection.ts`
- Test: `app/src/lib/sync/__tests__/submitInspection.test.ts`

**Interfaces:**
- Consumes: `tests.revision` (Task 1).
- Produces: la fila `tests` local + outbox ahora incluye `revision: number` (= max revisión previa del mismo `(equipment_id, template_id)` + 1, o 1).

- [ ] **Step 1: Escribir el test que falla** (añadir al final de `submitInspection.test.ts`)

```ts
test("revision = max(prev) + 1 por (equipment, template); 1 si no hay previa", async () => {
  // Inspección previa rechazada del mismo equipo+template, revision 2
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await localDB.tests.put({ id: "prev", project_id: "p1", equipment_id: "e1", template_id: "t1",
    revision: 2, status: "rechazado", sync_status: "synced" } as any);

  const d = deps(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await submitInspectionOffline({ state, projectId: "p1", userId: "u1", template }, d as any);
  const t = await localDB.tests.get(res.testId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((t as any)?.revision).toBe(3);

  // Otro template sin previa → revision 1
  const d2 = deps(false);
  const res2 = await submitInspectionOffline(
    { state: { ...state, templateId: "t9" }, projectId: "p1", userId: "u1",
      template: { ...template, id: "t9" } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d2 as any,
  );
  const t2 = await localDB.tests.get(res2.testId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((t2 as any)?.revision).toBe(1);
});
```

También agregar `getMaxRevision` al objeto `deps(...)` del archivo de test (dentro del `return {`):

```ts
    getMaxRevision: async (equipmentId: string, templateId: string) => {
      const rows = await localDB.tests
        .filter((r: any) => r.equipment_id === equipmentId && r.template_id === templateId) // eslint-disable-line @typescript-eslint/no-explicit-any
        .toArray();
      return rows.reduce((m: number, r: any) => Math.max(m, r.revision ?? 1), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    },
```

- [ ] **Step 2: Run para ver fallar**

Run: `cd app && npx vitest run src/lib/sync/__tests__/submitInspection.test.ts`
Expected: FAIL — `revision` es `undefined` (la implementación aún no la setea) y/o `getMaxRevision is not a function`.

- [ ] **Step 3: Añadir la dep e implementar en `submitInspection.ts`**

En la interfaz `SubmitDeps` (después de `now`):

```ts
  /** Max revisión previa de un (equipment_id, template_id) en el store local (0 si no hay). */
  getMaxRevision: (equipmentId: string, templateId: string) => Promise<number>;
```

Dentro de `submitInspectionOffline`, antes de construir `const test`:

```ts
  const prevRevision = await deps.getMaxRevision(state.equipmentId, template.id);
  const revision = prevRevision + 1;
```

En el objeto `test`, añadir el campo (junto a `version: 1,`):

```ts
    revision,
```

- [ ] **Step 4: Cablear la dep en `useSubmitInspection.ts`**

En el objeto de deps que se pasa a `submitInspectionOffline` (después de `now: ...`):

```ts
          getMaxRevision: async (equipmentId, templateId) => {
            const rows = await localDB.tests
              .filter((r) => (r as { equipment_id?: string }).equipment_id === equipmentId
                && (r as { template_id?: string }).template_id === templateId)
              .toArray();
            return rows.reduce((m, r) => Math.max(m, (r as { revision?: number }).revision ?? 1), 0);
          },
```

- [ ] **Step 5: Run para ver pasar**

Run: `cd app && npx vitest run src/lib/sync/__tests__/submitInspection.test.ts`
Expected: PASS (todos los tests del archivo, incluido el nuevo).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/sync/submitInspection.ts app/src/hooks/useSubmitInspection.ts app/src/lib/sync/__tests__/submitInspection.test.ts
git commit -m "feat(mc): submitInspection calcula revision por (equipment,template) (O1)"
```

---

### Task 6: Hook `useInspectionApproval` (RPC, online-only)

**Files:**
- Create: `app/src/hooks/useInspectionApproval.ts`
- Test: `app/src/hooks/__tests__/useInspectionApproval.test.ts`

**Interfaces:**
- Consumes: RPC `approve_inspection` (Task 2).
- Produces:
  ```ts
  export type ApprovalDecision = "approve" | "request_correction" | "reject_equipment";
  export interface ApprovalResult { ok: boolean; reason?: string; test_status?: string; equipment_status?: string; chain_complete?: boolean; applied_event?: string | null }
  export interface ApproveArgs { testId: string; level: number; decision: ApprovalDecision; observations?: string; signatureImage?: string }
  export function useInspectionApproval(): { approve: (a: ApproveArgs) => Promise<ApprovalResult>; isSubmitting: boolean; error: string | null }
  ```
  Consumido por Task 8.

- [ ] **Step 1: Escribir el test que falla**

Create `app/src/hooks/__tests__/useInspectionApproval.test.ts`:

```ts
import { test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

import { useInspectionApproval } from "@/hooks/useInspectionApproval";

beforeEach(() => {
  rpc.mockReset();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: "test-agent", configurable: true });
});

test("envía payload con p_user_agent y mapea resultado ok", async () => {
  rpc.mockResolvedValue({ data: { ok: true, test_status: "aprob_supervisor", equipment_status: "aprobado", chain_complete: true, applied_event: "INSPECTION_APPROVED" }, error: null });
  const { result } = renderHook(() => useInspectionApproval());
  let res!: Awaited<ReturnType<typeof result.current.approve>>;
  await act(async () => {
    res = await result.current.approve({ testId: "T1", level: 1, decision: "approve", observations: "ok" });
  });
  expect(rpc).toHaveBeenCalledWith("approve_inspection", {
    p_test_id: "T1", p_level: 1, p_decision: "approve",
    p_observations: "ok", p_signature_image: null, p_user_agent: "test-agent",
  });
  expect(res.ok).toBe(true);
  expect(res.equipment_status).toBe("aprobado");
});

test("offline → no llama al rpc y retorna ok:false reason requires_connection", async () => {
  Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
  const { result } = renderHook(() => useInspectionApproval());
  let res!: Awaited<ReturnType<typeof result.current.approve>>;
  await act(async () => {
    res = await result.current.approve({ testId: "T1", level: 1, decision: "approve" });
  });
  expect(rpc).not.toHaveBeenCalled();
  expect(res.ok).toBe(false);
  expect(res.reason).toBe("requires_connection");
});

test("error del rpc → ok:false con reason del error", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
  const { result } = renderHook(() => useInspectionApproval());
  let res!: Awaited<ReturnType<typeof result.current.approve>>;
  await act(async () => { res = await result.current.approve({ testId: "T1", level: 1, decision: "approve" }); });
  expect(res.ok).toBe(false);
  expect(res.reason).toBe("boom");
});
```

- [ ] **Step 2: Run para ver fallar**

Run: `cd app && npx vitest run src/hooks/__tests__/useInspectionApproval.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useInspectionApproval'`.

- [ ] **Step 3: Implementar el hook**

Create `app/src/hooks/useInspectionApproval.ts`:

```ts
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ApprovalDecision = "approve" | "request_correction" | "reject_equipment";

export interface ApprovalResult {
  ok: boolean;
  reason?: string;
  test_status?: string;
  equipment_status?: string;
  chain_complete?: boolean;
  applied_event?: string | null;
}

export interface ApproveArgs {
  testId: string;
  level: number;
  decision: ApprovalDecision;
  observations?: string;
  signatureImage?: string;
}

export function useInspectionApproval() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async (a: ApproveArgs): Promise<ApprovalResult> => {
    setError(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const r = { ok: false, reason: "requires_connection" as const };
      setError("Esta acción requiere conexión");
      return r;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("approve_inspection", {
        p_test_id: a.testId,
        p_level: a.level,
        p_decision: a.decision,
        p_observations: a.observations ?? null,
        p_signature_image: a.signatureImage ?? null,
        p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return { ok: false, reason: rpcErr.message };
      }
      const res = (data ?? { ok: false, reason: "empty_response" }) as ApprovalResult;
      if (!res.ok && res.reason) setError(res.reason);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      return { ok: false, reason: msg };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { approve, isSubmitting, error };
}
```

- [ ] **Step 4: Run para ver pasar**

Run: `cd app && npx vitest run src/hooks/__tests__/useInspectionApproval.test.ts`
Expected: PASS (3 tests).

> Si `@testing-library/react` no está instalado, verificar con `cd app && npx vitest run src/hooks` sobre algún test de hook existente; si no hay infraestructura de `renderHook`, reescribir los 3 tests llamando a la función `approve` extraída (refactor menor: exportar una `approveImpl(args, { rpc, online, userAgent })` pura y testearla). Mantener la cobertura: payload con `p_user_agent`, gate offline, mapeo de error.

- [ ] **Step 5: Commit**

```bash
git add app/src/hooks/useInspectionApproval.ts app/src/hooks/__tests__/useInspectionApproval.test.ts
git commit -m "feat(mc): hook useInspectionApproval (RPC autoritativo, online-only)"
```

---

### Task 7: Data hook `useApprovalQueue` (bandeja por proyecto)

**Files:**
- Create: `app/src/hooks/useApprovalQueue.ts`

**Interfaces:**
- Consumes: vista `v_inspection_approval_status` (Task 2).
- Produces:
  ```ts
  export interface ApprovalQueueItem {
    testId: string; equipmentId: string; equipmentTag: string;
    templateId: string; revision: number; code: string | null; testStatus: string;
    levels: { level: number; levelName: string; requiredRoleId: string | null; mandatory: boolean; approved: boolean }[];
    nextPendingLevel: number | null; // menor nivel mandatory no aprobado
  }
  export function useApprovalQueue(projectId: string): { items: ApprovalQueueItem[]; loading: boolean; error: string | null; refetch: () => void }
  ```
  Consumido por Task 8.

> Sin TDD estricto (data-fetching contra Supabase; se valida en verificación manual). Es un hook fino de lectura.

- [ ] **Step 1: Implementar el hook**

Create `app/src/hooks/useApprovalQueue.ts`:

```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ApprovalQueueLevel {
  level: number;
  levelName: string;
  requiredRoleId: string | null;
  mandatory: boolean;
  approved: boolean;
}
export interface ApprovalQueueItem {
  testId: string;
  equipmentId: string;
  equipmentTag: string;
  templateId: string;
  revision: number;
  code: string | null;
  testStatus: string;
  levels: ApprovalQueueLevel[];
  nextPendingLevel: number | null;
}

interface Row {
  test_id: string; equipment_id: string; equipment_tag: string;
  template_id: string; revision: number; code: string | null; test_status: string;
  level: number; level_name: string; required_role_id: string | null;
  mandatory: boolean; level_approved: boolean | null;
}

export function useApprovalQueue(projectId: string) {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("v_inspection_approval_status")
        .select("*")
        .eq("project_id", projectId)
        .order("equipment_tag", { ascending: true })
        .order("level", { ascending: true });
      if (e) throw e;

      const byTest = new Map<string, ApprovalQueueItem>();
      for (const r of (data ?? []) as Row[]) {
        let item = byTest.get(r.test_id);
        if (!item) {
          item = {
            testId: r.test_id, equipmentId: r.equipment_id, equipmentTag: r.equipment_tag,
            templateId: r.template_id, revision: r.revision, code: r.code, testStatus: r.test_status,
            levels: [], nextPendingLevel: null,
          };
          byTest.set(r.test_id, item);
        }
        item.levels.push({
          level: r.level, levelName: r.level_name, requiredRoleId: r.required_role_id,
          mandatory: r.mandatory, approved: !!r.level_approved,
        });
      }

      const result: ApprovalQueueItem[] = [];
      for (const item of byTest.values()) {
        item.levels.sort((a, b) => a.level - b.level);
        const pending = item.levels.filter((l) => l.mandatory && !l.approved).map((l) => l.level);
        item.nextPendingLevel = pending.length ? Math.min(...pending) : null;
        // Solo mostrar inspecciones con un nivel mandatory pendiente
        if (item.nextPendingLevel !== null) result.push(item);
      }
      setItems(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando aprobaciones");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return { items, loading, error, refetch: fetchData };
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: sin errores nuevos en `useApprovalQueue.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useApprovalQueue.ts
git commit -m "feat(mc): useApprovalQueue lee v_inspection_approval_status (next pending level)"
```

---

### Task 8: UI — firma, detalle y bandeja de revisión

**Files:**
- Create: `app/src/components/approval/SignaturePadField.tsx`
- Create: `app/src/components/approval/ApprovalDetail.tsx`
- Create: `app/src/components/approval/ApprovalTray.tsx`
- Create: `app/src/app/(workspace)/projects/[projectId]/approvals/page.tsx`

**Interfaces:**
- Consumes: `useApprovalQueue` (Task 7), `useInspectionApproval` (Task 6), `signature_pad` (dep instalada).

> **Antes de escribir la página**, leer la guía de rutas en `app/node_modules/next/dist/docs/` (regla `app/AGENTS.md`): confirmar la firma de `params` en este Next.js (puede ser `Promise<{ projectId: string }>` que se resuelve con `use()`/`await`). Ajustar la página al patrón vigente del repo — mirar una página hermana, p. ej. `app/src/app/(workspace)/projects/[projectId]/tests/page.tsx`, y copiar su forma de leer `params`.

- [ ] **Step 1: Componente de firma (canvas opcional → dataURL)**

Create `app/src/components/approval/SignaturePadField.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

interface Props {
  onChange: (dataUrl: string | null) => void;
}

export function SignaturePadField({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled || !canvasRef.current) return;
    const pad = new SignaturePad(canvasRef.current, { penColor: "#0f172a" });
    padRef.current = pad;
    pad.addEventListener("endStroke", () => {
      onChange(pad.isEmpty() ? null : pad.toDataURL("image/png"));
    });
    return () => { pad.off(); padRef.current = null; };
  }, [enabled, onChange]);

  if (!enabled) {
    return (
      <button type="button" className="text-sm text-blue-600 underline"
        onClick={() => setEnabled(true)}>
        Añadir firma dibujada (opcional)
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} width={360} height={140}
        className="rounded border border-slate-300 bg-white" />
      <div className="flex gap-3 text-sm">
        <button type="button" className="text-slate-600 underline"
          onClick={() => { padRef.current?.clear(); onChange(null); }}>
          Limpiar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Detalle de revisión + acciones**

Create `app/src/components/approval/ApprovalDetail.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useInspectionApproval, type ApprovalDecision } from "@/hooks/useInspectionApproval";
import { SignaturePadField } from "./SignaturePadField";
import type { ApprovalQueueItem } from "@/hooks/useApprovalQueue";

interface Props {
  item: ApprovalQueueItem;
  onDone: () => void;
}

export function ApprovalDetail({ item, onDone }: Props) {
  const { approve, isSubmitting, error } = useInspectionApproval();
  const [observations, setObservations] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const level = item.nextPendingLevel;
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const run = async (decision: ApprovalDecision) => {
    if (level === null) return;
    setLocalMsg(null);
    const res = await approve({
      testId: item.testId, level, decision,
      observations: observations.trim() || undefined,
      signatureImage: signature ?? undefined,
    });
    if (res.ok) onDone();
    else setLocalMsg(res.reason ?? "No se pudo procesar");
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <header>
        <h3 className="font-semibold">{item.equipmentTag} — {item.code ?? item.templateId}</h3>
        <p className="text-sm text-slate-500">Revisión {item.revision} · estado {item.testStatus}</p>
      </header>

      <ol className="flex flex-wrap gap-2 text-sm">
        {item.levels.map((l) => (
          <li key={l.level}
            className={`rounded px-2 py-1 ${l.approved ? "bg-green-100 text-green-800" : l.level === level ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
            L{l.level} {l.levelName} {l.approved ? "✓" : l.mandatory ? "" : "(opc.)"}
          </li>
        ))}
      </ol>

      <textarea value={observations} onChange={(e) => setObservations(e.target.value)}
        placeholder="Observaciones (requerido para corrección/rechazo)"
        className="w-full rounded border border-slate-300 p-2 text-sm" rows={3} />

      <SignaturePadField onChange={setSignature} />

      {offline && <p className="text-sm text-amber-600">Sin conexión: las acciones están deshabilitadas.</p>}
      {(localMsg || error) && <p className="text-sm text-red-600">{localMsg ?? error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={isSubmitting || offline}
          onClick={() => run("approve")}
          className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Aprobar nivel {level}
        </button>
        <button type="button" disabled={isSubmitting || offline || !observations.trim()}
          onClick={() => run("request_correction")}
          className="rounded bg-amber-500 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Solicitar corrección
        </button>
        <button type="button" disabled={isSubmitting || offline || !observations.trim()}
          onClick={() => run("reject_equipment")}
          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Rechazar equipo
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Bandeja (lista)**

Create `app/src/components/approval/ApprovalTray.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useApprovalQueue } from "@/hooks/useApprovalQueue";
import { ApprovalDetail } from "./ApprovalDetail";

export function ApprovalTray({ projectId }: { projectId: string }) {
  const { items, loading, error, refetch } = useApprovalQueue(projectId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-slate-500">Cargando bandeja de revisión…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (items.length === 0) return <p className="text-sm text-slate-500">No hay inspecciones pendientes de aprobación.</p>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.testId} className="rounded-lg border border-slate-200">
          <button type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setOpenId(openId === item.testId ? null : item.testId)}>
            <span className="font-medium">{item.equipmentTag} — {item.code ?? item.templateId}</span>
            <span className="text-sm text-slate-500">
              Rev {item.revision} · nivel pendiente L{item.nextPendingLevel}
            </span>
          </button>
          {openId === item.testId && (
            <div className="border-t border-slate-100 p-4">
              <ApprovalDetail item={item} onDone={() => { setOpenId(null); void refetch(); }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Página de ruta**

Create `app/src/app/(workspace)/projects/[projectId]/approvals/page.tsx` (ajustar la lectura de `params` al patrón del repo verificado en el Step 0):

```tsx
import { ApprovalTray } from "@/components/approval/ApprovalTray";

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Bandeja de revisión</h1>
      <p className="text-sm text-slate-500">
        Aprobá, solicitá corrección o rechazá inspecciones. Cuando todas las inspecciones
        vigentes de un equipo completan su cadena, el equipo pasa a <b>aprobado</b>.
      </p>
      <ApprovalTray projectId={projectId} />
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + build de tipos**

Run: `cd app && npx tsc --noEmit`
Expected: sin errores en los nuevos archivos. Si `tsc` se queja por la firma de `params`, corregir según el patrón de la página hermana de `tests`.

- [ ] **Step 6: Lint**

Run: `cd app && npx eslint src/components/approval src/app/\(workspace\)/projects/\[projectId\]/approvals src/hooks/useApprovalQueue.ts src/hooks/useInspectionApproval.ts`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add app/src/components/approval app/src/app/\(workspace\)/projects/\[projectId\]/approvals/page.tsx
git commit -m "feat(mc): UI bandeja de revisión (tray + detalle + firma) Fase B"
```

---

### Task 9: Verificación integral

**Files:** (ninguno nuevo)

- [ ] **Step 1: Suite vitest completa**

Run: `cd app && npx vitest run`
Expected: PASS — incluye `approvalChain`, `submitInspection` (con `revision`), `useInspectionApproval`, y no rompe `equipmentFsm.test.ts` ni `engine.transition.test.ts`.

- [ ] **Step 2: Typecheck global**

Run: `cd app && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Lint global de lo tocado**

Run: `cd app && npx eslint src/lib/state/approvalChain.ts src/lib/sync/submitInspection.ts src/hooks/useInspectionApproval.ts src/hooks/useApprovalQueue.ts src/components/approval`
Expected: sin errores.

- [ ] **Step 4: Test SQL transaccional (si hay DB local)**

Run: `psql "<conn-local>" -f database/tests/0052_approve_inspection_test.sql`
Expected: `NOTICE: OK approve_inspection (A,B,C,D)`. (Si no hay DB local, dejar registrado para correr en Supabase antes del deploy.)

- [ ] **Step 5: Checklist manual (post-deploy de migraciones)**

Aplicar `0051` y `0052` en Supabase (SQL Editor) y verificar:
- `project_approval_config` tiene seed (1 nivel Supervisor) para el proyecto Zipaquirá.
- `signatures.user_agent` y `tests.revision` presentes.
- En `/projects/<id>/approvals` aparece la bandeja; aprobar la(s) inspección(es) vigente(s) de un equipo `en_ejecucion` con rol supervisor → el equipo pasa a `aprobado`; `equipment_status_history` registra `INSPECTION_APPROVED` (`guard_result='applied'`).
- "Solicitar corrección" sobre equipo `aprobado` → `tests.status='rechazado'` y equipo `en_ejecucion`.
- "Rechazar equipo" → equipo `rechazado`.

- [ ] **Step 6: Commit final si hubiera ajustes**

```bash
git add -A
git commit -m "chore(mc): cierre verificación Fase B (cadena de aprobación)"
```

---

## Self-Review

**1. Spec coverage:**
- Componente 1 (migración modelo) → Task 1. ✓ (tabla + RLS + seed + alters `user_agent`/`revision`)
- Componente 2 (RPC + G1 por config) → Task 2. ✓ (RPC `approve_inspection`, `transition_equipment_state` G1, vista de apoyo)
- Componente 3 (eventos FSM) → sin cambios en `equipmentFsm.ts` (eventos ya existen); la completitud cliente la cubre `isApprovalChainComplete` (Task 4). ✓
- Componente 4 (approvals/signatures) → cubierto por el RPC (Task 2). ✓
- Componente 5 (`submitInspectionOffline` revision) → Task 5. ✓
- Componente 6 (hook + UI) → Tasks 6, 7, 8. ✓
- Componente 7 (UX/gating: full + rol, offline deshabilitado) → gate de rol en RPC (Task 2) + offline disable + acciones en `ApprovalDetail` (Task 8). ✓
- Decisiones 1–6 y observaciones O1–O4 → tabla con `required_role_id` FK (O3), `signatures.user_agent` (O2), `tests.revision` + rework por revisión (O1), `approval_sequential` en `projects.metadata` (O4), online-only (D4), firma electrónica obligatoria por acción + imagen opcional (D5), dos rechazos distintos (D3), G1 por config sobre vigentes (D1/D2), cadena sembrada (D6). ✓
- Testing del spec (vitest: `isApprovalChainComplete`, `useInspectionApproval`, `submitInspection.revision`; SQL transaccional) → Tasks 3, 4, 5, 6, 9. ✓

**2. Placeholder scan:** No hay "TBD/TODO/implement later". Cada step de código incluye el código real. Los únicos puntos "verificar patrón" (firma de `params` de Next.js custom, disponibilidad de `@testing-library/react`, DB local) son verificaciones explícitas con fallback definido, no placeholders de implementación.

**3. Type consistency:** `ApprovalDecision`/`ApproveArgs`/`ApprovalResult` definidos en Task 6 y consumidos sin renombrar en Task 8. `ApprovalQueueItem`/`ApprovalQueueLevel` definidos en Task 7 y usados igual en Task 8 (`nextPendingLevel`, `levels[].approved`, `equipmentTag`). El RPC `approve_inspection` tiene la misma firma de 6 parámetros en Task 2 (SQL), Task 6 (payload del hook) y Task 3 (test SQL). La vista `v_inspection_approval_status` expone las columnas consumidas por `useApprovalQueue` (`test_id`, `equipment_tag`, `level_approved`, etc.). `getMaxRevision` con la misma firma en `SubmitDeps` (Task 5), el wiring del hook y el mock de test.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-06-20-epic-002-faseB-approval-chain.md`.
