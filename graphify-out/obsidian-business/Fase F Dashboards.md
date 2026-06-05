---
tags: [fase]
tipo: Fase de producto
estado: Planificada
---

# Fase F — Dashboards y KPIs Ejecutivos

Paneles de control ejecutivos con indicadores clave del avance del [[Proyecto]] de comisionamiento.

## Parte de
[[CommissionPro]] — roadmap de producto

## Construye sobre
[[Proyecto]], [[Equipo]], [[Protocolo]], [[PunchItem]]

## KPIs principales
- **Avance general**: % de [[Equipo|Equipos]] con todos los protocolos cerrados
- **Avance por tipo**: [[Precomisionamiento]] / [[Loop Check]] / [[FAT]] / [[SAT]] completados
- **Punch abiertos**: críticos vs totales, tendencia de cierre
- **Curva S**: avance planificado vs real por semana

## Fuente de datos
Vista materializada `mv_project_stats` (calculada por pg_cron)
Columnas: equipment_total, tests_cerrados, punch_abierto, punch_critico_abierto...

## Disponibilidad offline
Stats calculadas aproximadamente desde IndexedDB cuando sin red.

## Usuarios objetivo
Gerente de proyecto, cliente, supervisor de comisionamiento
