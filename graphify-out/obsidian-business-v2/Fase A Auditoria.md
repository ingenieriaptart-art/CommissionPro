---
tags: [fase]
tipo: Fase de producto
estado: Completada
---

# Fase A — Auditoría Técnica (14 Riesgos)

Fase de estabilización técnica: identificación y corrección de los 14 riesgos técnicos críticos detectados en auditoría pre-producción.

## Parte de
[[CommissionPro]] — roadmap de producto

## Correcciones A-001 a A-007 (pre-producción)
- **A-001**: project_id desnormalizado en equipment para RLS eficiente
- **A-002**: Pull paginado (200 reg/ciclo) en motor de sync
- **A-005**: project_id como índice en equipment (migración v2)
- **A-006**: Snapshot de equipo al crear test (trazabilidad)
- **A-007**: Web Locks API para exclusividad entre pestañas
- **A-008**: Sync cursors en IndexedDB (no localStorage)

## Correcciones A-008 a A-014 (en producción)
Pendientes: RLS en project_members y signatures, conflictos de sync, blob upload, formularios dinámicos.

## Impacto
Sin esta fase, ninguna de las otras fases puede construirse sobre una base segura.
