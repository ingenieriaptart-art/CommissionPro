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

interface DashboardData {
  totalProjects: number;
  totalEquipment: number;
  equipmentByStatus: Record<string, number>;
  totalTests: number;
  testsByStatus: Record<string, number>;
  openPunch: number;
  criticalPunch: number;
  recentActivity: { date: string; action: string; entity: string }[];
}

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [
        { count: totalProjects },
        { count: totalEquipment },
        { count: totalTests },
        { count: openPunch },
        { count: criticalPunch },
        { data: equipmentRaw },
        { data: testsRaw },
        { data: auditRaw },
      ] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("equipment").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("tests").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("punch_items").select("*", { count: "exact", head: true }).eq("status", "abierto"),
        supabase.from("punch_items").select("*", { count: "exact", head: true }).eq("priority", "critica").eq("status", "abierto"),
        supabase.from("equipment").select("status").is("deleted_at", null),
        supabase.from("tests").select("status").is("deleted_at", null),
        supabase.from("audit_log").select("created_at, action, entity").order("created_at", { ascending: false }).limit(8),
      ]);

      // Agrupar por estado
      const equipmentByStatus: Record<string, number> = {};
      equipmentRaw?.forEach((r: { status: string }) => {
        equipmentByStatus[r.status] = (equipmentByStatus[r.status] ?? 0) + 1;
      });
      const testsByStatus: Record<string, number> = {};
      testsRaw?.forEach((r: { status: string }) => {
        testsByStatus[r.status] = (testsByStatus[r.status] ?? 0) + 1;
      });

      setData({
        totalProjects: totalProjects ?? 0,
        totalEquipment: totalEquipment ?? 0,
        equipmentByStatus,
        totalTests: totalTests ?? 0,
        testsByStatus,
        openPunch: openPunch ?? 0,
        criticalPunch: criticalPunch ?? 0,
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

  const equipmentPieData = Object.entries(data?.equipmentByStatus ?? {}).map(([name, value]) => ({ name, value }));
  const testsBarData = Object.entries(data?.testsByStatus ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Ejecutivo</h1>
        <p className="text-slate-500 text-sm mt-1">Vista general del estado de comisionamiento</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Proyectos" value={data?.totalProjects ?? 0} icon={<FolderKanban size={20} />} color="blue" />
        <KpiCard label="Equipos" value={data?.totalEquipment ?? 0} icon={<Wrench size={20} />} color="purple" />
        <KpiCard label="Aprobados" value={data?.equipmentByStatus["aprobado"] ?? 0}
          total={data?.totalEquipment} icon={<CheckSquare size={20} />} color="emerald" />
        <KpiCard label="Pruebas" value={data?.totalTests ?? 0} icon={<TrendingUp size={20} />} color="blue" />
        <KpiCard label="Punch Abiertos" value={data?.openPunch ?? 0} icon={<AlertTriangle size={20} />} color="amber" />
        <KpiCard label="Punch Críticos" value={data?.criticalPunch ?? 0} icon={<AlertTriangle size={20} />} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipos por estado */}
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
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              Sin datos aún
            </div>
          )}
        </Card>

        {/* Pruebas por estado */}
        <Card>
          <CardHeader><CardTitle>Pruebas por Estado</CardTitle></CardHeader>
          {testsBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={testsBarData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              Sin datos aún
            </div>
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
