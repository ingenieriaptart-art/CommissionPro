"use client";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockInspectionTemplate, InspectionState } from "@/types/inspection";

interface InspectionSummaryProps {
  template: MockInspectionTemplate;
  state: InspectionState;
  onClose: () => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  saveError?: string | null;
}

export function InspectionSummary({ template, state, onClose, onSave, isSaving, saveError }: InspectionSummaryProps) {
  const failures: { sectionName: string; fieldLabel: string; observation: string }[] = [];

  for (const section of template.sections) {
    for (const field of section.fields) {
      const v = state.answers[field.key];
      if (v === "FALLA" || v === "NO" || v === "RECHAZADO") {
        const nextField = section.fields[section.fields.indexOf(field) + 1];
        const obs = nextField?.type === "textarea"
          ? (state.answers[nextField.key] as string | undefined) ?? ""
          : "";
        failures.push({ sectionName: section.name, fieldLabel: field.label, observation: obs });
      }
    }
  }

  const isApproved  = failures.length === 0;
  const totalFields = template.sections.flatMap(s => s.fields).length;
  const answered    = Object.keys(state.answers).filter(k => {
    const v = state.answers[k];
    return v !== undefined && v !== null && v !== "";
  }).length;
  const totalEvidences = Object.values(state.evidences).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Result banner */}
      <div className={cn(
        "rounded-xl p-4 mb-6 flex items-center gap-3",
        isApproved
          ? "bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800"
          : "bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800"
      )}>
        {isApproved
          ? <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
          : <XCircle    size={24} className="text-red-400   flex-shrink-0" />
        }
        <div>
          <p className={cn("font-bold", isApproved ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
            {isApproved ? "INSPECCIÓN APROBADA" : "INSPECCIÓN CON OBSERVACIONES"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {answered}/{totalFields} campos respondidos · {totalEvidences} evidencias · {failures.length} fallas
          </p>
        </div>
      </div>

      {/* Failures list */}
      {failures.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Fallos detectados ({failures.length})
          </p>
          <div className="space-y-2">
            {failures.map((f, i) => (
              <div key={i} className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-600 dark:text-red-300 font-medium">{f.fieldLabel}</p>
                    <p className="text-[10px] text-slate-500">{f.sectionName}</p>
                    {f.observation && (
                      <p className="text-xs text-slate-400 mt-1 italic">&quot;{f.observation}&quot;</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section-by-section review */}
      <div className="space-y-4">
        {template.sections.map(section => {
          const sectionAnswers = section.fields
            .filter(f => state.answers[f.key] !== undefined && state.answers[f.key] !== "")
            .map(f => ({ label: f.label, value: String(state.answers[f.key] ?? "") }));
          const sectionEvs = Object.entries(state.evidences)
            .filter(([k]) => k.startsWith(`__section__${section.code}`) || section.fields.some(f => f.key === k))
            .flatMap(([, items]) => items);

          return (
            <div key={section.code} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">{section.name}</p>
              {sectionAnswers.length === 0 ? (
                <p className="text-xs text-slate-600 italic">Sin respuestas</p>
              ) : (
                <dl className="space-y-1">
                  {sectionAnswers.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-[10px] text-slate-500 flex-shrink-0">{label}</dt>
                      <dd className={cn(
                        "text-[10px] font-medium",
                        value === "FALLA" || value === "NO" || value === "RECHAZADO"
                          ? "text-red-600 dark:text-red-400"
                          : value === "OK" || value === "SI" || value === "APROBADO"
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-700 dark:text-slate-300"
                      )}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {sectionEvs.length > 0 && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {sectionEvs.map((ev, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={ev.url} alt="" className="w-10 h-10 rounded object-cover border border-slate-300 dark:border-slate-700" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
        {saveError && (
          <p className="text-xs text-red-400 text-center mb-3 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}
        <button
          disabled={isSaving}
          onClick={onSave ?? onClose}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
            isApproved
              ? "bg-green-700 hover:bg-green-600 text-white"
              : "bg-orange-700 hover:bg-orange-600 text-white"
          )}
        >
          {isSaving
            ? "Guardando en Supabase…"
            : isApproved
              ? "✓ Guardar y Cerrar Inspección"
              : "⚠ Guardar con Observaciones"}
        </button>
      </div>
    </div>
  );
}
