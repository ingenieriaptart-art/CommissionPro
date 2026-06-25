"use client";
import { useState } from "react";
import { FolderTree } from "lucide-react";
import { useAreas, useSystems, useSubsystems } from "@/hooks/useHierarchy";
import { useUpdateEquipment } from "@/hooks/useEquipment";

interface Props {
  projectId: string;
  equipmentId: string;
  onSuccess?: () => void;
}

export function ReclasificarForm({ projectId, equipmentId, onSuccess }: Props) {
  const [areaId, setAreaId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [subsystemId, setSubsystemId] = useState("");
  const [open, setOpen] = useState(false);

  const { data: areas = [] } = useAreas(projectId);
  const { data: systems = [] } = useSystems(areaId);
  const { data: subsystems = [] } = useSubsystems(systemId);
  const updateEquipment = useUpdateEquipment();

  function reset() { setAreaId(""); setSystemId(""); setSubsystemId(""); }

  function handleArea(id: string) { setAreaId(id); setSystemId(""); setSubsystemId(""); }
  function handleSystem(id: string) { setSystemId(id); setSubsystemId(""); }

  function handleSave() {
    if (!subsystemId) return;
    const sub = subsystems.find(s => s.id === subsystemId);
    if (!confirm(`¿Reclasificar este equipo al subsistema "${sub?.name}"?`)) return;
    updateEquipment.mutate(
      { id: equipmentId, subsystem_id: subsystemId },
      { onSuccess: () => { setOpen(false); reset(); onSuccess?.(); } }
    );
  }

  const selectCls =
    "w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
      >
        <FolderTree size={13} /> Reclasificar equipo
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
        Nueva clasificación
      </p>

      <div className="space-y-2">
        <select className={selectCls} value={areaId} onChange={e => handleArea(e.target.value)}>
          <option value="">Área…</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select className={selectCls} value={systemId} disabled={!areaId} onChange={e => handleSystem(e.target.value)}>
          <option value="">Sistema…</option>
          {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select className={selectCls} value={subsystemId} disabled={!systemId} onChange={e => setSubsystemId(e.target.value)}>
          <option value="">Subsistema…</option>
          {subsystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { setOpen(false); reset(); }}
          className="flex-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!subsystemId || updateEquipment.isPending}
          className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {updateEquipment.isPending ? "Guardando…" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
