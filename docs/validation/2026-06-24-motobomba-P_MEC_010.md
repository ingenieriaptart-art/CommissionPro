# Validación — Template P_MEC_010 · Motobomba (Motor + Bomba)

- **Fecha:** 2026-06-24
- **Rama:** `feat/brasil-motobomba` (commits `04616dc`, `fe4dd3d`)
- **Migración:** `database/migrations/0057_motobomba_template.sql`
- **Base:** `nkjunkolsmjledzwuxgn` (⚠️ producción, compartida con Brasil)
- **Alcance:** SOLO template + integración. NO se tocó FSM, Approval Chain, Auto Punch, Offline Engine ni Dossier Generator (solo INSERTs en `template_sections`, `section_fields`, `form_templates`, `form_template_sections`).

## Estado: PASS parcial (capa de datos) · PENDIENTE smoke de navegador

---

## 1. Lo aplicado en la base
- Template **P_MEC_010 · Motobomba (Motor + Bomba)** — global (`project_id NULL`), **SIN asignar** (cero impacto hasta asignación).
- `template_id = 7a2b7f17-b6dd-4da4-b1a7-ab58f6b9321e`
- 5 secciones dedicadas (no universales) + **31 campos** + 5 enlaces.

## 2. Resultados de validación (capa de datos) — PASS

**(A) Asignación** — asignado temporalmente a B2 (`futuro`): `get_equipment_templates` devolvió "Motobomba (Motor + Bomba)" con `source=equipment`. Asignación removida → ya no resuelve. ✅ Mecanismo correcto.

**(B) No-regresión** ✅
- Las 5 secciones nuevas son `is_universal=false` (no se filtran a otros templates).
- Secciones universales intactas: DATOS_GENERALES=9, INSPECCION_VISUAL=6, FIRMAS=3 campos (sin cambios).
- `P_MEC_002` (Bomba Centrífuga) sigue resolviendo sus 7 secciones sin cambios.

**(C) Ensamble del formato** ✅ (vía `get_template_sections` + `section_fields`)
| Orden | Sección | Tipo | Campos |
|---|---|---|---|
| 10 | DATOS_GENERALES | universal | 9 |
| 12 | DATOS_BOMBA | dedicada | 6 (tipo, fab, modelo, serie, NPSHr·m, H·m) |
| 14 | DATOS_MOTOR | dedicada | 9 (fab, modelo, serie, kW, HP, RPM, V, Hz, lubricación) |
| 16 | FOTOS_MOTOBOMBA | dedicada | 4 imágenes (bomba, placa bomba, motor, placa motor) |
| 20 | INSPECCION_VISUAL | universal | 6 ⚠️ redundante |
| 22 | INSP_VISUAL_BOMBA | dedicada | 6 |
| 24 | INSP_VISUAL_MOTOR | dedicada | 6 |
| 30 | ANCLAJE_NIVELACION | universal | 0 |
| 40 | CAMBIOS_DISENO_REDLINE | universal | 0 |
| 999 | FIRMAS | universal | 3 |

## 3. NO validado (requiere navegador — lo debe ejecutar el usuario)
No tengo navegador automatizable ni capturas. Pendiente smoke funcional UI:

- [ ] Asignar P_MEC_010 a un equipo de prueba (módulo Templates → pestaña Equipo).
- [ ] Abrir "Iniciar Precomisionamiento" y confirmar que **abre P_MEC_010** (ver Riesgo R3).
- [ ] Verificar que se ven las secciones y campos (estructura sección 2C).
- [ ] Llenar campos (texto, número con unidad, checkbox SI/NO/N/A, foto).
- [ ] Guardado: cerrar/recargar pestaña → reabrir → confirmar que las respuestas persisten (IndexedDB).
- [ ] Offline: activar modo avión, llenar, reconectar, confirmar sync.
- [ ] Capturas de cada paso.

## 4. Riesgos detectados

- **R1 — `0038` no aplicada (ALTO).** La columna `form_template_sections.is_active` no existe en prod y `get_template_sections` es la versión vieja. ⇒ **El apagado de secciones por plantilla NO funciona.** Consecuencia: la sección universal **INSPECCION_VISUAL** aparece y es **obligatoria**, duplicando la inspección visual con las versiones Bomba/Motor. ANCLAJE y REDLINE universales también aparecen (vacías).
  - *Mitigación:* aplicar `0038` (DDL, vía SQL Editor) y luego el `UPDATE is_active=false` documentado en 0057 para ocultar la visual universal.

- **R2 — localhost = base de producción (ALTO).** No hay entorno de prueba aislado; la validación se hizo sobre la base real. El template quedó **sin asignar** (seguro), pero cualquier asignación impacta a Brasil de inmediato.
  - *Mitigación:* hacer el smoke sobre un **equipo de prueba dedicado**, no sobre bombas reales, hasta el PASS completo.

