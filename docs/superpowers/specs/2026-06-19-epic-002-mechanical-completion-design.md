# EPIC-002 — Mechanical Completion Workflow (Diseño industrial)

Fecha: 2026-06-19
Estado: En revisión (diseño de epic — la implementación se descompone en fases A–F)

## Objetivo

Formalizar el flujo completo de Mechanical Completion sobre el modelo existente:
`Equipo → Inspección → Aprobación → Punch List → Mechanical Completion → Certificado → Dashboard → Digital Twin`,
con trazabilidad de extremo a extremo y sin perder la captura offline-first ya construida.

## Premisa — reutilización (≈80% del modelo ya existe)

| Activo existente | Para MC |
|---|---|
| `test_status` enum (`borrador,ejecutado,revisado,aprob_supervisor,aprob_qaqc,aprob_cliente,cerrado,rechazado`) | aprobación multinivel ya modelada |
| `equipment_status` enum (incl. `listo_energizacion`=RFC, `listo_arranque`=RFSU, `operativo`) | RFC/RFSU ya existen |
| `approvals` (`test_id, level 1..7, level_name, status, approver_id, approved_at, observations`) | workflow multinivel sin UI |
| `signatures` (`test_id, role_at_sign, image_url, signed_at, ip, device`) | firmas con integridad |
| `punch_items` (`equipment_id, test_id, priority, status, responsible_id, due_date`) | base de punch |
| `certificates` (`test_id UNIQUE, type CHECK, number, status, storage_path`) | base de certificado |
| `dossiers` (`scope, status`) | base de dossier (fuera de alcance del epic) |
| `tests.template_snapshot/template_hash` (0047) | trazabilidad de definición |
| `guard_test_approval` trigger (0040) | gate de permiso `full` para aprobar/cerrar |

EPIC-002 = máquina de estados + acciones de aprobación + auto-punch + gating de MC +
certificado MC + rollups. **3 cambios de enum + 2–3 tablas + lógica**, sin rehacer el modelo.

## Decisiones (aprobadas por el usuario, 2026-06-19)

1. **Estados de equipo: híbrido** — hitos persistidos en `equipment_status`; transitorios
   ("Inspeccionado", "Con Punch") **derivados** de datos (no en el enum).
2. **Certificado MC a ambos niveles** — equipo **y** subsistema (`mc_records.scope`).
3. **Punch automático: uno por ítem fallido** — trazabilidad fina vía `source_item_key`.
4. **Cadena de aprobación configurable por proyecto** (1–3 niveles) — tabla de config.

---

## FASE 1 — Diseño funcional (matrices de estados)

### Estados de Equipo (híbrido)

**Canónico (persistido en `equipment_status`):**
```
pendiente → en_ejecucion → aprobado → mechanical_completion* → listo_energizacion (RFC)
          → listo_arranque (RFSU) → operativo
ramas: rechazado, bloqueado
```
→ Único valor nuevo: **`mechanical_completion`**.

**Derivado (calculado, no en el enum):**
- **Inspeccionado** = ≥1 `tests` con status `ejecutado`+.
- **Con Punch** = ≥1 `punch_items` con status ∉ {`verificado`,`cerrado`}.

**Matriz de transición (equipo):**

| De | A | Disparador |
|---|---|---|
| pendiente | en_ejecucion | primera inspección ejecutada |
| en_ejecucion | aprobado | inspecciones requeridas aprobadas (sin punch abierto bloqueante) |
| en_ejecucion / aprobado | rechazado | inspección rechazada |
| aprobado | mechanical_completion | Caso 4 (punch cerrados + aprobaciones) + acción "Completar MC" |
| mechanical_completion | listo_energizacion | proceso RFC (fuera de alcance detallado del epic) |
| listo_energizacion | listo_arranque | proceso RFSU |
| cualquiera | bloqueado | bloqueo manual (supervisor) |

### Estados de Inspección (usar enum existente)

`borrador → ejecutado → revisado → aprob_supervisor → [aprob_qaqc] → [aprob_cliente] → cerrado`;
rama `rechazado`. Sin cambios de enum. El nº de niveles lo define la config por proyecto.

### Estados de Punch (extender enum)

`abierto → asignado → en_proceso → corregido → verificado → cerrado`.
→ Valores nuevos: **`asignado`, `verificado`**. ("en_proceso" = en corrección.)

---

## FASE 2 — Reglas de negocio

