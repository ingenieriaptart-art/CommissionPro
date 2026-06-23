"use client";
import { useState } from "react";
import {
  usePunchPaged,
  useCreatePunchWithEvidence,
  useMarkCorrected,
  useClosePunch,
  PUNCH_PAGE_SIZE,
} from "@/hooks/usePunch";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PunchStatusBadge, PunchPriorityBadge } from "@/components/ui/StatusBadge";
import { PunchImagePicker } from "@/components/punch/PunchImagePicker";
import { PunchTransitionModal } from "@/components/punch/PunchTransitionModal";
import { useAuthStore } from "@/stores/auth.store";
import { fmtDate } from "@/lib/utils";
import { Plus, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, Lock } from "lucide-react";
import type { PunchPriority, PunchStatus, PunchItem, EvidenceStage } from "@/types";

interface PunchListProps { projectId: string; }

type ModalState = {
  punch: PunchItem;
  stage: EvidenceStage;
  title: string;
  confirmLabel: string;
  action: "corrected" | "closed";
} | null;

export function PunchList({ projectId }: PunchListProps) {
  const [showForm,       setShowForm]       = useState(false);
  const [filterStatus,   setFilterStatus]   = useState<PunchStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<PunchPriority | "">("");
  const [page,           setPage]           = useState(1);
  const [modal,          setModal]          = useState<ModalState>(null);

  const userId = useAuthStore((s) => s.user?.id ?? "");

  const { data: result, isLoading, isFetching } = usePunchPaged(projectId, {
    status:   filterStatus   || undefined,
    priority: filterPriority || undefined,
    page,
    pageSize: PUNCH_PAGE_SIZE,
  });

  const items      = result?.data ?? [];
  const total      = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PUNCH_PAGE_SIZE));

  const createMutation  = useCreatePunchWithEvidence();
  const correctMutation = useMarkCorrected();
  const closeMutation   = useClosePunch();

  const resetPage = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => { setter(e.target.value); setPage(1); };

  const handleTransitionConfirm = () => {
    if (!modal) return;
    if (modal.action === "corrected") {
      correctMutation.mutate(
        { id: modal.punch.id, projectId },
        { onSuccess: () => setModal(null) }
      );
    } else {
      closeMutation.mutate(
        { id: modal.punch.id, projectId },
        { onSuccess: () => setModal(null) }
      );
    }
  };

  const transitionLoading = correctMutation.isPending || closeMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Select
            options={[
              { value: "abierto",    label: "Abierto"    },
              { value: "en_proceso", label: "En proceso" },
              { value: "corregido",  label: "Corregido"  },
              { value: "cerrado",    label: "Cerrado"    },
            ]}
            placeholder="Todo estado"
            value={filterStatus}
            onChange={resetPage(setFilterStatus as (v: string) => void)}
          />
          <Select
            options={[
              { value: "critica", label: "Crítica" },
              { value: "alta",    label: "Alta"    },
              { value: "media",   label: "Media"   },
              { value: "baja",    label: "Baja"    },
            ]}
            placeholder="Toda prioridad"
            value={filterPriority}
            onChange={resetPage(setFilterPriority as (v: string) => void)}
          />
          {!isLoading && (
            <span className="text-xs text-slate-400">
              {total} item{total !== 1 ? "s" : ""}
              {isFetching && !isLoading && " · actualizando…"}
            </span>
          )}
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          Nuevo Punch
        </Button>
      </div>

      {showForm && (
        <NewPunchForm
          projectId={projectId}
          userId={userId}
          onSave={(d) =>
            createMutation.mutate(d, { onSuccess: () => setShowForm(false) })
          }
          onCancel={() => setShowForm(false)}
          loading={createMutation.isPending}
          error={
            createMutation.isError
              ? (createMutation.error as Error)?.message ?? "Error al crear el punch."
              : undefined
          }
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-12">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            {filterStatus || filterPriority
              ? "Sin resultados con esos filtros"
              : "No hay items de punch list"}
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <PunchCard
                key={item.id}
                item={item}
                onMarkCorrected={() =>
                  setModal({
                    punch: item,
                    stage: "correccion",
                    title: "Evidencia de corrección",
                    confirmLabel: "Marcar corregido",
                    action: "corrected",
                  })
                }
                onClose={() =>
                  setModal({
                    punch: item,
                    stage: "verificacion",
                    title: "Evidencia de verificación",
                    confirmLabel: "Cerrar punch",
                    action: "closed",
                  })
                }
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{total} item(s) · página {page} de {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:border-slate-400 transition-colors"
                >
                  <ChevronLeft size={13} /> Anterior
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:border-slate-400 transition-colors"
                >
                  Siguiente <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <PunchTransitionModal
          punchId={modal.punch.id}
          equipmentId={modal.punch.equipment_id}
          projectId={projectId}
          userId={userId}
          stage={modal.stage}
          title={modal.title}
          confirmLabel={modal.confirmLabel}
          onConfirm={handleTransitionConfirm}
          onClose={() => setModal(null)}
          loading={transitionLoading}
        />
      )}
    </div>
  );
}

function PunchCard({
  item,
  onMarkCorrected,
  onClose,
}: {
  item: PunchItem;
  onMarkCorrected: () => void;
  onClose: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PunchPriorityBadge priority={item.priority} />
            <PunchStatusBadge status={item.status} />
          </div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
          {item.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">Creado {fmtDate(item.created_at)}</p>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          {(item.status === "abierto" || item.status === "en_proceso") && (
            <Button
              size="sm"
              variant="secondary"
              icon={<CheckCircle size={14} />}
              onClick={onMarkCorrected}
            >
              Corregido
            </Button>
          )}
          {item.status === "corregido" && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Lock size={14} />}
              onClick={onClose}
            >
              Cerrar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function NewPunchForm({
  projectId,
  userId,
  onSave,
  onCancel,
  loading,
  error,
}: {
  projectId: string;
  userId: string;
  onSave: (d: {
    project_id: string;
    title: string;
    description: string;
    priority: PunchPriority;
    evidenceBlob: Blob;
    capturedBy: string;
  }) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
}) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [priority,    setPriority]    = useState<PunchPriority>("media");
  const [blob,        setBlob]        = useState<Blob | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);

  const canSubmit = !!title.trim() && !!blob;

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <h4 className="font-medium mb-4 text-slate-900 dark:text-slate-100">Nuevo item de Punch List</h4>
      <div className="space-y-3">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción detallada..."
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        />
        <Select
          label="Prioridad"
          options={[
            { value: "critica", label: "Crítica" },
            { value: "alta",    label: "Alta"    },
            { value: "media",   label: "Media"   },
            { value: "baja",    label: "Baja"    },
          ]}
          value={priority}
          onChange={(e) => setPriority(e.target.value as PunchPriority)}
        />
        <PunchImagePicker
          preview={preview}
          onCapture={(b, p) => { setBlob(b); setPreview(p); }}
          onRemove={() => { setBlob(null); setPreview(null); }}
        />
        {error && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button
            loading={loading}
            disabled={!canSubmit}
            onClick={() =>
              blob &&
              onSave({
                project_id: projectId,
                title: title.trim(),
                description,
                priority,
                evidenceBlob: blob,
                capturedBy: userId,
              })
            }
          >
            Crear Punch
          </Button>
        </div>
      </div>
    </Card>
  );
}
