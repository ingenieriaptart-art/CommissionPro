# RELEASE 007 — Evidencia Fotográfica Obligatoria en Punch List

**Fecha de producción:** 2026-06-23  
**Estado:** PRODUCCIÓN ✅  
**Motivación:** Requisito operativo Brasil — precomisionamiento en campo activo

---

## Entrega

| Item | Valor |
|------|-------|
| PR | [#7](https://github.com/ingenieriaptart-art/CommissionPro/pull/7) |
| Rama | `feat/punch-evidence-mandatory` |
| Merge commit | `b87899a3e3752b39f8c853c9176198e9227d56f2` |
| Deploy ID | `dpl_BBHnmbYJyTYqVcibdPiDCP6RkWei` |
| URL producción | `https://app-precomisionamiento-projects-projects.vercel.app` |
| Build | READY en 62s |
| Smoke post-deploy | PASS |

---

## Qué se implementó

### 3 flujos de evidencia fotográfica

| Flujo | Componente | Stage DB | Obligatoriedad |
|-------|-----------|----------|---------------|
| Crear punch | `PunchImagePicker` + `useCreatePunchWithEvidence` | `general` | Botón deshabilitado hasta tener título + imagen |
| Marcar corregido | `PunchTransitionModal` + `EvidenceCapture` | `correccion` | Confirmar deshabilitado hasta `onSaved` |
| Cerrar punch | `PunchTransitionModal` + `EvidenceCapture` | `verificacion` | Confirmar deshabilitado hasta `onSaved` |

### Archivos entregados

| Archivo | Tipo |
|---------|------|
| `app/src/components/punch/PunchImagePicker.tsx` | Nuevo |
| `app/src/components/punch/PunchTransitionModal.tsx` | Nuevo |
| `app/src/components/punch/PunchList.tsx` | Modificado |
| `app/src/hooks/usePunch.ts` | Modificado — `useCreatePunchWithEvidence` |
| `app/src/lib/punch/__tests__/punchEvidence.gate.test.ts` | Nuevo |
| `scripts/gate-punch-evidence/validate.mjs` | Nuevo |
| `docs/releases/2026-06-23-punch-evidence-mandatory.md` | Auditoría |

---

## Gate completo

### Checks estáticos
| Check | Resultado |
|-------|-----------|
| `tsc --noEmit` | ✅ 0 errores |
| `eslint --max-warnings=0` | ✅ 0 warnings |
| `npm run build` | ✅ EXIT 0, compilado en 15.6s |

### Vitest — 65/65 (14 suites)
| Suite | Tests |
|-------|-------|
| `punchEvidence.gate.test.ts` (nueva) | 3/3 ✅ |
| 13 suites existentes | 62/62 ✅ |

**Casos Vitest cubiertos:**
- Caso 1: `canSubmit` — false sin título, false sin blob, true con ambos
- Caso 2: punch + evidencia en IndexedDB, FIFO `queue[0]=punch_items` / `queue[1]=evidences`
- Caso 3: sync offline→online — punch primero, evidencia después, 0 duplicados, outbox vacío

### Gate servidor — 14/14 (Supabase real)
| Check | Resultado |
|-------|-----------|
| Login admin | ✅ |
| Setup jerarquía + equipo aislado | ✅ |
| Caso 2 — punch + evidencia `general` (server) | ✅ 201 |
| Caso 2 — `evidencia.punch_id` + `stage=general` | ✅ |
| Caso 4a — corregido **bloqueado** sin evidencia | ✅ 400 |
| Caso 4b — corregido con evidencia `correccion` | ✅ 200 |
| Caso 4 — `corrected_at` y `corrected_by` auto-poblados | ✅ |
| Caso 5 — cerrado con `verification_notes` | ✅ 200 |
| Caso 5 — `closed_at`, `closed_by`, `verification_notes` | ✅ |
| Caso 6a — `status=cerrado`, `generation_source=manual` | ✅ |
| Caso 6b — 3 evidencias (general, correccion, verificacion) | ✅ count=3 |
| Caso 6c — sin punches huérfanos | ✅ orphans=[] |
| Caso 6d — FK evidencias → equipo correcto | ✅ |
| Cleanup — datos de prueba eliminados | ✅ proyectos=0 |

---

## Decisiones técnicas clave

**FIFO outbox:** El punch se escribe en IndexedDB + outbox ANTES que la evidencia. El auto-increment `++id` de Dexie garantiza que `punch_items` tenga ID menor que `evidences`, preservando el orden de sincronización en caso de reconexión. Sin esto, el trigger `guard_punch_lifecycle` rechazaría la evidencia por FK inexistente.

**Deferred save en PunchImagePicker:** El componente NO llama `saveBlobLocally` ni `enqueueSync` — solo convierte el archivo a Blob en React state. `useCreatePunchWithEvidence` controla el timing exacto de ambas escrituras.

**Reutilización de EvidenceCapture:** El modal de transición (`PunchTransitionModal`) embebe el componente `EvidenceCapture` existente sin modificación. `evidenceSaved` inicia en `false`; el botón confirmar se habilita solo cuando `EvidenceCapture` llama `onSaved`.

---

## Fuera de alcance (no tocado)
- Approval Chain / FSM / Auto Punch / Dossiers
- GPS / Geolocalización avanzada (EPIC-003 diferida)
- Nuevas migraciones o cambios de schema en Supabase
- Offline Engine (reutilizado sin cambios)

---

## Rollback
```
git revert HEAD~1 HEAD   # revierte los 2 commits de punch
git push ptart master    # auto-deploy del revert en ~60s
```
Sin cambios de schema → rollback no requiere migraciones.

---

## Contexto de sesión
- **Sesión:** `5d5627b5-62da-4196-96cb-5d3f43e3107c`
- **Auditoría completa:** `docs/releases/2026-06-23-punch-evidence-mandatory.md`
- **Rama de trabajo paralela (no mergeada):** `feat/dossier-compare-tool` — trabajo de dossier en curso, separado de este release
