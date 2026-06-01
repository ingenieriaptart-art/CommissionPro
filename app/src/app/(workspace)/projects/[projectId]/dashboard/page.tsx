"use client";
import { use } from "react";
import { useProject } from "@/hooks/useProject";
import { useProjectStats, calcAvance } from "@/hooks/useStats";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Wrench, CheckSquare, AlertTriangle, TrendingUp,
  MapPin, Calendar, Building2, RefreshCw,
} from "lucide-react";
import { fmtDate, fmtPercent } from "@/lib/utils";

interface Props { params: Promise<{ projectId: string }> }

const statusColor: Record<string, "default" | "info" | "warning" | "success"> = {
  planificacion: "default",
  en_ejecucion:  "info",
  suspendido:    "warning",
  cerrado:       "success",
};
const statusLabel: Record<string, string> = {
  planificacion: "Planificación",
  en_ejecucion:  "En ejecución",
  suspendido:    "Suspendido",
  cerrado:       "Cerrado",
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600",
  "bg-amber-500", "bg-rose-600",   "bg-cyan-600",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const TEST_TYPES = [
  { key: "precom",    label: "Precomisionamiento", total: "tests_precom_total",    ok: "tests_precom_ok",    color: "bg-slate-500"   },
  { key: "fat",       label: "FAT",                total: "tests_fat_total",       ok: "tests_fat_ok",       color: "bg-purple-500"  },
  { key: "sat",       label: "SAT",                total: "tests_sat_total",       ok: "tests_sat_ok",       color: "bg-blue-500"    },
  { key: "loop",      label: "Loop Check",         total: "tests_loop_total",      ok: "tests_loop_ok",      color: "bg-cyan-500"    },
  { key: "energy",    label: "Energización",       total: "tests_energy_total",    ok: "tests_energy_ok",    color: "bg-amber-500"   },
  { key: "funcional", label: "Funcional",          total: "tests_functional_total",ok: "tests_functional_ok",color: "bg-emerald-500" },
] as const;

const EQUIP_STATUS = [
  { key: "equipment_pendiente",    label: "Pendiente",    color: "bg-slate-400"   },
  { key: "equipment_en_ejecucion", label: "En ejecución", color: "bg-blue-500"    },
  { key: "equipment_aprobado",     label: "Aprobado",     color: "bg-emerald-500" },
  { key: "equipment_rechazado",    label: "Rechazado",    color: "bg-red-500"     },
  { key: "equipment_operativo",    label: "Operativo",    color: "bg-teal-500"    },
] as const;

export default function ProjectDashboardPage({ params }: Props) {
  const { projectId } = use(params);
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: stats,   isLoading: loadingStats   } = useProjectStats(projectId);

  if (loadingProject || loadingStats) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const clientName = (project.client_company as { name: string } | undefined)?.name;
  const avance     = stats ? calcAvance(stats) : 0;

  return (
    <div className="space-y-6">

      {/* ── Project header ── */}
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${avatarColor(project.name)}`}>
          {project.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
            <Badge variant={statusColor[project.status] ?? "default"}>
              {statusLabel[project.status] ?? project.status}
            </Badge>
          </div>
          <p className="text-xs font-mono text-blue-600 mt-0.5">{project.code}</p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {clientName && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Building2 size={12} /> {clientName}
              </span>
            )}
            {project.location && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={12} /> {project.location}
              </span>
            )}
            {(project.start_date || project.end_date) && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar size={12} /> {fmtDate(project.start_date)} — {fmtDate(project.end_date)}
              </span>
            )}
          </div>
        </div>
        {stats?.calculated_at && (
          <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0 mt-1">
            <RefreshCw size={10} /> {fmtDate(stats.calculated_at)}
          </span>
        )}
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Wrench size={22} />}
          label="Equipos registrados"
          value={stats?.equipment_total ?? 0}
          sub={stats ? `${stats.equipment_aprobado} aprobados` : ""}
          color="blue"
        />
        <KpiCard
          icon={<CheckSquare size={22} />}
          label="Pruebas cerradas"
          value={stats?.tests_cerrados ?? 0}
          sub={stats ? `de ${stats.tests_total} totales` : ""}
          color="emerald"
        />
        <KpiCard
          icon={<AlertTriangle size={22} />}
          label="Punch abiertos"
          value={stats?.punch_abierto ?? 0}
          sub={stats?.punch_critico_abierto ? `${stats.punch_critico_abierto} críticos` : "Sin críticos"}
          color="amber"
          subDanger={!!stats?.punch_critico_abierto}
        />
        <KpiCard
          icon={<TrendingUp size={22} />}
          label="Avance general"
          value={`${avance}%`}
          sub={stats ? `${stats.equipment_aprobado}/${stats.equipment_total} equipos` : ""}
          color="violet"
          progress={avance}
        />
      </div>

      {/* ── Protocolos por tipo ── */}
      <Card>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Protocolos por tipo</h3>
        <div className="space-y-3">
          {TEST_TYPES.map(({ key, label, total: totalKey, ok: okKey, color }) => {
            const total = stats?.[totalKey] ?? 0;
            const ok    = stats?.[okKey]    ?? 0;
            const pct   = total ? Math.round((ok / total) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {ok}<span className="text-slate-400">/{total}</span>
                    <span className="ml-2 font-medium text-slate-600 dark:text-slate-400">{pct}%</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Estado de equipos ── */}
      <Card>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Estado de equipos</h3>
        {!stats?.equipment_total ? (
          <p className="text-sm text-slate-400 py-4 text-center">Sin equipos registrados</p>
        ) : (
          <div className="space-y-2.5">
            {EQUIP_STATUS.map(({ key, label, color }) => {
              const count = stats?.[key] ?? 0;
              const pct   = stats.equipment_total ? Math.round((count / stats.equipment_total) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 dark:text-slate-400 w-28 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-slate-500 w-14 text-right flex-shrink-0">
                    {count} <span className="text-slate-400">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Punch resumen ── */}
      {!!stats?.punch_total && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",    value: stats.punch_total,          color: "text-slate-700 dark:text-slate-300" },
            { label: "Abiertos", value: stats.punch_abierto,         color: "text-amber-600" },
            { label: "Cerrados", value: stats.punch_cerrado,         color: "text-emerald-600" },
            { label: "Críticos", value: stats.punch_critico_abierto, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center py-3">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">Punch {label}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, progress, subDanger }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: "blue" | "emerald" | "amber" | "violet";
  progress?: number;
  subDanger?: boolean;
}) {
  const palette = {
    blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    icon: "text-blue-600",    val: "text-blue-700 dark:text-blue-300",    bar: "bg-blue-500"    },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: "text-emerald-600", val: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  icon: "text-amber-600",   val: "text-amber-700 dark:text-amber-300",   bar: "bg-amber-500"   },
    violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", icon: "text-violet-600", val: "text-violet-700 dark:text-violet-300", bar: "bg-violet-500"  },
  };
  const c = palette[color];

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className={`text-2xl font-bold leading-none ${c.val}`}>{value}</p>
          <p className="text-xs text-slate-500 mt-1 leading-tight">{label}</p>
        </div>
      </div>
      {sub && (
        <p className={`text-xs ${subDanger ? "text-red-500 font-medium" : "text-slate-400"}`}>
          {sub}
        </p>
      )}
      {progress !== undefined && (
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
            style={{ width: `${progress}%` }} />
        </div>
      )}
    </Card>
  );
}
