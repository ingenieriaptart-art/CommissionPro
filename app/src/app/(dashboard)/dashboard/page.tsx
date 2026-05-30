"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  FolderKanban, Wrench, CheckSquare, AlertTriangle,
  FileText, TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";

// [A-003 FIX] Tipo alineado con mv_project_stats (agregación en servidor)
interface ProjectStats {
  project_id: string;
  project_name: string;
  equipment_total: number;
  equipment_aprobado: number;
  equipment_pendiente: number;
  equipment_rechazado: number;
  tests_total: number;
  tests_cerrados: number;
  tests_rechazados: number;
  tests_precom_total: number; tests_precom_ok: number;
  tests_fat_total: number;    tests_fat_ok: number;
  tests_sat_total: number;    tests_sat_ok: number;
  tests_loop_total: number;   tests_loop_ok: number;
  tests_energy_total: number; tests_energy_ok: number;
  punch_total: number;
  punch_abierto: number;
  punch_cerrado: number;
  punch_critico_abierto: number;
  calculated_at: string;
}

interface DashboardData {
  totalProjects: number;
  stats: ProjectStats[];
  recentActivity: { date: string; action: string; entity: string }[];
}

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      // [A-003 FIX] Una sola query a mv_project_stats (pre-agregada en el servidor)
      // En lugar de 8 queries que descargaban decenas de miles de filas al cliente.
      const [
        { count: totalProjects },
        { data: statsRaw },
        { data: auditRaw },
      ] = await Promise.all([
        supabase.from("projects")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase.from("mv_project_stats")
          .select("*")
          .order("project_name"),
        supabase.from("audit_log")
          .select("created_at, action, entity")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      setData({
        totalProjects: totalProjects ?? 0,
        stats: (statsRaw ?? []) as ProjectStats[],
        recentActivity: auditRaw?.map((r) => ({
          date: r.created_at,
          action: r.action,
          entity: r.entity,
        })) ?? [],
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // [A-003 FIX] Totales calculados desde mv_project_stats (pre-agregados en servidor)
  const totalEquipment   = data?.stats.reduce((s, r) => s + (r.equipment_total ?? 0), 0) ?? 0;
  const totalAprobados   = data?.stats.reduce((s, r) => s + (r.equipment_aprobado ?? 0), 0) ?? 0;
  const totalTests       = data?.stats.reduce((s, r) => s + (r.tests_total ?? 0), 0) ?? 0;
  const totalPunchAbierto= data?.stats.reduce((s, r) => s + (r.punch_abierto ?? 0), 0) ?? 0;
  const totalPunchCritico= data?.stats.reduce((s, r) => s + (r.punch_critico_abierto ?? 0), 0) ?? 0;

  // Datos para gráficas (calculados en cliente pero sobre N proyectos, no N filas)
  const equipmentPieData = [
    { name: "Aprobado",    value: totalAprobados },
    { name: "Pendiente",   value: data?.stats.reduce((s, r) => s + (r.equipment_pendiente ?? 0), 0) ?? 0 },
    { name: "Rechazado",   value: data?.stats.reduce((s, r) => s + (r.equipment_rechazado ?? 0), 0) ?? 0 },
  ].filter(d => d.value > 0);

  const testsBarData = [
    { name: "Precom",     value: data?.stats.reduce((s, r) => s + (r.tests_precom_ok ?? 0), 0) ?? 0 },
    { name: "FAT",        value: data?.stats.reduce((s, r) => s + (r.tests_fat_ok ?? 0), 0) ?? 0 },
    { name: "SAT",        value: data?.stats.reduce((s, r) => s + (r.tests_sat_ok ?? 0), 0) ?? 0 },
    { name: "Loop",       value: data?.stats.reduce((s, r) => s + (r.tests_loop_ok ?? 0), 0) ?? 0 },
    { name: "Energiz.",   value: data?.stats.reduce((s, r) => s + (r.tests_energy_ok ?? 0), 0) ?? 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Ejecutivo</h1>
        <p className="text-slate-500 text-sm mt-1">Vista general del estado de comisionamiento</p>
      </div>

      {/* KPIs — datos de mv_project_stats, sin descargar filas individuales */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Proyectos" value={data?.totalProjects ?? 0} icon={<FolderKanban size={20} />} color="blue" />
        <KpiCard label="Equipos" value={totalEquipment} icon={<Wrench size={20} />} color="purple" />
        <KpiCard label="Aprobados" value={totalAprobados} total={totalEquipment}
          icon={<CheckSquare size={20} />} color="emerald" />
        <KpiCard label="Pruebas" value={totalTests} icon={<TrendingUp size={20} />} color="blue" />
        <KpiCard label="Punch Abiertos" value={totalPunchAbierto} icon={<AlertTriangle size={20} />} color="amber" />
        <KpiCard label="Punch Críticos" value={totalPunchCritico} icon={<AlertTriangle size={20} />} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Equipos por Estado</CardTitle></CardHeader>
          {equipmentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={equipmentPieData} cx="50%" cy="50%" outerRadius={80}
                  dataKey="value" label={false}>
                  {equipmentPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Sin datos aún</div>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Protocolos Aprobados por Tipo</CardTitle></CardHeader>
          {testsBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={testsBarData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Sin datos aún</div>
          )}
        </Card>
      </div>

      {/* Actividad reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <Badge variant="info">Auditoría</Badge>
        </CardHeader>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data?.recentActivity.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">Sin actividad registrada</p>
          )}
          {data?.recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                  <span className="font-medium">{item.action}</span> en <span className="text-blue-600">{item.entity}</span>
                </p>
              </div>
              <p className="text-xs text-slate-400 flex-shrink-0">{fmtDate(item.date)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
