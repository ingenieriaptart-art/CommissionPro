"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEquipmentForInspection, useInspectionTemplate } from "@/hooks/useInspectionData";
import { SectionSidebar } from "@/components/inspection/SectionSidebar";
import { DynamicFormSection } from "@/components/inspection/DynamicFormSection";
import { InspectionMiniMap } from "@/components/inspection/InspectionMiniMap";
import { EquipmentPdfUpload } from "@/components/equipment/EquipmentPdfUpload";
import type { InspectionState, SectionStatus } from "@/types/inspection";
import type { Equipment } from "@/types";
import { syncEquipmentStatus, calcFormPct } from "@/hooks/useEquipmentStatusSync";
import {
  saveInspectionDraft,
  getInspectionDraft,
  deleteInspectionDraft,
} from "@/lib/db/local";

/**
 * Estado inicial de una sección. Una sección SIN campos (p. ej. secciones
 * universales vacías como "Anclaje y Nivelación" o "Cambios de Diseño/Redline")
 * no tiene nada que responder, así que cuenta como "complete" por defecto —
 * de lo contrario quedaría "pending" para siempre y bloquearía el botón
 * "Revisar y Cerrar" en TODA inspección que la incluya.
 */
function defaultSectionStatus(section: { fields: unknown[] }): SectionStatus {
  return section.fields.length === 0 ? "complete" : "pending";
}

function buildInitialState(
  equipmentId: string,
  templateId: string,
  sections: { code: string; fields: unknown[] }[],
  equipment?: Equipment | null,
): InspectionState {
  const sectionStatus: Record<string, SectionStatus> = {};
  for (const s of sections) sectionStatus[s.code] = defaultSectionStatus(s);

  // Pre-llenar sección DATOS_GENERALES con datos conocidos del equipo
  const answers: Record<string, unknown> = {};
  if (equipment) {
    if (equipment.tag)            answers.tag            = equipment.tag;
    if (equipment.name)           answers.nombre_equipo  = equipment.name;
    if (equipment.manufacturer)   answers.fabricante     = equipment.manufacturer;
    if (equipment.model)          answers.modelo         = equipment.model;
    if (equipment.serial_number)  answers.no_serie       = equipment.serial_number;
    if (equipment.pid_reference)  answers.pid_referencia = equipment.pid_reference;
    if (equipment.location_system || equipment.service)
      answers.ubicacion = equipment.location_system ?? equipment.service;
  }

  return {
    equipmentId,
    templateId,
    activeSectionIndex: 0,
    answers,
    evidences: {},
    sectionStatus,
    savedAt: null,
    isDirty: false,
  };
}

/**
 * Reconcilia el sectionStatus de un borrador guardado contra las secciones
 * REALES de la plantilla actual: conserva el estado de las secciones que
 * existen, descarta claves obsoletas y agrega como "pending" las faltantes.
 * Evita el desfase "% = 100% pero el botón no aparece" cuando el borrador
 * quedó con un conjunto de secciones distinto al de la plantilla.
 */
function reconcileSectionStatus(
  saved: Record<string, SectionStatus>,
  sections: { code: string; fields: unknown[] }[],
): Record<string, SectionStatus> {
  const out: Record<string, SectionStatus> = {};
  for (const s of sections) out[s.code] = saved[s.code] ?? defaultSectionStatus(s);
  return out;
}

