"use client";
import { useState } from "react";
import { ChevronDown, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  entityLabel, ACTION_LABEL, actionKind, extractIdentifier, diffFields, fmtValue,
} from "@/lib/auditLabels";
import type { AuditRow } from "@/types";

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-900 text-emerald-300 border-emerald-700",
  edit:   "bg-blue-900 text-blue-300 border-blue-700",
  delete: "bg-red-900 text-red-300 border-red-700",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function AuditRowItem({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  const kind = actionKind(row.action);
  const fields = diffFields(row.before, row.after);

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="border-b border-slate-700 hover:bg-slate-800/60 cursor-pointer transition-colors"
      >
        <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(row.created_at)}</td>
        <td className="px-3 py-2 text-xs text-slate-200">
          <span className="inline-flex items-center gap-1.5">
            <UserIcon size={12} className="text-slate-500" />
            {row.user ? row.user.full_name : <span className="italic text-slate-500">Sistema</span>}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-slate-300">{entityLabel(row.entity)}</td>
        <td className="px-3 py-2">
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", ACTION_STYLE[kind])}>
            {ACTION_LABEL[row.action] ?? row.action}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-slate-200 font-medium">{extractIdentifier(row)}</td>
        <td className="px-2 py-2 text-right">
          <ChevronDown size={14} className={cn("inline transition-transform text-slate-500", open && "rotate-180")} />
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-900/60">
          <td colSpan={6} className="px-4 py-3">
            {fields.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Sin cambios de campos registrados.</p>
            ) : (
              <div className="space-y-1">
                {fields.map((f) => (
                  <div key={f.field} className="grid grid-cols-[160px_1fr] gap-2 text-xs">
                    <span className="text-slate-400 truncate">{f.field}</span>
                    <span className="text-slate-200 break-all">
                      {kind !== "create" && (
                        <span className="text-red-300/80 line-through mr-1">{fmtValue(f.from)}</span>
                      )}
                      {kind !== "delete" && (
                        <span className="text-emerald-300">→ {fmtValue(f.to)}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">Sin registros para los filtros seleccionados.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full">
        <thead className="bg-slate-800">
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2 font-medium">Fecha/hora</th>
            <th className="px-3 py-2 font-medium">Usuario</th>
            <th className="px-3 py-2 font-medium">Módulo</th>
            <th className="px-3 py-2 font-medium">Acción</th>
            <th className="px-3 py-2 font-medium">Qué</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <AuditRowItem key={r.id} row={r} />)}
        </tbody>
      </table>
    </div>
  );
}
