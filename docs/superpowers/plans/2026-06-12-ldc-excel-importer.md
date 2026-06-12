# LDC Excel Importer — `instrumentation_ldc` SheetType — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar el importador de Excel para reconocer y parsear la hoja `B.100_200_INSTRU.` del documento de diseño de instrumentación LDC (Planta de Biogas), incluyendo el status `futuro` para equipos no instalados.

**Architecture:** Se agrega un nuevo `SheetType = "instrumentation_ldc"` al parser existente (`excel-equipment-parser.ts`) con su propio mapa de columnas y función de parseo. La detección es automática por la combinación de headers `"TAG Nuevo"` + `"SEÑAL SALIDA"`, única en el libro. El route reutiliza el status devuelto por el parser en lugar de hardcodear `"pendiente"`. Una migración SQL agrega `'futuro'` al enum `equipment_status`.

**Tech Stack:** TypeScript, xlsx 0.18.5, Next.js 16, Supabase (PostgreSQL enum)

**Spec:** `docs/superpowers/specs/2026-06-12-ldc-excel-importer-design.md`

---

## Archivos afectados

| Archivo | Acción |
|---|---|
| `database/migrations/0027_add_futuro_status.sql` | Crear |
| `app/src/lib/excel-equipment-parser.ts` | Modificar |
| `app/src/app/api/import-equipment-excel/route.ts` | Modificar |

---

## Task 1: Migración SQL — Agregar `'futuro'` al enum `equipment_status`

**Files:**
- Create: `database/migrations/0027_add_futuro_status.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Agrega 'futuro' al enum equipment_status para equipos no instalados aún
ALTER TYPE equipment_status ADD VALUE IF NOT EXISTS 'futuro';
```

Guardar en `database/migrations/0027_add_futuro_status.sql`.

- [ ] **Step 2: Aplicar la migración en Supabase**

En el dashboard de Supabase → SQL Editor, ejecutar el contenido del archivo.

O desde CLI si está configurado:
```bash
supabase db push
```

Verificar que no hay error. Si el valor ya existía, `IF NOT EXISTS` previene el error.

- [ ] **Step 3: Verificar que el enum fue actualizado**

En Supabase SQL Editor:
```sql
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'equipment_status'
ORDER BY enumsortorder;
```

Resultado esperado — debe incluir `futuro` al final de la lista:
```
pendiente
en_ejecucion
aprobado
rechazado
bloqueado
listo_energizacion
listo_arranque
operativo
futuro
```

- [ ] **Step 4: Commit**

```bash
git add database/migrations/0027_add_futuro_status.sql
git commit -m "feat(db): agregar status futuro al enum equipment_status"
```

---

## Task 2: Actualizar `excel-equipment-parser.ts`

**Files:**
- Modify: `app/src/lib/excel-equipment-parser.ts`

El archivo actual tiene 250 líneas. Los cambios son:
1. Agregar `"instrumentation_ldc"` a `SheetType` (línea 5)
2. Agregar `EquipmentImportStatus` type export (nuevo, antes de `ParsedEquipmentRow`)
3. Agregar campo `status?: EquipmentImportStatus` a `ParsedEquipmentRow` (línea 17)
4. Agregar constante `INSTRUMENTATION_LDC_MAP` (después de `EQUIPMENT_LIST_MAP`)
5. Actualizar `detectSheetType` para detectar LDC antes de los otros tipos
6. Agregar función `parseLdcInstrumentRow`
7. Actualizar el loop principal en `parseExcelEquipment`

- [ ] **Step 1: Actualizar `SheetType` y agregar `EquipmentImportStatus`**

Reemplazar las líneas 5–18 (tipos públicos) con:

```typescript
export type SheetType =
  | "instrument_index"
  | "power_equipment"
  | "equipment_list"
  | "instrumentation_ldc"
  | "unknown";

export type EquipmentImportStatus = "pendiente" | "futuro";

export interface ParsedEquipmentRow {
  tag: string;
  name: string;
  service?: string;
  io_type?: string;
  rtu_destination?: string;
  location_system?: string;
  pid_reference?: string;
  power_kw?: number;
  ccm_panel?: string;
  status?: EquipmentImportStatus;
  metadata?: Record<string, unknown>;
}
```

- [ ] **Step 2: Agregar `INSTRUMENTATION_LDC_MAP` después de `EQUIPMENT_LIST_MAP`**

Insertar después de la constante `EQUIPMENT_LIST_MAP` (línea ~65):

```typescript
const INSTRUMENTATION_LDC_MAP = {
  tag:           ["tag nuevo", "tag"],
  name:          ["aplicacion / descripcion", "aplicacion/descripcion", "descripcion"],
  io_type:       ["senal salida"],
  pid_reference: ["tag anterior"],
  ubicacion:     ["ubicacion en plano"],
  cable_meters:  ["ms"],
  power_supply:  ["alimentacion"],
  instr_type:    ["tipo de medidor de instrumento"],
  pipe_diam:     ["diametro externo tuberia"],
} as const;
```

