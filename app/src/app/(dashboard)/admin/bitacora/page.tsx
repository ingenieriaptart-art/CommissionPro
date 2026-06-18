"use client";
import { useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useUserList } from "@/hooks/useUsers";
import { useAuditLog, type AuditFilters } from "@/hooks/useAuditLog";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { ENTITY_LABEL } from "@/lib/auditLabels";

const PAGE_SIZE = 50;

const inputCls = "bg-slate-800 border border-slate-600 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500";

const EMPTY: AuditFilters = { page: 1, pageSize: PAGE_SIZE };

export default function BitacoraPage() {
  const { isRole } = useAuthStore();
  const { data: users = [] } = useUserList();
  const [filters, setFilters] = useState<AuditFilters>(EMPTY);
  const { data, isLoading, isError, error, isFetching } = useAuditLog(filters);

  if (!isRole("admin")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ScrollText size={28} className="text-slate-400 mb-3" />
        <p className="text-sm font-semibold text-slate-200">Solo administradores</p>
        <p className="text-xs text-slate-400 mt-1">No tienes acceso a la bitácora.</p>
      </div>
    );
  }

  // Cambiar un filtro vuelve a la página 1.
  const set = (patch: Partial<AuditFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ScrollText size={22} className="text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bitácora de acciones</h1>
          <p className="text-slate-500 text-sm">Quién creó, editó o eliminó qué en el sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase">Usuario</span>
          <select className={inputCls} value={filters.userId ?? ""} onChange={(e) => set({ userId: e.target.value || undefined })}>
            <option value="">Todos</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase">Módulo</span>
          <select className={inputCls} value={filters.entity ?? ""} onChange={(e) => set({ entity: e.target.value || undefined })}>
            <option value="">Todos</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase">Acción</span>
          <select className={inputCls} value={filters.action ?? ""} onChange={(e) => set({ action: (e.target.value || undefined) as AuditFilters["action"] })}>
            <option value="">Todas</option>
            <option value="INSERT">Creó</option>
            <option value="UPDATE">Editó</option>
            <option value="DELETE">Eliminó</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase">Desde</span>
          <input type="date" className={inputCls} value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase">Hasta</span>
          <input type="date" className={inputCls} value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value ? `${e.target.value}T23:59:59` : undefined })} />
        </label>
        <button
          onClick={() => setFilters(EMPTY)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-400 transition-colors"
        >
          <RotateCcw size={12} /> Limpiar
        </button>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">
          {error instanceof Error ? error.message : "Error al cargar la bitácora"}
        </p>
      ) : (
        <>
          <AuditLogTable rows={data?.rows ?? []} />

          {/* Paginación */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{total} registro(s){isFetching && " · actualizando…"}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 text-slate-200 border border-slate-600 disabled:opacity-40 hover:border-slate-400 transition-colors"
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <span>Página {filters.page} de {totalPages}</span>
              <button
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 text-slate-200 border border-slate-600 disabled:opacity-40 hover:border-slate-400 transition-colors"
              >
                Siguiente <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
