# Persistencia por sección + Corrección interina + Tema claro/oscuro — Diseño

> **Estado:** diseño aprobado (brainstorming). Interino hasta EPIC-004 (Enmiendas/Auditoría).
> **Fecha:** 2026-06-26 · **Rama:** `feat/precom-persistencia-correccion`

## Objetivo

Tres mejoras al flujo de precomisionamiento, para soportar la operación de campo de Brasil **mientras la aplicación llega al 100%**:

1. **Persistencia por sección en la BD** — el avance de cada sección se guarda en `tests` y no se pierde; continuable desde cualquier dispositivo (resuelve [[pendiente_revision_precom]] puntos 1 y 3).
2. **Modo corrección interino** — admin/director pueden reabrir una inspección ya enviada y corregirla, **sobrescribiendo** el mismo registro (sin historial; la auditoría llega con EPIC-004).
3. **Tema claro/oscuro** en el formulario de inspección y la vista de revisión (hoy forzados a oscuro).

## Decisiones cerradas (brainstorming)

| Tema | Decisión |
|---|---|
| Corrección de inspección enviada | **Sobrescribir el mismo registro** (sin historial; interino) |
| Alcance de "no se pierda" | **Guardar en la BD por sección**, multidispositivo, funcionando offline |
| Quién corrige lo enviado | **Solo admin/director** (técnicos siguen capturando/continuando borradores) |
| Tema | **Formulario + revisión respetan el tema**, con toggle accesible en esas pantallas |
| Enfoque técnico | **Enfoque 1: borrador-como-fila-en-BD** (reusa el outbox/sync existente) |

## Restricciones globales

- **No modificar** el motor offline/sync (`engine.ts`): solo se usa su API pública `enqueueSync(entity, id, INSERT|UPDATE|DELETE, payload)`. Ya soporta `UPDATE` parcial vía `update().eq("id", …)`.
- **No tocar** la lógica de auto-punch ni la FSM en el cierre (`submitInspectionOffline` mantiene su comportamiento al pasar a `ejecutado`).
- No cambiar el enum `test_status` (ya tiene `borrador` y `ejecutado`).
- Excluir de edición: **firmas, fechas, inspector**.
- Datos reales de Brasil — probar en equipo de prueba aislado ([[localhost_usa_base_produccion]]).

## Modelo central

La inspección pasa de "draft local materializado al cerrar" a **una fila viva en `tests`** desde que se inicia:

```
Iniciar  → INSERT tests {status:'borrador'}              (id asignado, sincroniza)
Editar   → UPDATE tests.data por sección                 (outbox → multidispositivo)
Cerrar   → UPDATE {status:'ejecutado', result_summary, executed_by/at}
            + auto-punch + FSM (lógica actual, sin cambios)
Corregir → UPDATE data/result sobre la misma fila        (solo admin/director)
```

## Componentes y archivos

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Modificar | `app/src/lib/sync/submitInspection.ts` | Separar "crear borrador" (INSERT al iniciar) de "cerrar" (UPDATE a `ejecutado`); nueva función de UPDATE por sección y de corrección |
| Modificar | `app/src/hooks/useSubmitInspection.ts` | Exponer `startDraft`, `saveSection`, `closeInspection`, `correctInspection` |
| Modificar | `app/src/app/(workspace)/equipment/[equipmentId]/inspection/[templateId]/page.tsx` | Crear/cargar fila `tests`; autosave por sección a BD; precarga desde BD; modo corrección; toggle de tema |
| Modificar | `app/src/hooks/useInspectionData.ts` | Cargar `data`/snapshot desde la fila `tests` existente (continuar/corregir) cuando no hay draft local |
| Modificar | `app/src/lib/db/local.ts` | Atar el draft local al `testId` real; helper para leer `tests` local por (equipment, template) |
| Modificar | panel de equipo (`FloatingEquipmentPanel.tsx`) | Botón por estado: Continuar / Ver inspección / Corregir |
| Crear | `database/migrations/0058_guard_correccion.sql` | Trigger: bloquear edición de `data`/`result_summary` en tests `ejecutado`+ salvo admin/director |
| Modificar | `ThemeProvider`/encabezados de formulario y revisión | Respetar tema + toggle Sol/Luna en esas pantallas |
| Crear | `app/src/lib/inspection/correction.ts` (+ tests) | Lógica pura: recálculo de `result_summary`, campos editables/excluidos, patch de UPDATE |

