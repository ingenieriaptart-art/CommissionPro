---
tags: [entidad]
tipo: Entidad raíz
---

# Proyecto

Unidad organizacional de máximo nivel en [[CommissionPro]]. Representa una instalación industrial completa en proceso de precomisionamiento.

## Pertenece a
[[CommissionPro]] (gestionado por)

## Contiene
- [[Area|Áreas]] → [[Sistema|Sistemas]] → [[Subsistema|Subsistemas]] → [[Equipo|Equipos]]
- [[Documento|Documentos técnicos]]
- [[PunchItem|Punch items]] del proyecto

## Genera
- [[Dossier Precomisionamiento]] al cierre

## Atributos clave
`código`, `nombre`, `cliente`, `ubicación`, `estado` (planificación → en ejecución → cerrado)

## Contexto PTAR Zipaquirá
El proyecto piloto importa **360 instrumentos + 29 equipos de potencia + 136 equipos de lista** vía [[Importacion Excel|importación masiva Excel]].
