# FASE A — AUDITORÍA DE ARQUITECTURA TÉCNICA
## CommissionPro — Revisión del Código Fuente
**Fecha:** 2025-05-30 | Archivos revisados: 70

---

## RESUMEN EJECUTIVO

14 riesgos identificados: 7 ALTA, 5 MEDIA, 2 BAJA.

---

## [A-001] ALTA — RLS con JOINs en cada fila
**Archivo:** 0007_rls.sql

Problema: Las funciones helpers RLS ejecutan queries SQL en cada fila evaluada. El policy de equipment hace un JOIN de 3 tablas por fila. Con 50.000 equipos dispara 150.000+ operaciones.

Impacto: Timeouts en produccion. Colapso del connection pool.

Solucion: Agregar project_id directo en equipment. Cachear identity con current_setting por sesion.

---

## [A-002] ALTA — Pull sync sin paginacion
**Archivo:** sync/engine.ts — Lineas 99-120

Problema: pullChanges() hace select sin LIMIT. Al reconectar descarga TODOS los registros modificados. En 50k equipos puede ser 50MB en RAM de un movil.

Impacto: Crash de la app en tablets de campo.

Solucion: Paginacion de 200 registros por ciclo con cursor en Dexie.

---

## [A-003] ALTA — Dashboard sin agregacion en servidor
**Archivo:** dashboard/page.tsx — Lineas 54-66

Problema: Descarga 50.000 filas al cliente para hacer un forEach y contar por estado.

Impacto: 5-30 segundos de carga. Timeouts en redes 3G de campo.

Solucion: Vista materializada mv_project_stats con COUNT GROUP BY en PostgreSQL.

---

## [A-004] ALTA — Trigger audit guarda BLOBs en JSONB
**Archivo:** 0006_audit_sync_triggers.sql

Problema: fn_audit() guarda to_jsonb(new) completo. Con 1M de evidencias el audit_log puede superar 500GB.

Impacto: Costos de almacenamiento explosivos.

Solucion: Excluir columnas binarias del JSONB en fn_audit.

---

## [A-005] ALTA — useEquipment sin filtro de proyecto
**Archivo:** hooks/useEquipment.ts — Lineas 9-28

Problema: Sin subsystemId trae equipos de TODOS los proyectos. Fuga de datos entre clientes.

Impacto: Violacion de confidencialidad contractual entre proyectos.

Solucion: projectId como parametro obligatorio siempre.

---

## [A-006] ALTA — FK CASCADE borra protocolos firmados
**Archivo:** 0004_forms_tests.sql — Linea 46

Problema: Eliminar equipo borra en cascada TODOS sus protocolos firmados. Inaceptable en auditoria industrial.

Impacto: Perdida irreversible de trazabilidad. Incumplimiento ISA-88, ISO 9001.

Solucion: Cambiar a ON DELETE SET NULL. Agregar equipment_snapshot jsonb en tests.

---

## [A-007] ALTA — Sync sin lock de concurrencia
**Archivo:** sync/engine.ts — Lineas 157-173

Problema: Dos pestanas abiertas o red fluctuante disparan sync simultaneo. Riesgo de registros duplicados.

Impacto: Corrupcion de datos. Conflictos de version.

Solucion: Web Locks API (navigator.locks.request) para exclusividad entre pestanas.

---

## [A-008] MEDIA — Pull cursors en localStorage
**Archivo:** sync/engine.ts — Lineas 19-31

Problema: localStorage puede borrarse. Si se pierde el cursor, el proximo pull descarga todo desde 1970.

Solucion: Guardar cursors en IndexedDB (tabla sync_cursors en Dexie).

---

## [A-009] MEDIA — useTests sin paginacion ni lazy load
**Archivo:** hooks/useTests.ts — Lineas 13-19

Problema: 2.000 tests con relaciones = 100.000+ filas en un request. Sin paginacion ni limite.

Solucion: Paginacion de 50 tests. Checklist_items cargados solo al abrir el test (lazy).

---

## [A-010] MEDIA — checklist_items sin sync_status
**Archivo:** 0004_forms_tests.sql — Lineas 67-77

Problema: Sin updated_at, sync_status, version ni created_by. No pueden sincronizarse individualmente offline.

Solucion: Agregar columnas de auditoria y sync a checklist_items.

---

## [A-011] MEDIA — IndexedDB sin limpieza de blobs
**Archivo:** lib/db/local.ts — Lineas 86-94

Problema: Blobs de fotos se acumulan. 500 fotos de 2MB = 1GB en IndexedDB del dispositivo.

Solucion: Funcion purgeSyncedBlobs() que elimina blobs con storage_url confirmado.

---

## [A-012] MEDIA — Auth state desincronizado con JWT
**Archivo:** stores/auth.store.ts

Problema: JWT expira (24h) pero localStorage sigue con usuario activo. Queries fallan con 401 silencioso.

Solucion: Listener supabase.auth.onAuthStateChange para limpiar store al expirar token.

---

## [A-013] BAJA — form_templates no compartible entre proyectos
**Archivo:** 0004_forms_tests.sql

Problema: Formularios ligados a project_id. No hay plantillas globales organizacionales.

Solucion: Campo is_global boolean. Si project_id IS NULL es plantilla global.

---

## [A-014] BAJA — Sin disciplina ni contratista en tests
**Archivo:** 0004_forms_tests.sql

Problema: Sin campo disciplina ni contractor_id. KPIs de avance por disciplina y contratista no calculables.

Solucion: Agregar discipline ENUM y contractor_id FK a tests.

---

## TABLA RESUMEN

| ID    | Descripcion                         | Prioridad |
|-------|-------------------------------------|-----------|
| A-001 | RLS JOINs por fila                  | ALTA      |
| A-002 | Pull sync sin paginacion            | ALTA      |
| A-003 | Dashboard sin agregacion servidor   | ALTA      |
| A-004 | Trigger audit guarda BLOBs          | ALTA      |
| A-005 | useEquipment sin filtro proyecto     | ALTA      |
| A-006 | FK CASCADE borra protocolos         | ALTA      |
| A-007 | Sync sin lock concurrencia          | ALTA      |
| A-008 | Cursors en localStorage             | MEDIA     |
| A-009 | useTests sin paginacion             | MEDIA     |
| A-010 | checklist_items sin sync_status     | MEDIA     |
| A-011 | IndexedDB sin limpieza blobs        | MEDIA     |
| A-012 | Auth state desincronizado           | MEDIA     |
| A-013 | form_templates no global            | BAJA      |
| A-014 | Sin disciplina ni contratista       | BAJA      |
