"use client";
import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { X, Plus, Search, Loader2, Layers, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFormTemplates,
  useEquipmentTypes,
  useEquipmentTypeAssignments,
  useSystemAssignments,
  useSubsystemAssignments,
  useEquipmentDirectAssignments,
  useAssignTemplate,
  useRemoveAssignment,
  type TemplateAssignment,
} from "@/hooks/useTemplateAdmin";

// ── Tipos de tab ─────────────────────────────────────────────────────────────

type Tab = "tipo" | "sistema" | "subsistema" | "equipo";

const TABS: { id: Tab; label: string }[] = [
  { id: "tipo",       label: "Tipo de Equipo" },
  { id: "sistema",    label: "Sistema"        },
  { id: "subsistema", label: "Subsistema"     },
  { id: "equipo",     label: "Equipo"         },
];

const DISCIPLINE_COLORS: Record<string, string> = {
  precomisionamiento: "bg-blue-900/60 text-blue-300 border-blue-700",
  comisionamiento:    "bg-violet-900/60 text-violet-300 border-violet-700",
  inspección:         "bg-emerald-900/60 text-emerald-300 border-emerald-700",
};

function disciplineClass(d: string) {
  return DISCIPLINE_COLORS[d] ?? "bg-slate-700 text-slate-300 border-slate-600";
}

// ── Sub-componente: chips de asignación + selector ────────────────────────────

interface AssignmentCellProps {
  entityId: string;
  assignments: TemplateAssignment[];
  allTemplates: { id: string; key: string; name: string; test_type: string }[];
  level: "equipment_type" | "system" | "subsystem" | "equipment";
  projectId?: string;
}

