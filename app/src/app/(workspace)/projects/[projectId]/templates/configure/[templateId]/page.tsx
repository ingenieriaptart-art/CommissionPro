"use client";
import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, ChevronDown, ChevronRight, Eye, EyeOff, LayoutList, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInspectionTemplate } from "@/hooks/useInspectionData";
import { useQueryClient } from "@tanstack/react-query";
import type { MockInspectionSection } from "@/types/inspection";

// ── Toggle call ───────────────────────────────────────────────────────────────

async function patchActive(table: "template_sections" | "section_fields", id: string, is_active: boolean) {
  const res = await fetch("/api/admin/template-config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, id, is_active }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error);
  }
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  sectionId,
  onToggle,
}: {
  field: { key: string; _db_id?: string; label: string; type: string; required: boolean; is_active?: boolean };
  sectionId: string;
  onToggle: (sectionId: string, key: string, value: boolean) => void;
}) {
  const active = field.is_active !== false;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const dbId = field._db_id;
    if (!dbId) return; // mock data — no-op
    setLoading(true);
    setError(null);
    try {
      await patchActive("section_fields", dbId, !active);
      onToggle(sectionId, field.key, !active);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-2.5 border-b border-slate-800/50 last:border-0 transition-opacity",
      !active && "opacity-50"
    )}>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs leading-tight", active ? "text-slate-300" : "text-slate-500 line-through")}>
          {field.label}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] font-mono text-slate-600">{field.type}</span>
          {field.required && <span className="text-[9px] text-rose-700">requerido</span>}
        </div>
        {error && <p className="text-[9px] text-rose-500 mt-1">{error}</p>}
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        title={active ? "Desactivar campo" : "Activar campo"}
        className={cn(
          "flex-shrink-0 mt-0.5 p-1 rounded transition-colors",
          active
            ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
            : "text-slate-600 hover:text-slate-400 hover:bg-slate-800"
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : active ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  section,
  onToggleSection,
  onToggleField,
}: {
  section: MockInspectionSection & { id: string };
  onToggleSection: (id: string, value: boolean) => void;
  onToggleField: (sectionId: string, fieldKey: string, value: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = section.is_active !== false;

  async function toggleSection() {
    setLoading(true);
    setError(null);
    try {
      await patchActive("template_sections", section.id, !active);
      onToggleSection(section.id, !active);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      active ? "border-slate-700 bg-slate-900" : "border-slate-800/60 bg-slate-900/40"
    )}>
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <span className="text-slate-600 flex-shrink-0">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <div className="min-w-0">
            <p className={cn(
              "text-sm font-medium leading-tight",
              active ? "text-slate-200" : "text-slate-500 line-through"
            )}>
              {section.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-slate-600">{section.code}</span>
              {section.is_universal && (
                <span className="text-[8px] px-1.5 py-0.5 bg-blue-900/40 border border-blue-800 rounded-full text-blue-500 uppercase tracking-wider">
                  Universal
                </span>
              )}
              <span className="text-[9px] text-slate-600 flex items-center gap-1">
                <Hash size={8} /> {section.fields.length} campo{section.fields.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {error && <span className="text-[9px] text-rose-500">{error}</span>}
          <button
            onClick={toggleSection}
            disabled={loading}
            title={active ? "Desactivar sección" : "Activar sección"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border",
              active
                ? "text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/20"
                : "text-slate-500 border-slate-700 hover:bg-slate-800"
            )}
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : active ? (
              <><Eye size={12} /> Activa</>
            ) : (
              <><EyeOff size={12} /> Inactiva</>
            )}
          </button>
        </div>
      </div>

      {/* Fields */}
      {expanded && section.fields.length > 0 && (
        <div className="border-t border-slate-800">
          {section.fields.map(f => (
            <FieldRow
              key={f.key}
              field={f}
              sectionId={section.id}
              onToggle={onToggleField}
            />
          ))}
        </div>
      )}
      {expanded && section.fields.length === 0 && (
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-600">Sin campos</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplateConfigurePage() {
  const params = useParams() as { projectId: string; templateId: string };
  const router = useRouter();
  const qc     = useQueryClient();

  const { data: template, isLoading, error } = useInspectionTemplate(params.templateId);

  const [sectionActive, setSectionActive] = useState<Record<string, boolean>>({});
  const [fieldActive, setFieldActive]     = useState<Record<string, Record<string, boolean>>>({});

  const handleToggleSection = useCallback((id: string, value: boolean) => {
    setSectionActive(prev => ({ ...prev, [id]: value }));
    qc.invalidateQueries({ queryKey: ["inspection-template", params.templateId] });
  }, [qc, params.templateId]);

  const handleToggleField = useCallback((sectionId: string, key: string, value: boolean) => {
    setFieldActive(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [key]: value },
    }));
    qc.invalidateQueries({ queryKey: ["inspection-template", params.templateId] });
  }, [qc, params.templateId]);

  const sections = (template?.sections ?? []).map(s => ({
    ...s,
    is_active: sectionActive[s.id] ?? s.is_active,
    fields: s.fields.map(f => ({
      ...f,
      is_active: fieldActive[s.id]?.[f.key] ?? f.is_active,
    })),
  })) as (MockInspectionSection & { id: string })[];

  const activeSections   = sections.filter(s => s.is_active !== false).length;
  const inactiveSections = sections.length - activeSections;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-slate-800 flex items-center gap-4">
        <button
          onClick={() => router.push(`/projects/${params.projectId}/templates`)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <LayoutList size={14} className="text-slate-500" />
            <p className="text-xs text-slate-500">Configurar plantilla</p>
          </div>
          {template && (
            <h1 className="text-base font-semibold text-slate-100 leading-tight truncate mt-0.5">
              {template.name}
              <span className="ml-2 text-xs font-mono text-slate-500 font-normal">{template.code}</span>
            </h1>
          )}
        </div>
        {template && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-slate-500">
              <span className="text-emerald-400 font-medium">{activeSections}</span> activas ·{" "}
              <span className="text-slate-600 font-medium">{inactiveSections}</span> inactivas
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">{sections.length} secciones en total</p>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-slate-600" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-rose-400 py-8 justify-center text-sm">
            <AlertCircle size={16} />
            <span>Error cargando la plantilla</span>
          </div>
        )}

        {!isLoading && !error && sections.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-slate-500">Esta plantilla no tiene secciones</p>
          </div>
        )}

        {sections.length > 0 && (
          <>
            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
              Activa o desactiva secciones y campos. Los campos desactivados no aparecen en el formulario
              de inspección. Las secciones desactivadas se muestran como marcador de posición.
            </p>
            <div className="space-y-3">
              {sections.map(s => (
                <SectionCard
                  key={s.id}
                  section={s}
                  onToggleSection={handleToggleSection}
                  onToggleField={handleToggleField}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
