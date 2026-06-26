"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Printer, PenLine,
  History, Camera, Loader2, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/utils";
import { useInspectionDetail, useEquipmentInspections } from "@/hooks/useInspectionReview";
import {
  extractSnapshotSections, snapshotMeta, collectFailures,
  isFailValue, isPassValue, isSignatureField, formatFieldValue,
} from "@/lib/inspection/review";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  .review-print-root, .review-print-root * { visibility: visible; }
  .review-print-root { position: absolute; top: 0; left: 0; width: 100%; }
  .review-no-print { display: none !important; }
  @page { size: A4; margin: 12mm; }
}`;

interface Props {
  equipmentId: string;
  testId: string;
  returnTo?: string;
}

export function ReviewInspection({ equipmentId, testId, returnTo }: Props) {
  const router = useRouter();
  const { data: detail, isLoading, isError } = useInspectionDetail(testId);
  const { data: history = [] } = useEquipmentInspections(equipmentId);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const sections = useMemo(
    () => (detail ? extractSnapshotSections(detail.test) : []),
    [detail],
  );
  const failures = useMemo(
    () => collectFailures(sections, detail?.test.data ?? {}),
    [sections, detail],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Cargando inspección…
      </div>
    );
  }
  if (isError || !detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <p>No se pudo cargar la inspección.</p>
        <button onClick={() => router.push(returnTo ?? "/")} className="text-blue-400 text-sm">← Volver</button>
      </div>
    );
  }

  const { test, inspectorName, inspectorEmail, evidences, punches } = detail;
  const meta = snapshotMeta(test);
  const data = test.data ?? {};
  const approved = test.result_summary === "cumple" || (test.result_summary !== "no_cumple" && failures.length === 0);
  const data_ = data as Record<string, unknown>;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="min-h-screen bg-slate-950 text-slate-200">
        {/* Top bar — no imprime */}
        <header className="review-no-print sticky top-0 z-10 bg-slate-900 border-b border-slate-800 h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => router.push(returnTo ?? `/projects`)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-sm font-semibold text-slate-200">Revisión de inspección</span>

          <div className="ml-auto flex items-center gap-2">
            {/* Selector de revisiones (Task 4) */}
            {history.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <History size={13} className="text-slate-500" />
                <select
                  value={testId}
                  onChange={(e) => router.push(`/equipment/${equipmentId}/review/${e.target.value}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {history.map((h) => (
                    <option key={h.id} value={h.id}>
                      Rev {h.revision ?? "?"} · {h.result_summary === "no_cumple" ? "No cumple" : "Cumple"} · {h.executed_at ? fmtDate(h.executed_at) : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Printer size={13} /> Exportar / Imprimir
            </button>
          </div>
        </header>

        {/* Contenido imprimible */}
        <div className="review-print-root max-w-3xl mx-auto px-4 md:px-6 py-6">
          {/* Encabezado */}
          <div className="mb-5">
            <p className="font-mono text-xs text-blue-400 font-bold">{test.code ?? "—"}</p>
            <h1 className="text-xl font-bold text-white mt-0.5">
              {(test.equipment_snapshot?.tag ?? "") + (test.equipment_snapshot?.name ? ` — ${test.equipment_snapshot?.name}` : "")}
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {meta.templateName && <span>Plantilla: {meta.templateName}</span>}
              {typeof test.revision === "number" && <span>· Revisión {test.revision}</span>}
              <span>· {inspectorName ?? inspectorEmail ?? "Inspector N/D"}</span>
              {test.executed_at && <span>· {fmtDate(test.executed_at)}</span>}
            </p>
          </div>

          {/* Banner resultado */}
          <div className={cn(
            "rounded-xl p-4 mb-6 flex items-center gap-3",
            approved ? "bg-green-900/30 border border-green-800" : "bg-red-900/30 border border-red-800",
          )}>
            {approved
              ? <CheckCircle size={22} className="text-green-400 flex-shrink-0" />
              : <XCircle size={22} className="text-red-400 flex-shrink-0" />}
            <div>
              <p className={cn("font-bold", approved ? "text-green-300" : "text-red-300")}>
                {approved ? "INSPECCIÓN CUMPLE" : "INSPECCIÓN NO CUMPLE"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {failures.length} {failures.length === 1 ? "ítem en falla" : "ítems en falla"} · {evidences.length} fotos · {punches.length} punch
              </p>
            </div>
          </div>

          {/* Fallas */}
          {failures.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Fallas detectadas</p>
              <div className="space-y-2">
                {failures.map((f) => (
                  <div key={f.fieldKey} className="bg-red-950/20 border border-red-900/40 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-300 font-medium">{f.fieldLabel} = {f.value}</p>
                      <p className="text-[10px] text-slate-500">{f.sectionName}</p>
                      {f.observation && <p className="text-xs text-slate-400 mt-1 italic">&quot;{f.observation}&quot;</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Secciones (solo lectura, desde snapshot) */}
          <div className="space-y-4">
            {sections.map((section) => {
              const fields = section.fields ?? [];
              if (fields.length === 0) return null;
              return (
                <div key={section.code} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <p className="text-sm font-semibold text-slate-200 mb-3">{section.name}</p>
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {fields.map((field) => {
                      const raw = data_[field.key];
                      const fail = isFailValue(raw);
                      const pass = isPassValue(raw);
                      const signed = isSignatureField(field.type) && !!raw;
                      return (
                        <div key={field.key} className="flex justify-between gap-3 border-b border-slate-800/60 pb-1.5">
                          <dt className="text-[11px] text-slate-500 flex-shrink-0">{field.label}</dt>
                          <dd className={cn(
                            "text-[11px] font-medium text-right",
                            fail ? "text-red-400" : pass ? "text-green-400" : "text-slate-300",
                          )}>
                            {isSignatureField(field.type)
                              ? (signed ? <span className="inline-flex items-center gap-1 text-green-400"><PenLine size={11} /> Firmada</span> : "—")
                              : formatFieldValue(raw, field.validations?.unit)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })}
          </div>

          {/* Fotografías */}
          <div className="mt-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera size={13} /> Fotografías ({evidences.length})
            </p>
            {evidences.length === 0 ? (
              <p className="text-xs text-slate-600 italic">Sin evidencias fotográficas.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {evidences.map((ev) => ev.storage_url && (
                  <button
                    key={ev.id}
                    onClick={() => setLightbox(ev.storage_url ?? null)}
                    className="block aspect-square rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.storage_url} alt="evidencia" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Punch generados */}
          {punches.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Punch generados ({punches.length})
              </p>
              <div className="space-y-1.5">
                {punches.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-200 flex-1">{p.title}</span>
                    <span className="text-[10px] text-slate-500">{p.priority}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Firmas */}
          <div className="mt-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={13} /> Firmas
            </p>
            <div className="flex flex-wrap gap-3">
              {sections.flatMap((s) => s.fields).filter((f) => isSignatureField(f.type)).map((f) => {
                const signed = !!data_[f.key];
                return (
                  <div key={f.key} className={cn(
                    "rounded-lg border px-3 py-2 text-xs flex items-center gap-2",
                    signed ? "bg-slate-800 border-green-700 text-green-300" : "bg-slate-900 border-slate-700 text-slate-600",
                  )}>
                    <PenLine size={13} /> {f.label}: {signed ? "Firmada" : "Sin firmar"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="review-no-print fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="evidencia ampliada" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}
