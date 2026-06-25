"use client";
import { use } from "react";
import { useInspeccionReport } from "@/hooks/useInspeccionReport";
import { InspeccionPrintView } from "@/components/reports/InspeccionPrintView";
import { Button } from "@/components/ui/Button";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Props { params: Promise<{ projectId: string }> }

export default function InspeccionElectricoPage({ params }: Props) {
  const { projectId } = use(params);
  const { data, isLoading, isError } = useInspeccionReport(projectId, "electrico");

  function handlePrint() { window.print(); }

  async function handleExportXlsx() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(
      `/api/reports/inspeccion-xlsx?projectId=${projectId}&discipline=electrico`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) { alert("Error al generar el Excel"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = data?.project.name?.replace(/\s+/g, "_").toUpperCase() ?? "PROYECTO";
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.download = `INSPECCION_ELECTRICO_${name}_${today}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="ui-controls flex items-center justify-between mb-4 flex-wrap gap-3">
        <Link href={`/projects/${projectId}/reports`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Informes
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Download size={15} />}
            onClick={handleExportXlsx} disabled={!data}>
            Exportar .xlsx
          </Button>
          <Button icon={<Printer size={15} />} onClick={handlePrint} disabled={!data}>
            Imprimir / PDF
          </Button>
        </div>
      </div>
      {isLoading && <div className="py-12 text-center text-slate-500 text-sm">Cargando informe…</div>}
      {isError && <div className="py-12 text-center text-red-500 text-sm">Error al cargar los datos.</div>}
      {!isLoading && !data && !isError && <div className="py-12 text-center text-slate-400 text-sm">Sin conexión — datos no disponibles.</div>}
      {data && <InspeccionPrintView data={data} title="LISTADO DE INSPECCIÓN DE EQUIPOS ELÉCTRICOS" />}
    </>
  );
}
