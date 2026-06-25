# Checklist de Aceptación Operacional — P_MEC_010 · Motobomba

- **Fecha:** 2026-06-24
- **Rama:** `feat/brasil-motobomba`
- **Equipo de prueba:** `MB-TEST-001` · id `0e1d976c-873d-450d-81d7-e1653557d999`
- **Template:** `P_MEC_010 · Motobomba` · id `7a2b7f17-b6dd-4da4-b1a7-ab58f6b9321e`
- **URL directa:** `/equipment/0e1d976c-873d-450d-81d7-e1653557d999/inspection/7a2b7f17-b6dd-4da4-b1a7-ab58f6b9321e`
- **Estructura esperada:** 10 secciones · 31 campos dedicados (49 totales) · 4 fotos

| # | Prueba | Objetivo | Pasos | Resultado esperado | Evidencia requerida | Criterio PASS / FAIL |
|---|--------|----------|-------|--------------------|---------------------|----------------------|
| 1 | Apertura | Confirmar que el formato carga | Abrir la URL directa como admin/director | Carga sin spinner colgado ni "Plantilla no encontrada" | Captura del formato cargado | PASS si renderiza; FAIL si error/blanco |
| 2 | Plantilla correcta (R3) | Confirmar que abre P_MEC_010 | a) Header = "Motobomba"; b) Mapa de planta → MB-TEST-001 → panel "Plantillas (2)" → elegir Motobomba | Header = Motobomba; selector muestra 2 (Motobomba + Motor Eléctrico) y abre el mismo formato | Captura header + selector | PASS si abre Motobomba; FAIL si abre otro |
| 3 | Secciones | Verificar las 10 secciones y orden | Revisar sidebar | Datos Generales · Datos Bomba · Datos Motor · Fotografías · Inspección Visual (univ) · Insp. Visual Bomba · Insp. Visual Motor · Anclaje · Redline · Firmas | Captura del sidebar | PASS si 10 en orden; FAIL si falta/sobra |
| 4 | Campos | Verificar 31 campos dedicados | Recorrer secciones dedicadas | Datos Bomba=6, Datos Motor=9 (kW y HP separados), Fotos=4, Visual Bomba=6, Visual Motor=6; unidades (m, kW, HP, RPM, V, Hz) | Captura Datos Bomba + Datos Motor | PASS si conteos+unidades OK; FAIL si discrepan |
| 5 | Fotografías | Verificar 4 capturas etiquetadas | Abrir Fotografías; tocar cada control | Foto BOMBA, Foto PLACA BOMBA, Foto MOTOR, Foto PLACA MOTOR; en móvil abre cámara | Captura sección + 1 foto cargada | PASS si las 4 capturan; FAIL si alguna no |
| 6 | Guardado | Confirmar guardado | Llenar requeridos + datos placa + 1 foto; observar indicador | "Guardado HH:MM:SS"; al completar requeridos se habilita "Revisar y Cerrar" | Captura con indicador + botón habilitado | PASS si guarda y habilita; FAIL si no |
| 7 | Recarga | Persistencia ante F5 | Sin cerrar, recargar (F5) | Reabre con todas las respuestas y fotos | Captura post-recarga | PASS si persiste; FAIL si pierde |
| 8 | Reapertura | Persistencia al navegar fuera y volver | Ir a otra pantalla y volver | Mismo borrador con datos | Captura | PASS si persiste; FAIL si vacío |
| 9 | Aprobación | Cerrar/aprobar | "Revisar y Cerrar" → resumen → guardar/enviar | Se crea `test` (ejecutado); borrador eliminado; vuelve al plano sin error | Captura resumen + confirmación | PASS si cierra sin error; FAIL si falla |
| 10 | 2ª inspección | Múltiples inspecciones | Reabrir y enviar otra | 2º `test` con `revision=2` (no sobrescribe) | Captura + verificación BD | PASS si crea 2º; FAIL si sobrescribe |
| 11 | Historial | Conservación | "Pruebas y Protocolos" del proyecto | Aparecen ambas inspecciones, fechas distintas | Captura listado | PASS si ambas; FAIL si solo una |
| 12 | Offline | Operación sin red | F12 → Network → Offline; llenar y guardar | Permite llenar/guardar; indicador pendientes; sin crash | Captura modo offline | PASS si funciona; FAIL si bloquea |
| 13 | Reconexión | Disparo auto-sync | Volver online | A ~1.5 s arranca sincronización | Captura "sincronizando" | PASS si arranca; FAIL si no |
| 14 | Sincronización | Cola vaciada | Esperar fin de sync | Pendientes → 0; sin `sync_status=failed` | Captura indicador en 0 | PASS si 0/0; FAIL si quedan |
| 15 | Evidencias en BD | Filas `evidences` | Supabase → `evidences` por `test_id` (o verifica QA por REST) | 1 fila/foto con `test_id`, `stage`, `storage_url` tras sync | Query/captura | PASS si filas con url; FAIL si faltan/sin url |
| 16 | Evidencias en storage | Archivos subidos | Supabase → Storage → `evidences/{project}/{equipment}/{test}/` | Existen `.jpg` (1/foto) y abren | Captura del bucket | PASS si existen y abren; FAIL si 0/rotos |
| 17 | Informe | Validar informe | Abrir informe de inspección del proyecto | MB-TEST-001 figura con estado/observaciones. ⚠️ Conocido: fotos `stage=general` NO salen en columnas FOTO (R-FOTO-REP) | Captura informe | PASS si equipo figura correcto; FAIL si no aparece/datos errados |
| 18 | Errores consola | Sin errores JS | F12 → Console durante todo el smoke | Sin errores rojos (warnings Next/Image admitidos) | Captura Console | PASS si sin errores; FAIL si hay |
| 19 | Errores de red | Sin fallos HTTP | F12 → Network durante guardado/sync | Sin 4xx/5xx a Supabase (REST/Storage/RPC) | Captura Network | PASS si sin 4xx/5xx; FAIL si hay |
| 20 | Resultado final | Veredicto agregado | Consolidar 1–19 y 21 | Todas PASS (o solo R1/R-FOTO-REP abiertas) | Tabla completa + capturas | GO / GO C-OBS / NO-GO (ver criterio abajo) |
| 21 | Validación IndexedDB | Verificar motor offline-first local | F12 → Application → IndexedDB → revisar `tests`, `evidences`, `blobStore`, `syncQueue`. **OFFLINE:** nuevo registro de inspección, `sync_status=pending`, evidencias presentes, `syncQueue` con ops. **ONLINE (tras sync):** `sync_status=synced`, `syncQueue` vacía, evidencias sincronizadas | Ciclo `pending → synced` observable; registros no desaparecen | Capturas de IndexedDB ANTES y DESPUÉS de sincronizar | PASS si se observa pending→synced; FAIL si registros desaparecen o no sincronizan |

## Criterio de decisión final (Prueba 20)
- **GO:** pruebas 1–16, 18, 19, 21 en PASS **y** R3 cerrado (prueba 2).
- **GO CON OBSERVACIONES:** lo anterior en PASS y solo quedan abiertas R1 (inspección visual triplicada) y/o R-FOTO-REP (fotos no salen en columnas del informe).
- **NO-GO:** falla cualquiera de persistencia (6–8), aprobación (9), historial (10–11), offline/sync (12–14, 21) o evidencias (15–16).

## Bloqueantes vs observaciones aceptables
- **Crítico para GO:** 2 (R3), 6–9, 10–16, 21.
- **Observaciones aceptables (no bloquean):** 17 (R-FOTO-REP), triplicidad visual (R1).
- Pruebas 15 y 16 pueden ser verificadas por QA vía REST/Storage tras el envío + sync.
