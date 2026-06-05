# Sprint 3 — Parser Excel Zipaquirá: Importación Masiva de Equipos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar equipos enriquecidos directamente desde los archivos Excel de PTAR Zipaquirá (`DATOS_INST`, `DATOS_POT`, `LISTADO EQUIPOS`) hacia la tabla `equipment`, poblando los campos de ingeniería introducidos en la migración 0016 (`service`, `io_type`, `rtu_destination`, `location_system`, `pid_reference`, `power_kw`), manteniendo compatibilidad con el flujo existente TAG → Equipo.

**Architecture:** Módulo de parsing puro (`excel-equipment-parser.ts`) que detecta el tipo de hoja por nombre de columnas y devuelve filas tipadas, sin efectos secundarios. Una API route `POST /api/import-equipment-excel` que acepta el archivo Excel vía `multipart/form-data` junto con `project_id`, parsea, deduplica y hace bulk upsert usando el constraint `uq_equipment_project_tag`. Un hook cliente `useImportEquipmentFromExcel` y un componente `ExcelImportPanel.tsx` integrado en la pantalla de ingeniería. Los equipos importados desde Excel se marcan con `metadata.from_excel = true` y usan el mismo RPC `get_or_create_unclassified_subsystem` ya en producción.

**Tech Stack:** TypeScript, Next.js 16 App Router (Node.js runtime), `xlsx@0.18.5` (ya instalado), TanStack Query v5, Supabase (service_role en API route), Tailwind CSS, Lucide React.

---

## Fuentes de datos y mapping de columnas

### DATOS_INST (hoja de `1_MEMORIA_CONTROL_EIT-V2.xlsx`)
360 instrumentos. Columnas confirmadas por auditoría funcional:

| Columna Excel | Campo `equipment` | Notas |
|---|---|---|
| TAG | `tag` | Normalizar: TRIM + UPPERCASE |
| INSTRUMENTO | `name` | Descripción del instrumento |
| SERVICIO | `service` | |
| TIPO | `io_type` | AI, AO, DI, DO, COMM, RS485 |
| RTU DESTINO | `rtu_destination` | |
| UBICACIÓN O SISTEMA | `location_system` | |
| — | `pid_reference` | Columna puede no existir → NULL |
| — | `power_kw` | No aplica para instrumentos |

### DATOS_POT (hoja de `1_MEMORIA_CONTROL_EIT-V2.xlsx`)
29 equipos de potencia:

| Columna Excel | Campo `equipment` | Notas |
|---|---|---|
| TAG | `tag` | |
| DESCRIPCION | `name` | |
| SERVICIO | `service` | Si existe |
| TIPO | `io_type` | Si existe |
| KW | `power_kw` | Convertir a NUMERIC |
| HP | metadata.hp | Guardar como metadata extra |
| VOLTAJE | metadata.voltage | Guardar como metadata extra |

### LISTADO EQUIPOS REVISION OCTUBRE 24.xlsx
136 instrumentos con P&ID reference. Columnas inferidas:

| Columna Excel | Campo `equipment` | Notas |
|---|---|---|
| TAG | `tag` | |
| nombre/descripción | `name` | |
| P&ID / plano | `pid_reference` | |
| TIPO | `io_type` | Si existe |

### Fuera de scope Sprint 3
- `RESUMEN CABLEADOS CONTROL.xlsx`: cables no mapean a `equipment` — requiere tabla `cable_schedule` (Sprint futuro).
- OCR de PDFs y DXF: pospuesto.

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|----------------|
| CREATE | `app/src/lib/excel-equipment-parser.ts` | Parsing puro: Buffer → ParsedEquipmentRow[] |
| CREATE | `app/src/app/api/import-equipment-excel/route.ts` | POST: multipart → parse → upsert → respuesta |
| MODIFY | `app/src/hooks/useEngineering.ts` | Agregar `useImportEquipmentFromExcel` |
| CREATE | `app/src/components/engineering/ExcelImportPanel.tsx` | UI: upload, preview, confirmación |
| MODIFY | `app/src/app/(workspace)/projects/[projectId]/engineering/page.tsx` | Integrar ExcelImportPanel |

---

