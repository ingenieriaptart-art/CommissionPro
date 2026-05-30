"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, MinusCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ChecklistItem, ChecklistResult } from "@/types";

interface ChecklistFormProps {
  items: ChecklistItem[];
  readonly?: boolean;
  onChange?: (items: ChecklistItem[]) => void;
  onSave?: (items: ChecklistItem[]) => void;
}

const resultConfig: Record<ChecklistResult, { label: string; icon: React.ReactNode; color: string }> = {
  cumple:     { label: "Cumple",     icon: <CheckCircle2 size={18} />, color: "text-emerald-600 bg-emerald-50 border-emerald-300 dark:bg-emerald-900/30" },
  no_cumple:  { label: "No Cumple", icon: <XCircle size={18} />,     color: "text-red-600 bg-red-50 border-red-300 dark:bg-red-900/30" },
  no_aplica:  { label: "N/A",        icon: <MinusCircle size={18} />, color: "text-slate-500 bg-slate-50 border-slate-300 dark:bg-slate-800" },
};

export function ChecklistForm({ items: initialItems, readonly, onChange, onSave }: ChecklistFormProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [saving, setSaving] = useState(false);

  const setResult = (id: string, result: ChecklistResult) => {
    const updated = items.map((i) => i.id === id ? { ...i, result } : i);
    setItems(updated);
    onChange?.(updated);
  };

  const setObservation = (id: string, observation: string) => {
    const updated = items.map((i) => i.id === id ? { ...i, observation } : i);
    setItems(updated);
    onChange?.(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave?.(items);
    setSaving(false);
  };

  const totalCumple    = items.filter((i) => i.result === "cumple").length;
  const totalNoCumple  = items.filter((i) => i.result === "no_cumple").length;
  const totalPending   = items.filter((i) => !i.result).length;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex gap-4 text-sm">
        <span className="text-emerald-600 font-medium">{totalCumple} ✓</span>
        <span className="text-red-600 font-medium">{totalNoCumple} ✗</span>
        <span className="text-slate-500">{totalPending} pendientes</span>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              item.result === "cumple"    && "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10",
              item.result === "no_cumple" && "border-red-200 bg-red-50/50 dark:bg-red-900/10",
              item.result === "no_aplica" && "border-slate-200 bg-slate-50/50 dark:bg-slate-800/50",
              !item.result                && "border-slate-200 dark:border-slate-700"
            )}>
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-slate-400 mt-1 w-5 flex-shrink-0">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.description}</p>

                {/* Botones resultado */}
                {!readonly && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(["cumple", "no_cumple", "no_aplica"] as ChecklistResult[]).map((r) => {
                      const cfg = resultConfig[r];
                      return (
                        <button key={r}
                          onClick={() => setResult(item.id, r)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            item.result === r ? cfg.color : "border-slate-200 text-slate-500 hover:border-slate-300"
                          )}>
                          {cfg.icon}{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Observación */}
                {item.result === "no_cumple" && !readonly && (
                  <textarea
                    value={item.observation ?? ""}
                    onChange={(e) => setObservation(item.id, e.target.value)}
                    placeholder="Describe la no conformidad..."
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-xs resize-none
                               focus:outline-none focus:ring-1 focus:ring-red-400
                               dark:bg-slate-800 dark:border-red-800 dark:text-slate-200"
                  />
                )}

                {readonly && item.result && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn("text-xs font-medium", resultConfig[item.result].color,
                      "px-2 py-0.5 rounded-full border inline-flex items-center gap-1")}>
                      {resultConfig[item.result].icon}{resultConfig[item.result].label}
                    </span>
                    {item.observation && (
                      <span className="text-xs text-slate-500">{item.observation}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!readonly && onSave && (
        <Button size="lg" fullWidth loading={saving} onClick={handleSave}>
          Guardar checklist
        </Button>
      )}
    </div>
  );
}
