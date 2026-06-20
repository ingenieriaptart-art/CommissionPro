# EPIC-002 · Fase B — Cadena de Aprobación Configurable (diseño)

Fecha: 2026-06-20
Estado: Aprobado para implementación (diseño)
Pertenece a: `2026-06-19-epic-002-mechanical-completion-design.md`
Depende de: Fase A (`2026-06-19-epic-002-faseA-state-machine-design.md`) — ya en producción (migraciones 0049/0050).

## Objetivo

Formalizar la **aprobación multinivel de inspecciones** con una **cadena configurable por proyecto (1–3 niveles)**, reusando las tablas existentes `approvals` y `signatures`, y conectarla con la máquina de estados de Fase A: al completarse la cadena de **todas** las inspecciones vigentes de un equipo, el equipo transiciona a `aprobado` (`INSPECTION_APPROVED`); el rechazo expone rework (`INSPECTION_REJECTED`) y rechazo duro (`EQUIPMENT_REJECTED`). Deja la base para Mechanical Completion (Fase D) y el certificado MC (Fase E).

## Decisiones aprobadas por el usuario

1. **Granularidad:** el equipo pasa a `aprobado` solo cuando **todas** sus inspecciones **vigentes** (no borrador, no rechazadas/superadas) completaron su cadena de aprobación obligatoria.
2. **Fuente de verdad:** filas `approvals` (una por nivel configurado) + `project_approval_config`. `test_status` es un **espejo grueso** (compat/UI). El guard G1 se calcula por config, no por el enum.
3. **Rechazo = dos acciones distintas:** "solicitar corrección" (rework) y "rechazar equipo" (no conforme).
4. **Online-only:** aprobar/rechazar exige conexión; llama directo al RPC autoritativo.
5. **Firma electrónica obligatoria** por aprobación (fila `signatures`); imagen dibujada opcional.
6. **Alcance:** backend (modelo + RPC) + integración FSM + **UI de aprobación**; cadena **sembrada** por defecto (pantalla de configuración por proyecto diferida).

### Observaciones incorporadas (refinamiento del usuario)
- **O1 · approval_cycle / revisión por rework:** el rework crea una **nueva** inspección (`tests`) con `revision` incremental; la inspección anterior queda `rechazado` (ciclo cerrado, no bloquea). La completitud mira la inspección **vigente** (mayor `revision`, no rechazada) por plantilla. `approvals`/`signatures` cuelgan de su `tests` → trazabilidad por ciclo natural.
- **O2 · user_agent completo:** `signatures` gana columna `user_agent text` (además de `ip`/`device`).
- **O3 · rol tipado, no texto libre:** `project_approval_config.required_role_id uuid REFERENCES roles(id)` (NULL = cualquiera con acceso `full`). Sin strings sueltos.
- **O4 · `sequential` preparado:** flag a nivel proyecto, default `true`. Fase B siempre aplica orden secuencial; el flag queda reservado para cadenas no-secuenciales futuras (sin nueva migración: `projects.metadata->>'approval_sequential'`).

## Contexto reusado (ya existe)

- **`approvals`** (`id, test_id FK tests ON DELETE CASCADE, level int, level_name text, status approval_status[pendiente|aprobado|rechazado], approver_id FK users, approved_at, observations, unique(test_id, level)`).
- **`signatures`** (`id, user_id FK users, test_id FK tests ON DELETE CASCADE, role_at_sign text, image_url text, signed_at, ip inet, device text`).
- **`roles`** (`id, key[admin|supervisor|tecnico|cliente], name, …`).
- **`guard_test_approval`** (0040): aprobar exige `app_can_full(project_id,'tests')`.
- **`test_status`** enum (fijo): `borrador, ejecutado, revisado, aprob_supervisor, aprob_qaqc, aprob_cliente, cerrado, rechazado`.
- **FSM Fase A** (`equipmentFsm.ts` + `transition_equipment_state` RPC): eventos `INSPECTION_APPROVED` (en_ejecucion→aprobado, guard G1), `INSPECTION_REJECTED` (aprobado→en_ejecucion), `EQUIPMENT_REJECTED` (→rechazado) ya definidos. Audit en `equipment_status_history`.

