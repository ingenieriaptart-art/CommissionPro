"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useCreateUser, useRoles } from "@/hooks/useUsers";
import type { User } from "@/types";

const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  onClose:   () => void;
  onCreated: (user: User) => void;
}

export function CreateUserModal({ onClose, onCreated }: Props) {
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role_id: "", position: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await createUser.mutateAsync({
        email:     form.email.trim(),
        password:  form.password,
        full_name: form.full_name.trim(),
        role_id:   form.role_id,
        position:  form.position.trim() || undefined,
        phone:     form.phone.trim()    || undefined,
      });
      onCreated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100">Nuevo usuario</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <Field label="Nombre completo *">
            <input required value={form.full_name} onChange={set("full_name")} className={inputCls} placeholder="Juan García" />
          </Field>
          <Field label="Email *">
            <input required type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="juan@empresa.com" />
          </Field>
          <Field label="Contraseña *">
            <input required type="password" value={form.password} onChange={set("password")} className={inputCls} placeholder="Mínimo 8 caracteres" minLength={8} />
          </Field>
          <Field label="Rol *">
            <select required value={form.role_id} onChange={set("role_id")} className={inputCls}>
              <option value="">Seleccioná un rol…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Cargo">
            <input value={form.position} onChange={set("position")} className={inputCls} placeholder="Jefe de Proyecto" />
          </Field>
          <Field label="Teléfono">
            <input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+57 300 000 0000" />
          </Field>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createUser.isPending}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 transition-colors">
              {createUser.isPending ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