- **R3 — Selección de template al abrir (MEDIO).** Una bomba resuelve varios templates (P_EFL-019, P_MEC_002, P_MEC_001 + P_MEC_010 si se asigna). `InstrumentDrawer` abre el primero (CHK o `[0]`), y el RPC no tiene `ORDER BY` ⇒ no se garantiza que abra P_MEC_010. **Debe confirmarse en el smoke** que el técnico llega al formato correcto.

- **R4 — Pre-llenado (BAJO).** El pre-llenado automático solo mapea las keys de DATOS_GENERALES universal; los campos dedicados (bomba/motor) inician vacíos (esperado).

## 5. Recomendación de despliegue

**NO-GO directo a campo todavía.** GO condicionado a:
1. Completar el **smoke de navegador** (sección 3) con PASS, incluido R3 (que abra P_MEC_010).
2. Decidir sobre **R1**: aplicar `0038` + override para ocultar la visual universal (recomendado), o aceptar la redundancia de inspección visual.
3. Asignar a Brasil **solo tras PASS completo**, y preferiblemente vía nivel **equipo o subsistema** (no a todo el tipo BOMBA_CENTRIFUGA de golpe) para un rollout controlado.
4. Solo entonces: PR (`feat/brasil-motobomba`, rebasada sobre `master`), merge y deploy.

## 7. Gate funcional (FASE 1 hecha · FASE 2 pendiente)

### FASE 1 — Equipo de prueba (HECHO)
- Creado **MB-TEST-001 · "Motobomba Prueba Brasil"** (`0e1d976c-873d-450d-81d7-e1653557d999`) en proyecto ANAEROBICO DE BIOGAS LDC, subsistema SERVICIOS-GENERALES, **sin tipo de equipo**.
- Asignado **únicamente** P_MEC_010 (asignación directa).
- Resolución actual: **2 templates** → "Motobomba (Motor + Bomba)" (source=equipment) + "Motor Eléctrico" (source=default del proyecto). Ver R3.

### FASE 2 — Smoke UI (PENDIENTE — requiere navegador del usuario)
Runbook (yo no puedo ejecutar UI ni tomar capturas):
1. Entrar como admin/director.
2. Abrir directamente: `/equipment/0e1d976c-873d-450d-81d7-e1653557d999/inspection/7a2b7f17-b6dd-4da4-b1a7-ab58f6b9321e` → garantiza abrir P_MEC_010 para el smoke.
3. (Para validar R3 visual) MB-TEST-001 NO aparece en el mapa (sin posición) → su formato solo se abre por URL directa. Para validar el **mecanismo selector**, abrir desde el mapa una **bomba real existente** (resuelve varias plantillas) y confirmar que muestra lista "Plantillas (N)" con elección manual. No asignar P_MEC_010 a equipos reales.
4. Confirmar 10 secciones / 31 campos dedicados / 4 fotos.
5. Llenar, Guardar, recargar, reabrir → persistencia.
6. Aprobar inspección.
7. Offline → llenar → reconectar → sync.
8. Capturas de cada etapa.

## 8. Estado de riesgos (actualizado)

- **R1 — Visual universal (CONFIRMADO por código, MEDIO).** `INSPECCION_VISUAL` universal tiene 5 campos **requeridos**; según `lib/inspection/completion.ts`, una sección activa con requeridos sin llenar deja la inspección incompleta ⇒ **bloquea "Revisar y Cerrar"** hasta llenarla. No bloquea abrir ni guardar borrador, pero **obliga a llenar inspección visual genérica + Bomba + Motor** (triplicada). *Decisión pendiente del usuario:* aceptar la triplicidad o aplicar 0038 + override para ocultar la universal. (No aplicar 0038 aún, por instrucción.)

- **R3 — Resolución de template (MITIGADO por diseño, confirmar en smoke).** El camino real para una motobomba es `FloatingEquipmentPanel` (mapa de planta), que **muestra un selector de plantillas y el técnico elige** — no auto-abre. El auto-pick está solo en `InstrumentDrawer` (instrumentos IC02 del P&ID), que **no aplica** a motobombas. **Nota:** MB-TEST-001 no tiene posición en el mapa, así que su formato solo se abre por **URL directa**; el panel/selector solo se abre desde overlays del mapa o el iframe SCADA. Por eso R3 se valida en dos partes: (a) la URL directa prueba que abre P_MEC_010; (b) el mecanismo selector se confirma en una bomba real existente que ya resuelve varias plantillas (sin asignarle P_MEC_010).

## 6. Rollback
Disponible al final de `0057_motobomba_template.sql` (borra enlaces, campos, secciones y el template). El template está sin asignar, así que el rollback no afecta inspecciones existentes.
