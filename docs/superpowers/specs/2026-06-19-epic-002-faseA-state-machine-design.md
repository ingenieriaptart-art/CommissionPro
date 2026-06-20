# EPIC-002 · Fase A — Máquina de Estados del Equipo (especificación formal)

Fecha: 2026-06-19
Estado: En validación (diseño — sin migraciones ni código)
Pertenece a: `2026-06-19-epic-002-mechanical-completion-design.md`

## Alcance

Definir formalmente la máquina de estados (FSM) del **estado del equipo**, su correctitud
(determinismo, alcanzabilidad, ausencia de deadlocks y de ciclos inválidos) y su impacto en
Dashboard, Digital Twin, Punch, MC, RFC y RFSU. No incluye punch (FSM propia) ni migraciones.

---

## 1. Estados canónicos (persistidos en `equipment_status`)

| # | Estado | Significado | Tipo |
|---|---|---|---|
| S0 | `pendiente` | sin inspección ejecutada | inicial |
| S1 | `en_ejecucion` | inspección(es) en curso/ejecutadas, sin aprobación final | — |
| S2 | `aprobado` | inspecciones requeridas aprobadas (puede tener punch abierto) | — |
| S3 | `mechanical_completion` *(nuevo)* | MC formal completado (sin punch abierto) | hito |
| S4 | `listo_energizacion` (RFC) | listo para comisionamiento | hito |
| S5 | `listo_arranque` (RFSU) | listo para arranque | hito |
| S6 | `operativo` | en operación | **terminal** |
| SR | `rechazado` | rechazo formal a nivel equipo | excepción |
| SB | `bloqueado` | bloqueo administrativo | excepción |

## 2. Estados derivados (NO persistidos — se calculan)

| Derivado | Definición | Uso |
|---|---|---|
| `inspeccionado` | ≥1 `tests` con status `ejecutado`+ | color Twin (amarillo) |
| `con_punch` | ≥1 `punch_items` con status ∉ {`verificado`,`cerrado`} | gate de MC + color Twin (naranja) |
| `aprobaciones_completas` | todos los niveles obligatorios de `project_approval_config` aprobados para las inspecciones requeridas | guard de `→aprobado` |

Los derivados **no** son estados de la FSM: son **flags** que (a) alimentan guards y (b)
modifican la presentación. La FSM opera solo sobre los 9 estados canónicos.

## 3. Eventos que disparan transiciones

| Evento | Origen | Naturaleza |
|---|---|---|
| `INSPECTION_EXECUTED` | submit/sync de una inspección `ejecutado` | dato |
| `INSPECTION_APPROVED` | aprobación que alcanza el último nivel obligatorio | acción + guard |
| `INSPECTION_REJECTED` | inspección rechazada | acción |
| `PUNCH_RAISED` | auto-punch creado (ítem fallido) | dato (cambia `con_punch`) |
| `PUNCH_CLEARED` | todos los punch del equipo `verificado`/`cerrado` | dato |
| `MC_COMPLETED` | acción "Completar MC" (supervisor) | acción + guard |
| `MC_REVOKED` | reapertura de punch / anulación de cert | acción + guard |
| `RFC_GRANTED` / `RFC_REVOKED` | proceso RFC | acción + guard |
| `RFSU_GRANTED` / `RFSU_REVOKED` | proceso RFSU | acción + guard |
| `COMMISSIONED` | puesta en operación | acción + guard |
| `EQUIPMENT_REJECTED` | rechazo formal del equipo | acción |
| `EQUIPMENT_REOPENED` | reapertura tras rechazo | acción |
| `BLOCK` / `UNBLOCK` | bloqueo/desbloqueo administrativo | acción |

## 4. Transiciones válidas

