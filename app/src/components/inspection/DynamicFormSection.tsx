"use client";
import { FieldRenderer } from "./FieldRenderer";
import { EvidenceCapture } from "./EvidenceCapture";
import type { MockInspectionSection, EvidenceItem } from "@/types/inspection";

interface DynamicFormSectionProps {
  section: MockInspectionSection;
  answers: Record<string, unknown>;
  evidences: Record<string, EvidenceItem[]>;
  onAnswerChange: (fieldKey: string, value: unknown) => void;
  onEvidenceAdd: (fieldKey: string, url: string) => void;
  onEvidenceRemove: (fieldKey: string, index: number) => void;
}

export function DynamicFormSection({
  section, answers, evidences,
  onAnswerChange, onEvidenceAdd, onEvidenceRemove,
}: DynamicFormSectionProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Section header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-slate-100">{section.name}</h2>
          {section.is_universal && (
            <span className="text-[9px] px-2 py-0.5 bg-blue-900/40 border border-blue-800 rounded-full text-blue-400 uppercase tracking-wider">
              Universal
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{section.code}</p>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {section.fields.map((field, idx) => {
          // Textarea after a FALLA/NO checkbox becomes required
          const prevField = idx > 0 ? section.fields[idx - 1] : null;
          const prevValue = prevField ? answers[prevField.key] : undefined;
          const forceRequired =
            field.type === "textarea" &&
            (prevValue === "FALLA" || prevValue === "NO" || prevValue === "RECHAZADO");

          return (
            <div
              key={field.key}
              className="bg-slate-900 rounded-xl p-4 border border-slate-800"
            >
              <FieldRenderer
                field={field}
                value={answers[field.key]}
                evidences={evidences[field.key] ?? []}
                onChange={onAnswerChange}
                onEvidenceAdd={onEvidenceAdd}
                onEvidenceRemove={onEvidenceRemove}
                forceRequired={forceRequired}
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
    </div>
  );
}
