"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PunchStatusBadge, PunchPriorityBadge } from "@/components/ui/StatusBadge";
import { fmtDate } from "@/lib/utils";
import { Plus, AlertTriangle } from "lucide-react";
import type { PunchItem, PunchPriority, PunchStatus } from "@/types";

interface PunchListProps { projectId: string; }

export function PunchList({ projectId }: PunchListProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PunchStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<PunchPriority | "">("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["punch", projectId],
    queryFn: async (): Promise<PunchItem[]> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data } = await supabase.from("punch_items")
          .select("*").eq("project_id", projectId).is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (data) await localDB.punchItems.bulkPut(data as PunchItem[]);
        return (data ?? []) as PunchItem[];
      }
      return localDB.punchItems.where("project_id").equals(projectId).toArray();
    },
  });

  const filteredItems = items.filter((i) => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; priority: PunchPriority }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const item: PunchItem = {
        id, project_id: projectId, title: data.title,
        description: data.description, priority: data.priority,
        status: "abierto", created_at: now, updated_at: now,
        sync_status: "pending", version: 1,
      };
      await localDB.punchItems.add(item);
      await enqueueSync("punch_items", id, "INSERT", item);
      if (navigator.onLine) {
        const supabase = createClient();
        await supabase.from("punch_items").insert(item);
        await localDB.punchItems.update(id, { sync_status: "synced" });
      }
      return item;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["punch", projectId] }); setShowForm(false); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Select
            options={[
              { value: "abierto", label: "Abierto" },
              { value: "en_proceso", label: "En proceso" },
              { value: "corregido", label: "Corregido" },
              { value: "cerrado", label: "Cerrado" },
            ]}
            placeholder="Todo estado"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PunchStatus | "")}
          />
          <Select
            options={[
              { value: "critica", label: "Crítica" },
              { value: "alta", label: "Alta" },
              { value: "media", label: "Media" },
              { value: "baja", label: "Baja" },
            ]}
            placeholder="Toda prioridad"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as PunchPriority | "")}
          />
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          Nuevo Punch
        </Button>
      </div>

      {showForm && <NewPunchForm onSave={createMutation.mutate} onCancel={() => setShowForm(false)} loading={createMutation.isPending} />}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay items de punch list</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
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
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPunchForm({ onSave, onCancel, loading }: {
  onSave: (d: { title: string; description: string; priority: PunchPriority }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PunchPriority>("media");

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <h4 className="font-medium mb-4 text-slate-900 dark:text-slate-100">Nuevo item de Punch List</h4>
      <div className="space-y-3">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción detallada..." rows={3}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" />
        <Select label="Prioridad"
          options={[
            { value: "critica", label: "Crítica" },
            { value: "alta", label: "Alta" },
            { value: "media", label: "Media" },
            { value: "baja", label: "Baja" },
          ]}
          value={priority}
          onChange={(e) => setPriority(e.target.value as PunchPriority)} />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button loading={loading} disabled={!title} onClick={() => onSave({ title, description, priority })}>
            Crear Punch
          </Button>
        </div>
      </div>
    </Card>
  );
}
