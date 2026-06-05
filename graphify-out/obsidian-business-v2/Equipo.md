---
tags: [entidad]
tipo: Activo industrial
---

# Equipo

Activo industrial individual que se precomisiona. Nodo central del modelo de dominio: todo el flujo de trabajo converge en el equipo.

## Jerarquía
[[Subsistema]] → [[Sistema]] → [[Area]] → [[Proyecto]]

## Identificación
- Identificado por un [[TAG]] único (código de instrumento o equipo)
- Campos de ingeniería: `io_type`, `rtu_destination`, `service`, `pid_reference`, `location_system`

## Secuencia de pruebas
El equipo atraviesa protocolos en orden:
1. [[Precomisionamiento]] — verificación mecánica y eléctrica previa
2. [[Loop Check]] — verificación de señales de campo
3. [[Energizacion]] — primera energización controlada
4. [[FAT]] — prueba de aceptación en fábrica
5. [[SAT]] — prueba de aceptación en sitio
6. [[Funcional]] — prueba funcional integrada

## Trazabilidad
- [[Evidencia|Evidencias]] fotográficas por etapa (antes / durante / después)
- [[Firma Aprobacion|Firmas digitales]] de supervisores y clientes
- [[PunchItem|Punch items]] vinculados al equipo

## Orígenes de datos
- [[Pipeline TAG Equipo]] — creado desde TAG aprobado en documentos
- [[Importacion Excel]] — importación masiva desde hoja de instrumentos

## Contribuye a
[[Dossier Precomisionamiento]] al completar todos sus protocolos
