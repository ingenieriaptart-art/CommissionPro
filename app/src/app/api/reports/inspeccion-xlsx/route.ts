import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = serviceClient();
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const { error } = await supabase.auth.getUser(token);
    if (error) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId requerido" }, { status: 400 });

  const [projectRes, equipmentRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, client_company:companies(name)")
      .eq("id", projectId)
      .single(),
    supabase
      .from("equipment")
      .select(`
        id, tag, name, status, power_kw, power_installed_kw,
        catalog_url, fat_protocol_url,
        subsystem:subsystems(system:systems(area:areas(name)))
      `)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("tag"),
  ]);

  if (projectRes.error) return NextResponse.json({ error: projectRes.error.message }, { status: 500 });

  const project = projectRes.data;
  const equipment = (equipmentRes.data ?? []) as Array<{
    id: string; tag: string; name: string; status: string;
    power_kw?: number; power_installed_kw?: number;
    catalog_url?: string; fat_protocol_url?: string;
    subsystem?: { system?: { area?: { name: string } } };
  }>;

  const wb = XLSX.utils.book_new();
  const wsData: (string | number | null)[][] = [];

  wsData.push([], []);

  wsData.push([null, null, null, null, "Cliente", (project.client_company as { name: string } | null)?.name ?? "", null, null, null, null, "LISTADO DE INSPECCIÓN DE EQUIPOS ELECTROMECÁNICOS"]);
  wsData.push([null, null, null, null, "Proyecto", project.name]);
  wsData.push([null, null, null, null, "Ubicación", (project as { location?: string }).location ?? ""]);
  wsData.push([]);
  wsData.push([null, null, null, null, "ESQUEMAS DE VERIFICACIÓN"]);
  wsData.push([
    "Est.", "ITEM", "TAG", "ÁREA", "APLICACIÓN", "",
    "kW dem.", "HP dem.", "Pot. Inst. kW",
    "FOTO EQUIPO", "FOTO PLACA", "MANUAL/CATÁLOGO", "PROTOCOLOS FAT",
    "SI", "NO", "OBSERVACIONES",
  ]);

  equipment.forEach((eq, i) => {
    const hpFormula = eq.power_kw ? { f: `G${wsData.length + 1}*1.341022` } : null;
    wsData.push([
      eq.status === "aprobado" ? "OK" : eq.status === "rechazado" ? "NC" : "PEND",
      i + 1,
      eq.tag,
      eq.subsystem?.system?.area?.name ?? "",
      eq.name,
      "",
      eq.power_kw ?? null,
      hpFormula as unknown as string | null,
      eq.power_installed_kw ?? null,
      "", "",
      eq.catalog_url ? "SI" : "",
      eq.fat_protocol_url ? "SI" : "",
      eq.status === "aprobado" ? "✓" : "",
      eq.status === "rechazado" ? "✓" : "",
      "",
    ]);
  });

  wsData.push([], []);
  wsData.push(["POR BIOTEC", null, null, null, null, "POR BIOTEC", null, null, null, null, "POR LDC"]);
  wsData.push(["Responsable", null, null, null, null, "Revisa", null, null, null, null, "Aprueba"]);
  wsData.push([]);
  wsData.push(["Nombre:", null, null, null, null, "Nombre:", null, null, null, null, "Nombre:"]);
  wsData.push(["Cargo:", null, null, null, null, "Cargo:", null, null, null, null, "Cargo:"]);
  wsData.push(["Fecha: DD/MM/AAAA", null, null, null, null, "Fecha: DD/MM/AAAA", null, null, null, null, "Fecha: DD/MM/AAAA"]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = Array.from({ length: 16 }, (_, i) => {
    if (i >= 13 && i <= 17) return { hidden: true, wch: 10 };
    return { wch: i === 4 ? 35 : 12 };
  });

  XLSX.utils.book_append_sheet(wb, ws, "1.1. Inspeccion");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const projectName = project.name.replace(/\s+/g, "_").toUpperCase();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="INSPECCION_${projectName}_${today}.xlsx"`,
    },
  });
}
