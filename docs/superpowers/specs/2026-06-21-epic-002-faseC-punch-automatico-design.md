# EPIC-002 · Fase C — Punch Automático (diseño)

Fecha: 2026-06-21
Estado: Aprobado para implementación (diseño)
Pertenece a: `2026-06-19-epic-002-mechanical-completion-design.md`
Depende de: Fase A (`0049/0050`, FSM + `transition_equipment_state`) y Fase B (`0051/0052`, cadena de aprobación) — ambas en producción.

## Objetivo

Generar **punch automáticamente** a partir de los ítems fallidos de una inspección, de forma **offline-first**, idempotente y trazable de punta a punta (inspección → punch → corrección → verificación → cierre). Integrar el punch con la FSM de equipos y dejar preparada —sin implementar— la clasificación A/B/C de Mechanical Completion (Fase D). La detección de falla mantiene **una sola fuente de verdad** (`FAIL_VALUES`, en cliente); el servidor es la autoridad de **persistencia, idempotencia y reglas de ciclo de vida** vía constraints y triggers (no vía RPC autoritativo, a diferencia de la aprobación de Fase B).

## Decisiones aprobadas

1. **Generación en cliente, offline-first (Q1).** Al cerrar la inspección, `submitInspectionOffline` deriva los punch y los encola en el mismo pipeline IndexedDB → Outbox → Sync Engine de Fases A/B. **Idempotencia autoritativa = `UNIQUE(source_test_id, source_item_key)`** en la base. El `id` del punch se genera con `uuidv5(testId + ':' + fieldKey)` para reducir reconciliación local; el UNIQUE sigue siendo la fuente real de idempotencia. **El `UNIQUE(source_test_id, source_item_key)` es la autoridad definitiva de idempotencia; el UUID determinístico es solo una optimización local — si el algoritmo de id cambiara, la base sigue protegiendo contra duplicados.** Sin duplicar `FAIL_VALUES` en SQL.
2. **Regla de disparo (Q2).** Por cada `(fieldKey, value)` con `value ∈ FAIL_VALUES` (match exacto) → 1 punch; `source_item_key = fieldKey`. `no_aplica` nunca dispara. Campos no-veredicto no matchean.
3. **Prioridad inicial data-driven (Q2/P2).** `priority = field.punch_priority ?? 'media'`. Soporte cableado desde Fase C aunque ninguna plantilla traiga `punch_priority` hoy (todo cae a `media`).
4. **`generation_source` (Q1):** `auto_inspection | manual | imported`. El flujo manual existente pasa a `'manual'` (default).
5. **Ciclo de vida (Q3).** Estados sin cambios: `abierto → en_proceso → corregido → cerrado`. "Abierto" para commissioning = `status <> 'cerrado'`; `corregido` **sigue bloqueando** MC. Transiciones **offline-optimistas** (update directo de tabla + IndexedDB + sync), **sin RPC**. Cierre en dos pasos: `corregido` (ejecutor) → `cerrado` (verificador con `full`). Reapertura permitida a `full`, auditada.
6. **Autoridad de ciclo de vida = trigger `guard_punch_lifecycle` (Q3 + ajuste).** Valida evidencia obligatoria, permisos de cierre, reapertura, y **materializa** timestamps y actores. Es la autoridad para cualquier vía (online directo u offline sync).
7. **Ownership (Q4).** `responsible_id = NULL` por defecto; `created_by = inspector`. Triage manual reusando el flujo de actualización de punch. Auto-asignación diferida.
8. **Bandeja y métricas (Q4/T2).** Vista read-only `v_punch_board` (`security_invoker`) — **exclusiva de UI/filtros/agrupación/métricas, nunca para reglas FSM**. Online = vista; offline = fallback IndexedDB read-only. Agrupación Área→Sistema→**Subsistema**→Equipo→Punch (unidad principal: subsistema).
9. **Evidencias (Q5).** Evidencia de **corrección obligatoria** al pasar a `corregido` (≥1, pipeline de evidencias existente, `evidences.punch_id`, `stage='correccion'`). Evidencia de **verificación opcional** (`stage='verificacion'`). `verification_notes` opcional al cerrar. Sin tabla nueva. **Path de Storage:** `project/equipment/punch/<punch_id>/<evidence_id>`.
10. **Orden del outbox (Q5 + ajuste):** la evidencia de corrección se sincroniza **antes** de la transición a `corregido` (FIFO); el trigger valida la existencia real en servidor; el cliente replica el gate solo como UX.
11. **Trazabilidad materializada (Q3/Q4/Q5):** `first_raised_at`, `raised_at`, `corrected_at`, `corrected_by`, `closed_at`(existente), `closed_by`, `reopened_at`, `reopened_by`, `verification_notes`; se conservan `created_by`, `responsible_id`, `source_test_id`, `source_item_key`, `generation_source`.
    - **`first_raised_at` es inmutable:** se fija solo en la creación del punch; reaperturas, correcciones y cierres **no** lo modifican (el trigger lo fuerza a `OLD.first_raised_at` en todo UPDATE). `raised_at` sí refleja la última (re)apertura. **Los KPIs de aging histórico se basan en `first_raised_at`, no en `raised_at`**, para no perder antigüedad al reabrir.
