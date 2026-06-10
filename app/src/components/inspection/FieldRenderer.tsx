"use client";
import { cn } from "@/lib/utils";
import { CheckboxField } from "./fields/CheckboxField";
import { SignatureField } from "./fields/SignatureField";
import { EvidenceCapture } from "./EvidenceCapture";
import type { MockInspectionField, EvidenceItem } from "@/types/inspection";

interface FieldRendererProps {
  field: MockInspectionField;
  value: unknown;
  evidences: EvidenceItem[];
  onChange: (fieldKey: string, value: unknown) => void;
  onEvidenceAdd: (fieldKey: string, url: string) => void;
  onEvidenceRemove: (fieldKey: string, index: number) => void;
  /** When true, textarea is visually required (previous checkbox = FALLA/NO) */
  forceRequired?: boolean;
}

const inputClass =
  "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors";

export function FieldRenderer({
  field, value, evidences,
  onChange, onEvidenceAdd, onEvidenceRemove,
  forceRequired = false,
}: FieldRendererProps) {
  const strValue   = (value as string | undefined) ?? "";
  const numValue   = (value as number | undefined) ?? "";
  const isRequired = field.required || forceRequired;

  const label = (
    <label className="block text-xs text-slate-400 mb-1.5">
      {field.label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
      {field.hint && <span className="text-slate-600 ml-1">— {field.hint}</span>}
    </label>
  );

  switch (field.type) {
    case "texto":
      return (
        <div>
          {label}
          <input
            type="text"
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            className={inputClass}
            placeholder={field.label}
          />
        </div>
      );

    case "numero":
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={numValue}
              onChange={e => onChange(field.key, e.target.valueAsNumber)}
              min={field.validations?.min}
              max={field.validations?.max}
              className={cn(inputClass, "w-36")}
              placeholder="0"
              step="any"
            />
            {field.validations?.unit && (
              <span className="text-sm text-slate-500">{field.validations.unit}</span>
            )}
          </div>
        </div>
      );

    case "fecha":
      return (
        <div>
          {label}
          <input
            type="date"
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            className={cn(inputClass, "w-44")}
          />
        </div>
      );

    case "select":
      return (
        <div>
          {label}
          <select
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            className={cn(inputClass, "w-auto min-w-[160px]")}
          >
            <option value="">— Seleccionar —</option>
            {(field.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );

    case "checkbox":
      return (
        <div>
          {label}
          <CheckboxField
            options={field.options ?? ["OK", "FALLA", "N/A"]}
            value={strValue || undefined}
            onChange={v => onChange(field.key, v)}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          {label}
          <textarea
            value={strValue}
            onChange={e => onChange(field.key, e.target.value)}
            rows={3}
            className={cn(
              inputClass,
              "resize-y",
              forceRequired && !strValue ? "border-red-600 bg-red-950/10" : ""
            )}
            placeholder={forceRequired ? "Requerido cuando hay FALLA" : field.label}
          />
        </div>
      );

    case "firma":
      return (
        <div>
          {label}
          <SignatureField
            value={strValue || undefined}
            onChange={v => onChange(field.key, v)}
          />
        </div>
      );

    case "imagen":
      return (
        <div>
          {label}
          <EvidenceCapture
            fieldKey={field.key}
            items={evidences}
            onAdd={url => onEvidenceAdd(field.key, url)}
            onRemove={idx => onEvidenceRemove(field.key, idx)}
          />
        </div>
      );

    default:
      return (
        <div>
          {label}
          <p className="text-xs text-slate-600">Campo tipo &quot;{field.type}&quot; no soportado en prototipo.</p>
        </div>
      );
  }
}
