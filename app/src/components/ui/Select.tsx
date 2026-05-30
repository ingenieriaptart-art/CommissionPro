import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}{props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        {...props}
        className={cn(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm",
          "text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500",
          "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100",
          error && "border-red-500", className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";