12. **Integración MC (Q6/G-Prep-1).** `transition_equipment_state` **sin cambios**: cualquier punch `≠ 'cerrado'` bloquea MC por igual (cualquier prioridad/origen). `commissioning_category` = **placeholder nullable sin uso**. La regla A/B/C y el cambio de guard pertenecen a Fase D.
13. **Rework (Q3):** nueva revisión = nuevo test = nuevos punch (otro `source_test_id`). No se reabren punch históricos. Reconciliación entre revisiones diferida.

## Diferimientos explícitos

Auto-asignación por disciplina/subsistema · reconciliación entre revisiones · categorías A/B/C y su gating · `mc_blocking` · dashboard avanzado / Digital Twin de punch · materialized views · analítica histórica avanzada · firma electrónica de cierre · evidencia obligatoria del verificador · evidencia obligatoria por prioridad/proyecto · workflow QA/QC específico.

## Contexto reusado (ya existe)

- **`punch_items`** (0005): `id, project_id, equipment_id, test_id, code, title, description, priority(punch_priority), status(punch_status), responsible_id, due_date, closed_at, version, sync_status, created_at, updated_at, deleted_at, created_by, updated_by`.
- **Enums:** `punch_priority(critica|alta|media|baja)`, `punch_status(abierto|en_proceso|corregido|cerrado)`, `evidence_stage(antes|durante|despues|general)`, `evidence_type(foto|video|pdf|archivo)`.
- **`evidences`** con `punch_id` (FK ON DELETE CASCADE, desde 0005) + pipeline offline (blob IndexedDB → Storage en `engine.ts`, path actual `project/equipment/test/<id>`).
- **Jerarquía:** `equipment.subsystem_id → subsystems.system_id → systems.area_id → areas.project_id`. `equipment.project_id` denormalizado.
- **Hooks punch:** `usePunch / usePunchPaged / useCreatePunch / useUpdatePunch / useClosePunch` (offline-aware), página `projects/[projectId]/punch/page.tsx`. Métricas en `useStats` (offline IndexedDB) + vista materializada `0010`.
- **Cliente inspección:** `submitInspection.ts` con `FAIL_VALUES = {FALLA, NO, RECHAZADO, No cumple, No conforme}`, outbox (`enqueueSync`, `enqueueTransition`), FSM `nextState`.
- **FSM:** `PUNCH_RAISED` (`mechanical_completion → aprobado`), `PUNCH_CLEARED` (no-op reservado); `transition_equipment_state` guard de MC = `count(punch_items where status<>'cerrado')=0`.

## Arquitectura