## Arquitectura

```
[UI Bandeja de revisión] --aprobar/rechazar (ONLINE)--> RPC approve_inspection (autoritativo, atómico)
  ├─ valida full + rol (required_role_id) + orden secuencial
  ├─ inserta approvals(level,status) + signatures(firma electrónica + user_agent)
  ├─ actualiza tests.status (espejo) según decisión
  ├─ recalcula completitud de la cadena del test vigente vs project_approval_config
  └─ si TODAS las inspecciones vigentes del equipo están completas
        → transition_equipment_state(INSPECTION_APPROVED)  (motor Fase A; escribe equipment_status_history)
     rechazo: request_correction → INSPECTION_REJECTED (si equipo 'aprobado') · reject_equipment → EQUIPMENT_REJECTED
```
El servidor es la única autoridad (igual que Fase A). El cliente solo invoca el RPC y refleja el resultado.

## Componentes

### 1. Migración `0051_project_approval_config.sql` — modelo

**Tabla nueva `project_approval_config`:**
```sql
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
ALTER TABLE public.project_approval_config ENABLE ROW LEVEL SECURITY;
-- SELECT: miembros del proyecto o admin. INSERT/UPDATE/DELETE: solo admin (config).
```
- **Seed por defecto** (idempotente) para cada proyecto sin config: 1 fila
  `level=1, level_name='Supervisor', required_role_id=(roles.key='supervisor'), test_status_on_approve='aprob_supervisor', mandatory=true`.
- **Alter `signatures`** (O2): `ADD COLUMN IF NOT EXISTS user_agent text;`
- **Alter `tests`** (O1): `ADD COLUMN IF NOT EXISTS revision int NOT NULL DEFAULT 1;`
  - `revision` = en cada re-inspección de un `(equipment_id, template_id)` con una inspección previa rechazada, `max(revision previa)+1`. (Lo setea `submitInspectionOffline` — ver componente 5.)

> Numeración auto-detectada: max actual = 0050 → 0051/0052. El plan ejecuta `ls database/migrations | ...`.

### 2. Migración `0052_fn_approve_inspection.sql` — RPC + guard G1

**RPC `approve_inspection` (SECURITY DEFINER, atómico):**
```sql
approve_inspection(
  p_test_id        uuid,
  p_level          int,
  p_decision       text,                 -- 'approve' | 'request_correction' | 'reject_equipment'
  p_observations   text DEFAULT NULL,
  p_signature_image text DEFAULT NULL,   -- opcional (URL/dataref)
  p_user_agent     text DEFAULT NULL     -- O2
) RETURNS jsonb
```
Flujo:
1. Cargar `tests` (`project_id, equipment_id, status, template_id, revision`) `FOR UPDATE`; si no existe/borrado → `{ok:false, reason:'test_not_found'}`.
2. **Permiso:** `app_can_full(project_id,'tests')`; y si la fila de config del `p_level` tiene `required_role_id`, el actor debe tener ese rol (o ser admin). Si no → `{ok:false, reason:'not_allowed'}`.
3. **Orden secuencial** (O4): si `projects.metadata->>'approval_sequential'` ≠ `'false'` (default true), `p_level` debe ser el **menor nivel `mandatory` aún sin aprobar** para ese test. Si no → `{ok:false, reason:'level_not_next'}`.
4. Según `p_decision`:
   - **approve:** upsert `approvals(test_id,level,level_name,status='aprobado',approver_id,approved_at=now,observations)` (onConflict `test_id,level`); insert `signatures(user_id,test_id,role_at_sign=level_name,image_url=p_signature_image,ip=inet_client_addr(),device=…,user_agent=p_user_agent)`; `UPDATE tests SET status = COALESCE(test_status_on_approve, status)`.
     - Recalcular **completitud del test**: todo nivel `mandatory` del proyecto tiene `approvals(status='aprobado')`.
     - Si el test quedó completo → evaluar **completitud del equipo** (ver guard G1) → si aplica, `PERFORM transition_equipment_state(equipment_id,'INSPECTION_APPROVED',<status_actual>,…,'online')`.
   - **request_correction:** upsert `approvals(level,status='rechazado',observations)` + `signature`; `UPDATE tests SET status='rechazado'`. Si el equipo está `aprobado` → `transition_equipment_state(...,'INSPECTION_REJECTED',...)` (→en_ejecucion). Si está `en_ejecucion`, sin transición (se re-ejecuta luego).
   - **reject_equipment:** registra `approvals(status='rechazado')` + `signature`; `transition_equipment_state(...,'EQUIPMENT_REJECTED',...)` (→rechazado).
