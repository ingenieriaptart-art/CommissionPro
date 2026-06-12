# Diseño: Importador Excel LDC — Hoja `B.100_200_INSTRU.`

**Fecha:** 2026-06-12  
**Proyecto:** LDC Biogas (Planta de Biogas — Zipaquirá)  
**Alcance:** Adaptar el importador de Excel para reconocer y parsear la hoja de instrumentación del documento de diseño LDC.

---

## Contexto

El documento `AA24-70(LDC DOCUMENTO DISEÑO INSTRUMENTACIÓN)_MAR_05_2026.xlsx` contiene 23 hojas. La hoja maestra de equipos físicos es `B.100_200_INSTRU.` (224 filas, 31 columnas). Sus headers no coinciden con ningún perfil existente en el parser (`instrument_index`, `power_equipment`, `equipment_list`), por lo que se requiere un nuevo SheetType específico.

**Decisiones tomadas antes del diseño:**
1. Importar `B.100_200_INSTRU.` como fuente principal de equipos físicos
2. Ignorar columna `CAJA JB` (junction box) — se integra en una iteración futura
3. Equipos con `UBICACIÓN EN PLANO = FUTURO` entran con `status = 'futuro'`

---

## Componentes afectados

| Archivo | Tipo de cambio |
|---|---|
| `database/migrations/0027_add_futuro_status.sql` | Nuevo — agrega valor al enum |
| `app/src/lib/excel-equipment-parser.ts` | Modificado — nuevo SheetType y parser |
| `app/src/app/api/import-equipment-excel/route.ts` | Modificado — usa status dinámico |

---

## Sección 1 — Migración de BD

```sql
-- Agrega 'futuro' al enum equipment_status para equipos no instalados aún
ALTER TYPE equipment_status ADD VALUE IF NOT EXISTS 'futuro';
```

No requiere reescritura de tabla. Se aplica en producción como cualquier otra migración.

---

## Sección 2 — Parser

### Nuevo SheetType

```typescript
export type SheetType =
  | "instrument_index"
  | "power_equipment"
  | "equipment_list"
  | "instrumentation_ldc"   // NUEVO
  | "unknown";
```

### Nuevo campo en `ParsedEquipmentRow`

```typescript
status?: string;
```

Permite que el parser comunique al route el status derivado del contenido de la fila (ej. `"futuro"`), sin hardcodear la lógica en el route.

### Mapa de columnas `INSTRUMENTATION_LDC_MAP`

| Header Excel | Normalizado (post-NFD) | Campo destino |
|---|---|---|
| TAG Nuevo | `tag nuevo` | `tag` |
| APLICACIÓN / DESCRIPCION | `aplicacion / descripcion` | `name` |
| SEÑAL SALIDA | `senal salida` | `io_type` |
| TAG Anterior | `tag anterior` | `pid_reference` |
| UBICACIÓN EN PLANO | `ubicacion en plano` | lógica de status + metadata |
| mS | `ms` | `metadata.cable_meters` |
| ALIMENTACION | `alimentacion` | `metadata.power_supply` |
| Tipo de medidor de INSTRUMENTO | `tipo de medidor de instrumento` | `metadata.instrument_type` |
| DIAMETRO EXTERNO TUBERIA | `diametro externo tuberia` | `metadata.pipe_diameter` |

### Detección automática

Condición: headers contienen **`"tag nuevo"`** Y **`"senal salida"`** → `instrumentation_ldc`.

Esta combinación es única en el libro y no colisiona con ningún otro perfil existente. La detección de `instrumentation_ldc` se evalúa **antes** que los otros tipos para evitar falsos positivos.

### Parser `parseLdcInstrumentRow`

**Lógica de status desde `UBICACIÓN EN PLANO`:**

| Valor | status | metadata.en_planos |
|---|---|---|
| `FUTURO` | `"futuro"` | `"FUTURO"` |
| `CONFIRMAR` | `"pendiente"` | `"CONFIRMAR"` |
| `SI` | `"pendiente"` | `"SI"` |
| `NO` | `"pendiente"` | `"NO"` |
| vacío | `"pendiente"` | omitido |

**Sub-header row (fila 2):** La fila con sub-encabezados MIN/MAX/UNIDAD no tiene valor en la columna TAG Nuevo → `parseLdcInstrumentRow` retorna `null` → se cuenta como `skipped`. No requiere manejo especial.

**Metadata generada por fila:**
```typescript
{
  en_planos: "SI" | "NO" | "FUTURO" | "CONFIRMAR",  // solo si presente
  cable_meters: "66",                                 // valor de mS
  power_supply: "24VDC",                              // valor de ALIMENTACION
  instrument_type: "Ultrasónico",                     // tipo de medidor
  pipe_diameter: "355",                               // diámetro tubería
  is_futuro: true,                                    // solo si FUTURO
  unclassified: true,                                 // heredado del route
  from_excel: true,                                   // heredado del route
  sheet_name: "B.100_200_INSTRU.",                    // heredado del route
  sheet_type: "instrumentation_ldc",                  // heredado del route
}
```

---

## Sección 3 — Route

Único cambio: en el payload de INSERT, reemplazar:

```typescript
// Antes
status: "pendiente" as const,

// Después
status: r.status ?? "pendiente",
```

El resto del flujo no cambia: deduplicación por TAG, bulk INSERT, UPDATE de campos de ingeniería, auditoría con `created_by`/`updated_by`.

---

## Sección 4 — Flujo de uso en la UI

1. Usuario sube el archivo Excel en el importador
2. Hace clic en "Ver hojas disponibles" — el endpoint `list_sheets` devuelve las 23 hojas
3. Selecciona `B.100_200_INSTRU.`
4. El parser detecta automáticamente `instrumentation_ldc`
5. Se importan los equipos: ~220 filas de datos + ~4 filas skipped (sub-header, totales, notas)
6. Los equipos FUTURO quedan con `status = 'futuro'` y `metadata.is_futuro = true`
7. El resumen de respuesta muestra: `created`, `updated`, `skipped`, `sheetType: "instrumentation_ldc"`

---

## Fuera de alcance (iteraciones futuras)

- **CAJA JB** (junction box): campo `rtu_destination` o campo propio — pendiente decisión
- **Rangos MIN/MAX/UNIDAD**: sub-headers en fila 2, no accesibles por nombre de columna — requiere estrategia de parseo posicional
- **Hoja SEÑALES BASE** (639 filas): lista de señales I/O individuales — módulo separado de comisionamiento
- **Hojas 2.1_lod, 2.2_bio**: listas por área — evaluar si agregan datos no cubiertos por la hoja maestra