export default function InspectionPage() {
  const params       = useParams() as { equipmentId: string; templateId: string };
  const searchParams = useSearchParams();
  const router       = useRouter();

  const { equipmentId, templateId } = params;
  const returnTo = searchParams.get("returnTo") ?? "/";

  const { data: equipment, isLoading: eqLoading }  = useEquipmentForInspection(equipmentId);
  const { data: template,  isLoading: tplLoading } = useInspectionTemplate(templateId);

  const [state, setState]   = useState<InspectionState | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);

  // Sólo equipos reales de Supabase tienen UUID (36 chars); los mock empiezan con ic02-/eq-/tpl-
  const isRealEquipment = equipmentId.length === 36 && !equipmentId.startsWith("eq-");

  // Load or initialize state from IndexedDB (survives tab close / browser restart)
  useEffect(() => {
    if (!template || !equipment) return;
    const sections = template.sections;
    getInspectionDraft(equipmentId, templateId)
      .then((saved) => {
        if (saved) {
          // Reconciliar el borrador con las secciones actuales de la plantilla
          setState({ ...saved, sectionStatus: reconcileSectionStatus(saved.sectionStatus, sections) });
        } else {
          setState(buildInitialState(equipmentId, templateId, sections, equipment));
        }
      })
      .catch(() => {
        setState(buildInitialState(equipmentId, templateId, sections, equipment));
      });
  }, [equipmentId, templateId, template, equipment]);

  // Persist state on every change to IndexedDB
  useEffect(() => {
    if (!state) return;
    saveInspectionDraft(equipmentId, templateId, state).catch(() => {
      // IndexedDB quota exceeded or unavailable — fail silently
    });
  }, [state, equipmentId, templateId]);

  const handleAnswerChange = useCallback((fieldKey: string, value: unknown) => {
    setState(prev => {
      if (!prev) return prev;
      const section = template?.sections[prev.activeSectionIndex];
      if (!section) return prev;
      const newAnswers = { ...prev.answers, [fieldKey]: value };
      // Recompute section status
      const allRequired = section.fields.filter(f => f.required);
      const allFilled = allRequired.every(f => {
        const v = newAnswers[f.key];
        return v !== undefined && v !== null && v !== "";
      });
      const hasFail = section.fields.some(
        f => newAnswers[f.key] === "FALLA" || newAnswers[f.key] === "NO" || newAnswers[f.key] === "RECHAZADO"
      );
      const sectionStatus: SectionStatus = allFilled
        ? (hasFail ? "failed" : "complete")
        : "in_progress";
      return {
        ...prev,
        answers: newAnswers,
        sectionStatus: { ...prev.sectionStatus, [section.code]: sectionStatus },
        isDirty: true,
        savedAt: new Date().toISOString(),
      };
    });
  }, [template]);

  const handleEvidenceAdd = useCallback((fieldKey: string, url: string) => {
    setState(prev => {
      if (!prev) return prev;
      const existing = prev.evidences[fieldKey] ?? [];
      if (existing.length >= 5) return prev; // prototype limit
      return {
        ...prev,
        evidences: {
          ...prev.evidences,
          [fieldKey]: [
            ...existing,
            { fieldKey, url, caption: "", stage: "general" as const, timestamp: new Date().toISOString() },
          ],
        },
        isDirty: true,
      };
    });
  }, []);

  const handleEvidenceRemove = useCallback((fieldKey: string, index: number) => {
    setState(prev => {
      if (!prev) return prev;
      const existing = prev.evidences[fieldKey] ?? [];
      const updated = existing.filter((_, i) => i !== index);
      return { ...prev, evidences: { ...prev.evidences, [fieldKey]: updated }, isDirty: true };
    });
  }, []);

  const handleSectionSelect = useCallback((index: number) => {
    setState(prev => prev ? { ...prev, activeSectionIndex: index } : prev);
    // Sync progreso al BD al cambiar sección (fire-and-forget)
    if (state && equipment) {
      const pct = calcFormPct(state.sectionStatus);
      if (pct > 0) syncEquipmentStatus(equipment.id, "en_ejecucion", pct);
    }
  }, [state, equipment]);

  const handleNext = useCallback(() => {
    setState(prev => {
      if (!prev || !template) return prev;
      const next = Math.min(prev.activeSectionIndex + 1, template.sections.length - 1);
      return { ...prev, activeSectionIndex: next };
    });
    // Sync progreso al BD al avanzar sección (fire-and-forget)
    if (state && equipment) {
      const pct = calcFormPct(state.sectionStatus);
      if (pct > 0) syncEquipmentStatus(equipment.id, "en_ejecucion", pct);
    }
  }, [template, state, equipment]);

  const handlePrev = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      return { ...prev, activeSectionIndex: Math.max(0, prev.activeSectionIndex - 1) };
    });
  }, []);

  const handleComplete = useCallback(() => {
    // Borra el borrador al completar (el estado ya está en Supabase desde syncEquipmentStatus)
    deleteInspectionDraft(equipmentId, templateId).catch(() => {});
    router.push(`/equipment/${equipmentId}/inspection/${templateId}/summary?returnTo=${encodeURIComponent(returnTo)}`);
  }, [router, equipmentId, templateId, returnTo]);

  if (eqLoading || tplLoading || !state) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  if (!equipment || !template) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">
          {!equipment ? "Equipo no encontrado" : "Plantilla no encontrada"}
        </p>
      </div>
    );
  }

  const activeSection = template.sections[state.activeSectionIndex];
  const isLastSection = state.activeSectionIndex === template.sections.length - 1;
  const allComplete   = template.sections.every(s =>
    state.sectionStatus[s.code] === "complete" || state.sectionStatus[s.code] === "failed"
  );

  return (
    <>
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => router.push(returnTo)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Plano
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-sm font-mono font-bold text-blue-400">{equipment.tag}</span>
          <span className="text-slate-600 text-sm">—</span>
          <span className="text-sm text-slate-300 truncate">{equipment.name}</span>
          <span className="text-slate-700 text-sm">›</span>
          <span className="text-sm text-slate-400 truncate">{template.code}</span>
          <div className="ml-auto flex items-center gap-2">
            {state.savedAt && (
              <span className="text-[10px] text-slate-600">
                Guardado {new Date(state.savedAt).toLocaleTimeString("es-CO")}
              </span>
            )}
            {isRealEquipment && (
              <button
                onClick={() => setDocsOpen(o => !o)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  docsOpen
                    ? "bg-blue-900/60 text-blue-300 border border-blue-700"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <FileText size={13} />
                Docs
                {docsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
            {allComplete && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <CheckCircle size={14} /> Revisar y Cerrar
              </button>
            )}
          </div>
        </div>

        {/* Panel documentos desplegable */}
        {isRealEquipment && docsOpen && (
          <div className="px-4 pb-3 flex gap-6 border-t border-slate-800 pt-3">
            <EquipmentPdfUpload
              equipmentId={equipmentId}
              field="catalog_url"
              label="Manual del catálogo (fabricante)"
              currentUrl={equipment.catalog_url}
            />
            <EquipmentPdfUpload
              equipmentId={equipmentId}
              field="fat_protocol_url"
              label="Protocolo de pruebas FAT"
              currentUrl={equipment.fat_protocol_url}
            />
          </div>
        )}
      </header>

      {/* BODY: sidebar + form + minimap */}
      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar
          sections={template.sections}
          activeSectionIndex={state.activeSectionIndex}
          sectionStatus={state.sectionStatus}
          answers={state.answers}
          onSectionSelect={handleSectionSelect}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950">
          <DynamicFormSection
            section={activeSection}
            answers={state.answers}
            evidences={state.evidences}
            onAnswerChange={handleAnswerChange}
            onEvidenceAdd={handleEvidenceAdd}
            onEvidenceRemove={handleEvidenceRemove}
          />
        </main>

        <InspectionMiniMap
          equipmentId={equipmentId}
          equipmentTag={equipment.tag}
        />
      </div>

      {/* FOOTER */}
      <footer className="h-13 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
        <button
          onClick={handlePrev}
          disabled={state.activeSectionIndex === 0}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors",
            state.activeSectionIndex === 0
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          ← {state.activeSectionIndex > 0 ? template.sections[state.activeSectionIndex - 1].name : ""}
        </button>

        <span className="text-[10px] text-slate-600">
          Sección {state.activeSectionIndex + 1} de {template.sections.length}
        </span>

        <button
          onClick={handleNext}
          disabled={isLastSection}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors",
            isLastSection
              ? "text-slate-700 cursor-not-allowed"
              : "text-white bg-blue-700 hover:bg-blue-600"
          )}
        >
          {!isLastSection ? template.sections[state.activeSectionIndex + 1].name : "Última sección"} →
        </button>
      </footer>
    </>
  );
}
