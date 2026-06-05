---
tags: [entidad]
tipo: Identificador de instrumento
---

# TAG

Identificador único de un instrumento o equipo según la convención de ingeniería del proyecto (ej: FT-101, MCC-A-12, LIT-204).

## Fuente
Extraído automáticamente de [[Documento|documentos de ingeniería]] (P&IDs, diagramas de lazo) por el módulo de [[Digitalizacion Ingenieria]].

## Ciclo de vida
1. **Extraído** — detectado en un documento, estado `pending_review`
2. **Revisado** — aprobado / rechazado / fusionado por el ingeniero
3. **Convertido** — TAG aprobado convierte en [[Equipo]] vía [[Pipeline TAG Equipo]]

## Estados
`pending_review` → `approved` → `merged` (vinculado a equipo)
`rejected` (descartado)

## Relaciones
- Extraído de [[Documento]]
- Procesado por [[Digitalizacion Ingenieria]]
- Convertido en [[Equipo]] vía [[Pipeline TAG Equipo]]
- Verificado en [[Loop Check]]
- Importado masivamente vía [[Importacion Excel]]

## Contexto PTAR Zipaquirá
360 instrumentos en hoja DATOS_INST + 29 equipos de potencia en DATOS_POT
