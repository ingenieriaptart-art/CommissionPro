"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, FileText, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEquipmentForInspection, useInspectionTemplate, useLatestTestForInspection } from "@/hooks/useInspectionData";
import { SectionSidebar } from "@/components/inspection/SectionSidebar";
import { DynamicFormSection } from "@/components/inspection/DynamicFormSection";
import { InspectionSummary } from "@/components/inspection/InspectionSummary";
import { InspectionMiniMap } from "@/components/inspection/InspectionMiniMap";
import { EquipmentPdfUpload } from "@/components/equipment/EquipmentPdfUpload";
import { useSubmitInspection } from "@/hooks/useSubmitInspection";
import { useInspectionDetail } from "@/hooks/useInspectionReview";
import { useAuthStore } from "@/stores/auth.store";
import { isEditableField } from "@/lib/inspection/correction";
import type { InspectionState, SectionStatus, MockInspectionSection } from "@/types/inspection";
import type { Equipment } from "@/types";
import { syncEquipmentStatus, calcFormPct } from "@/hooks/useEquipmentStatusSync";
import {
  saveInspectionDraft,
  getInspectionDraft,
  deleteInspectionDraft,
} from "@/lib/db/local";
import {
  activeRequiredFields,
  defaultSectionStatus,
  isInspectionComplete,
  deriveSectionStatuses,
} from "@/lib/inspection/completion";