function AssignmentCell({ entityId, assignments, allTemplates, level, projectId }: AssignmentCellProps) {
  const [open, setOpen] = useState(false);
  const assign   = useAssignTemplate();
  const remove   = useRemoveAssignment();

  const assignedIds = new Set(assignments.map(a => a.template_id));
  const available   = allTemplates.filter(t => !assignedIds.has(t.id));

  function handleAdd(templateId: string) {
    assign.mutate({ level, entityId, templateId, projectId });
    setOpen(false);
  }

  function handleRemove(a: TemplateAssignment) {
    remove.mutate({ level, assignmentId: a.id, projectId });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
      {assignments.map(a => (
        <span
          key={a.id}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-900/50 text-blue-300 border border-blue-700/60"
        >
          {a.template.key}
          <button
            onClick={() => handleRemove(a)}
            className="text-blue-500 hover:text-red-400 transition-colors ml-0.5"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {available.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 hover:border-slate-500 transition-colors"
          >
            <Plus size={10} />
            Asignar
            <ChevronDown size={10} />
          </button>

          {open && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[200px] py-1 max-h-48 overflow-y-auto">
              {available.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleAdd(t.id)}
                  className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <span className="text-[11px] font-mono font-medium text-slate-200">{t.key}</span>
                  <span className="text-[10px] text-slate-500 truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(assign.isPending || remove.isPending) && (
        <Loader2 size={12} className="text-slate-600 animate-spin" />
      )}
    </div>
  );
}

// ── Tab: Tipo de Equipo ───────────────────────────────────────────────────────

function TipoTab({ templates }: { templates: ReturnType<typeof useFormTemplates>["data"] }) {
  const { data: types = [], isLoading: typesLoading }   = useEquipmentTypes();
  const { data: assignMap = {}, isLoading: assignLoading } = useEquipmentTypeAssignments();

  if (typesLoading || assignLoading) return <LoadingRows />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-800">
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-48">Tipo</th>
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-24">Disciplina</th>
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium">Templates asignados</th>
        </tr>
      </thead>
      <tbody>
        {types.map(type => (
          <tr key={type.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-2 px-3">
              <span className="text-[12px] font-medium text-slate-200">{type.name}</span>
              <span className="block text-[10px] text-slate-500 font-mono">{type.code}</span>
            </td>
            <td className="py-2 px-3">
              <span className="text-[10px] text-slate-400">{type.discipline}</span>
            </td>
            <td className="py-2 px-3">
              <AssignmentCell
                entityId={type.id}
                assignments={assignMap[type.id] ?? []}
                allTemplates={templates ?? []}
                level="equipment_type"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Tab: Sistema ─────────────────────────────────────────────────────────────

function SistemaTab({ projectId, templates }: { projectId: string; templates: ReturnType<typeof useFormTemplates>["data"] }) {
  const { data, isLoading } = useSystemAssignments(projectId);

  if (isLoading) return <LoadingRows />;
  if (!data?.systems.length) return <EmptyState text="No hay sistemas en este proyecto." />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-800">
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-48">Sistema</th>
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-36">Área</th>
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium">Templates asignados</th>
        </tr>
      </thead>
      <tbody>
        {data.systems.map(sys => (
          <tr key={sys.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-2 px-3">
              <span className="text-[12px] font-medium text-slate-200">{sys.name}</span>
            </td>
            <td className="py-2 px-3">
              <span className="text-[10px] text-slate-500">{sys.area_name}</span>
            </td>
            <td className="py-2 px-3">
              <AssignmentCell
                entityId={sys.id}
                assignments={data.map[sys.id] ?? []}
                allTemplates={templates ?? []}
                level="system"
                projectId={projectId}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Tab: Subsistema ──────────────────────────────────────────────────────────

function SubsistemaTab({ projectId, templates }: { projectId: string; templates: ReturnType<typeof useFormTemplates>["data"] }) {
  const { data, isLoading } = useSubsystemAssignments(projectId);

  if (isLoading) return <LoadingRows />;
  if (!data?.subsystems.length) return <EmptyState text="No hay subsistemas en este proyecto." />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-800">
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-48">Subsistema</th>
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-36">Sistema</th>
          <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium">Templates asignados</th>
        </tr>
      </thead>
      <tbody>
        {data.subsystems.map(sub => (
          <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-2 px-3">
              <span className="text-[12px] font-medium text-slate-200">{sub.name}</span>
            </td>
            <td className="py-2 px-3">
              <span className="text-[10px] text-slate-500">{sub.system_name}</span>
            </td>
            <td className="py-2 px-3">
              <AssignmentCell
                entityId={sub.id}
                assignments={data.map[sub.id] ?? []}
                allTemplates={templates ?? []}
                level="subsystem"
                projectId={projectId}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Tab: Equipo individual ────────────────────────────────────────────────────

function EquipoTab({ projectId, templates }: { projectId: string; templates: ReturnType<typeof useFormTemplates>["data"] }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce manual simple
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as any)._timer);
    (handleSearch as any)._timer = setTimeout(() => setDebouncedSearch(v), 300);
  };

  const { data, isLoading } = useEquipmentDirectAssignments(projectId, debouncedSearch);

  return (
    <div>
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 max-w-xs">
          <Search size={13} className="text-slate-500 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por TAG o nombre…"
            className="flex-1 bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(""); setDebouncedSearch(""); }}>
              <X size={12} className="text-slate-500 hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : !data?.equipment.length ? (
        <EmptyState text={search ? "Sin resultados para esa búsqueda." : "No hay equipos en este proyecto."} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-32">TAG</th>
              <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium w-56">Nombre</th>
              <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-medium">Templates asignados directamente</th>
            </tr>
          </thead>
          <tbody>
            {data.equipment.map(eq => (
              <tr key={eq.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-2 px-3">
                  <span className="text-[12px] font-mono font-bold text-blue-400">{eq.tag}</span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-[11px] text-slate-300 truncate block max-w-[220px]">{eq.name}</span>
                </td>
                <td className="py-2 px-3">
                  <AssignmentCell
                    entityId={eq.id}
                    assignments={data.map[eq.id] ?? []}
                    allTemplates={templates ?? []}
                    level="equipment"
                    projectId={projectId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function LoadingRows() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={18} className="text-slate-600 animate-spin" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-slate-600 text-sm">{text}</div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const params    = useParams() as { projectId: string };
  const projectId = params.projectId;

  const [activeTab, setActiveTab] = useState<Tab>("tipo");

  const { data: templates = [], isLoading: tplLoading } = useFormTemplates();

  const globalTemplates = useMemo(
    () => templates.filter(t => t.project_id === null || t.project_id === projectId),
    [templates, projectId]
  );

  return (
    <div className="flex flex-col h-full gap-0 -m-4 md:-m-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Layers size={20} className="text-blue-400" />
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-none">
              Templates de Inspección
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión de plantillas globales y asignaciones por tipo, sistema, subsistema y equipo
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo: catálogo de plantillas ─────────────────── */}
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 flex-shrink-0 overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              Plantillas globales
            </p>
          </div>

          {tplLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="text-slate-600 animate-spin" />
            </div>
          ) : (
            <div className="py-1">
              {globalTemplates.map(t => (
                <div
                  key={t.id}
                  className="px-3 py-2.5 border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-mono font-bold text-slate-200">{t.key}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{t.name}</p>
                    </div>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5",
                      disciplineClass(t.test_type)
                    )}>
                      {t.test_type}
                    </span>
                  </div>
                  {t.project_id === null && (
                    <span className="text-[9px] text-slate-600 mt-0.5 block">Global</span>
                  )}
                </div>
              ))}

              {!globalTemplates.length && (
                <p className="text-xs text-slate-600 px-3 py-4 italic">
                  Sin plantillas. Ejecuta la migración 0022.
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ── Panel derecho: asignaciones por nivel ───────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-slate-200 dark:border-slate-800 px-4 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"
                )}
              >
                {tab.label}
              </button>
            ))}

            <div className="ml-auto text-[10px] text-slate-600 pb-1">
              Las asignaciones por tipo aplican a todos los proyectos
            </div>
          </div>

          {/* Contenido del tab */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "tipo" && (
              <TipoTab templates={globalTemplates} />
            )}
            {activeTab === "sistema" && (
              <SistemaTab projectId={projectId} templates={globalTemplates} />
            )}
            {activeTab === "subsistema" && (
              <SubsistemaTab projectId={projectId} templates={globalTemplates} />
            )}
            {activeTab === "equipo" && (
              <EquipoTab projectId={projectId} templates={globalTemplates} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