```
S0 pendiente            ─INSPECTION_EXECUTED──────────────► S1 en_ejecucion
S1 en_ejecucion         ─INSPECTION_APPROVED [G1]──────────► S2 aprobado
S1 en_ejecucion         ─(INSPECTION_EXECUTED|REJECTED|PUNCH_*)► S1 (self)
S2 aprobado             ─MC_COMPLETED [G2]─────────────────► S3 mechanical_completion
S2 aprobado             ─INSPECTION_REJECTED───────────────► S1 en_ejecucion   (rework)
S2 aprobado             ─INSPECTION_EXECUTED───────────────► S1 en_ejecucion   (trabajo nuevo)
S2 aprobado             ─(PUNCH_RAISED|PUNCH_CLEARED)──────► S2 (self; afecta gate de MC)
S3 mechanical_completion─RFC_GRANTED [G3]──────────────────► S4 listo_energizacion
S3 mechanical_completion─(MC_REVOKED [G7] | PUNCH_RAISED)──► S2 aprobado       (revocación)
S4 listo_energizacion   ─RFSU_GRANTED [G4]─────────────────► S5 listo_arranque
S4 listo_energizacion   ─RFC_REVOKED [G7]──────────────────► S3 mechanical_completion
S5 listo_arranque       ─COMMISSIONED [G5]─────────────────► S6 operativo
S5 listo_arranque       ─RFSU_REVOKED [G7]─────────────────► S4 listo_energizacion
(S0,S1,S2,S3,S4,S5)      ─BLOCK [G6]────────────────────────► SB bloqueado
SB bloqueado            ─UNBLOCK [G6]──────────────────────► S0|S1 (recomputado)
(S1,S2,S3)              ─EQUIPMENT_REJECTED [G6]────────────► SR rechazado
SR rechazado            ─EQUIPMENT_REOPENED [G6]────────────► S1 en_ejecucion
```

**Nota clave:** `PUNCH_RAISED` sobre `mechanical_completion` provoca **auto-revocación** a
`aprobado` (no se admite MC con punch abierto). Sobre `aprobado` solo activa `con_punch`
(bloquea el futuro MC, sin cambiar de estado). Sobre RFC/RFSU **no** auto-revoca: alerta y
requiere manejo manual (G7).

## 5. Transiciones prohibidas (explícitas)

- Saltos hacia adelante: `pendiente→aprobado`, `pendiente→mechanical_completion`,
  `en_ejecucion→mechanical_completion`, `aprobado→listo_energizacion`,
  `mechanical_completion→listo_arranque`, `listo_energizacion→operativo`. (Cada avance es de **un paso**.)
- `mechanical_completion` con `con_punch=true` (invariante: MC ⇒ sin punch abierto).
- `RFC/RFSU/operativo` sin el hito previo (`MC` antes de RFC; RFC antes de RFSU; RFSU antes de operativo).
- Retroceso desde `operativo` (terminal; cambios post-operación = gestión de cambio, fuera de alcance).
- Cualquier transición de estado **sin** pasar por sus guards (§6).

## 6. Guards obligatorios

| Guard | Aplica a | Condición |
|---|---|---|
| **G1** | `→ aprobado` | `aprobaciones_completas` = true (último nivel obligatorio de `project_approval_config`) |
| **G2** | `→ mechanical_completion` | G1 ∧ `con_punch=false` ∧ actor con acceso `full` ∧ rol ∈ {supervisor, admin, director} ∧ se crea `mc_record` |
| **G3** | `→ listo_energizacion` | estado=`mechanical_completion` ∧ prerrequisitos RFC ∧ rol autorizado |
| **G4** | `→ listo_arranque` | estado=`listo_energizacion` ∧ prerrequisitos RFSU |
| **G5** | `→ operativo` | estado=`listo_arranque` ∧ arranque completado |
| **G6** | BLOCK/UNBLOCK/REJECT/REOPEN | rol supervisor+ ∧ motivo registrado |
| **G7** | revocaciones (MC/RFC/RFSU) | motivo registrado ∧ no existe hito posterior bloqueante (p. ej. no revocar MC si ya hay RFSU sin revocar antes) |
| **G-OFFLINE** | **toda** transición | la FSM se **re-evalúa en el servidor al sincronizar** (trigger/RPC): una transición encolada offline contra un estado servidor ya cambiado se **rechaza** (no LWW ciego). Resuelve el riesgo de "MC offline mientras se levantó un punch online". |

## 7. Matriz Estado × Evento

Celda = estado destino, `·` = ignorado (no-op), `✗` = prohibido.