## Flujo del formulario

1. **Iniciar** (panel del equipo → plantilla): crea fila `tests` `status='borrador'`, sella `template_snapshot` al inicio, `enqueueSync("tests", id, "INSERT", …)`.
2. **Guardar por sección**: en cada cambio/avance de sección → autosave local inmediato + `enqueueSync("tests", id, "UPDATE", { id, data, updated_at })`. Online u offline.
3. **Botón según estado** (panel/listado): `borrador`→**"Continuar"** · `ejecutado` (técnico)→**"Ver inspección"** (revisión solo-lectura) · `ejecutado` (admin/director)→**"Corregir"**.
4. **Revisar y Cerrar**: `UPDATE {status:'ejecutado', result_summary, executed_by/at}` + auto-punch + FSM (sin cambios respecto a hoy).
5. **Corregir** (admin/director): abre el formulario precargado desde `tests`, edita campos permitidos (no firmas/fechas/inspector), guarda con `UPDATE` sobre la misma fila + recalcula `result_summary`. Sobrescribe.

## Permisos / RLS

- Capturar/continuar `borrador`: igual que hoy (edición en módulo Pruebas).
- **Corregir `ejecutado`: solo admin/director** — doble barrera:
  - **UI**: botón "Corregir" y campos editables solo si `isRole('admin','director')`.
  - **BD (trigger)**: bloquear `UPDATE` de `data`/`result_summary` cuando `status` ya es `ejecutado`+ salvo `app_is_admin()` o rol `director`. Cierra la brecha de que un técnico edite vía API directa (`tests_update` hoy permite a cualquier edit-level).

## Tema claro/oscuro

- Reusar `useUIStore.theme` + `ThemeProvider` (togglea `.dark` en `<html>`).
- Refactor de encabezados/cuerpos del **formulario** y **revisión** (hoy `slate-900/950` fijos) a clases con variante (`bg-white dark:bg-slate-950`, etc.).
- Agregar **toggle Sol/Luna** en el encabezado propio de esas pantallas (no usan Topbar). Trabajo principal: contraste/legibilidad en modo claro.

## Conflictos y errores

- **Conflicto** (dos dispositivos editan la misma inspección): **last-write-wins** por `id` (interino). `sync_status='conflict'` queda para EPIC-004; no se bloquea ahora.
- **Errores de sync**: reusar reintentos + `last_sync_error`. El autosave local garantiza no perder datos aunque falle el push.
- **Offline**: local-first; push encolado y conciliado al reconectar (sin cambios al engine).

## Testing

- **Unit (lógica pura)** `correction.ts`: patch de UPDATE por sección; recálculo de `result_summary` (alguna falla → `no_cumple`; si no → `cumple`); gating de campos editables (excluye firma/fecha/inspector).
- **Integración sync**: un cambio de sección encola `UPDATE` y el engine hace `update().eq()` (patrón ya cubierto en `engine.test.ts`).
- **Trigger BD**: técnico NO puede editar `ejecutado`; admin/director sí.
- **UI**: botón por estado correcto; formulario/revisión legibles en claro y oscuro.

## Fuera de alcance

- Historial/auditoría de correcciones, revisiones superseantes, anulación de punch, MC avanzado → **EPIC-004** (`inspection_amendments`). Esto es explícitamente interino y sobrescribe.

## Riesgos

| Riesgo | Nivel | Mitigación |
|---|---|---|
| Ediciones concurrentes sin traza | Medio | LWW + EPIC-004 futuro; probar en equipo de prueba |
| Romper el flujo offline al adelantar el INSERT | Medio | Reusar outbox; no tocar engine; tests de integración |
| Migración sobre datos reales de Brasil | Medio | Trigger idempotente; probar aislado ([[localhost_usa_base_produccion]]) |
| Borradores `tests` "huérfanos" (iniciados y no cerrados) | Bajo | Quedan como `borrador`; el botón "Continuar" los retoma; no afectan FSM/reportes (filtran por estado) |
| Legibilidad en modo claro | Bajo | Revisar contraste por pantalla |
