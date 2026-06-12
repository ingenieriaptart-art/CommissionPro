import * as XLSX from "xlsx";

// ── Tipos públicos ────────────────────────────────────────────

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

export interface ParseResult {
  sheetType: SheetType;
  sheetName: string;
  rows: ParsedEquipmentRow[];
  skipped: number;
  totalRows: number;
  detectedHeaders: string[];
}

// ── Mapas de columnas (case-insensitive, sin acentos) ────────

type ColMap = Partial<Record<keyof ParsedEquipmentRow | "hp" | "voltage", string[]>>;

const CCM_VARIANTS = ["ccm", "tablero ccm", "panel ccm", "ccm controlador", "ccm alimentador", "tablero", "alimentado por", "alimentado desde", "centro control motores"];

const INSTRUMENT_MAP: ColMap = {
  tag:             ["tag", "codigo", "cod", "codigo tag"],
  name:            ["instrumento", "descripcion", "descripción", "nombre"],
  service:         ["servicio"],
  io_type:         ["tipo"],
  rtu_destination: ["rtu destino", "rtu_destino", "rtu"],
  location_system: ["ubicacion o sistema", "ubicación o sistema", "ubicacion", "sistema", "location"],
  pid_reference:   ["p&id", "pid", "plano", "p_id", "referencia pid"],
  ccm_panel:       CCM_VARIANTS,
};

const POWER_MAP: ColMap = {
  tag:       ["tag", "codigo", "cod"],
  name:      ["descripcion", "descripción", "nombre"],
  service:   ["servicio"],
  io_type:   ["tipo"],
  power_kw:  ["kw"],
  hp:        ["hp"],
  voltage:   ["voltaje", "voltage"],
  ccm_panel: CCM_VARIANTS,
};

const EQUIPMENT_LIST_MAP: ColMap = {
  tag:             ["tag", "codigo", "cod"],
  name:            ["descripcion", "descripción", "nombre", "instrumento"],
  io_type:         ["tipo"],
  pid_reference:   ["p&id", "pid", "plano"],
  service:         ["servicio"],
  location_system: ["ubicacion", "ubicación", "sistema"],
  ccm_panel:       CCM_VARIANTS,
};

const INSTRUMENTATION_LDC_MAP: Record<string, string[]> = {
  tag:          ["tag nuevo", "tag"],
  name:         ["aplicacion / descripcion", "aplicacion/descripcion", "descripcion"],
  io_type:      ["senal salida"],
  pid_reference:["tag anterior"],
  ubicacion:    ["ubicacion en plano"],
  cable_meters: ["ms"],
  power_supply: ["alimentacion"],
  instr_type:   ["tipo de medidor de instrumento"],
  pipe_diam:    ["diametro externo tuberia"],
};

// ── Helpers ─────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function buildHeaderIndex(headers: string[]): Map<string, number> {
  const idx = new Map<string, number>();
  headers.forEach((h, i) => idx.set(normalizeHeader(String(h ?? "")), i));
  return idx;
}

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

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value.replace(",", "."));
  return isNaN(n) ? undefined : n;
}

// ── Detección de tipo de hoja ────────────────────────────────

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

// ── Parsers por tipo de hoja ─────────────────────────────────