| Caso | Disparador | Resultado |
|---|---|---|
| 1 — sin hallazgos | todos los ítems `cumple`/`no_aplica` | inspección aprobable; al aprobar → equipo `aprobado` |
| 2 — con hallazgos | ítem `no_cumple`/`rechazado`/crítico | auto-punch **por ítem** (equipo+test+`source_item_key`) |
| 3 — punch abierto | equipo con ≥1 punch ∉ {verificado,cerrado} | **MC bloqueado** |
| 4 — punch cerrados | todos los punch verificado/cerrado **Y** inspecciones requeridas aprobadas | **MC habilitado** ("Completar MC") |

---

## FASE 3 — Modelo de datos

**Reutilizar sin cambio:** `tests`, `evidences`, `signatures`, `approvals`, `dossiers`.

**Modificar:**
- `equipment_status` enum: **+`mechanical_completion`**.
- `punch_status` enum: **+`asignado`, +`verificado`**.
- `punch_items`: **+`source_item_key text`** (idempotencia) + índice `(equipment_id,status)`.
- `certificates`: **+`'mechanical_completion'`** al CHECK `type`; **`test_id` → nullable**;
  **+`scope` (`equipment`|`subsystem`), +`scope_id uuid`, +`equipment_id uuid`**.

**Nuevas tablas:**
- **`mc_records`** — acta de MC: `id, project_id, scope('equipment'|'subsystem'), scope_id uuid,
  equipment_id uuid, status('pendiente'|'bloqueado_punch'|'completado'), completed_at,
  completed_by, certificate_id uuid, created_at`. Ancla de MC + certificado + trazabilidad.
- **`certificate_items`** — N:M certificado ↔ contenido: `certificate_id, item_type('inspection'|'punch'), item_id`.
- **`project_approval_config`** — cadena por proyecto: `project_id, level int, level_name text,
  role_required text, mandatory bool`. Default sembrado: L2 supervisor (mandatory). Niveles
  QA/cliente opcionales activables.

**ER (texto):**
```
project ─1:N─ project_approval_config
equipment ─1:N─ tests ─1:N─ evidences
   │               ├─1:N─ approvals ─N:1─ users
   │               ├─1:N─ signatures
   │               └─1:N─ punch_items (source_item_key, test_id, equipment_id)
   └─1:N─ mc_records ─1:1─ certificates ─1:N─ certificate_items ─→ tests | punch_items
```

**Índices nuevos:** `punch_items(equipment_id,status)`, `tests(equipment_id,status)`,
`mc_records(scope,scope_id)`, `certificates(scope,scope_id)`, `certificate_items(certificate_id)`.

---

## FASE 4 — Workflow de aprobación (configurable)

Sobre `approvals` + `project_approval_config`. Cadena por defecto: L1 ejecución (técnico,
implícita) → L2 supervisor (obligatoria) → [L3 cliente/QA opcional].

| Nivel | test_status resultante | Rol | Acciones |
|---|---|---|---|
| L1 | `ejecutado` | Técnico | ejecutar + evidencias + firmar |
| L2 | `aprob_supervisor` | Supervisor | aprobar / rechazar / solicitar corrección |
| L3 (opc) | `aprob_cliente`/`cerrado` | Cliente o QA | visualizar / comentar / aprobar |

Cada acción inserta `approvals` (level, status, approver_id, observations) + `signatures` +
transición `test_status`. **Reusa `guard_test_approval` (0040)** (exige acceso `full`).
"Solicitar corrección" → `rechazado` con observación → reapertura/re-ejecución.
Al alcanzar el último nivel obligatorio aprobado → equipo evalúa transición a `aprobado`.

---

## FASE 5 — Punch automático (lógica)

Función única `generatePunchFromInspection(test)` invocada tras persistir el `tests`
(en `pushPendingOps` del motor offline y en el submit online — un solo punto):

```
para cada campo checkbox con valor ∈ {no_cumple,"No cumple","No conforme",rechazado} o crítico:
  clave = field.key
  si NO existe punch con (test_id, source_item_key = clave):     ← idempotente
    crear punch_item {
      title = label del ítem (snapshot), description = valor de "<key>_obs",
      equipment_id, test_id, source_item_key = clave,
      priority = crítico→critica | seguridad→alta | resto→media,
      responsible_id = supervisor de disciplina del equipo (o NULL),
      due_date = hoy + SLA[priority] (critica:3d, alta:7d, media:14d, baja:30d),
      status = 'abierto', code = 'PUNCH-<eq.tag>-<NNN>'
    }
```
Idempotencia por `(test_id, source_item_key)` → re-sync no duplica.

---

## FASE 6 — Dashboard (KPIs reales)

Nuevo RPC `get_mc_rollup(project_id)` con rollup recursivo subsistema→sistema→área:
- % Mechanical Completion (equipos `mechanical_completion`+ / total).
- % Punch abiertos / cerrados.
- Equipos aprobados / pendientes / rechazados.
- Avance por área / sistema / subsistema.

