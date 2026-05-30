import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = { none: "", sm: "p-3", md: "p-5", lg: "p-7" };

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm",
      paddings[padding], className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-base font-semibold text-slate-900 dark:text-slate-100", className)}>{children}</h3>;
}
