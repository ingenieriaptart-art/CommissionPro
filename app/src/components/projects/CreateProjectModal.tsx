"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X } from "lucide-react";
import type { Project } from "@/types";

interface Props {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    location: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "planificacion" as const,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError("Código y nombre son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
    };
    const { data, error: err } = await supabase
      .from("projects")
      .insert(payload)
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated(data as Project);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nuevo proyecto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Código *" value={form.code} onChange={(e) => set("code", e.target.value)}
              placeholder="PRY-001" />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Estado</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as typeof form.status)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="planificacion">Planificación</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="suspendido">Suspendido</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          <Input label="Nombre *" value={form.name} onChange={(e) => set("name", e.target.value)}
            placeholder="PTAR Norte – Fase 1" />

          <Input label="Ubicación" value={form.location} onChange={(e) => set("location", e.target.value)}
            placeholder="Ciudad, Departamento" />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Descripción</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={2} placeholder="Descripción breve del proyecto..."
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha inicio" type="date" value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)} />
            <Input label="Fecha fin" type="date" value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear proyecto</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
