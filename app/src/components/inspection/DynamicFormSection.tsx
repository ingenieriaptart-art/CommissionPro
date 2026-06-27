"use client";
import { FieldRenderer } from "./FieldRenderer";
import { EvidenceCapture } from "./EvidenceCapture";
import { PowerOff } from "lucide-react";
import type { MockInspectionSection, EvidenceItem } from "@/types/inspection";

interface DynamicFormSectionProps {
  section: MockInspectionSection;
  answers: Record<string, unknown>;
  evidences: Record<string, EvidenceItem[]>;
  onAnswerChange: (fieldKey: string, value: unknown) => void;
  onEvidenceAdd: (fieldKey: string, url: string) => void;
  onEvidenceRemove: (fieldKey: string, index: number) => void;
  /** Opcional: si retorna true para un campo, ese campo se muestra solo-lectura (corrección admin). */
  readOnlyField?: (field: import("@/types/inspection").MockInspectionField) => boolean;
}

export function DynamicFormSection({
  section, answers, evidences,
  onAnswerChange, onEvidenceAdd, onEvidenceRemove,
  readOnlyField,
}: DynamicFormSectionProps) {
  const sectionInactive = section.is_active === false;

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Section header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className={`text-lg font-semibold ${sectionInactive ? "text-slate-600" : "text-slate-100"}`}>
            {section.name}
          </h2>
          {section.is_universal && !sectionInactive && (
            <span className="text-[9px] px-2 py-0.5 bg-blue-900/40 border border-blue-800 rounded-full text-blue-400 uppercase tracking-wider">
              Universal
            </span>
          )}
          {sectionInactive && (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-slate-800/60 border border-slate-700 rounded-full text-slate-500 uppercase tracking-wider">
              <PowerOff size={9} />
              Desactivada
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{section.code}</p>
      </div>

      {/* Inactive section placeholder */}
      {sectionInactive ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
          <PowerOff size={28} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-600 font-medium">Sección desactivada</p>
          <p className="text-xs text-slate-700 mt-1">
            Esta sección no aplica para precomisionamiento.<br />
            Un administrador puede activarla desde la configuración de plantillas.
          </p>
        </div>
      ) : (
        <>
          {/* Fields */}
          <div className="space-y-5">
            {section.fields.map((field, idx) => {
              const fieldInactive = field.is_active === false;
              const fieldReadOnly = !fieldInactive && (readOnlyField?.(field) ?? false);
              const prevField = idx > 0 ? section.fields[idx - 1] : null;
              const prevValue = prevField ? answers[prevField.key] : undefined;
              const forceRequired =
                field.type === "textarea" &&
                (prevValue === "FALLA" || prevValue === "NO" || prevValue === "RECHAZADO");

              return (
                <div
                  key={field.key}
                  className={`bg-slate-900 rounded-xl p-4 border transition-opacity ${
                    fieldInactive
                      ? "border-slate-800/40 opacity-40 pointer-events-none select-none"
                      : fieldReadOnly
                      ? "border-slate-700/60 opacity-50 pointer-events-none select-none"
                      : "border-slate-800"
                  }`}
                >
                  {fieldInactive && (
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <PowerOff size={8} /> Campo desactivado
                    </p>
                  )}
                  <FieldRenderer
                    field={field}
                    value={answers[field.key]}
                    evidences={evidences[field.key] ?? []}
                    onChange={onAnswerChange}
                    onEvidenceAdd={onEvidenceAdd}
                    onEvidenceRemove={onEvidenceRemove}
                    forceRequired={forceRequired}
                    disabled={fieldReadOnly}
                  />
                </div>
              );
            })}
          </div>

          {/* Section-level evidence capture */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
              Evidencias de la sección
            </p>
            <EvidenceCapture
              fieldKey={`__section__${section.code}`}
              items={evidences[`__section__${section.code}`] ?? []}
              onAdd={url => onEvidenceAdd(`__section__${section.code}`, url)}
              onRemove={idx => onEvidenceRemove(`__section__${section.code}`, idx)}
            />
          </div>
        </>
      )}
    </div>
  );
}