| Estado \ Evento | INSP_EXEC | INSP_APPR | INSP_REJ | PUNCH_RAISED | PUNCH_CLEARED | MC_COMPLETED | MC_REVOKED | RFC_GRANT | RFSU_GRANT | COMMISSION | EQ_REJECT | EQ_REOPEN | BLOCK | UNBLOCK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pendiente | en_ejecucion | ✗ | · | · | · | ✗ | ✗ | ✗ | ✗ | ✗ | rechazado | · | bloqueado | · |
| en_ejecucion | en_ejecucion | aprobado [G1] | en_ejecucion | en_ejecucion | en_ejecucion | ✗ | ✗ | ✗ | ✗ | ✗ | rechazado | · | bloqueado | · |
| aprobado | en_ejecucion | aprobado | en_ejecucion | aprobado | aprobado | mech_compl [G2] | ✗ | ✗ | ✗ | ✗ | rechazado | · | bloqueado | · |
| mechanical_completion | ✗ | · | ✗ | aprobado* | · | · | aprobado [G7] | listo_energ [G3] | ✗ | ✗ | rechazado | · | bloqueado | · |
| listo_energizacion | ✗ | · | ✗ | · (alerta) | · | ✗ | mech_compl [G7] | · | listo_arranque [G4] | ✗ | ✗ | · | bloqueado | · |
| listo_arranque | ✗ | · | ✗ | · (alerta) | · | ✗ | ✗ | listo_energ [G7] | · | operativo [G5] | ✗ | · | bloqueado | · |
| operativo | ✗ | · | ✗ | · | · | ✗ | ✗ | ✗ | ✗ | · | ✗ | · | ✗ | · |
| rechazado | ✗ | ✗ | ✗ | · | · | ✗ | ✗ | ✗ | ✗ | ✗ | · | en_ejecucion | bloqueado | · |
| bloqueado | · | · | · | · | · | · | · | · | · | · | · | · | · | en_ejecucion/pendiente |

`*` `PUNCH_RAISED` en `mechanical_completion` ⇒ auto-`MC_REVOKED` ⇒ `aprobado`.

## 8. Diagrama completo

```
                 ┌──────────── BLOCK ───────────┐         ┌── BLOCK ──┐
                 ▼                               │         ▼           │
   (init)   ┌─────────┐  INSP_EXEC  ┌──────────────┐  INSP_APPR[G1]  ┌──────────┐
   ─────────►pendiente├────────────►│ en_ejecucion ├────────────────►│ aprobado │
            └────┬────┘             └───▲───┬──────┘                 └──┬───▲───┘
                 │ EQ_REJECT            │   │ self: INSP_EXEC/REJ/PUNCH │   │
                 ▼                      │   └──────────────────────────┘   │
            ┌──────────┐  EQ_REOPEN     │ INSP_REJ / INSP_EXEC             │ MC_COMPLETED [G2]
            │ rechazado├────────────────┘◄────────────────────────────────┤  (con_punch=false)
            └──────────┘                                                   ▼
                                                          ┌───────────────────────────┐
                                  PUNCH_RAISED* / MC_REVOKED[G7]  │ mechanical_completion │
                                          ┌───────────────────────┤  (invariante: sin punch)│
                                          ▼                       └──────────┬────────────┘
                                     (a aprobado)                  RFC_GRANTED [G3] │  ▲ RFC_REVOKED[G7]
                                                                                    ▼  │
                                                                        ┌───────────────────┐
                                                                        │ listo_energizacion│ (RFC)
                                                                        └─────────┬─────────┘
                                                                  RFSU_GRANTED[G4]│  ▲ RFSU_REVOKED[G7]
                                                                                  ▼  │
                                                                        ┌───────────────────┐
                                                                        │  listo_arranque   │ (RFSU)
                                                                        └─────────┬─────────┘
                                                                       COMMISSIONED[G5]│
                                                                                  ▼
                                                                        ┌───────────────────┐
                                                                        │     operativo     │ (terminal)
                                                                        └───────────────────┘
   bloqueado  ◄── BLOCK ── (cualquier estado no terminal) ── UNBLOCK ──► (estado recomputado)
```

## 9. Impacto por subsistema

