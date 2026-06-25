# Release Package — P_MEC_010 · Motobomba (Brasil)

- **Rama:** `feat/brasil-motobomba`
- **Fecha:** 2026-06-24
- **Estado:** GATE ABIERTO — pendiente smoke funcional (FASE 2)
- **Commits:** `04616dc` (migración), `fe4dd3d` (fix sin 0038), `9b80d0a`/`c265220` (validación)
- **Documentos relacionados:**
  - Validación técnica: `2026-06-24-motobomba-P_MEC_010.md`
  - Checklist: `2026-06-24-motobomba-smoke-checklist.md`
  - Resultados (diligenciar): `2026-06-24-motobomba-smoke-results.md`
  - Limpieza: `scripts/cleanup-mbtest/cleanup-mbtest001.ps1`

---

## 1. Resumen ejecutivo
P_MEC_010 es un template reutilizable **Motobomba (Motor + Bomba)** creado como secciones dedicadas no-universales + reuso de universales, **global y sin asignar** (cero impacto productivo). La capa de datos, código y arquitectura están **validadas (PASS)**. El **único bloqueante** para liberación es la **validación funcional en navegador (smoke)**, que aún no se ha ejecutado ni evidenciado. Restricciones del gate: sin PR, merge, deploy ni `0038`.

## 2. Auditoría técnica (resumen)
- **Resolución de plantillas:** MB-TEST-001 resuelve P_MEC_010 (directo) + Motor Eléctrico (default del proyecto). El flujo real (`FloatingEquipmentPanel`) usa **selector** — el técnico elige. Auto-pick solo en `InstrumentDrawer` (IC02), no aplica a motobombas.
- **Estructura:** 10 secciones, 49 campos (31 dedicados), 4 fotos `imagen`. Verificado vía `get_template_sections` + `section_fields`.
- **Persistencia:** borrador en IndexedDB por cambio; submit crea `test` con `revision=max+1` (**append-only, sin sobrescritura**); borra borrador tras enviar.
- **Evidencias:** `EvidenceCapture` (`createObjectURL`, cámara) → blob en `blobStore` → fila `evidences` (sin url) → sync sube a Storage (`upsert`) y completa `storage_url`.
- **Offline-first:** real (borrador+envío+blobs locales; `runSync` al reconectar). Limitación: borrador no sincronizado entre dispositivos.
- **Sync:** outbox `syncQueue`, upsert idempotente LWW por `id`, reintentos máx 5, Web Locks multi-pestaña, pull paginado con cursor.
- **Historial:** múltiples inspecciones = múltiples `test` con `revision++`. Conservadas.
- **No-regresión:** secciones nuevas `is_universal=false`; universales intactas; P_MEC_002 sin cambios.

## 3. Riesgos

| ID | Riesgo | Prob | Impacto | Clasif | Estado |
|----|--------|------|---------|--------|--------|
| R-SMOKE | Smoke funcional/visual no ejecutado | Alta | Alto | **CRÍTICO** | Abierto (bloqueante) |
| R1 | Inspección visual universal triplicada / bloquea cierre | Alta | Medio | MEDIO | Abierto (decisión) |
| R-SYNC5 | Op abandonada tras 5 fallos → pérdida silenciosa | Baja | Alto | MEDIO | Mitigable (monitor) |
| R-DRAFT | Borrador device-local no sincronizado | Media | Medio | MEDIO | Conocido |
| R3 | Técnico elige plantilla equivocada | Baja | Alto | MEDIO | Mitigado por selector; confirmar visual |
| R2 | MB-TEST-001 en base real | Media | Bajo | BAJO | Limpiar tras gate |
| R-FOTO-REP | Fotos `stage=general` no salen en columnas del informe | Alta | Bajo | BAJO | Aceptable / ajuste futuro |

## 4. Checklist
21 pruebas definidas en `2026-06-24-motobomba-smoke-checklist.md` (1–20 + Prueba 21 IndexedDB).

## 5. Resultados del smoke
Pendientes de diligenciar en `2026-06-24-motobomba-smoke-results.md`.
- PASS: ___ / 21 · FAIL: ___ / 21 · Bloqueantes: ___

## 6. Decisión de liberación

**Estado actual: ⛔ NO-GO** — por ausencia de evidencia funcional (no por defecto de código). No se autoriza PR, merge ni deploy.

**Ruta a GO:**
1. Ejecutar smoke (checklist 21 pruebas) + capturas → diligenciar resultados.
2. Cerrar R3 (confirmación visual del selector).
3. Decidir R1 (aceptar o programar 0038).
4. QA reevalúa → emite GO / GO CON OBSERVACIONES.
5. Solo entonces: PR (rebasar sobre `master`) → merge → deploy.
6. Ejecutar limpieza de MB-TEST-001.

**Autorización de liberación (al cierre):**
- ☐ PR autorizado
- ☐ Merge autorizado
- ☐ Deploy autorizado
- Firma: _________________________ Fecha: ____________
