import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const variants = {
  primary:  "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500",
  secondary:"bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600",
  danger:   "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500",
  ghost:    "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  success:  "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-sm rounded-xl gap-2",
  lg: "h-14 px-6 text-base rounded-xl gap-2",   // modo guante (campo)
  xl: "h-16 px-8 text-lg rounded-2xl gap-3",    // modo guante grande
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children, variant = "primary", size = "md",
  loading, icon, fullWidth, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : icon}
      {children}
    </button>
  );
}
