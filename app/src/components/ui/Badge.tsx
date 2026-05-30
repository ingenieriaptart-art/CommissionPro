import { cn } from "@/lib/utils";

const variants = {
  default:   "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  success:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  warning:   "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  danger:    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  info:      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  purple:    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
} as const;

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
      variants[variant], className
    )}>
      {children}
    </span>
  );
}
