"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEquipmentById, getTemplateById } from "@/lib/inspection-mock-data";
import { InspectionSummary } from "@/components/inspection/InspectionSummary";
import { SectionSidebar } from "@/components/inspection/SectionSidebar";
import { InspectionMiniMap } from "@/components/inspection/InspectionMiniMap";
import type { InspectionState } from "@/types/inspection";

const STORAGE_KEY = (eqId: string, tplId: string) => `inspection_${eqId}_${tplId}`;

export default function InspectionSummaryPage() {
  const params       = useParams() as { equipmentId: string; templateId: string };
  const searchParams = useSearchParams();
  const router       = useRouter();

  const { equipmentId, templateId } = params;
  const returnTo = searchParams.get("returnTo") ?? "/";

  const equipment = getEquipmentById(equipmentId);
  const template  = getTemplateById(templateId);
  const [state, setState] = useState<InspectionState | null>(null);

  useEffect(() => {
    if (!template) return;
    const key = STORAGE_KEY(equipmentId, templateId);
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) setState(JSON.parse(stored) as InspectionState);
    } catch { /* ignore */ }
  }, [equipmentId, templateId, template]);

  const handleClose = () => {
    try { sessionStorage.removeItem(STORAGE_KEY(equipmentId, templateId)); } catch { /* ignore */ }
    router.push(returnTo);
  };

  if (!equipment || !template || !state) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-slate-500">Cargando…</p></div>;
  }

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push(`/equipment/${equipmentId}/inspection/${templateId}?returnTo=${encodeURIComponent(returnTo)}`)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Formulario
        </button>
        <span className="text-slate-700">|</span>
        <span className="text-sm font-mono font-bold text-blue-400">{equipment.tag}</span>
        <span className="text-slate-600 text-sm">—</span>
        <span className="text-sm text-green-400 font-semibold">Resumen de Inspección</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar
          sections={template.sections}
          activeSectionIndex={template.sections.length - 1}
          sectionStatus={state.sectionStatus}
          answers={state.answers}
          onSectionSelect={() => {}}
        />
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <InspectionSummary template={template} state={state} onClose={handleClose} />
        </main>
        <InspectionMiniMap equipmentId={equipmentId} equipmentTag={equipment.tag} />
      </div>
    </>
  );
}
