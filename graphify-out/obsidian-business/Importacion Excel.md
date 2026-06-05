---
tags: [proceso]
tipo: Importación masiva
---

# Importación Excel

Módulo de importación masiva de equipos e instrumentos desde hojas de cálculo Excel. Diseñado específicamente para el proyecto piloto PTAR Zipaquirá.

## Volumen PTAR Zipaquirá
- **DATOS_INST**: 360 instrumentos de proceso
- **DATOS_POT**: 29 equipos de potencia
- **LISTADO EQUIPOS**: 136 equipos adicionales

## Flujo
1. Usuario selecciona archivo Excel en `ExcelImportPanel`
2. Hook `useImportEquipmentFromExcel` sube el archivo con JWT
3. API route `/api/import-equipment-excel` detecta tipo de hoja automáticamente
4. Parser mapea columnas al modelo de [[Equipo]]
5. Equipos creados con `metadata.from_excel: true` para trazabilidad

## Detección de tipo de hoja
- Header "TAG" + "SERVICIO" → hoja de instrumentos
- Header "EQUIPO" + "POTENCIA" → hoja de equipos de potencia
- Fallback al nombre de hoja o selección manual

## Alimenta
[[Equipo|Equipos]] registrados en [[Proyecto]] con jerarquía "SIN CLASIFICAR" hasta que el ingeniero los clasifique

## Relacionado con
[[TAG]] — los TAGs importados pueden cruzarse con los TAGs extraídos de [[Documento|documentos]]
[[Pipeline TAG Equipo]] — alternativa para proyectos sin documentos digitalizados
