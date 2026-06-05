---
tags: [entidad]
tipo: Documento técnico
---

# Documento

Documento técnico de ingeniería asociado a un [[Proyecto]]: P&IDs, diagramas de lazo, hojas de datos, planos eléctricos, listados de instrumentos.

## Pertenece a
[[Proyecto]]

## Procesado por
[[Digitalizacion Ingenieria]] extrae [[TAG|TAGs]] automáticamente al subirlo

## Tipos soportados
PDF, DXF, Excel (.xlsx), imágenes escaneadas

## Flujo de procesamiento
1. Ingeniero sube el documento a [[CommissionPro]]
2. API route dispara procesamiento en Edge Function (Supabase Deno)
3. Se extraen entidades: TAGs, tipos de instrumento, descripciones
4. Se crean registros en `engineering_extracted_tags`
5. Estado: `pending` → `processing` → `completed` / `failed`

## Contribuye a
- [[Digitalizacion Ingenieria]] — input primario del pipeline
- [[TAG]] — resultado de la extracción automática
- [[Dossier Precomisionamiento]] — documentación técnica de respaldo

## Relación con fases
[[Fase E Documental]] — gestión y versionado de documentos técnicos
