# Release — Evidencia Fotográfica Obligatoria en Punch List

**Fecha:** 2026-06-23  
**Rama:** `feat/punch-evidence-mandatory`  
**Proyecto:** CommissionPro — Precomisionamiento LDC Brasil

---

## Motivación

Requerimiento operativo explícito del equipo de Brasil previo al inicio del precomisionamiento en campo. Todo punch levantado debe contar con evidencia fotográfica desde su creación, garantizando trazabilidad completa del hallazgo, la corrección y la verificación.

---

## Alcance funcional

### Incluido en este release

| Flujo | Comportamiento | Stage DB |
|-------|---------------|----------|
| Crear punch | Imagen obligatoria. Botón deshabilitado hasta tener título + foto. Punch y evidencia se guardan en FIFO outbox (punch primero, evidencia después). | `general` |
| Marcar corregido | Modal con `EvidenceCapture`. Confirmar habilitado solo tras guardar imagen. Satisface trigger `guard_punch_lifecycle` del servidor. | `correccion` |
| Cerrar punch | Mismo modal reutilizable. Evidencia de verificación requerida por UX antes de confirmar cierre. | `verificacion` |
| Cards del punch | Botones de acción visibles por estado: `abierto/en_proceso` → "Corregido"; `corregido` → "Cerrar". | — |
| Error de asociación | Si la evidencia falla al guardarse, el punch queda en outbox para reintento automático y la UI muestra el error al usuario. | — |

### Archivos modificados/creados

| Archivo | Cambio |
|---------|--------|
| `app/src/components/punch/PunchImagePicker.tsx` | Nuevo — picker ligero (cámara/galería), guarda blob en estado React (deferred save) |
| `app/src/components/punch/PunchTransitionModal.tsx` | Nuevo — modal reutilizable con `EvidenceCapture` para corregido/cerrado |
| `app/src/components/punch/PunchList.tsx` | Modificado — `NewPunchForm` con imagen obligatoria, cards con botones de acción, estado de modal |
| `app/src/hooks/usePunch.ts` | Modificado — `useCreatePunchWithEvidence` (punch + evidencia FIFO atómico) |
| `app/src/lib/punch/__tests__/punchEvidence.gate.test.ts` | Nuevo — gate Vitest Casos 1-3 (offline/IndexedDB/FIFO) |
| `scripts/gate-punch-evidence/validate.mjs` | Nuevo — gate REST real Supabase Casos 2,4,5,6 |

### Fuera de alcance (NO incluido, NO modificado)

- Approval Chain
- FSM (máquina de estados de equipos)
- Auto Punch (generación automática desde inspección)
- Dossiers
- GPS / Geolocalización avanzada (EPIC-003 diferida)
- Nuevos formatos de precomisionamiento
- Supabase schema (sin migraciones nuevas)
- Offline Engine (reutilizado sin cambios estructurales)

---

## Riesgos identificados

| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| `captured_by` = `user.id` puede ser vacío si sesión expirada | Baja | El campo es opcional en DB; la evidencia se guarda de todas formas |
| Evidencia falla tras punch creado (IndexedDB lleno, cuota excedida) | Baja | Error visible en UI + punch en outbox; el operador puede agregar evidencia después |
| Sync FIFO depende de que punch esté en outbox antes que evidencia | Controlado | Orden garantizado por `localDB.punchItems.add` + `enqueueSync` secuenciales, luego `evidences` |
| Modo offline sin Service Worker: `/summary` no carga rutas nuevas | Pre-existente | No afecta este release; backlog post-Brasil |

---

## Resultado del gate

### Checks estáticos

| Check | Resultado |
|-------|-----------|
| `tsc --noEmit` | ✅ 0 errores |
| `eslint --max-warnings=0` | ✅ 0 warnings, 0 errores |
| `npm run build` | ✅ BUILD_CLEAN, EXIT 0 |

### Vitest — 65/65 (14 archivos)

| Suite nueva | Tests |
|-------------|-------|
| `punchEvidence.gate.test.ts` | 3/3 ✅ |
| 13 suites existentes | 62/62 ✅ |

**Casos verificados en Vitest:**
- Caso 1: `canSubmit` false sin título; false sin blob; true con ambos
- Caso 2: Punch + evidencia en IndexedDB, `punch_id` correcto, FIFO `queue[0]=punch_items` / `queue[1]=evidences`
- Caso 3: Sync offline→online con mock Supabase: punch subido primero, evidencia después, 0 duplicados, outbox vacío, `sync_status=synced`

### Gate servidor — 14/14 (Supabase real)

| Check | Resultado |
|-------|-----------|
| Login admin | ✅ |
| Setup jerarquía + equipo | ✅ |
| Caso 2 — punch manual + evidencia `general` (server) | ✅ status=201 |
| Caso 2 — `evidencia.punch_id` correcto + `stage=general` | ✅ |
| Caso 4a — corregido **bloqueado** sin evidencia | ✅ status=400 |
| Caso 4b — corregido con evidencia `correccion` | ✅ status=200 |
| Caso 4 — `corrected_at` y `corrected_by` auto-poblados | ✅ |
| Caso 5 — cerrado con `verification_notes` | ✅ status=200 |
| Caso 5 — `closed_at`, `closed_by`, `verification_notes` | ✅ |
| Caso 6a — `status=cerrado`, `generation_source=manual` | ✅ |
| Caso 6b — 3 evidencias (general, correccion, verificacion) | ✅ count=3 |
| Caso 6c — sin punches huérfanos | ✅ orphans=[] |
| Caso 6d — FK evidencias → equipo correcto | ✅ |
| Cleanup — datos de prueba eliminados | ✅ proyectos=0 |

---

## Estrategia de rollback

En caso de regresión post-deploy:

1. **Revert en master:** `git revert HEAD~1 HEAD` (revierte los 2 commits de punch en orden inverso)
2. **Push:** `git push ptart master` → auto-deploy del revert
3. **Verificación:** confirmar que `/punch` carga sin errores y que `PunchList` anterior está activa
4. **No requiere cambio de schema:** no hay migraciones asociadas a este release

**Tiempo estimado de rollback:** < 5 minutos (push + deploy Vercel ~60s)

---

## Autorización de release

- **Solicitado por:** Equipo de campo — Brasil (requerimiento operativo pre-precomisionamiento)
- **Gate ejecutado:** 2026-06-23
- **Aprobado por:** Usuario (autorización condicional tras revisión completa del gate)
- **Auditor técnico:** Claude Sonnet 4.6

---

*Este documento queda como registro de auditoría para el precomisionamiento de Brasil.*
