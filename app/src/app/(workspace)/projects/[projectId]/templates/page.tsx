"use client";
import { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { X, Plus, Search, Loader2, Layers, ChevronDown, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFormTemplates,
  useEquipmentTypes,
  useEquipmentTypeAssignments,
  useSystemAssignments,
  useSubsystemAssignments,
  useDefaultTemplates,
  useEquipmentDirectAssignments,
  useProjectEquipmentResolution,
  useAssignTemplate,
  useRemoveAssignment,
  type TemplateAssignment,
  type AssignmentSource,
  type AssignLevel,
} from "@/hooks/useTemplateAdmin";

// ── Constantes de presentación ────────────────────────────────────────────────

const SOURCE_META: Record<AssignmentSource, { label: string; chip: string; badge: string }> = {
  equipment:      { label: "Equipo",          chip: "bg-blue-900/60 text-blue-300 border-blue-700",         badge: "bg-blue-800/50 text-blue-300" },
  subsystem:      { label: "Subsistema",      chip: "bg-violet-900/60 text-violet-300 border-violet-700",   badge: "bg-violet-800/50 text-violet-300" },
  system:         { label: "Sistema",         chip: "bg-amber-900/60 text-amber-300 border-amber-700",      badge: "bg-amber-800/50 text-amber-300" },
  equipment_type: { label: "Tipo de equipo",  chip: "bg-emerald-900/60 text-emerald-300 border-emerald-700",badge: "bg-emerald-800/50 text-emerald-300" },
  default:        { label: "Default",         chip: "bg-slate-700/80 text-slate-300 border-slate-600",      badge: "bg-slate-700 text-slate-400" },
};

type Tab = "tipo" | "sistema" | "subsistema" | "equipo" | "default";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "tipo",       label: "Tipo de Equipo", description: "Global — aplica a todos los proyectos" },
  { id: "sistema",    label: "Sistema",        description: "Aplica a todos los equipos del sistema" },
  { id: "subsistema", label: "Subsistema",     description: "Aplica a todos los equipos del subsistema" },
  { id: "equipo",     label: "Equipo",         description: "Asignación directa + vista de herencia" },
  { id: "default",    label: "Fallback",       description: "Template de último recurso del proyecto" },
];

// ── Chip de asignación directa (con botón ×) ─────────────────────────────────

function DirectChip({ assignment, level, projectId }: {
  assignment: TemplateAssignment;
  level: AssignLevel;
  projectId?: string;
}) {
  const remove = useRemoveAssignment();
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-blue-900/50 text-blue-300 border border-blue-700/60">
      {assignment.template.key}
      <button
        onClick={() => remove.mutate({ level, assignmentId: assignment.id, projectId })}
        className="text-blue-500 hover:text-red-400 transition-colors"
        title="Remover asignación"
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ── Chip heredado (solo lectura, con badge de origen) ────────────────────────

function InheritedChip({ templateKey, source }: { templateKey: string; source: AssignmentSource }) {
  const meta = SOURCE_META[source];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono border border-dashed",
      meta.chip
    )}>
      <span className="opacity-60">⇑</span>
      {templateKey}
      <span className={cn("text-[9px] rounded px-1 py-0 font-sans font-medium not-italic", meta.badge)}>
        {meta.label}
      </span>
    </span>
  );
}

// ── Selector inline para agregar template ────────────────────────────────────

