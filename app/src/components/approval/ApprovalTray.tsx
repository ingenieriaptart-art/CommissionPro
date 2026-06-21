"use client";
import { useState } from "react";
import { useApprovalQueue } from "@/hooks/useApprovalQueue";
import { ApprovalDetail } from "./ApprovalDetail";

export function ApprovalTray({ projectId }: { projectId: string }) {
  const { items, loading, error, refetch } = useApprovalQueue(projectId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-slate-500">Cargando bandeja de revisión…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (items.length === 0) return <p className="text-sm text-slate-500">No hay inspecciones pendientes de aprobación.</p>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.testId} className="rounded-lg border border-slate-200">
          <button type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setOpenId(openId === item.testId ? null : item.testId)}>
            <span className="font-medium">{item.equipmentTag} — {item.code ?? item.templateId}</span>
            <span className="text-sm text-slate-500">
              Rev {item.revision} · nivel pendiente L{item.nextPendingLevel}
            </span>
          </button>
          {openId === item.testId && (
            <div className="border-t border-slate-100 p-4">
              <ApprovalDetail item={item} onDone={() => { setOpenId(null); void refetch(); }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
