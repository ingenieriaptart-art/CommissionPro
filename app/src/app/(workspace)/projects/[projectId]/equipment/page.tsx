"use client";
import { use, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEquipmentPaged, useCreateEquipment, EQUIP_PAGE_SIZE } from "@/hooks/useEquipment";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EquipmentStatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Plus, Wrench, Search, ScanSearch, FileOutput, FileText, FolderTree, X, ChevronLeft, ChevronRight } from "lucide-react";
import { TagSearchModal } from "@/components/shared/TagSearchModal";
import { EquipmentPdfUpload } from "@/components/equipment/EquipmentPdfUpload";
import { EquipmentDocuments } from "@/components/equipment/EquipmentDocuments";
import { ReclasificarForm } from "@/components/equipment/ReclasificarForm";
import { useAuthStore } from "@/stores/auth.store";
import type { Equipment, Criticality } from "@/types";

interface Props { params: Promise<{ projectId: string }> }

export default function EquipmentPage({ params }: Props) {
  const { projectId }   = use(params);
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const canEditEquipment = useAuthStore((s) => s.canWrite(projectId, "equipment"));
  const authUser = useAuthStore((s) => s.user);
  const userRoleKey = authUser?.role?.key ?? "";
  const isAdminOrDirector = userRoleKey === "admin" || userRoleKey === "director";

  const [inputValue, setInputValue]       = useState(searchParams.get("tag") ?? "");
  const [search, setSearch]               = useState(searchParams.get("tag") ?? "");
  const [page, setPage]                   = useState(1);
  const [showForm, setShowForm]               = useState(false);
  const [tagSearchOpen, setTagSearchOpen]     = useState(false);
  const [docsEquipment, setDocsEquipment]     = useState<Equipment | null>(null);
  const [reclasEquipment, setReclasEquipment] = useState<Equipment | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: aplica el search 350ms después de que el usuario deja de escribir
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(inputValue);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputValue]);

  const createEquipment = useCreateEquipment();
  const { data: result, isLoading, isFetching } = useEquipmentPaged(projectId, {
    search,
    page,
    pageSize: EQUIP_PAGE_SIZE,
  });

  const equipment  = result?.data ?? [];
  const total      = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / EQUIP_PAGE_SIZE));

  const criticalityColor: Record<Criticality, "danger" | "warning" | "default"> = {
    alta: "danger", media: "warning", baja: "default",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Equipos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total} equipo(s){isFetching && !isLoading && " · actualizando…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            icon={<ScanSearch size={16} />}
            onClick={() => setTagSearchOpen(true)}
          >
            Buscar TAG
          </Button>
          <Button
            variant="ghost"
            icon={<FileOutput size={16} />}
            onClick={() => router.push(`/projects/${projectId}/reports/inspeccion`)}
          >
            Listado Inspección
          </Button>
          {canEditEquipment && (
            <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
              Nuevo equipo
            </Button>
          )}
        </div>
      </div>

      <Input
        placeholder="Buscar por TAG o nombre…"
        icon={<Search size={16} />}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />

      {showForm && (
        <EquipmentForm
          projectId={projectId}
          onSave={async (data) => {
            await createEquipment.mutateAsync(data as Parameters<typeof createEquipment.mutateAsync>[0]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          loading={createEquipment.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : equipment.length === 0 ? (
        <Card className="text-center py-16">
          <Wrench size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {search ? "Sin resultados para esa búsqueda" : "No hay equipos registrados"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {equipment.map((eq) => (
            <Card key={eq.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-xs text-blue-600 font-bold">{eq.tag}</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{eq.name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {isAdminOrDirector && (
                    <button
                      onClick={() => setReclasEquipment(eq)}
                      title="Reclasificar equipo"
                      className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <FolderTree size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setDocsEquipment(eq)}
                    title="Documentos técnicos (manual / FAT)"
                    className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <FileText size={14} />
                  </button>
                  <EquipmentStatusBadge status={eq.status} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant={criticalityColor[eq.criticality]}>
                  Crit. {eq.criticality}
                </Badge>
                {eq.metadata?.unclassified === true && (
                  <Badge variant="warning">
                    Sin clasificar
                  </Badge>
                )}
                {eq.manufacturer && (
                  <span className="text-xs text-slate-500">{eq.manufacturer}</span>
                )}
              </div>
              {(eq.voltage || eq.power) && (
                <p className="text-xs text-slate-400 mt-2">
                  {eq.voltage && `${eq.voltage}V`} {eq.power && `· ${eq.power}kW`}
                </p>
              )}
              {(eq.service || eq.io_type || eq.rtu_destination) && (
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {[eq.io_type, eq.rtu_destination, eq.service].filter(Boolean).join(" · ")}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{total} equipo(s) · página {page} de {totalPages}</span>
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

      <TagSearchModal
        projectId={projectId}
        isOpen={tagSearchOpen}
        onClose={() => setTagSearchOpen(false)}
      />

      {/* Modal reclasificar */}
      {reclasEquipment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReclasEquipment(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-blue-600 font-bold">{reclasEquipment.tag}</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{reclasEquipment.name}</p>
              </div>
              <button onClick={() => setReclasEquipment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <ReclasificarForm
              projectId={projectId}
              equipmentId={reclasEquipment.id}
              onSuccess={() => setReclasEquipment(null)}
            />
          </div>
        </div>
      )}

      {/* Panel documentos técnicos */}
      {docsEquipment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDocsEquipment(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-blue-600 font-bold">{docsEquipment.tag}</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{docsEquipment.name}</p>
              </div>
              <button onClick={() => setDocsEquipment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Documentos técnicos</p>
            <EquipmentDocuments equipmentId={docsEquipment.id} projectId={projectId} />
            <EquipmentPdfUpload
              equipmentId={docsEquipment.id}
              field="catalog_url"
              label="Manual del catálogo (fabricante)"
              currentUrl={docsEquipment.catalog_url}
            />
            <EquipmentPdfUpload
              equipmentId={docsEquipment.id}
              field="fat_protocol_url"
              label="Protocolo de pruebas FAT"
              currentUrl={docsEquipment.fat_protocol_url}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentForm({ projectId, onSave, onCancel, loading }: {
  projectId: string;
  onSave: (data: Partial<Equipment>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [criticality, setCriticality] = useState<Criticality>("media");

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <h4 className="font-medium mb-4">Nuevo Equipo</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="TAG" value={tag} onChange={(e) => setTag(e.target.value)} required />
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Fabricante" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        <Select
          label="Criticidad"
          options={[
            { value: "alta", label: "Alta" },
            { value: "media", label: "Media" },
            { value: "baja", label: "Baja" },
          ]}
          value={criticality}
          onChange={(e) => setCriticality(e.target.value as Criticality)}
        />
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button
          loading={loading}
          disabled={!tag || !name}
          onClick={() => onSave({ tag, name, manufacturer, criticality, status: "pendiente" })}
        >
          Crear equipo
        </Button>
      </div>
    </Card>
  );
}