function AddTemplateDropdown({ entityId, assignedIds, allTemplates, level, projectId }: {
  entityId: string;
  assignedIds: Set<string>;
  allTemplates: { id: string; key: string; name: string }[];
  level: AssignLevel;
  projectId?: string;
}) {
  const [open, setOpen]       = useState(false);
  const assign                = useAssignTemplate();
  const available             = allTemplates.filter(t => !assignedIds.has(t.id));

  function handleAdd(templateId: string) {
    assign.mutate({ level, entityId, templateId, projectId });
    setOpen(false);
  }

  if (!available.length) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 hover:border-slate-500 transition-colors"
      >
        <Plus size={10} />
        Asignar
        <ChevronDown size={9} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl min-w-[220px] py-1 max-h-52 overflow-y-auto">
            {available.map(t => (
              <button
                key={t.id}
                onClick={() => handleAdd(t.id)}
                className="w-full flex items-start gap-3 px-3 py-2 hover:bg-slate-700 text-left transition-colors"
              >
                <span className="text-[11px] font-mono font-bold text-blue-300 flex-shrink-0">{t.key}</span>
                <span className="text-[10px] text-slate-400 leading-tight">{t.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {assign.isPending && <Loader2 size={11} className="inline ml-1 text-slate-500 animate-spin" />}
    </div>
  );
}

// ── Tab: Tipo de Equipo ───────────────────────────────────────────────────────

function TipoTab({ templates }: { templates: { id: string; key: string; name: string }[] }) {
  const { data: types = [],  isLoading: l1 } = useEquipmentTypes();
  const { data: assignMap = {}, isLoading: l2 } = useEquipmentTypeAssignments();

  if (l1 || l2) return <LoadingRows />;

  return (
    <table className="w-full text-sm">
      <colgroup><col className="w-56" /><col className="w-24" /><col /></colgroup>
      <thead>
        <tr className="border-b border-slate-800 bg-slate-900/40">
          <Th>Tipo de equipo</Th><Th>Disciplina</Th><Th>Templates asignados (nivel global)</Th>
        </tr>
      </thead>
      <tbody>
        {types.map(type => {
          const assignments = assignMap[type.id] ?? [];
          const assignedIds = new Set(assignments.map(a => a.template_id));
          return (
            <tr key={type.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
              <Td>
                <p className="text-[12px] font-medium text-slate-200">{type.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{type.code}</p>
              </Td>
              <Td><span className="text-[10px] text-slate-400">{type.discipline}</span></Td>
              <Td>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {assignments.map(a => (
                    <DirectChip key={a.id} assignment={a} level="equipment_type" />
                  ))}
                  <AddTemplateDropdown
                    entityId={type.id}
                    assignedIds={assignedIds}
                    allTemplates={templates}
                    level="equipment_type"
                  />
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Tab: Sistema ─────────────────────────────────────────────────────────────

function SistemaTab({ projectId, templates }: { projectId: string; templates: { id: string; key: string; name: string }[] }) {
  const { data, isLoading } = useSystemAssignments(projectId);
  if (isLoading) return <LoadingRows />;
  if (!data?.systems.length) return <EmptyState text="No hay sistemas en este proyecto." />;
  return (
    <table className="w-full text-sm">
      <colgroup><col className="w-56" /><col className="w-32" /><col /></colgroup>
      <thead>
        <tr className="border-b border-slate-800 bg-slate-900/40">
          <Th>Sistema</Th><Th>Área</Th><Th>Templates asignados</Th>
        </tr>
      </thead>
      <tbody>
        {data.systems.map(sys => {
          const assignments = data.map[sys.id] ?? [];
          const assignedIds = new Set(assignments.map(a => a.template_id));
          return (
            <tr key={sys.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
              <Td><p className="text-[12px] font-medium text-slate-200">{sys.name}</p></Td>
              <Td><span className="text-[10px] text-slate-500">{sys.area_name}</span></Td>
              <Td>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {assignments.map(a => (
                    <DirectChip key={a.id} assignment={a} level="system" projectId={projectId} />
                  ))}
                  <AddTemplateDropdown entityId={sys.id} assignedIds={assignedIds} allTemplates={templates} level="system" projectId={projectId} />
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Tab: Subsistema ──────────────────────────────────────────────────────────

function SubsistemaTab({ projectId, templates }: { projectId: string; templates: { id: string; key: string; name: string }[] }) {
  const { data, isLoading } = useSubsystemAssignments(projectId);
  if (isLoading) return <LoadingRows />;
  if (!data?.subsystems.length) return <EmptyState text="No hay subsistemas en este proyecto." />;
  return (
    <table className="w-full text-sm">
      <colgroup><col className="w-56" /><col className="w-32" /><col /></colgroup>
      <thead>
        <tr className="border-b border-slate-800 bg-slate-900/40">
          <Th>Subsistema</Th><Th>Sistema</Th><Th>Templates asignados</Th>
        </tr>
      </thead>
      <tbody>
        {data.subsystems.map(sub => {
          const assignments = data.map[sub.id] ?? [];
          const assignedIds = new Set(assignments.map(a => a.template_id));
          return (
            <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
              <Td><p className="text-[12px] font-medium text-slate-200">{sub.name}</p></Td>
              <Td><span className="text-[10px] text-slate-500">{sub.system_name}</span></Td>
              <Td>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {assignments.map(a => (
                    <DirectChip key={a.id} assignment={a} level="subsystem" projectId={projectId} />
                  ))}
                  <AddTemplateDropdown entityId={sub.id} assignedIds={assignedIds} allTemplates={templates} level="subsystem" projectId={projectId} />
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Tab: Equipo (directos + herencia + Origen) ────────────────────────────────

const PAGE_SIZE = 50;

function EquipoTab({ projectId, templates }: { projectId: string; templates: { id: string; key: string; name: string }[] }) {
  const [search, setSearch]   = useState("");
  const [query,  setQuery]    = useState("");
  const [page,   setPage]     = useState(0);

  // Debounce de búsqueda
  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => { setQuery(v); setPage(0); }, 350);
  }, []);

  // Resolución bulk del RPC
  const { data, isLoading, isFetching } = useProjectEquipmentResolution(projectId, query, page, PAGE_SIZE);

  // Asignaciones directas editables (tab equipo)
  const { data: directData } = useEquipmentDirectAssignments(projectId, query);

  const rows    = data?.rows ?? [];
  const total   = data?.totalCount ?? 0;
  const pages   = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Barra de búsqueda + paginación */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-slate-500 flex-shrink-0" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por TAG o nombre…"
            className="flex-1 bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(""); setQuery(""); setPage(0); }}>
              <X size={12} className="text-slate-500 hover:text-white" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          {isFetching && <Loader2 size={12} className="animate-spin" />}
          <span>{total} equipos</span>
          {pages > 1 && (
            <>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span>{page + 1} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors">
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : !rows.length ? (
        <EmptyState text={query ? "Sin equipos que coincidan." : "No hay equipos en este proyecto."} />
      ) : (
        <table className="w-full text-sm">
          <colgroup><col className="w-28" /><col className="w-48" /><col /><col /></colgroup>
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              <Th>TAG</Th>
              <Th>Nombre</Th>
              <Th>
                <span className="flex items-center gap-1">
                  Asignado directamente
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                </span>
              </Th>
              <Th>
                <span className="flex items-center gap-1">
                  Heredado
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span className="text-[9px] font-normal text-slate-500">+ Origen</span>
                </span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(eq => {
              const directAssignments = directData?.map[eq.id] ?? [];
              const directIds         = new Set(directAssignments.map(a => a.template_id));
              const inherited         = eq.templates.filter(t => t.source !== "equipment");
              const hasNothing        = directAssignments.length === 0 && inherited.length === 0;

              return (
                <tr key={eq.id} className={cn(
                  "border-b border-slate-800/50 hover:bg-slate-800/20",
                  hasNothing && "bg-amber-950/20"
                )}>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      {hasNothing && (
                        <AlertCircle size={11} className="text-amber-500 flex-shrink-0" aria-label="Sin templates asignados" />
                      )}
                      <span className="text-[12px] font-mono font-bold text-blue-400">{eq.tag}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-[11px] text-slate-300 truncate block max-w-[180px]">{eq.name}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {directAssignments.map(a => (
                        <DirectChip key={a.id} assignment={a} level="equipment" projectId={projectId} />
                      ))}
                      <AddTemplateDropdown
                        entityId={eq.id}
                        assignedIds={directIds}
                        allTemplates={templates}
                        level="equipment"
                        projectId={projectId}
                      />
                    </div>
                  </Td>
                  <Td>
                    {inherited.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {inherited.map(t => (
                          <InheritedChip key={t.id} templateKey={t.key} source={t.source} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-700 italic">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Tab: Default (fallback del proyecto) ─────────────────────────────────────

function DefaultTab({ projectId, templates }: { projectId: string; templates: { id: string; key: string; name: string }[] }) {
  const { data: assignments = [], isLoading } = useDefaultTemplates(projectId);
  const assignedIds = new Set(assignments.map(a => a.template_id));

  if (isLoading) return <LoadingRows />;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-xs text-slate-400 leading-relaxed max-w-xl">
        <p className="font-semibold text-slate-300 mb-1">¿Qué es el template fallback?</p>
        <p>
          Cuando un equipo no tiene ningún template asignado por tipo, sistema, subsistema
          ni directamente, se usa el template fallback del proyecto. Es el último nivel de
          resolución en la jerarquía. Útil para garantizar que todos los equipos tengan
          al menos un protocolo base de inspección.
        </p>
      </div>

      <div>
        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-3">Templates fallback activos</p>
        <div className="flex flex-wrap gap-2 items-start">
          {assignments.map(a => (
            <DirectChip key={a.id} assignment={a} level="default" projectId={projectId} />
          ))}
          <AddTemplateDropdown
            entityId={projectId}
            assignedIds={assignedIds}
            allTemplates={templates}
            level="default"
            projectId={projectId}
          />
        </div>
        {!assignments.length && (
          <p className="text-[11px] text-slate-600 italic mt-1">
            Sin fallback configurado. Equipos sin template no mostrarán ninguna plantilla.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Helpers de presentación ───────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2 px-3 align-middle">{children}</td>;
}

function LoadingRows() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="text-slate-700 animate-spin" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-600 text-xs">{text}</div>
  );
}

// ── Leyenda de colores de origen ──────────────────────────────────────────────

function OriginLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {(Object.entries(SOURCE_META) as [AssignmentSource, typeof SOURCE_META[AssignmentSource]][]).map(([key, meta]) => (
        <span key={key} className={cn("text-[9px] px-2 py-0.5 rounded border font-medium", meta.chip)}>
          {meta.label}
        </span>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const params    = useParams() as { projectId: string };
  const projectId = params.projectId;

  const [activeTab, setActiveTab] = useState<Tab>("tipo");

  const { data: allTemplates = [], isLoading: tplLoading } = useFormTemplates();

  // Templates disponibles para asignar: globales + del proyecto actual
  const assignableTemplates = useMemo(
    () => allTemplates
      .filter(t => t.project_id === null || t.project_id === projectId)
      .map(t => ({ id: t.id, key: t.key, name: t.name })),
    [allTemplates, projectId]
  );

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Layers size={20} className="text-blue-400 flex-shrink-0" />
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Templates de Inspección</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Motor de asignación por jerarquía — Equipo → Subsistema → Sistema → Tipo → Fallback
              </p>
            </div>
          </div>
          <OriginLegend />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo: catálogo de templates ─────────────────── */}
        <aside className="w-60 border-r border-slate-800 flex flex-col bg-slate-900 flex-shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
              Catálogo global
            </p>
          </div>

          {tplLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={16} className="text-slate-700 animate-spin" /></div>
          ) : (
            <div className="py-0.5">
              {assignableTemplates.map(t => {
                const ft = allTemplates.find(x => x.id === t.id);
                return (
                  <div key={t.id} className="px-3 py-2 border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono font-bold text-slate-200">{t.key}</p>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{t.name}</p>
                      </div>
                      {ft?.test_type && (
                        <span className="text-[8px] text-slate-600 flex-shrink-0 mt-0.5 font-mono">{ft.test_type}</span>
                      )}
                    </div>
                    {ft?.project_id === null && (
                      <span className="text-[8px] text-slate-700">global</span>
                    )}
                  </div>
                );
              })}
              {!assignableTemplates.length && (
                <p className="text-xs text-slate-600 px-3 py-4 italic">
                  Sin plantillas. Ejecuta la migración 0022.
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ── Panel derecho: asignaciones por nivel ───────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">

          {/* Tabs */}
          <div className="flex items-end border-b border-slate-800 px-4 gap-0 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                )}
              >
                {tab.label}
              </button>
            ))}
            <span className="ml-4 pb-2 text-[10px] text-slate-600 self-end whitespace-nowrap">
              {activeTabMeta.description}
            </span>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "tipo"       && <TipoTab       templates={assignableTemplates} />}
            {activeTab === "sistema"    && <SistemaTab    projectId={projectId} templates={assignableTemplates} />}
            {activeTab === "subsistema" && <SubsistemaTab projectId={projectId} templates={assignableTemplates} />}
            {activeTab === "equipo"     && <EquipoTab     projectId={projectId} templates={assignableTemplates} />}
            {activeTab === "default"    && <DefaultTab    projectId={projectId} templates={assignableTemplates} />}
          </div>
        </div>
      </div>
    </div>
  );
}
