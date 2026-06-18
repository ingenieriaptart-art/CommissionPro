"use client";
import { cn } from "@/lib/utils";
import {
  MODULES, ACCESS_LEVELS, accessOf, type Access, type ModuleAccessMap,
} from "@/lib/modules";

interface Props {
  value: ModuleAccessMap;
  onChange: (next: ModuleAccessMap) => void;
  /** Si el usuario destino es admin global, no se limita nada (es superusuario igual). */
  isAdminTarget?: boolean;
  disabled?: boolean;
}

/** Niveles permitidos para un módulo según si es solo-admin y el destino. */
function allowedLevels(adminOnly: boolean, isAdminTarget: boolean): Access[] {
  if (adminOnly && !isAdminTarget) return ["none", "read"];
  return ["none", "read", "edit", "full"];
}

export function ModuleAccessMatrix({ value, onChange, isAdminTarget = false, disabled = false }: Props) {
  const set = (key: string, level: Access) => {
    if (disabled) return;
    onChange({ ...value, [key]: level });
  };

  const setAll = (level: Access) => {
    if (disabled) return;
    const next: ModuleAccessMap = {};
    for (const m of MODULES) {
      const allowed = allowedLevels(m.adminOnly, isAdminTarget);
      next[m.key] = allowed.includes(level) ? level : allowed[allowed.length - 1];
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setAll("none")} disabled={disabled}
          className="text-[10px] px-2 py-1 rounded-md bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-400 disabled:opacity-50">
          Todo sin acceso
        </button>
        <button type="button" onClick={() => setAll("read")} disabled={disabled}
          className="text-[10px] px-2 py-1 rounded-md bg-slate-700 text-blue-300 border border-blue-800 hover:border-blue-500 disabled:opacity-50">
          Todo lectura
        </button>
        <button type="button" onClick={() => setAll("edit")} disabled={disabled}
          className="text-[10px] px-2 py-1 rounded-md bg-slate-700 text-amber-300 border border-amber-800 hover:border-amber-500 disabled:opacity-50">
          Todo edición
        </button>
      </div>

      <div className="rounded-lg border border-slate-600 overflow-hidden">
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          const current = accessOf(value, m.key);
          const allowed = allowedLevels(m.adminOnly, isAdminTarget);
          return (
            <div key={m.key}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2 bg-slate-800",
                i % 2 === 1 && "bg-slate-800/60"
              )}>
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={14} className="flex-shrink-0 text-slate-400" />
                <span className="text-xs text-slate-200 truncate">{m.label}</span>
                {m.adminOnly && !isAdminTarget && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-900 text-purple-300 flex-shrink-0">
                    Solo admin
                  </span>
                )}
              </div>

              {/* Selector segmentado */}
              <div className="flex flex-shrink-0 rounded-md overflow-hidden border border-slate-600">
                {ACCESS_LEVELS.map((lvl) => {
                  const isAllowed = allowed.includes(lvl.value);
                  const isActive = current === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      disabled={disabled || !isAllowed}
                      onClick={() => set(m.key, lvl.value)}
                      title={!isAllowed ? "No disponible para este módulo" : lvl.label}
                      className={cn(
                        "text-[10px] px-2 py-1 transition-colors border-r border-slate-600 last:border-r-0",
                        isActive
                          ? lvl.value === "none" ? "bg-slate-600 text-slate-200"
                            : lvl.value === "read" ? "bg-blue-700 text-white"
                            : lvl.value === "edit" ? "bg-amber-600 text-white"
                            : "bg-emerald-600 text-white"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-700",
                        (!isAllowed || disabled) && "opacity-30 cursor-not-allowed hover:bg-slate-900"
                      )}
                    >
                      {lvl.short}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
