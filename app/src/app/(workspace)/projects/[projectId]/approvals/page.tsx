"use client";
import { use } from "react";
import { ApprovalTray } from "@/components/approval/ApprovalTray";

interface Props { params: Promise<{ projectId: string }> }

export default function ApprovalsPage({ params }: Props) {
  const { projectId } = use(params);
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Bandeja de revisión</h1>
      <p className="text-sm text-slate-500">
        Aprobá, solicitá corrección o rechazá inspecciones. Cuando todas las inspecciones
        vigentes de un equipo completan su cadena, el equipo pasa a <b>aprobado</b>.
      </p>
      <ApprovalTray projectId={projectId} />
    </div>
  );
}