Nota: los strings ya están normalizados (sin acentos, minúsculas) porque `normalizeHeader` los procesa antes de comparar. No obstante, `pick()` llama `normalizeHeader` internamente, así que pasarlos sin normalizar también funciona — se usan sin acentos aquí por consistencia visual.

- [ ] **Step 3: Actualizar `detectSheetType` para detectar LDC primero**

Reemplazar la función `detectSheetType` completa (líneas ~106–124):

```typescript
function detectSheetType(headerIdx: Map<string, number>): SheetType {
  const has = (...variants: string[]) =>
    variants.some(v => headerIdx.has(normalizeHeader(v)));

  // LDC instrumentation: combinación única de "TAG Nuevo" + "SEÑAL SALIDA"
  if (has("tag nuevo") && has("senal salida")) return "instrumentation_ldc";

  const hasTag = has("tag", "codigo", "cod");
  if (!hasTag) return "unknown";

  if (has("kw")) return "power_equipment";

  if (has("tipo") && (has("rtu destino", "rtu") || has("servicio"))) {
    return "instrument_index";
  }

  if (has("p&id", "pid", "plano")) return "equipment_list";

  if (headerIdx.size > 2) return "instrument_index";

  return "unknown";
}
```

- [ ] **Step 4: Agregar `parseLdcInstrumentRow`**

Insertar la función nueva después de `parseEquipmentListRow` (antes de `// ── Función principal`):

```typescript
function parseLdcInstrumentRow(
  row: unknown[],
  idx: Map<string, number>
): ParsedEquipmentRow | null {
  const tag = pick(row, idx, [...INSTRUMENTATION_LDC_MAP.tag])?.toUpperCase();
  if (!tag || tag.length < 2) return null;

  const ubicacion = pick(row, idx, [...INSTRUMENTATION_LDC_MAP.ubicacion])?.toUpperCase() ?? "";
  const isFuturo  = ubicacion === "FUTURO";

  const meta: Record<string, unknown> = {};
  if (ubicacion) meta.en_planos = ubicacion;
  if (isFuturo)  meta.is_futuro = true;

  const cm = pick(row, idx, [...INSTRUMENTATION_LDC_MAP.cable_meters]);
  const ps = pick(row, idx, [...INSTRUMENTATION_LDC_MAP.power_supply]);
  const it = pick(row, idx, [...INSTRUMENTATION_LDC_MAP.instr_type]);
  const pd = pick(row, idx, [...INSTRUMENTATION_LDC_MAP.pipe_diam]);

  if (cm) meta.cable_meters    = cm;
  if (ps) meta.power_supply    = ps;
  if (it) meta.instrument_type = it;
  if (pd) meta.pipe_diameter   = pd;

  return {
    tag,
    name:          pick(row, idx, [...INSTRUMENTATION_LDC_MAP.name])          ?? tag,
    io_type:       pick(row, idx, [...INSTRUMENTATION_LDC_MAP.io_type]),
    pid_reference: pick(row, idx, [...INSTRUMENTATION_LDC_MAP.pid_reference]),
    status:        isFuturo ? "futuro" : "pendiente",
    metadata:      Object.keys(meta).length > 0 ? meta : undefined,
  };
}
```

- [ ] **Step 5: Agregar `instrumentation_ldc` al loop de parseo en `parseExcelEquipment`**

Dentro de `parseExcelEquipment`, el loop `for (const row of dataRows)` selecciona el parser según `sheetType`. Reemplazar el bloque completo del loop (líneas ~223–240):

```typescript
  for (const row of dataRows) {
    let parsed: ParsedEquipmentRow | null = null;

    if (sheetType === "instrumentation_ldc") {
      parsed = parseLdcInstrumentRow(row as unknown[], headerIdx);
    } else if (sheetType === "instrument_index") {
      parsed = parseInstrumentRow(row as unknown[], headerIdx);
    } else if (sheetType === "power_equipment") {
      parsed = parsePowerRow(row as unknown[], headerIdx);
    } else if (sheetType === "equipment_list") {
      parsed = parseEquipmentListRow(row as unknown[], headerIdx);
    } else {
      parsed = parseInstrumentRow(row as unknown[], headerIdx);
    }

    if (parsed) {
      rows.push(parsed);
    } else {
      skipped++;
    }
  }
```

- [ ] **Step 6: Verificar tipos con TypeScript**

```bash
cd app && npx tsc --noEmit
```

Resultado esperado: sin errores. Si TypeScript se queja de `as const` en `INSTRUMENTATION_LDC_MAP`, reemplazar `[...INSTRUMENTATION_LDC_MAP.tag]` por el array literal directamente.

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/excel-equipment-parser.ts
git commit -m "feat(parser): agregar SheetType instrumentation_ldc para Excel LDC Biogas"
```

---

## Task 3: Actualizar `route.ts` — Usar status dinámico

**Files:**
- Modify: `app/src/app/api/import-equipment-excel/route.ts`

- [ ] **Step 1: Reemplazar el status hardcodeado en el INSERT**

En el archivo `route.ts`, línea 146, cambiar:

```typescript
// Antes
status: "pendiente" as const,

