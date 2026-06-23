"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EvidenceCapture } from "@/components/evidence/EvidenceCapture";
import type { EvidenceStage } from "@/types";

interface PunchTransitionModalProps {
  punchId: string;
  equipmentId?: string;
  projectId: string;
  userId: string;
  stage: EvidenceStage;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

export function PunchTransitionModal({
  punchId,
  equipmentId,
  projectId,
  userId,
  stage,
  title,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
}: PunchTransitionModalProps) {
  const [evidenceSaved, setEvidenceSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        {!evidenceSaved && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            Capture una imagen como evidencia para habilitar la confirmación.
          </p>
        )}

        {evidenceSaved && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
            ✓ Evidencia guardada. Puede confirmar.
          </p>
        )}

        <EvidenceCapture
          projectId={projectId}
          equipmentId={equipmentId}
          punchId={punchId}
          stage={stage}
          capturedBy={userId}
          onSaved={() => setEvidenceSaved(true)}
        />

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!evidenceSaved}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