Reemplaza el `equipment.metadata.form_pct` (flag) por agregación real desde
`equipment_status` + `punch_items`. Extiende o complementa `mv_project_stats`.

---

## FASE 7 — Digital Twin (colores)

Color = función pura `equipmentColor(equipment_status, hasOpenPunch)`:

| Color | Estado |
|---|---|
| Gris | pendiente |
| Amarillo | en_ejecucion / inspeccionado (sin aprobar) |
| Naranja | Con Punch (≥1 abierto) — prevalece sobre amarillo |
| Azul | aprobado (pre-MC) |
| Verde | mechanical_completion / RFC / RFSU / operativo |
| Rojo | rechazado / bloqueado |

Una sola fuente usada en plant-map, badges y listas.

---

## FASE 8 — Certificado de Mechanical Completion

**Contenido:** Proyecto · Área · Sistema · Subsistema · Equipo(s) · inspecciones asociadas
(ref a `template_snapshot`/`template_hash`) · evidencias · punch cerrados · firmas · nº cert ·
fecha/emisor.
**Modelo:** `certificates` (extendido: `type='mechanical_completion'`, `scope`, `scope_id`,
`equipment_id`) + `certificate_items` + `mc_records.certificate_id`. PDF → `storage_path`.
**Alcance dual:** un cert por **equipo** y/o por **subsistema** (agrega sus equipos).
**Numeración:** `MC-<proyecto>-<EQ|SUB>-<NNN>`.
**Generación:** solo con MC habilitado (Caso 4). Estado `borrador→emitido→anulado` (ya en CHECK).

---

## FASE 9 — Trazabilidad

```
Template(snapshot en tests) → Inspección(tests) → Evidencia(evidences.test_id)
→ Punch(punch_items.test_id + source_item_key) → Aprobación(approvals.test_id + signatures)
→ MC(mc_records.equipment_id/scope_id) → Certificado(certificates ← mc_record + certificate_items)
```
Cada eslabón es FK. Se entrega una vista `v_traceability` (equipo → cadena completa).

---

## Matriz de permisos (rol × acción)

| Acción | Técnico | Supervisor | Cliente | Admin/Director |
|---|---|---|---|---|
| Ejecutar inspección / evidencias | ✅ | ✅ | — | ✅ |
| Aprobar / rechazar / pedir corrección | — | ✅ | (según permiso) | ✅ |
| Corregir / verificar / cerrar punch | corregir | ✅ | comentar | ✅ |
| Completar MC | — | ✅ | — | ✅ |
| Emitir certificado MC | — | ✅ (o QA) | — | ✅ |
| Visualizar / comentar | ✅ | ✅ | ✅ | ✅ |

Se apoya en el control de acceso por módulo (0039/0040): nivel `full` para aprobar/MC/cert.

---

## FASE 10 — Roadmap (descomposición; cada fase = su spec→plan→rama)

Este epic es demasiado grande para un solo plan. 6 sub-proyectos secuenciales:

| Fase | Entrega | Depende de |
|---|---|---|
| **A — Máquina de estados** | enums (+mc, +punch), motor de transición de `equipment_status` (reemplaza form_pct), matriz de estados | — |
| **B — Aprobación de inspección** | `project_approval_config` + UI/acciones approvals/signatures multinivel + RLS | A |
| **C — Punch automático** | `generatePunchFromInspection` + `source_item_key` + idempotencia | A, B |
| **D — Gating MC** | `mc_records` + reglas Caso 3/4 + "Completar MC" | A, C |
| **E — Certificado MC** | certificates extendido + certificate_items + PDF + numeración | D |
| **F — Dashboard + Twin** | RPC `get_mc_rollup` + colores derivados | A, C, D |

(G — Dossier: posterior, fuera de EPIC-002.)

Compatibilidad offline: las transiciones de estado y el auto-punch deben pasar por el motor
offline (outbox + LWW) como el resto — la Fase A integra el estado en el flujo `pushPendingOps`.

## Fuera de alcance (EPIC-002)

- Dossier UI/exportación (existe el modelo; va aparte).
- Comisionamiento / FAT / SAT / loop-check (otros `test_type`).
- Procesos RFC/RFSU detallados (más allá de la transición de estado).
- Resolución de conflictos manual (se mantiene LWW + append-only).

## Verificación (a nivel epic)

- Las 4 reglas de negocio (Casos 1–4) se cumplen end-to-end con datos reales.
- La cadena de trazabilidad (`v_traceability`) no tiene eslabones rotos para un equipo con
  inspección → punch → aprobación → MC → certificado.
- Cada fase entrega software testeable de forma independiente (Vitest + e2e donde aplique).