5. Devuelve `{ ok:true, test_status, equipment_status, chain_complete, applied_event }`.

Toda transición de equipo escribe `equipment_status_history` (motor Fase A). El RPC reusa `guard_test_approval` indirectamente vía el chequeo `app_can_full`.

**Actualización de G1 en `transition_equipment_state` (`CREATE OR REPLACE`):**
`v_appr` deja de mirar el enum y pasa a **completitud por config sobre inspecciones vigentes**:
```sql
-- "inspección vigente" por (equipment_id, template_id) = la de mayor revision, status <> 'borrador' y <> 'rechazado'
-- v_appr = (existe ≥1 inspección vigente) Y (ninguna inspección vigente tiene un nivel mandatory sin aprobar)
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
```

### 3. Eventos FSM (sin estados ni enum nuevos)
- `INSPECTION_APPROVED`: `en_ejecucion → aprobado`, guard **G1 = completitud por config** (arriba).
- `INSPECTION_REJECTED`: `aprobado → en_ejecucion` (rework tras aprobado).
- `EQUIPMENT_REJECTED`: cualquier activo → `rechazado`.
- La FSM cliente (`equipmentFsm.ts`) ya los contiene; `DerivedFlags.approvalsComplete` se calcula en cliente (UX) con un helper espejo `isApprovalChainComplete(equipmentTests, config, approvals)`. El servidor es autoridad.

### 4. Integración con `approvals` / `signatures`
- `approvals`: una fila por nivel; `level/level_name` provienen de `project_approval_config`. Reusa `unique(test_id,level)` (idempotente al re-aprobar).
- `signatures`: una fila por **acción** de aprobación/rechazo (firma electrónica: `user_id, role_at_sign, signed_at, ip, device, user_agent`; `image_url` opcional). Trazabilidad por ciclo: cuelgan del `tests` de su revisión.

### 5. Cliente — `submitInspectionOffline` (O1, cambio menor)
Al crear una inspección, calcular `revision`: si existe una inspección previa del mismo `(equipment_id, template_id)`, `revision = max(prev.revision)+1`, si no `1`. Se incluye en la fila `tests` (y viaja en el outbox). El resto del flujo de Fase A no cambia.

### 6. Cliente — hook + UI de aprobación
- **`useInspectionApproval`** (hook): `approve(testId, level, decision, observations?, signatureImage?)` → `supabase.rpc('approve_inspection', {... p_user_agent: navigator.userAgent})`; online-only (si `!navigator.onLine` → error "requiere conexión").
- **`isApprovalChainComplete(...)`** (`lib/state/approvalChain.ts`, puro y testeable): completitud por config para UX/gating.
- **Bandeja de revisión** (ruta `/projects/[projectId]/approvals` o sección en la página de pruebas): inspecciones con un nivel `mandatory` pendiente que el usuario puede aprobar (rol + `full`). Muestra TAG, plantilla, revisión, progreso de cadena (L1✓ L2…).
- **Detalle de revisión:** reusa `InspectionSummary` (solo lectura) + acciones **Aprobar / Solicitar corrección / Rechazar equipo** + `signature_pad` (firma dibujada opcional) → `useInspectionApproval`.