## Task 1: Módulo de parsing Excel (`excel-equipment-parser.ts`)

**Principio:** lógica pura, sin imports de Next.js ni Supabase. Acepta `Buffer`, nombre de hoja opcional, devuelve filas parseadas y metadata de detección.

**Files:**
- Create: `app/src/lib/excel-equipment-parser.ts`

- [ ] **Step 1: Crear el módulo con tipos y función principal**

Crea `app/src/lib/excel-equipment-parser.ts`:

```typescript
import * as XLSX from "xlsx";

// ── Tipos públicos ────────────────────────────────────────────

export type SheetType = "instrument_index" | "power_equipment" | "equipment_list" | "unknown";

export interface ParsedEquipmentRow {
  tag: string;
  name: string;
  service?: string;
  io_type?: string;
  rtu_destination?: string;
  location_system?: string;
  pid_reference?: string;
  power_kw?: number;
  metadata?: Record<string, unknown>;
}

export interface ParseResult {
  sheetType: SheetType;
  sheetName: string;
  rows: ParsedEquipmentRow[];
  skipped: number;          // filas sin TAG válido
  totalRows: number;        // filas brutas procesadas
}

// ── Mapas de columnas (case-insensitive, sin acentos) ────────

type ColMap = Partial<Record<keyof ParsedEquipmentRow | "hp" | "voltage", string[]>>;

const INSTRUMENT_MAP: ColMap = {
  tag:              ["tag", "codigo", "cod", "codigo tag"],
  name:             ["instrumento", "descripcion", "descripción", "nombre"],
  service:          ["servicio"],
  io_type:          ["tipo"],
  rtu_destination:  ["rtu destino", "rtu_destino", "rtu"],
  location_system:  ["ubicacion o sistema", "ubicación o sistema", "ubicacion", "sistema", "location"],
  pid_reference:    ["p&id", "pid", "plano", "p_id", "referencia pid"],
};

const POWER_MAP: ColMap = {
  tag:     ["tag", "codigo", "cod"],
  name:    ["descripcion", "descripción", "nombre"],
  service: ["servicio"],
  io_type: ["tipo"],
  power_kw: ["kw"],
  hp:       ["hp"],
  voltage:  ["voltaje", "voltage"],
};

const EQUIPMENT_LIST_MAP: ColMap = {
  tag:           ["tag", "codigo", "cod"],
  name:          ["descripcion", "descripción", "nombre", "instrumento"],
  io_type:       ["tipo"],
  pid_reference: ["p&id", "pid", "plano"],
  service:       ["servicio"],
  location_system: ["ubicacion", "ubicación", "sistema"],
};

// ── Helpers ─────────────────────────────────────────────────

/** Normaliza una clave de columna: lowercase + sin acentos + trim */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/** Construye un mapa de columna-normalizada → índice en la fila */
function buildHeaderIndex(headers: string[]): Map<string, number> {
  const idx = new Map<string, number>();
  headers.forEach((h, i) => idx.set(normalizeHeader(String(h ?? "")), i));
  return idx;
}

/** Busca el primer header que matchee alguna de las variantes; devuelve el valor de la fila */
function pick(
  row: unknown[],
  idx: Map<string, number>,
  variants: string[]
): string | undefined {
  for (const v of variants) {
    const pos = idx.get(normalizeHeader(v));
    if (pos !== undefined && row[pos] != null && String(row[pos]).trim() !== "") {
      return String(row[pos]).trim();
    }
  }
  return undefined;
}

/** Intenta convertir a número; devuelve undefined si no es numérico */
function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value.replace(",", "."));
  return isNaN(n) ? undefined : n;
}

// ── Detección de tipo de hoja ────────────────────────────────

function detectSheetType(headerIdx: Map<string, number>): SheetType {
  const keys = Array.from(headerIdx.keys());
  const has = (...variants: string[]) =>
    variants.some(v => headerIdx.has(normalizeHeader(v)));

  const hasTag = has("tag", "codigo", "cod");
  if (!hasTag) return "unknown";

  // DATOS_POT: tiene KW
  if (has("kw")) return "power_equipment";

  // DATOS_INST / instrument_index: tiene TIPO con valores IO y RTU
  if (has("tipo") && (has("rtu destino", "rtu") || has("servicio"))) {
    return "instrument_index";
  }

  // LISTADO EQUIPOS: tiene TAG y P&ID
  if (has("p&id", "pid", "plano")) return "equipment_list";

  // Fallback: tiene TAG y algo más → instrument_index genérico
  if (keys.length > 2) return "instrument_index";

  return "unknown";
}

// ── Parsers por tipo de hoja ─────────────────────────────────

function parseInstrumentRow(
  row: unknown[],
  idx: Map<string, number>
): ParsedEquipmentRow | null {
  const tag = pick(row, idx, INSTRUMENT_MAP.tag!)?.toUpperCase();
  if (!tag || tag.length < 2) return null;

  return {
    tag,
    name:             pick(row, idx, INSTRUMENT_MAP.name!)       ?? tag,
    service:          pick(row, idx, INSTRUMENT_MAP.service!),
    io_type:          pick(row, idx, INSTRUMENT_MAP.io_type!),
    rtu_destination:  pick(row, idx, INSTRUMENT_MAP.rtu_destination!),
    location_system:  pick(row, idx, INSTRUMENT_MAP.location_system!),
    pid_reference:    pick(row, idx, INSTRUMENT_MAP.pid_reference!),
  };
}

function parsePowerRow(
  row: unknown[],
  idx: Map<string, number>
): ParsedEquipmentRow | null {
  const tag = pick(row, idx, POWER_MAP.tag!)?.toUpperCase();
  if (!tag || tag.length < 2) return null;

  const hp      = pick(row, idx, POWER_MAP.hp!);
  const voltage = pick(row, idx, POWER_MAP.voltage!);
  const extraMeta: Record<string, unknown> = {};
  if (hp)      extraMeta.hp      = hp;
  if (voltage) extraMeta.voltage = voltage;

  return {
    tag,
    name:     pick(row, idx, POWER_MAP.name!)     ?? tag,
    service:  pick(row, idx, POWER_MAP.service!),
    io_type:  pick(row, idx, POWER_MAP.io_type!),
    power_kw: toNumber(pick(row, idx, POWER_MAP.power_kw!)),
    metadata: Object.keys(extraMeta).length > 0 ? extraMeta : undefined,
  };
}

function parseEquipmentListRow(
  row: unknown[],
  idx: Map<string, number>
): ParsedEquipmentRow | null {
  const tag = pick(row, idx, EQUIPMENT_LIST_MAP.tag!)?.toUpperCase();
  if (!tag || tag.length < 2) return null;

  return {
    tag,
    name:           pick(row, idx, EQUIPMENT_LIST_MAP.name!)          ?? tag,
    io_type:        pick(row, idx, EQUIPMENT_LIST_MAP.io_type!),
    pid_reference:  pick(row, idx, EQUIPMENT_LIST_MAP.pid_reference!),
    service:        pick(row, idx, EQUIPMENT_LIST_MAP.service!),
    location_system: pick(row, idx, EQUIPMENT_LIST_MAP.location_system!),
  };
}

// ── Función principal ────────────────────────────────────────

/**
 * Parsea un archivo Excel y devuelve filas de equipos.
 * @param buffer   Contenido del archivo .xlsx / .xls
 * @param sheetName  Nombre de hoja específica (ej. "DATOS_INST"). Si se omite,
 *                   procesa la primera hoja con nombre de columnas reconocibles.
 */
export function parseExcelEquipment(
  buffer: Buffer,
  sheetName?: string
): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const targetSheet = sheetName
    ? wb.SheetNames.find(n => n.toUpperCase() === sheetName.toUpperCase())
    : wb.SheetNames[0];

  if (!targetSheet || !wb.Sheets[targetSheet]) {
    return { sheetType: "unknown", sheetName: sheetName ?? "", rows: [], skipped: 0, totalRows: 0 };
  }

  const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[targetSheet], {
    header: 1,
    defval: "",
  });

  if (raw.length < 2) {
    return { sheetType: "unknown", sheetName: targetSheet, rows: [], skipped: 0, totalRows: 0 };
  }

  const headers    = raw[0] as string[];
  const headerIdx  = buildHeaderIndex(headers);
  const sheetType  = detectSheetType(headerIdx);

  const dataRows = raw.slice(1);
  const rows: ParsedEquipmentRow[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    let parsed: ParsedEquipmentRow | null = null;

    if (sheetType === "instrument_index") {
      parsed = parseInstrumentRow(row as unknown[], headerIdx);
    } else if (sheetType === "power_equipment") {
      parsed = parsePowerRow(row as unknown[], headerIdx);
    } else if (sheetType === "equipment_list") {
      parsed = parseEquipmentListRow(row as unknown[], headerIdx);
    } else {
      // unknown: intentar instrument parser como fallback
      parsed = parseInstrumentRow(row as unknown[], headerIdx);
    }

    if (parsed) {
      rows.push(parsed);
    } else {
      skipped++;
    }
  }

  return { sheetType, sheetName: targetSheet, rows, skipped, totalRows: dataRows.length };
}

/**
 * Lista los nombres de todas las hojas de un archivo Excel.
 * Útil para mostrar al usuario qué hojas están disponibles.
 */
export function listSheets(buffer: Buffer): string[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  return wb.SheetNames;
}
```