```
[Inspección cerrada] --deriveAutoPunches (FAIL_VALUES, cliente)--> punch_items (IndexedDB) + Outbox
       │                                                                   │
       │ (FSM) PUNCH_RAISED solo si transiciona (mc→aprobado)              ▼
       │                                                          Sync Engine → Supabase
       ▼                                                                   │
[Ciclo de vida offline-optimista]  abierto→en_proceso→corregido→cerrado    ▼
   evidencia(correccion) → corregido (FIFO)                      guard_punch_lifecycle (TRIGGER, autoridad)
   verificador full + verification_notes → cerrado                + UNIQUE(source_test_id,source_item_key) (idempotencia)
       │                                                                   │
       ▼                                                                   ▼
[Bandeja/Métricas]  v_punch_board (UI only)              transition_equipment_state (guard MC, SIN cambios)
```
Servidor autoritativo vía **constraint + trigger** (no RPC). La FSM sigue siendo la única autoridad de estados de equipo.

## Componentes

### 1. Migración `0053_punch_auto_model.sql` — modelo

```sql
-- Valores de enum primero (fuera de transacción; ADD VALUE no se usa en la misma migración)
ALTER TYPE public.evidence_stage ADD VALUE IF NOT EXISTS 'correccion';
ALTER TYPE public.evidence_stage ADD VALUE IF NOT EXISTS 'verificacion';

BEGIN;
ALTER TABLE public.punch_items
  ADD COLUMN IF NOT EXISTS source_test_id        uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_item_key       text,
  ADD COLUMN IF NOT EXISTS generation_source     text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS commissioning_category text,            -- placeholder A/B/C (sin uso en Fase C)
  ADD COLUMN IF NOT EXISTS raised_at             timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_raised_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS corrected_at          timestamptz,
  ADD COLUMN IF NOT EXISTS corrected_by          uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS closed_by             uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS reopened_at           timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by           uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS verification_notes    text;

-- generation_source acotado (CHECK idempotente, no enum, para evitar fricción de ALTER TYPE)
ALTER TABLE public.punch_items DROP CONSTRAINT IF EXISTS punch_generation_source_chk;
ALTER TABLE public.punch_items ADD CONSTRAINT punch_generation_source_chk
  CHECK (generation_source IN ('auto_inspection','manual','imported'));

-- Idempotencia autoritativa del auto-punch (manuales NULL,NULL no colisionan)
CREATE UNIQUE INDEX IF NOT EXISTS uq_punch_source
  ON public.punch_items (source_test_id, source_item_key);

CREATE INDEX IF NOT EXISTS idx_punch_equipment_status ON public.punch_items(equipment_id, status);
CREATE INDEX IF NOT EXISTS idx_punch_unassigned ON public.punch_items(project_id) WHERE responsible_id IS NULL AND deleted_at IS NULL;
COMMIT;
```
Notas: las dos `ALTER TYPE ADD VALUE` se ejecutan **antes** del `BEGIN` (PostgreSQL no permite usar el valor nuevo en la misma transacción; en el SQL Editor de Supabase cada sentencia autocommitea). Migración **idempotente** y re-ejecutable.

### 2. Migración `0054_fn_punch_lifecycle.sql` — trigger + vista

