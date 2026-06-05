---
tags: [entidad]
tipo: Lista de verificación
---

# Checklist

Lista de ítems de verificación que estructura la ejecución de un [[Protocolo]]. Cada ítem tiene un resultado: cumple, no cumple o no aplica.

## Pertenece a
[[Protocolo]]

## Utilizado en
- [[Precomisionamiento]] — ítems de instalación mecánica y eléctrica
- [[Loop Check]] — ítems de señal y calibración
- [[FAT]] — ítems de aceptación en fábrica
- [[SAT]] — ítems de aceptación en sitio
- [[Funcional]] — escenarios funcionales

## Estructura de un ítem
`descripción`, `resultado` (cumple / no cumple / no aplica), `observación`, `responsable`

## Generación
Los checklists son generados desde [[Fase B Formularios|formularios dinámicos]]: el ingeniero crea plantillas reutilizables por tipo de equipo, y el sistema instancia el checklist al crear la prueba.

## Relación con PunchItem
Un ítem "no cumple" genera automáticamente un [[PunchItem]] que debe resolverse

## Contribuye a
[[Dossier Precomisionamiento]] — evidencia del cumplimiento técnico
