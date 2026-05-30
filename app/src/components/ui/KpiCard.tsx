import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: number | string;
  total?: number;
  icon?: React.ReactNode;
  color?: "blue" | "emerald" | "amber" | "red" | "purple" | "slate";
  subtitle?: string;
}

const colorMap = {
  blue:    { ring: "ring-blue-500",    icon: "bg-blue-50 text-blue-600 dark:bg-blue-900/30",    bar: "bg-blue-500" },
  emerald: { ring: "ring-emerald-500", icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30", bar: "bg-emerald-500" },
  amber:   { ring: "ring-amber-500",   icon: "bg-amber-50 text-amber-600 dark:bg-amber-900/30",   bar: "bg-amber-500" },
  red:     { ring: "ring-red-500",     icon: "bg-red-50 text-red-600 dark:bg-red-900/30",       bar: "bg-red-500" },
  purple:  { ring: "ring-purple-500",  icon: "bg-purple-50 text-purple-600 dark:bg-purple-900/30", bar: "bg-purple-500" },
  slate:   { ring: "ring-slate-400",   icon: "bg-slate-100 text-slate-600 dark:bg-slate-800",   bar: "bg-slate-400" },
};

export function KpiCard({ label, value, total, icon, color = "blue", subtitle }: KpiCardProps) {
  const colors = colorMap[color];
  const pct = total && typeof value === "number" ? Math.round((value / total) * 100) : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          {total !== undefined && <p className="text-xs text-slate-400 mt-0.5">de {total}</p>}
        </div>
        {icon && (
          <div className={cn("p-2.5 rounded-xl", colors.icon)}>
            {icon}
          </div>
        )}
      </div>
      {pct !== null && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Avance</span><span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </Card>
  );
}