**Trigger `guard_punch_lifecycle` (BEFORE UPDATE, autoridad de ciclo de vida):**
```sql
CREATE OR REPLACE FUNCTION public.guard_punch_lifecycle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.first_raised_at := OLD.first_raised_at;   -- inmutable: nunca cambia tras la creación
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- → corregido: requiere ≥1 evidencia de corrección; materializa actor/timestamp
    IF NEW.status = 'corregido' THEN
      IF NOT EXISTS (SELECT 1 FROM public.evidences e
                     WHERE e.punch_id = NEW.id AND e.stage = 'correccion' AND e.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'punch %: se requiere evidencia de corrección', NEW.id USING ERRCODE='check_violation';
      END IF;
      NEW.corrected_at := COALESCE(NEW.corrected_at, now());
      NEW.corrected_by := app_current_user_id();

    -- → cerrado: solo desde corregido, full sobre 'punch', evidencia presente
    ELSIF NEW.status = 'cerrado' THEN
      IF OLD.status <> 'corregido' THEN
        RAISE EXCEPTION 'punch %: solo se cierra desde corregido', NEW.id USING ERRCODE='check_violation';
      END IF;
      IF NOT public.app_can_full(NEW.project_id, 'punch') THEN
        RAISE EXCEPTION 'punch %: se requiere control total para cerrar', NEW.id USING ERRCODE='insufficient_privilege';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.evidences e
                     WHERE e.punch_id = NEW.id AND e.stage = 'correccion' AND e.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'punch %: cierre requiere evidencia de corrección', NEW.id USING ERRCODE='check_violation';
      END IF;
      NEW.closed_at := COALESCE(NEW.closed_at, now());
      NEW.closed_by := app_current_user_id();

    -- reapertura (corregido/cerrado → abierto/en_proceso): requiere full; audita; preserva first_raised_at
    ELSIF NEW.status IN ('abierto','en_proceso') AND OLD.status IN ('corregido','cerrado') THEN
      IF NOT public.app_can_full(NEW.project_id, 'punch') THEN
        RAISE EXCEPTION 'punch %: se requiere control total para reabrir', NEW.id USING ERRCODE='insufficient_privilege';
      END IF;
      NEW.reopened_at := now();
      NEW.reopened_by := app_current_user_id();
      NEW.raised_at   := now();                 -- nueva apertura
      NEW.corrected_at := NULL; NEW.corrected_by := NULL;
      NEW.closed_at := NULL;    NEW.closed_by := NULL;
      -- first_raised_at NO se modifica (backlog real)
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_punch_lifecycle ON public.punch_items;
CREATE TRIGGER trg_guard_punch_lifecycle
  BEFORE UPDATE ON public.punch_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_punch_lifecycle();
```
- Los **actores** se fijan con `app_current_user_id()` (autoridad del servidor); los **timestamps** preservan el valor del cliente cuando existe (`COALESCE`, para reflejar el momento real offline) o usan `now()`.
- El trigger corre igual para escritura online directa (PostgREST) y para la aplicación en el sync.

**Vista `v_punch_board` (UI/métricas, nunca FSM):**
```sql
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
  (p.status <> 'cerrado')                                         AS is_open,
  (p.responsible_id IS NULL)                                      AS unassigned,
  GREATEST(0, EXTRACT(DAY FROM now() - p.raised_at))::int         AS age_days,        -- apertura actual
  GREATEST(0, EXTRACT(DAY FROM now() - p.first_raised_at))::int   AS age_days_total   -- backlog histórico (KPIs)
FROM public.punch_items p
JOIN public.equipment e   ON e.id = p.equipment_id
LEFT JOIN public.subsystems ss ON ss.id = e.subsystem_id
LEFT JOIN public.systems    sy ON sy.id = ss.system_id
LEFT JOIN public.areas      ar ON ar.id = sy.area_id
WHERE p.deleted_at IS NULL;
```

### 3. Generación automática — cliente

**Helper puro `deriveAutoPunches(answers, template, ctx)`** (`app/src/lib/punch/autoPunch.ts`, testeable):
- `FAIL_VALUES` se extrae a un módulo compartido reusado por `submitInspection` (única fuente de verdad).
- Recorre `answers`; por cada `value ∈ FAIL_VALUES`, mapea `fieldKey → field` (label, `punch_priority?`) vía las secciones de `template`; produce filas punch:
  - `id = uuidv5(\`${testId}:${fieldKey}\`, NS)`, `source_test_id=testId`, `source_item_key=fieldKey`, `test_id=testId`, `equipment_id`, `project_id`,
  - `generation_source='auto_inspection'`, `priority = field.punch_priority ?? 'media'`, `status='abierto'`,
  - `title = field.label`, `description = \`${sectionName}: ${value}\``, `responsible_id=null`, `created_by=userId`,
  - `raised_at=first_raised_at=now`, `sync_status='pending'`.

