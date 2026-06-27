"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, X, ChevronRight, Circle, PowerOff } from "lucide-react";
import type { MockInspectionSection, SectionStatus } from "@/types/inspection";

interface SectionSidebarProps {
  sections: MockInspectionSection[];
  activeSectionIndex: number;
  sectionStatus: Record<string, SectionStatus>;
  answers: Record<string, unknown>;
  onSectionSelect: (index: number) => void;
}

function SectionIcon({ status, active, inactive }: { status: SectionStatus; active: boolean; inactive: boolean }) {
  if (inactive) return <PowerOff size={12} className="text-slate-600" />;
  if (active) return <ChevronRight size={13} className="text-blue-400" />;
  if (status === "complete")    return <Check  size={13} className="text-green-400" />;
  if (status === "failed")      return <X      size={13} className="text-red-400" />;
  if (status === "in_progress") return <Circle size={13} className="text-yellow-400" />;
  return <Circle size={13} className="text-slate-600" />;
}

function statusBg(status: SectionStatus, active: boolean, inactive: boolean): string {
  if (inactive)                  return "opacity-50 cursor-default";
  if (active)                    return "bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500";
  if (status === "complete")     return "hover:bg-slate-200/60 dark:hover:bg-slate-800/60";
  if (status === "failed")       return "hover:bg-slate-200/60 dark:hover:bg-slate-800/60";
  if (status === "in_progress")  return "hover:bg-slate-200/60 dark:hover:bg-slate-800/60";
  return "hover:bg-slate-200/40 dark:hover:bg-slate-800/40";
}

export function SectionSidebar({
  sections,
  activeSectionIndex,
  sectionStatus,
  answers,
  onSectionSelect,
}: SectionSidebarProps) {
  const { totalRequired, totalFilled } = useMemo(() => {
    let req = 0, filled = 0;
    for (const sec of sections) {
      if (sec.is_active === false) continue;
      for (const f of sec.fields) {
        if (f.is_active === false) continue;
        if (f.required) {
          req++;
          const v = answers[f.key];
          if (v !== undefined && v !== null && v !== "") filled++;
        }
      }
    }
    return { totalRequired: req, totalFilled: filled };
  }, [sections, answers]);

  const pct = totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;

  return (
    <aside className="w-52 flex-shrink-0 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Secciones
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {sections.map((section, index) => {
          const status = sectionStatus[section.code] ?? "pending";
          const active = index === activeSectionIndex;
          const inactive = section.is_active === false;
          return (
            <button
              key={section.code}
              onClick={() => !inactive && onSectionSelect(index)}
              className={cn(
                "w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors",
                statusBg(status, active, inactive)
              )}
            >
              <span className="mt-0.5 flex-shrink-0">
                <SectionIcon status={status} active={active} inactive={inactive} />
              </span>
              <div className="min-w-0">
                <p className={cn(
                  "text-xs leading-tight",
                  inactive       ? "text-slate-500 dark:text-slate-600 line-through" :
                  active         ? "text-blue-600 dark:text-blue-300 font-semibold" :
                                   "text-slate-700 dark:text-slate-300"
                )}>
                  {section.name}
                </p>
                {inactive ? (
                  <p className="text-[9px] text-slate-600 mt-0.5">Desactivada</p>
                ) : section.is_universal ? (
                  <p className="text-[9px] text-slate-600 mt-0.5">Universal</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Progress footer */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Completado</p>
          <p className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold">{pct}%</p>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[9px] text-slate-600 mt-1">
          {totalFilled} / {totalRequired} campos requeridos
        </p>
      </div>
    </aside>
  );
}
