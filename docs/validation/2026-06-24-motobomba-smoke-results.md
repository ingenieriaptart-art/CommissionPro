# Resultados del Smoke Test — P_MEC_010 · Motobomba

> Documento para diligenciar DURANTE el smoke. Marcar cada prueba, adjuntar evidencia y emitir veredicto final.

- **Ejecutado por:** _________________________
- **Fecha/hora de ejecución:** _________________________
- **Dispositivo / navegador:** _________________________
- **Entorno:** localhost (base de producción compartida — `nkjunkolsmjledzwuxgn`)
- **Equipo:** `MB-TEST-001` (`0e1d976c-873d-450d-81d7-e1653557d999`)
- **Template:** `P_MEC_010` (`7a2b7f17-b6dd-4da4-b1a7-ab58f6b9321e`)

## Marcado de resultados

| # | Prueba | PASS / FAIL | Observaciones | Evidencia (archivo/enlace captura) |
|---|--------|:-----------:|---------------|------------------------------------|
| 1 | Apertura | ☐ PASS ☐ FAIL | | |
| 2 | Plantilla correcta (R3) | ☐ PASS ☐ FAIL | | |
| 3 | Secciones (10) | ☐ PASS ☐ FAIL | | |
| 4 | Campos (31 dedicados) | ☐ PASS ☐ FAIL | | |
| 5 | Fotografías (4) | ☐ PASS ☐ FAIL | | |
| 6 | Guardado | ☐ PASS ☐ FAIL | | |
| 7 | Recarga (F5) | ☐ PASS ☐ FAIL | | |
| 8 | Reapertura | ☐ PASS ☐ FAIL | | |
| 9 | Aprobación | ☐ PASS ☐ FAIL | | |
| 10 | 2ª inspección (revision=2) | ☐ PASS ☐ FAIL | | |
| 11 | Historial | ☐ PASS ☐ FAIL | | |
| 12 | Offline | ☐ PASS ☐ FAIL | | |
| 13 | Reconexión | ☐ PASS ☐ FAIL | | |
| 14 | Sincronización | ☐ PASS ☐ FAIL | | |
| 15 | Evidencias en BD | ☐ PASS ☐ FAIL | | |
| 16 | Evidencias en storage | ☐ PASS ☐ FAIL | | |
| 17 | Informe | ☐ PASS ☐ FAIL | (R-FOTO-REP esperado) | |
| 18 | Errores consola | ☐ PASS ☐ FAIL | | |
| 19 | Errores de red | ☐ PASS ☐ FAIL | | |
| 21 | Validación IndexedDB (pending→synced) | ☐ PASS ☐ FAIL | | |

## Estado de riesgos al cierre

| Riesgo | Estado | Nota |
|--------|--------|------|
| R3 — selección de plantilla | ☐ Cerrado ☐ Abierto | Confirmar prueba 2 |
| R1 — inspección visual triplicada | ☐ Aceptado ☐ Aplicar 0038 | Decisión del usuario |
| R-FOTO-REP — fotos no salen en informe | ☐ Aceptado ☐ Corregir después | |
| R-SYNC5 — op abandonada tras 5 fallos | ☐ Sin incidencia ☐ Observado | Revisar prueba 14/21 |
| R-DRAFT — borrador local no sincronizado | ☐ Sin incidencia ☐ Observado | |
| R2 — MB-TEST-001 en base real | ☐ Pendiente limpieza | Ejecutar script de cleanup |

## Conteo
- PASS: _____ / 20
- FAIL: _____ / 20
- Bloqueantes en FAIL (2, 6–16, 21): ☐ Ninguno ☐ Sí (listar): _________________________

## Resultado final

☐ **GO** — autorizar PR, merge y deploy.
☐ **GO CON OBSERVACIONES** — liberar P_MEC_010; corregir después: _________________________
☐ **NO-GO** — bloqueantes pendientes: _________________________

- **Firma QA Lead:** _________________________
- **Firma Release Manager:** _________________________
- **Fecha de decisión:** _________________________