function parseInstrumentRow(
  row: unknown[],
  idx: Map<string, number>
): ParsedEquipmentRow | null {
  const tag = pick(row, idx, INSTRUMENT_MAP.tag!)?.toUpperCase();
  if (!tag || tag.length < 2) return null;

  return {
    tag,
    name:            pick(row, idx, INSTRUMENT_MAP.name!)            ?? tag,
    service:         pick(row, idx, INSTRUMENT_MAP.service!),
    io_type:         pick(row, idx, INSTRUMENT_MAP.io_type!),
    rtu_destination: pick(row, idx, INSTRUMENT_MAP.rtu_destination!),
    location_system: pick(row, idx, INSTRUMENT_MAP.location_system!),
    pid_reference:   pick(row, idx, INSTRUMENT_MAP.pid_reference!),
    ccm_panel:       pick(row, idx, INSTRUMENT_MAP.ccm_panel!),
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
    name:      pick(row, idx, POWER_MAP.name!)      ?? tag,
    service:   pick(row, idx, POWER_MAP.service!),
    io_type:   pick(row, idx, POWER_MAP.io_type!),
    power_kw:  toNumber(pick(row, idx, POWER_MAP.power_kw!)),
    ccm_panel: pick(row, idx, POWER_MAP.ccm_panel!),
    metadata:  Object.keys(extraMeta).length > 0 ? extraMeta : undefined,
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
    name:            pick(row, idx, EQUIPMENT_LIST_MAP.name!)            ?? tag,
    io_type:         pick(row, idx, EQUIPMENT_LIST_MAP.io_type!),
    pid_reference:   pick(row, idx, EQUIPMENT_LIST_MAP.pid_reference!),
    service:         pick(row, idx, EQUIPMENT_LIST_MAP.service!),
    location_system: pick(row, idx, EQUIPMENT_LIST_MAP.location_system!),
    ccm_panel:       pick(row, idx, EQUIPMENT_LIST_MAP.ccm_panel!),
  };
}

function parseLdcInstrumentRow(
  row: unknown[],
  idx: Map<string, number>
): ParsedEquipmentRow | null {
  const tag = pick(row, idx, INSTRUMENTATION_LDC_MAP.tag!)?.toUpperCase();
  if (!tag || tag.length < 2) return null;

  const ubicacion = pick(row, idx, INSTRUMENTATION_LDC_MAP.ubicacion!)?.toUpperCase() ?? "";
  const isFuturo  = ubicacion === "FUTURO";

  const meta: Record<string, unknown> = {};
  if (ubicacion) meta.en_planos = ubicacion;
  if (isFuturo)  meta.is_futuro = true;

  const cm = pick(row, idx, INSTRUMENTATION_LDC_MAP.cable_meters!);
  const ps = pick(row, idx, INSTRUMENTATION_LDC_MAP.power_supply!);
  const it = pick(row, idx, INSTRUMENTATION_LDC_MAP.instr_type!);
  const pd = pick(row, idx, INSTRUMENTATION_LDC_MAP.pipe_diam!);

  if (cm) meta.cable_meters    = toNumber(cm) ?? cm;
  if (ps) meta.power_supply    = ps;
  if (it) meta.instrument_type = it;
  if (pd) meta.pipe_diameter   = pd;

  return {
    tag,
    name:          pick(row, idx, INSTRUMENTATION_LDC_MAP.name!)          ?? tag,
    io_type:       pick(row, idx, INSTRUMENTATION_LDC_MAP.io_type!),
    pid_reference: pick(row, idx, INSTRUMENTATION_LDC_MAP.pid_reference!),
    status:        isFuturo ? "futuro" : "pendiente",
    metadata:      Object.keys(meta).length > 0 ? meta : undefined,
  };
}

// ── Función principal ────────────────────────────────────────

export function parseExcelEquipment(
  buffer: Buffer,
  sheetName?: string
): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const targetSheet = sheetName
    ? wb.SheetNames.find(n => n.toUpperCase() === sheetName.toUpperCase())
    : wb.SheetNames[0];

  if (!targetSheet || !wb.Sheets[targetSheet]) {
    return { sheetType: "unknown", sheetName: sheetName ?? "", rows: [], skipped: 0, totalRows: 0, detectedHeaders: [] };
  }

  const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[targetSheet], {
    header: 1,
    defval: "",
  });

  if (raw.length < 2) {
    return { sheetType: "unknown", sheetName: targetSheet, rows: [], skipped: 0, totalRows: 0, detectedHeaders: [] };
  }

  const headers   = raw[0] as string[];
  const headerIdx = buildHeaderIndex(headers);
  const sheetType = detectSheetType(headerIdx);
  const detectedHeaders = headers.map(h => String(h ?? "")).filter(h => h.trim() !== "");

  const dataRows = raw.slice(1);
  const rows: ParsedEquipmentRow[] = [];
  let skipped = 0;

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

  return { sheetType, sheetName: targetSheet, rows, skipped, totalRows: dataRows.length, detectedHeaders };
}

export function listSheets(buffer: Buffer): string[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  return wb.SheetNames;
}