### 7. UX / gating
- Solo se muestran acciones de aprobación si el usuario tiene `full` en `tests` **y** su rol coincide con `required_role_id` del nivel (o el nivel no exige rol).
- Offline: acciones deshabilitadas con aviso.

## Manejo de errores
- `test_not_found` / `not_allowed` / `level_not_next` → el RPC devuelve `{ok:false, reason}`; la UI lo muestra y no muta estado.
- Re-aprobar el mismo nivel → idempotente (`unique(test_id,level)` → upsert).
- Concurrencia: `FOR UPDATE` sobre el `tests`; la transición del equipo usa el `FOR UPDATE` + G-OFFLINE del motor de Fase A.
- Online-only: sin red, la acción ni se intenta (gate en cliente) y, si llegara, el RPC falla por ausencia de sesión.

## Testing
- **Vitest:**
  - `isApprovalChainComplete`: con varias plantillas/revisiones; ignora `rechazado`/superadas; exige todos los niveles `mandatory`; cadena de 1 y de 3 niveles.
  - `useInspectionApproval`: mockea `rpc`; verifica payload (incluye `p_user_agent`) y manejo online/offline.
  - `submitInspectionOffline`: `revision` = max previa + 1 por `(equipment, template)`.
- **SQL (prueba transaccional con rollback, patrón Fase A):**
  - approve secuencial L1→…→último mandatory → `chain_complete=true` → equipo `aprobado` (si todas las inspecciones vigentes completas), fila `applied` en `equipment_status_history`.
  - `level_not_next` al saltar nivel; `not_allowed` sin rol/full.
  - request_correction → `tests.status='rechazado'`, equipo `en_ejecucion` (o INSPECTION_REJECTED si estaba aprobado).
  - reject_equipment → equipo `rechazado`.
  - Inspección `rechazado` vieja **no** bloquea cuando existe una `revision` posterior aprobada.

## Impacto en Mechanical Completion (Fase D)
Ninguno estructural: `MC_COMPLETED` (G2) ya exige equipo `aprobado` + sin punch. Fase B hace que `aprobado` sea **significativo** (cadena configurable cumplida sobre inspecciones vigentes). MC consume el estado.

## Impacto en certificados futuros (Fase E)
El certificado MC citará la **cadena de aprobación**: `approvals` (nivel/quién/cuándo) + `signatures` (firma electrónica + `user_agent`/`ip`) de las inspecciones **vigentes**, más el historial de ciclos (rework) por trazabilidad. Fase B garantiza esos registros; el certificado (Fase E) los consume vía `certificate_items`. Sin código de certificado en Fase B.

## Fuera de alcance
- Pantalla admin de configuración de la cadena (`project_approval_config`) — fase posterior (Fase B solo siembra el default).
- Aprobaciones offline (Fase B es online-only).
- Cadenas no-secuenciales (flag `sequential` reservado; Fase B aplica secuencial).
- Rol `qaqc`/`director` nuevos (no existen en `roles`; los niveles QA/cliente usan roles existentes o se agregan en otra fase).
- Punch automático, MC, certificados, dashboard (Fases C–F).

## Verificación
- `npm test` (vitest) verde con la cobertura listada.
- Migraciones 0051/0052 aplicadas: `project_approval_config` con seed; `signatures.user_agent` y `tests.revision` presentes; `approve_inspection` y `transition_equipment_state` (G1 por config) operativos.
- Prueba SQL transaccional: cadena completa → equipo `aprobado`; rechazos correctos; rework por revisión no bloquea.
- Manual: aprobar una inspección desde la bandeja (online) → el equipo pasa a `aprobado` cuando todas sus inspecciones vigentes están aprobadas; `equipment_status_history` registra `INSPECTION_APPROVED`.
