"use client";
import { use } from "react";
import { ReportIndexCard } from "@/components/reports/ReportIndexCard";

interface Props { params: Promise<{ projectId: string }> }

export default function ReportsPage({ params }: Props) {
  const { projectId } = use(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Informes</h1>
        <p className="text-slate-500 text-sm mt-1">Documentos de salida del proyecto</p>
      </div>

      <div className="space-y-3 max-w-2xl">
        <ReportIndexCard
          title="Inspección Equipos de Proceso"
          description="Mecánico · BIOGAS-AIRE · LODOS-EFLUENTES · Formato horizontal A4"
          href={`/projects/${projectId}/reports/inspeccion-proceso`}
        />
        <ReportIndexCard
          title="Inspección Eléctrico"
          description="Tableros · Servicios generales · Formato horizontal A4"
          href={`/projects/${projectId}/reports/inspeccion-electrico`}
        />
        <ReportIndexCard
          title="Inspección Instrumentación y Control"
          description="I&C · Transmisores · Válvulas actuadas · Sensores · Formato horizontal A4"
          href={`/projects/${projectId}/reports/inspeccion-ic`}
        />
        <ReportIndexCard
          title="Check Características"
          description="Resumen de especificaciones técnicas"
          comingSoon
        />
      </div>
    </div>
  );
}
