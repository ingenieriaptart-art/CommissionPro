---
tags: [fase]
tipo: Fase de producto
estado: Futura
---

# Fase G — Escalabilidad Multi-Proyecto

Arquitectura para operar múltiples [[Proyecto|Proyectos]] concurrentes con cientos de usuarios simultáneos.

## Parte de
[[CommissionPro]] — roadmap de producto

## Objetivo
Pasar de un proyecto piloto (PTAR Zipaquirá) a una plataforma SaaS multi-tenant con:
- Multi-tenancy por empresa / organización
- Particionamiento de datos por proyecto
- Escalado automático de Edge Functions
- Replicación regional para proyectos internacionales

## Desafíos técnicos
- Partición de tabla `equipment` por `project_id` (400+ equipos × N proyectos)
- Sincronización offline para múltiples proyectos simultáneos
- Generación paralela de [[Dossier Precomisionamiento|Dossiers]] en PDF
- Permisos granulares: empresa contratista, cliente, inspector externo

## Impacto en modelo de datos
[[Equipo]], [[Protocolo]], [[Evidencia]] necesitan row-level security estricto por empresa y proyecto
