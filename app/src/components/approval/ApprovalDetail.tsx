"use client";
import { useState } from "react";
import { useInspectionApproval, type ApprovalDecision } from "@/hooks/useInspectionApproval";
import { SignaturePadField } from "./SignaturePadField";
import type { ApprovalQueueItem } from "@/hooks/useApprovalQueue";

interface Props {
  item: ApprovalQueueItem;
  onDone: () => void;
}

export function ApprovalDetail({ item, onDone }: Props) {
  const { approve, isSubmitting, error } = useInspectionApproval();
  const [observations, setObservations] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const level = item.nextPendingLevel;
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const run = async (decision: ApprovalDecision) => {
    if (level === null) return;
    setLocalMsg(null);
    const res = await approve({
      testId: item.testId, level, decision,
      observations: observations.trim() || undefined,
      signatureImage: signature ?? undefined,
    });
    if (res.ok) onDone();
    else setLocalMsg(res.reason ?? "No se pudo procesar");
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <header>
        <h3 className="font-semibold">{item.equipmentTag} — {item.code ?? item.templateId}</h3>
        <p className="text-sm text-slate-500">Revisión {item.revision} · estado {item.testStatus}</p>
      </header>

      <ol className="flex flex-wrap gap-2 text-sm">
        {item.levels.map((l) => (
          <li key={l.level}
            className={`rounded px-2 py-1 ${l.approved ? "bg-green-100 text-green-800" : l.level === level ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
            L{l.level} {l.levelName} {l.approved ? "✓" : l.mandatory ? "" : "(opc.)"}
          </li>
        ))}
      </ol>

      <textarea value={observations} onChange={(e) => setObservations(e.target.value)}
        placeholder="Observaciones (requerido para corrección/rechazo)"
        className="w-full rounded border border-slate-300 p-2 text-sm" rows={3} />

      <SignaturePadField onChange={setSignature} />

      {offline && <p className="text-sm text-amber-600">Sin conexión: las acciones están deshabilitadas.</p>}
      {(localMsg || error) && <p className="text-sm text-red-600">{localMsg ?? error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={isSubmitting || offline}
          onClick={() => run("approve")}
          className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Aprobar nivel {level}
        </button>
        <button type="button" disabled={isSubmitting || offline || !observations.trim()}
          onClick={() => run("request_correction")}
          className="rounded bg-amber-500 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Solicitar corrección
        </button>
        <button type="button" disabled={isSubmitting || offline || !observations.trim()}
          onClick={() => run("reject_equipment")}
          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Rechazar equipo
        </button>
      </div>
    </div>
  );
}
