---
tags: [proceso]
tipo: Pipeline de extracción
---

# Digitalización Ingeniería

Módulo que convierte documentos técnicos de ingeniería en datos estructurados, extrayendo automáticamente los TAGs de instrumentos y equipos mediante inteligencia artificial.

## Input
[[Documento|Documentos de ingeniería]] (P&IDs, diagramas de lazo, hojas de datos)

## Proceso
1. PDF/DXF/Excel subido a [[CommissionPro]]
2. Edge Function (Supabase Deno) analiza el documento
3. Motor de extracción detecta patrones de TAG (regex + ML)
4. Cada entidad detectada → registro `engineering_document_entity`
5. TAGs normalizados → registro `engineering_extracted_tag` (estado: `pending_review`)

## Output
[[TAG|TAGs]] listos para revisión por el ingeniero

## Alimenta
[[Pipeline TAG Equipo]] — TAGs aprobados se convierten en [[Equipo|Equipos]]

## Fase relacionada
[[Fase E Documental]] — gestión documental con extracción automática

## Contexto PTAR Zipaquirá
360 instrumentos detectados en DATOS_INST, 29 equipos de potencia en DATOS_POT, 136 en LISTADO EQUIPOS → importados vía [[Importacion Excel]]