// Después
status: r.status ?? "pendiente",
```

El campo `r.status` es `EquipmentImportStatus | undefined`. Si el parser retorna `"futuro"`, se usa `"futuro"`. Si no viene (otros tipos de hoja), se usa `"pendiente"` por defecto.

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

Resultado esperado: sin errores. Si TypeScript infiere el tipo como `string` (incompatible con el enum de Supabase), agregar cast explícito:

```typescript
status: (r.status ?? "pendiente") as "pendiente" | "futuro",
```

- [ ] **Step 3: Commit**

```bash
git add app/src/app/api/import-equipment-excel/route.ts
git commit -m "feat(api): usar status dinámico del parser al importar equipos"
```

---

## Task 4: Verificación manual con el Excel real

**Prerequisito:** La migración del Task 1 debe estar aplicada en Supabase.

- [ ] **Step 1: Iniciar el servidor de desarrollo**

```bash
cd app && npm run dev
```

Esperar a que aparezca `Ready on http://localhost:3000`.

- [ ] **Step 2: Obtener un token de autenticación**

Iniciar sesión en la app (`http://localhost:3000`) con el usuario admin. En la consola del navegador:

```javascript
const { data } = await window.__supabase.auth.getSession()
console.log(data.session.access_token)
```

Copiar el token.

- [ ] **Step 3: Listar hojas del Excel**

```bash
curl -X POST http://localhost:3000/api/import-equipment-excel \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "file=@\"c:/Users/USUARIO/Documents/BIOTEC JUN 2026/AA24-70(LDC DOCUMENTO DISEÑO INSTRUMENTACIÓN)_MAR_05_2026.xlsx\"" \
  -F "project_id=9023a92f-..." \
  -F "list_sheets=true"
```

Resultado esperado (parcial):
```json
{
  "sheets": ["B.100_200_INSTRU_OLD", "dis_entre_caja", ..., "B.100_200_INSTRU.", ...]
}
```

- [ ] **Step 4: Importar la hoja `B.100_200_INSTRU.`**

```bash
curl -X POST http://localhost:3000/api/import-equipment-excel \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "file=@\"c:/Users/USUARIO/Documents/BIOTEC JUN 2026/AA24-70(LDC DOCUMENTO DISEÑO INSTRUMENTACIÓN)_MAR_05_2026.xlsx\"" \
  -F "project_id=9023a92f-..." \
  -F "sheet_name=B.100_200_INSTRU."
```

Resultado esperado:
```json
{
  "created": 220,
  "updated": 0,
  "skipped": 4,
  "sheetType": "instrumentation_ldc",
  "sheetName": "B.100_200_INSTRU.",
  "totalRows": 224
}
```

- [ ] **Step 5: Verificar equipos FUTURO en Supabase**

En Supabase SQL Editor:
```sql
SELECT tag, name, status, metadata->>'is_futuro' as es_futuro, metadata->>'en_planos' as en_planos
FROM equipment
WHERE project_id = '9023a92f-...'
  AND status = 'futuro'
ORDER BY tag;
```

Resultado esperado: `FIT-105`, `FIT-203`, `VE-103`, `VL-103` y similares marcados como `FUTURO` en el Excel.

- [ ] **Step 6: Verificar metadata de un equipo normal**

```sql
SELECT tag, name, status, io_type, pid_reference, metadata
FROM equipment
WHERE project_id = '9023a92f-...'
  AND tag = 'FIT-101';
```

Resultado esperado:
```json
{
  "tag": "FIT-101",
  "name": "TRANSMISOR DE FLUJO DE CRUDO EXISTENTE A SPLITING BOX #1",
  "status": "pendiente",
  "io_type": "HART",
  "pid_reference": "FIT-ECE-101",
  "metadata": {
    "en_planos": "SI",
    "cable_meters": "66",
    "power_supply": "24VDC",
    "instrument_type": "Ultrasónico",
    "pipe_diameter": "355",
    "unclassified": true,
    "from_excel": true,
    "sheet_name": "B.100_200_INSTRU.",
    "sheet_type": "instrumentation_ldc"
  }
}
```

- [ ] **Step 7: Commit final**

```bash
git add -A
git commit -m "chore: verificación manual completada — importación LDC instrumentation_ldc OK"
```

---

## Checklist de self-review

- [x] **Cobertura del spec:** Migración ✓, nuevo SheetType ✓, mapa de columnas ✓, detección automática ✓, parseLdcInstrumentRow ✓, status dinámico en route ✓, lógica FUTURO/CONFIRMAR/SI/NO ✓, metadata técnica ✓
- [x] **Sin placeholders:** Todos los pasos tienen código completo
- [x] **Consistencia de tipos:** `EquipmentImportStatus` definido en Task 2 Step 1, usado en Task 2 Step 4 y Task 3 Step 1
- [x] **CAJA JB excluido:** Confirmado fuera de alcance, no aparece en ningún paso
- [x] **Rangos MIN/MAX/UNIDAD excluidos:** Fuera de alcance por sub-headers, no aparece en ningún paso