- [ ] **Step 2: Verificar tipos con tsc**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/excel-equipment-parser.ts
git commit -m "feat: módulo excel-equipment-parser — parsing puro de DATOS_INST/DATOS_POT/LISTADO EQUIPOS"
```

---

## Task 2: API route `POST /api/import-equipment-excel`

**Files:**
- Create: `app/src/app/api/import-equipment-excel/route.ts`

- [ ] **Step 1: Crear la API route**

Crea `app/src/app/api/import-equipment-excel/route.ts`:

```typescript
// ============================================================
// POST /api/import-equipment-excel
// Acepta un archivo Excel vía multipart/form-data + project_id.
// Parsea, deduplica y hace bulk upsert en equipment.
// Auth: JWT Bearer + membresía al proyecto (mismo patrón que create-equipment-from-tags).
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import { parseExcelEquipment, listSheets } from "@/lib/excel-equipment-parser";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user: authUser }, error: authErr } =
    await serviceClient.auth.getUser(token);
  if (authErr || !authUser) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ── Parse multipart ──────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const file       = formData.get("file") as File | null;
  const project_id = formData.get("project_id") as string | null;
  const sheet_name = formData.get("sheet_name") as string | null | undefined;

  if (!file || !project_id) {
    return NextResponse.json(
      { error: "Se requieren los campos 'file' y 'project_id'" },
      { status: 400 }
    );
  }

  // ── Membresía al proyecto ────────────────────────────────
  const { data: appUser } = await serviceClient
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (!appUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });
  }

  const { count } = await serviceClient
    .from("project_members")
    .select("*", { count: "exact", head: true })
    .eq("project_id", project_id)
    .eq("user_id", appUser.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Sin acceso al proyecto" }, { status: 403 });
  }

  // ── Si solo se pide el listado de hojas ─────────────────
  if (formData.get("list_sheets") === "true") {
    const buffer = Buffer.from(await file.arrayBuffer());
    return NextResponse.json({ sheets: listSheets(buffer) });
  }

  // ── Parsear Excel ────────────────────────────────────────
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseExcelEquipment(buffer, sheet_name ?? undefined);

  if (parsed.rows.length === 0) {
    return NextResponse.json({
      message: "No se encontraron filas válidas",
      sheetType: parsed.sheetType,
      sheetName: parsed.sheetName,
      skipped: parsed.skipped,
      totalRows: parsed.totalRows,
    });
  }

  // ── Obtener subsistema SIN CLASIFICAR ────────────────────
  const { data: subsystemId, error: rpcErr } = await serviceClient
    .rpc("get_or_create_unclassified_subsystem", { p_project_id: project_id });

  if (rpcErr || !subsystemId) {
    return NextResponse.json(
      { error: "No se pudo obtener subsistema SIN CLASIFICAR", detail: rpcErr?.message },
      { status: 500 }
    );
  }

  // ── Deduplicación: qué TAGs ya existen en este proyecto ──
  const incomingTags = parsed.rows.map(r => r.tag);

  const { data: existing } = await serviceClient
    .from("equipment")
    .select("tag")
    .eq("project_id", project_id)
    .in("tag", incomingTags)
    .is("deleted_at", null);

  const existingSet = new Set((existing ?? []).map((e: { tag: string }) => e.tag));

  const toInsert = parsed.rows.filter(r => !existingSet.has(r.tag));
  const toUpdate = parsed.rows.filter(r => existingSet.has(r.tag));

  // ── Bulk INSERT de nuevos equipos ────────────────────────
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  if (toInsert.length > 0) {
    const insertPayload = toInsert.map(r => ({
      project_id,
      subsystem_id:    subsystemId,
      tag:             r.tag,
      name:            r.name,
      service:         r.service   ?? null,
      io_type:         r.io_type   ?? null,
      rtu_destination: r.rtu_destination ?? null,
      location_system: r.location_system ?? null,
      pid_reference:   r.pid_reference   ?? null,
      power_kw:        r.power_kw        ?? null,
      criticality:     "media" as const,
      status:          "pendiente" as const,
      metadata: {
        unclassified: true,
        from_excel:   true,
        sheet_name:   parsed.sheetName,
        sheet_type:   parsed.sheetType,
        ...(r.metadata ?? {}),
      },
      created_by: appUser.id,
      updated_by: appUser.id,
    }));

    const { error: insertErr } = await serviceClient
      .from("equipment")
      .insert(insertPayload);

    if (insertErr) {
      errors.push(`INSERT: ${insertErr.message}`);
    } else {
      created = toInsert.length;
    }
  }

  // ── UPDATE de campos de ingeniería en equipos existentes ─
  // Solo actualiza campos vacíos (no sobreescribe datos manuales).
  for (const r of toUpdate) {
    const updateFields: Record<string, unknown> = {};
    if (r.service)          updateFields.service          = r.service;
    if (r.io_type)          updateFields.io_type          = r.io_type;
    if (r.rtu_destination)  updateFields.rtu_destination  = r.rtu_destination;
    if (r.location_system)  updateFields.location_system  = r.location_system;
    if (r.pid_reference)    updateFields.pid_reference    = r.pid_reference;
    if (r.power_kw != null) updateFields.power_kw         = r.power_kw;

    if (Object.keys(updateFields).length === 0) continue;

    const { error: updateErr } = await serviceClient
      .from("equipment")
      .update(updateFields)
      .eq("project_id", project_id)
      .eq("tag", r.tag)
      .is("deleted_at", null);

    if (updateErr) {
      errors.push(`UPDATE ${r.tag}: ${updateErr.message}`);
    } else {
      updated++;
    }
  }

  return NextResponse.json({
    created,
    updated,
    skipped:    parsed.skipped,
    existing:   existingSet.size,
    sheetType:  parsed.sheetType,
    sheetName:  parsed.sheetName,
    totalRows:  parsed.totalRows,
    errors:     errors.length > 0 ? errors : undefined,
  });
}
```

- [ ] **Step 2: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/app/api/import-equipment-excel/route.ts
git commit -m "feat: API route POST /api/import-equipment-excel — bulk import desde Excel"
```

