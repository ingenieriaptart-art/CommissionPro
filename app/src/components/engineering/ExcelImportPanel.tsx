"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import {
  useImportEquipmentFromExcel,
  useListExcelSheets,
  type ImportEquipmentResult,
} from "@/hooks/useEngineering";

interface ExcelImportPanelProps {
  projectId: string;
}

export function ExcelImportPanel({ projectId }: ExcelImportPanelProps) {
  const inputRef                          = useRef<HTMLInputElement>(null);
  const [file, setFile]                   = useState<File | null>(null);
  const [sheets, setSheets]               = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [result, setResult]               = useState<ImportEquipmentResult | null>(null);
  const [importError, setImportError]     = useState<string | null>(null);

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

      {importError && (
        <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {importError}
        </div>
      )}
    </div>
  );
}
