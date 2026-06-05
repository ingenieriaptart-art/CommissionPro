---
tags: [entidad]
tipo: Registro multimedia
---

# Evidencia

Registro multimedia (foto, video, PDF) que documenta el estado de un [[Equipo]] o el resultado de un [[Protocolo]] en un momento específico.

## Vinculada a
- [[Protocolo]] — evidencia de la ejecución de la prueba
- [[Equipo]] — estado del activo antes / durante / después
- [[PunchItem]] — foto del defecto y de la corrección

## Etapas de captura
`antes` · `durante` · `después` · `general`

## Metadatos capturados
Coordenadas GPS, anotaciones, observaciones, responsable, timestamp

## Almacenamiento
- **Sin red**: guardada en IndexedDB local (blobStore)
- **Con red**: subida a Supabase Storage, registro en base de datos

## Contribuye a
[[Dossier Precomisionamiento]] — evidencia irrefutable del proceso ejecutado

## Fase relacionada
[[Fase C Trazabilidad]]