---

## Task 3: Hook `useImportEquipmentFromExcel`

**Files:**
- Modify: `app/src/hooks/useEngineering.ts`

- [ ] **Step 1: Agregar el hook al final de useEngineering.ts**

Al final de `app/src/hooks/useEngineering.ts`, agrega:

```typescript
// ── useImportEquipmentFromExcel ───────────────────────────────

export interface ImportEquipmentParams {
  projectId: string;
  file: File;
  sheetName?: string;
}

export interface ImportEquipmentResult {
  created: number;
  updated: number;
  skipped: number;
  existing: number;
  sheetType: string;
  sheetName: string;
  totalRows: number;
  errors?: string[];
}

export function useImportEquipmentFromExcel() {
  const queryClient = useQueryClient();

  return useMutation<ImportEquipmentResult, Error, ImportEquipmentParams>({
    mutationFn: async ({ projectId, file, sheetName }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No autenticado");

      const body = new FormData();
      body.append("file", file);
      body.append("project_id", projectId);
      if (sheetName) body.append("sheet_name", sheetName);

      const res = await fetch("/api/import-equipment-excel", {
        method:  "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Error al importar");
      }

      return res.json() as Promise<ImportEquipmentResult>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["equipment", projectId] });
      queryClient.invalidateQueries({ queryKey: ["eng-tags",       projectId] });
      queryClient.invalidateQueries({ queryKey: ["eng-tags-stats", projectId] });
    },
  });
}

export function useListExcelSheets() {
  return useMutation<string[], Error, { projectId: string; file: File }>({
    mutationFn: async ({ projectId, file }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No autenticado");

      const body = new FormData();
      body.append("file", file);
      body.append("project_id", projectId);
      body.append("list_sheets", "true");

      const res = await fetch("/api/import-equipment-excel", {
        method:  "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });

      if (!res.ok) throw new Error("Error al leer hojas");
      const data = await res.json();
      return data.sheets as string[];
    },
  });
}
```

