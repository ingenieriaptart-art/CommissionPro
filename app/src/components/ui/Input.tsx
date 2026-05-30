import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          {...props}
          className={cn(
            "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm",
            "placeholder:text-slate-400 text-slate-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-10",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
