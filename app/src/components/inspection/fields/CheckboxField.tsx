"use client";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps {
  options: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OPTION_STYLES: Record<string, { selected: string; hover: string }> = {
  OK:        { selected: "bg-green-800 border-green-500 text-green-300",  hover: "hover:border-green-700" },
  SI:        { selected: "bg-green-800 border-green-500 text-green-300",  hover: "hover:border-green-700" },
  FALLA:     { selected: "bg-red-900   border-red-500   text-red-300",    hover: "hover:border-red-700" },
  NO:        { selected: "bg-red-900   border-red-500   text-red-300",    hover: "hover:border-red-700" },
  RECHAZADO: { selected: "bg-red-900   border-red-500   text-red-300",    hover: "hover:border-red-700" },
  APROBADO:  { selected: "bg-green-800 border-green-500 text-green-300",  hover: "hover:border-green-700" },
  "N/A":     { selected: "bg-slate-700 border-slate-500 text-slate-300",  hover: "hover:border-slate-600" },
};

const DEFAULT_STYLE = {
  selected: "bg-blue-900 border-blue-500 text-blue-300",
  hover:    "hover:border-blue-700",
};

export function CheckboxField({ options, value, onChange, disabled }: CheckboxFieldProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = value === opt;
        const style = OPTION_STYLES[opt] ?? DEFAULT_STYLE;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(isSelected ? "" : opt)}
            className={cn(
              "px-4 py-1.5 rounded-md border text-xs font-semibold transition-all",
              isSelected
                ? style.selected
                : cn("border-slate-700 text-slate-500 bg-transparent", style.hover)
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