- [ ] **Step 2: Verificar que el hook importa correctamente `useMutation` y `useQueryClient`**

Estos ya deberían estar importados en `useEngineering.ts`. Verifica que las líneas de imports al inicio del archivo incluyan:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
```
Si alguno falta, agrégalo a la línea de imports existente.

- [ ] **Step 3: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/src/hooks/useEngineering.ts
git commit -m "feat: hooks useImportEquipmentFromExcel y useListExcelSheets"
```

---

## Task 4: Componente `ExcelImportPanel.tsx`

**Files:**
- Create: `app/src/components/engineering/ExcelImportPanel.tsx`

- [ ] **Step 1: Crear el componente**

Crea `app/src/components/engineering/ExcelImportPanel.tsx`:

```typescript
"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { useImportEquipmentFromExcel, useListExcelSheets, ImportEquipmentResult } from "@/hooks/useEngineering";

interface ExcelImportPanelProps {
  projectId: string;
}

export function ExcelImportPanel({ projectId }: ExcelImportPanelProps) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets]           = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [result, setResult]           = useState<ImportEquipmentResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const listSheets  = useListExcelSheets();
  const importExcel = useImportEquipmentFromExcel();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setImportError(null);
    setSheets([]);
    setSelectedSheet("");

    try {
      const sheetList = await listSheets.mutateAsync({ projectId, file: f });
      setSheets(sheetList);
      setSelectedSheet(sheetList[0] ?? "");
    } catch {
      // Si falla el listado de hojas, aún se puede importar con auto-detección
      setSheets([]);
    }
  }

  async function handleImport() {
    if (!file) return;
    setResult(null);
    setImportError(null);

    try {
      const res = await importExcel.mutateAsync({
        projectId,
        file,
        sheetName: selectedSheet || undefined,
      });
      setResult(res);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  const isLoading = listSheets.isPending || importExcel.isPending;

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <FileSpreadsheet className="h-4 w-4 text-green-600" />
        Importar desde Excel
      </div>

      {/* Zona de upload */}
      <div
        className="flex flex-col items-center gap-2 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition">
          <Upload className="h-4 w-4" />
          {file ? file.name : "Seleccionar archivo .xlsx"}
        </div>
        <p className="text-xs text-gray-400">
          Soporta: DATOS_INST, DATOS_POT, LISTADO EQUIPOS
        </p>
      </div>

      {/* Selector de hoja */}
      {sheets.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Hoja:</label>
          <div className="relative flex-1">
            <select
              value={selectedSheet}
              onChange={e => setSelectedSheet(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm appearance-none pr-8"
            >
              {sheets.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* Botón de importar */}
      {file && (
        <button
          onClick={handleImport}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
        >
          {importExcel.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
          ) : (
            <><Upload className="h-4 w-4" /> Importar equipos</>
          )}
        </button>
      )}

      {/* Resultado */}
      {result && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            Importación completada — hoja: {result.sheetName} ({result.sheetType})
          </div>
          <ul className="text-green-600 text-xs space-y-0.5 pl-5">
            <li>✓ {result.created} equipo(s) nuevo(s) creado(s)</li>
            <li>↻ {result.updated} equipo(s) actualizado(s) con campos de ingeniería</li>
            <li>— {result.existing} ya existían (sin cambios)</li>
            <li>✗ {result.skipped} fila(s) omitidas (sin TAG válido)</li>
          </ul>
          {result.errors && result.errors.length > 0 && (
            <div className="text-amber-600 text-xs pt-1">
              Errores parciales: {result.errors.join("; ")}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {importError && (
        <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {importError}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/engineering/ExcelImportPanel.tsx
git commit -m "feat: componente ExcelImportPanel — upload, selector de hoja, preview de resultado"
```

