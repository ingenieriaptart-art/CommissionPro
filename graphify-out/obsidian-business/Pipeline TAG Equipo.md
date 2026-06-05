---
tags: [proceso]
tipo: Pipeline de conversión
---

# Pipeline TAG → Equipo

Flujo que convierte un [[TAG]] aprobado en un [[Equipo]] registrado con todos sus metadatos de ingeniería.

## Disparador
Ingeniero aprueba uno o más [[TAG|TAGs]] en la bandeja de revisión

## Pasos
1. Selección de TAGs en estado `approved` en la pantalla de Ingeniería
2. Click "Convertir a Equipo" → `useCreateEquipmentFromTags`
3. API route `/api/create-equipment-from-tags` ejecuta RPC `create_equipment_from_tags`
4. Migración 0017 creó subsistema "SIN CLASIFICAR" en la jerarquía
5. El equipo se crea con los campos de ingeniería mapeados desde el TAG
6. TAG pasa a estado `merged`, equipo creado en [[Subsistema]] correspondiente

## Manejo de duplicados
- TAGs ya convertidos → skipped (no crea duplicados)
- Retorna: `{ created, skipped, existing[], errors[] }`

## Alimentado por
[[Digitalizacion Ingenieria]] → [[TAG]] → este pipeline

## Produce
[[Equipo|Equipos]] listos para asignar protocolos de comisionamiento

## Alternativa
[[Importacion Excel]] — para proyectos con inventario en Excel (PTAR Zipaquirá)