| Subsistema | Impacto |
|---|---|
| **Dashboard** | `get_mc_rollup` cuenta `mechanical_completion`+ para %MC; `con_punch` para KPIs de punch; reemplaza `form_pct`. Solo lee estado canónico + derivados. |
| **Digital Twin** | color = `equipmentColor(estado_canónico, con_punch)`: gris/amarillo/naranja/azul/verde/rojo (ver epic §7). `con_punch` (naranja) prevalece sobre amarillo. |
| **Punch** | FSM **separada** (`abierto→asignado→en_proceso→corregido→verificado→cerrado`). No cambia el estado canónico del equipo; alimenta `con_punch` (gate de G2) y dispara `PUNCH_RAISED`/`PUNCH_CLEARED`. |
| **Mechanical Completion** | estado `mechanical_completion` + `mc_records`; entrada por G2 (sin punch). Invariante MC ⇒ `con_punch=false` (auto-revoca si se levanta punch). |
| **RFC** | `listo_energizacion`, downstream de MC (G3). Revocable (G7) hacia MC. |
| **RFSU** | `listo_arranque`, downstream de RFC (G4). Revocable (G7) hacia RFC. |

---

## Validación de consistencia (verdict)

1. **Determinismo:** cada par (estado, evento) tiene a lo sumo **un** destino (los guards solo
   deciden si el evento *dispara*, no ramifican destino). ✓ FSM determinista.
2. **Alcanzabilidad:** todos los estados son alcanzables desde `pendiente`
   (`pendiente→en_ejecucion→aprobado→mechanical_completion→listo_energizacion→listo_arranque→operativo`;
   `rechazado` y `bloqueado` desde estados no terminales). ✓ Sin estados inalcanzables.
3. **Vivacidad / sin deadlocks:** todo estado no terminal tiene ≥1 salida; `bloqueado` sale por
   `UNBLOCK`, `rechazado` por `EQUIPMENT_REOPENED`. **Único estado terminal: `operativo`** (intencional). ✓
4. **Ciclos:** existen ciclos `en_ejecucion⇄aprobado` (rework), `aprobado⇄mechanical_completion`
   (revocación), y los de RFC/RFSU/bloqueo. **Todos son ciclos guardados e impulsados por un
   evento externo real** (rechazo, punch, acción humana) — no hay ciclo auto-sostenido ni
   progresión sin guard. ✓ **Libre de ciclos inválidos.**
5. **Sin saltos:** la matriz no permite avanzar más de un hito por transición (§5). ✓
6. **Invariante MC:** `mechanical_completion ⇒ con_punch=false`, sostenido por G2 (entrada) y por
   auto-revocación ante `PUNCH_RAISED` (mantenimiento). ✓
7. **Correctitud distribuida (offline):** G-OFFLINE re-evalúa la transición en el servidor al
   sincronizar; una transición encolada contra estado obsoleto se rechaza (no LWW ciego). ✓
   Cierra el riesgo I-1 del PR #2 a nivel de estado.

**Conclusión: la máquina de estados es consistente** — determinista, totalmente alcanzable, con
un único terminal, sin deadlocks y sin ciclos inválidos (los retrocesos son rework/revocación
guardados e intencionales).

## Trazabilidad de transiciones (history / audit trail) — aprobado por el usuario

Cada transición de estado se registra de forma inmutable para **reconstruir la evolución
completa del equipo**.

**Tabla `equipment_status_history`** (append-only):
`id, equipment_id, project_id, from_status, to_status, event, guard_result('applied'|'rejected'),
reason, actor_id, source('online'|'offline_sync'), occurred_at (cuándo ocurrió en el dispositivo),
applied_at (cuándo se aplicó en servidor), context jsonb (p. ej. test_id/punch_id que disparó el evento)`.

Reglas:
- **Toda** transición aplicada por el motor (`transition_equipment_state`) escribe una fila
  `applied`. Las transiciones **rechazadas** por G-OFFLINE también se registran (`rejected` +
  `reason`) para auditoría de conflictos.
- Append-only: sin UPDATE/DELETE (RLS de solo INSERT+SELECT). Inmutable.
- `context` enlaza el evento con su causa (`test_id`, `punch_id`, `mc_record_id`) → cierra la
  cadena de trazabilidad del epic (Template→Inspección→…→MC) a nivel de estado.
- Permite una vista `v_equipment_timeline(equipment_id)` que devuelve la línea de tiempo
  ordenada (estado, evento, actor, fecha, causa).

Índices: `equipment_status_history(equipment_id, occurred_at)`, `(project_id, applied_at)`.

## Fuera de alcance (Fase A)

- FSM del punch (se especifica en Fase C).
- Procesos internos de RFC/RFSU más allá de la transición de estado.