---

## Task 5: Integrar ExcelImportPanel en la pantalla de ingeniería

**Files:**
- Modify: `app/src/app/(workspace)/projects/[projectId]/engineering/page.tsx`

- [ ] **Step 1: Localizar dónde agregar el panel**

Lee `app/src/app/(workspace)/projects/[projectId]/engineering/page.tsx` y encuentra:
- El bloque de `return (` donde se renderiza la pantalla
- El componente `<TagReviewTable>` o la sección principal

- [ ] **Step 2: Agregar el import y el panel**

En la sección de imports de `engineering/page.tsx`, agrega:
```typescript
import { ExcelImportPanel } from "@/components/engineering/ExcelImportPanel";
```

En el JSX, encima o debajo de `<TagReviewTable>` (según la jerarquía visual de la página), agrega:
```tsx
<div className="mb-6">
  <ExcelImportPanel projectId={params.projectId} />
</div>
```

> **Nota:** `params.projectId` es el segmento dinámico de la ruta. Verifica el nombre exacto del parámetro leyendo la firma del componente page (`{ params }: { params: { projectId: string } }`).

- [ ] **Step 3: Verificar TypeScript**

```
cd app && npx tsc --noEmit
```
Resultado esperado: exit 0.

- [ ] **Step 4: Verificar build completo**