**Integración en `submitInspectionOffline`:** tras escribir el `test`, llamar `deriveAutoPunches`, `db.punchItems.add` + `enqueueSync('punch_items','INSERT', row)` por cada punch. Emitir `PUNCH_RAISED` por la FSM **solo si transiciona** (mismo patrón que `INSPECTION_EXECUTED`: `if target && target !== fromStatus`).

### 4. Ciclo de vida + evidencias (offline-optimista)

- **Hooks** (extienden el patrón punch existente, sin RPC):
  - `useMarkCorrected(punchId)`: exige (UX) ≥1 evidencia de corrección capturada; **encola primero la(s) evidencia(s)** (`enqueueSync('evidences','INSERT')`) y **luego** el update `status='corregido'` (orden FIFO garantiza que el trigger vea la evidencia).
  - `useClosePunch(punchId, verification_notes?)`: set `status='cerrado'` (+ `verification_notes`); UX deshabilitado si el usuario no tiene `full`.
  - `useReopenPunch(punchId)`: set `status='abierto'`; UX solo `full`.
- **Captura de evidencia de punch:** reusa `saveBlobLocally` + fila `evidences` con `punch_id`, `stage='correccion'` (o `'verificacion'`), `captured_by`, `captured_at`, `observations`.
- **Engine (`engine.ts`):** (a) path de Storage para evidencia de punch → `\`${project_id}/${equipment_id}/punch/${punch_id}/${id}.${ext}\`` cuando `test_id` es null y hay `punch_id`; (b) **idempotencia**: si el INSERT de un `punch_items` viola `uq_punch_source` (replay/reenvío), tratar la op como **resuelta** (no reintentar), igual que una transición `rejected`.

### 5. Bandeja operativa + métricas

- **Hook `usePunchBoard(projectId, filters)`** lee `v_punch_board` (online) con fallback IndexedDB read-only (join de jerarquía en cliente). Agrupa por Área→Sistema→Subsistema→Equipo→Punch (default subsistema, colapsable).
- **Filtros:** `status`, `priority`, `generation_source`, **sin asignar** (`unassigned`), `aging` (buckets), sobre la página `punch` existente.
- **KPIs (extender `useStats` offline + agregación de `v_punch_board` online):** abiertos totales; por prioridad; por estado; por origen; **aging `0–7 / 8–30 / >30` sobre `first_raised_at` (`age_days_total`)** — backlog histórico que sobrevive reaperturas; equipos con punch abierto; % equipos con punch abierto; top subsistemas con punch abierto; ratio auto-punch/inspección.
- Dashboard avanzado / Digital Twin → Fase F.

### 6. FSM e integración MC

- `transition_equipment_state` **sin cambios** — guard de MC inline (`count(status<>'cerrado')=0`), autoritativo. `commissioning_category` no se lee.
- `PUNCH_RAISED` se emite solo cuando hay transición real (`mc → aprobado`); `PUNCH_CLEARED` reservado; cerrar punch no dispara transición.

## Manejo de errores

- **Duplicado auto-punch** (replay): violación de `uq_punch_source` → op resuelta (no reintenta), el punch ya existe.
- **`corregido` sin evidencia / orden incorrecto:** el trigger lanza `check_violation`; el cliente previene el caso ordenando evidencia→corregido en el outbox y con gate de UX.
- **`cerrado` sin `full` o sin evidencia / no desde corregido:** trigger lanza `insufficient_privilege`/`check_violation`; UX deshabilita la acción para usuarios sin `full`.
- **Reapertura sin `full`:** trigger rechaza.
- **Offline:** todas las acciones son optimistas; una op que el servidor rechace se reconcilia (el engine reporta y no reintenta indefinidamente).

## Testing