function buildInitialState(
  equipmentId: string,
  templateId: string,
  sections: MockInspectionSection[],
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

export default function InspectionPage() {
  const params       = useParams() as { equipmentId: string; templateId: string };
  const searchParams = useSearchParams();
  const router       = useRouter();

  const { equipmentId, templateId } = params;
  const returnTo = searchParams.get("returnTo") ?? "/";

  // Correction mode: ?correct=<testId> — only admin/director may enter
  const correctId = searchParams.get("correct") ?? undefined;
  const isAdminOrDirector = useAuthStore((s) => s.isRole("admin", "director"));
  const correctionMode = !!correctId && isAdminOrDirector;

  const { data: equipment, isLoading: eqLoading }  = useEquipmentForInspection(equipmentId);
  const { data: template,  isLoading: tplLoading } = useInspectionTemplate(templateId);

  const [state, setState]   = useState<InspectionState | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const { startDraft, saveSection, close, submit, correct, isSubmitting, error: saveError } = useSubmitInspection();

  const { data: latestTest } = useLatestTestForInspection(equipmentId, templateId);
  // For correction mode: load the specific ejecutado test by id
  const { data: correctionDetail } = useInspectionDetail(correctionMode ? correctId : undefined);

  // Guard: the init effect must only run once — prevents re-initialization from background refetches
  const initialized = useRef(false);

  // Sólo equipos reales de Supabase tienen UUID (36 chars); los mock empiezan con ic02-/eq-/tpl-
  const isRealEquipment = equipmentId.length === 36 && !equipmentId.startsWith("eq-");

  // Load or initialize state from IndexedDB (survives tab close / browser restart).
  // También crea un borrador en BD (startDraft) si no existe ninguno, y precarga
  // respuestas desde la BD si hay un borrador existente sin draft local.
  // En modo corrección (correctionMode), carga las respuestas del test ejecutado
  // sin crear un nuevo borrador ni disparar auto-punch/FSM.
  useEffect(() => {
    if (initialized.current) return;
    if (!template || !equipment) return;

    if (correctionMode) {
      // Esperar a que cargue el detalle de la inspección a corregir
      if (correctionDetail === undefined) return;
      initialized.current = true;
      const sections = template.sections;
      if (!correctionDetail) {
        // Test no encontrado — iniciar estado vacío sin borrador
        setState(buildInitialState(equipmentId, templateId, sections, equipment));
        return;
      }
      const answers = { ...(correctionDetail.test.data ?? {}) };
      setState({
        ...buildInitialState(equipmentId, templateId, sections, equipment),
        answers,
        testId: correctId,
        sectionStatus: deriveSectionStatuses(sections, answers),
      });
      return;
    }

    // Flujo normal (sin corrección)
    // Esperar a que la consulta de BD resuelva (undefined = aún cargando)
    if (latestTest === undefined) return;
    // All data is ready — mark as initialized so background refetches don't re-run this body
    initialized.current = true;
    const sections = template.sections;
    // Solo crear borrador en BD para equipos reales (UUIDs de Supabase)
    const isReal = equipmentId.length === 36 && !equipmentId.startsWith("eq-");

    getInspectionDraft(equipmentId, templateId)
      .then((saved) => {
        if (saved) {
          // Restaurar borrador local — enriquecer con testId de BD si falta
          const testId = saved.testId ?? (latestTest?.status === "borrador" ? latestTest.id : undefined);
          setState({ ...saved, testId, sectionStatus: deriveSectionStatuses(sections, saved.answers ?? {}) });
        } else if (latestTest?.status === "borrador") {
          // Sin draft local pero BD tiene un borrador → precargar respuestas
          const answers = { ...(latestTest.data ?? {}) };
          setState({
            ...buildInitialState(equipmentId, templateId, sections, equipment),
            answers,
            testId: latestTest.id,
            sectionStatus: deriveSectionStatuses(sections, answers),
          });
        } else {
          // Sin draft ni borrador → estado fresco + crear fila en BD
          const initialState = buildInitialState(equipmentId, templateId, sections, equipment);
          if (isReal && equipment.project_id) {
            startDraft(initialState, equipment.project_id, template)
              .then((result) => {
                setState({ ...initialState, testId: result?.testId });
              })
              .catch(() => {
                setState(initialState);
              });
          } else {
            setState(initialState);
          }
        }
      })
      .catch(() => {
        setState(buildInitialState(equipmentId, templateId, sections, equipment));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId, templateId, template, equipment, latestTest, correctionMode, correctionDetail]);

  // Persist state on every change to IndexedDB (skip in correction mode —
  // sections persist to DB via saveSection; draft would pollute normal capture flow).
  useEffect(() => {
    if (!state || correctionMode) return;
    saveInspectionDraft(equipmentId, templateId, state).catch(() => {
      // IndexedDB quota exceeded or unavailable — fail silently
    });
  }, [state, correctionMode, equipmentId, templateId]);

  const handleAnswerChange = useCallback((fieldKey: string, value: unknown) => {
    setState(prev => {
      if (!prev) return prev;
      const section = template?.sections[prev.activeSectionIndex];
      if (!section) return prev;
      const newAnswers = { ...prev.answers, [fieldKey]: value };
      // Recompute section status — solo cuentan los requeridos ACTIVOS
      const allRequired = activeRequiredFields(section);
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
    // Autosave respuestas a BD vía outbox al cambiar sección
    if (state?.testId) saveSection(state.testId, state.answers);
  }, [state, equipment, saveSection]);

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
    // Autosave respuestas a BD vía outbox al avanzar sección
    if (state?.testId) saveSection(state.testId, state.answers);
  }, [template, state, equipment, saveSection]);

  const handlePrev = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      return { ...prev, activeSectionIndex: Math.max(0, prev.activeSectionIndex - 1) };
    });
  }, []);

  // "Revisar y Cerrar" abre el resumen INLINE (misma ruta ya cargada), sin
  // navegar a /summary — así el guardado no depende de cargar otra ruta offline.
  const handleComplete = useCallback(() => {
    setReviewing(true);
  }, []);

  // Guardar desde el resumen inline: escribe local-first y vuelve al plano.
  const handleSaveInline = useCallback(async () => {
    if (!state || !equipment?.project_id || !template) return;
    const result = await close(state, equipment.project_id, template);
    if (!result) return; // error mostrado vía saveError
    await deleteInspectionDraft(equipmentId, templateId).catch(() => {});
    router.push(returnTo);
  }, [state, equipment, template, close, equipmentId, templateId, returnTo, router]);

  // Guardar corrección (admin/director): sobrescribe data + result_summary del
  // test ejecutado, sin re-disparar auto-punch/FSM ni tocar executed_by/at.
  const handleSaveCorrection = useCallback(async () => {
    if (!correctionMode || !state?.testId) return;
    const ok = await correct(state.testId, state.answers);
    if (!ok) return; // error mostrado vía saveError
    await deleteInspectionDraft(equipmentId, templateId).catch(() => {});
    router.push(returnTo);
  }, [correctionMode, state, correct, equipmentId, templateId, returnTo, router]);

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
  const allComplete   = isInspectionComplete(template.sections, state.sectionStatus);

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
          {reviewing && (
            <>
              <span className="text-slate-700 text-sm">›</span>
              <span className="text-sm text-green-400 font-semibold">Resumen de Inspección</span>
            </>
          )}
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
            {reviewing ? (
              <button
                onClick={() => setReviewing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <ArrowLeft size={14} /> Volver al formulario
              </button>
            ) : correctionMode ? (
              <button
                onClick={handleSaveCorrection}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle size={14} /> Guardar corrección
              </button>
            ) : allComplete && (
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
          {reviewing ? (
            <InspectionSummary
              template={template}
              state={state}
              onClose={() => setReviewing(false)}
              onSave={handleSaveInline}
              isSaving={isSubmitting}
              saveError={saveError}
            />
          ) : (
            <DynamicFormSection
              section={activeSection}
              answers={state.answers}
              evidences={state.evidences}
              onAnswerChange={handleAnswerChange}
              onEvidenceAdd={handleEvidenceAdd}
              onEvidenceRemove={handleEvidenceRemove}
              readOnlyField={correctionMode ? (field) => !isEditableField(field) : undefined}
            />
          )}
        </main>

        <InspectionMiniMap
          equipmentId={equipmentId}
          equipmentTag={equipment.tag}
        />
      </div>

      {/* FOOTER */}
      {!reviewing && (
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
      )}
    </>
  );
}