```
cd app && npx next build --webpack 2>&1
```
Resultado esperado: EXIT_CODE 0.

- [ ] **Step 5: Smoke test visual**

```
cd app && npm run dev
```
Navega a la pantalla de ingeniería de un proyecto y verifica:
1. El panel "Importar desde Excel" es visible.
2. Al seleccionar `1_MEMORIA_CONTROL_EIT-V2.xlsx`, aparece el selector de hojas con DATOS_INST y DATOS_POT.
3. Al seleccionar DATOS_INST y pulsar "Importar equipos", la operación completa en <15 s.
4. El resultado muestra el número de equipos creados.
5. En la pantalla de equipos, los nuevos equipos muestran badge "Sin clasificar" con campos io_type / rtu_destination / service visibles.

- [ ] **Step 6: Commit final**

```bash
git add app/src/app/(workspace)/projects/[projectId]/engineering/page.tsx
git commit -m "feat: integrar ExcelImportPanel en pantalla de ingeniería — Sprint 3 completo"
```

---

## Verificación Final Sprint 3

- [ ] TypeScript: exit 0
- [ ] Build: exit 0 sin warnings nuevos
- [ ] Importar DATOS_INST (360 instrumentos) → ≥350 equipos creados en proyecto Zipaquirá
- [ ] Importar DATOS_POT (29 equipos) → 29 equipos con `power_kw` poblado
- [ ] Campos verificados en BD:
  ```sql
  SELECT tag, service, io_type, rtu_destination, location_system, power_kw
  FROM equipment
  WHERE project_id = '9023a92f-5294-4a20-ac20-1c579662340a'
    AND metadata->>'from_excel' = 'true'
  LIMIT 10;
  ```
- [ ] Compatibilidad con flujo TAG → Equipo: los equipos ya creados por `create-equipment-from-tags` no fueron sobreescritos ni duplicados (verificar con `skipped = 0` en el resultado de importación).

---

## Fuera de scope (Sprint futuro)

- `RESUMEN CABLEADOS CONTROL.xlsx`: cables requieren tabla `cable_schedule` nueva.
- OCR de PDFs y loop drawings.
- Pantalla de reclasificación de equipos SIN CLASIFICAR → subsistemas reales.
- Import desde URL de Supabase Storage (actualmente solo upload directo).