- **Vitest:**
  - `deriveAutoPunches`: dispara solo en `FAIL_VALUES`; `no_aplica` no; 1 punch por `fieldKey`; `priority = field.punch_priority ?? 'media'`; id determinístico estable por `(testId, fieldKey)`; `generation_source='auto_inspection'`, `responsible_id=null`, `created_by` correcto.
  - `submitInspectionOffline`: con fallas → filas `punch_items` en store + outbox; `PUNCH_RAISED` solo si transiciona; sin fallas → 0 punch.
  - Engine: idempotencia ante `uq_punch_source` (op resuelta); path de Storage de evidencia de punch.
- **SQL transaccional (`database/tests/0054_punch_lifecycle_test.sql`, patrón Fase B):**
  - Idempotencia: segundo INSERT con mismo `(source_test_id, source_item_key)` falla por UNIQUE.
  - `→ corregido` sin evidencia → excepción; con evidencia → ok + `corrected_at/by` materializados.
  - `→ cerrado` sin `full` → excepción; sin evidencia → excepción; desde `corregido` con `full` + evidencia → ok + `closed_at/by` + `verification_notes`.
  - Reapertura: sin `full` → excepción; con `full` → `reopened_at/by`, `raised_at` nuevo, `first_raised_at` intacto.
  - Guard MC: con punch `≠ cerrado` el equipo no completa MC (comportamiento sin cambios).
- **Gate funcional** (script `validate.mjs` vía REST/Auth, patrón Fase B): generación → corregido (con evidencia) → cerrado (full) → verificación de timestamps/actores/`v_punch_board`; limpieza de datos de prueba.

## Roadmap de implementación

1. **Mig 0053** — modelo (`punch_items` + UNIQUE + CHECK + placeholder; `evidence_stage` ADD VALUE).
2. **Mig 0054** — `guard_punch_lifecycle` (trigger) + `v_punch_board` (vista).
3. **Test SQL 0054** — idempotencia + guard (corregido/cerrado/reapertura) + MC.
   **🛑 Checkpoint backend** (revisión humana antes de cliente/UI, igual que Fase B).
4. **`deriveAutoPunches`** + módulo compartido `FAIL_VALUES` (TDD).
5. **Integración generación** en `submitInspection.ts` / `useSubmitInspection` (+ `PUNCH_RAISED` condicional).
6. **Hooks de ciclo de vida** (`useMarkCorrected`/`useClosePunch`/`useReopenPunch`) + captura de evidencia de punch.
7. **Engine** — path de Storage de punch + idempotencia `uq_punch_source`.
8. **`usePunchBoard` + UI** — bandeja agrupada (subsistema) + filtros + triage, reusando la página `punch`.
9. **KPIs** en `useStats` + tiles de métricas.
10. **Verificación + gate funcional** (vitest verde, tsc/eslint 0, test SQL, `validate.mjs`).

## Criterios de aceptación

- Una inspección con ítems fallidos genera 1 punch por ítem (`source_item_key`), `generation_source='auto_inspection'`, `priority` data-driven, `responsible_id=NULL`, offline.
- Reenviar/replay no duplica (UNIQUE).
- No se puede pasar a `corregido` sin evidencia de corrección, ni cerrar sin `full` + evidencia; reapertura solo con `full`; todo materializado (`*_at/*_by`, `first_raised_at`) y auditado.
- Evidencia de punch se almacena por el pipeline existente con `evidences.punch_id` y path de punch; `stage` `correccion`/`verificacion` operativos.
- Cualquier punch `≠ cerrado` bloquea MC (sin cambios en `transition_equipment_state`).
- Bandeja agrupada por subsistema con filtros (status/priority/source/triage/aging) y KPIs listados; offline en read-only.
- `commissioning_category` presente y sin efecto; FSM sin cambios.
- `npm test` (vitest) verde; `tsc`/`eslint` sin errores nuevos; test SQL y gate funcional en verde.

## Fuera de alcance

Categorías A/B/C y su gating (Fase D) · Mechanical Completion (Fase D) · certificados (Fase E) · dashboard/Digital Twin avanzado (Fase F) · auto-asignación · reconciliación entre revisiones · materialized views · firma electrónica de cierre · evidencia obligatoria del verificador · workflow QA/QC.
