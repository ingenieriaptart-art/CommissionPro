"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Equipment, Project, Company } from "@/types";

export type InspeccionDiscipline = "proceso" | "electrico" | "ic";

export interface EquipmentWithArea extends Equipment {
  area_name?: string;
  system_name?: string;
  subsystem?: { system?: { area?: { name: string }; name?: string } };
}

export interface Evidence {
  id: string;
  equipment_id?: string;
  stage: "antes" | "durante" | "despues" | "general";
  storage_url?: string;
}

export interface FatTest {
  id: string;
  equipment_id: string;
  code?: string;
  data?: { observations?: string } & Record<string, unknown>;
}

export interface InspeccionReportData {
  project: Project & { client_company?: Company & { logo_url?: string } };
  contractorCompany?: Company & { logo_url?: string };
  equipment: EquipmentWithArea[];
  evidences: Evidence[];
  fatTests: FatTest[];
}

function filterByDiscipline(
  equipment: EquipmentWithArea[],
  discipline?: InspeccionDiscipline
): EquipmentWithArea[] {
  if (!discipline) return equipment;
  return equipment.filter((eq) => {
    const area = eq.area_name ?? "";
    const sys  = eq.system_name ?? "";
    if (discipline === "ic")       return area === "INSTRUMENTOS";
    if (discipline === "proceso")  return area === "EQUIPOS" && sys === "PROCESOS";
    if (discipline === "electrico") return area === "EQUIPOS" && sys === "ELECTRICOS";
    return false;
  });
}

export function useInspeccionReport(
  projectId: string,
  discipline?: InspeccionDiscipline
) {
  return useQuery<InspeccionReportData | null>({
    queryKey: ["inspeccion-report", projectId, discipline ?? "all"],
    queryFn: async () => {
      if (!navigator.onLine) return null;
      const supabase = createClient();

      const [projectRes, equipmentRes, evidencesRes, fatTestsRes, userRes] =
        await Promise.all([
          supabase
            .from("projects")
            .select("*, client_company:companies(id, name, type, nit, logo_url)")
            .eq("id", projectId)
            .single(),
          supabase
            .from("equipment")
            .select(`
              *,
              subsystem:subsystems(
                id, name,
                system:systems(
                  id, name,
                  area:areas(id, name)
                )
              )
            `)
            .eq("project_id", projectId)
            .is("deleted_at", null)
            .order("tag"),
          supabase
            .from("evidences")
            .select("id, equipment_id, stage, storage_url")
            .eq("project_id", projectId),
          supabase
            .from("tests")
            .select("id, equipment_id, code, data")
            .eq("project_id", projectId)
            .eq("type", "fat"),
          supabase.auth.getUser(),
        ]);

      if (projectRes.error) throw projectRes.error;

      let contractorCompany: InspeccionReportData["contractorCompany"] | undefined;
      if (userRes.data.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("company_id, company:companies(id, name, logo_url)")
          .eq("id", userRes.data.user.id)
          .single();
        contractorCompany = userData?.company as typeof contractorCompany;
      }

      const equipmentList = (equipmentRes.data ?? []) as EquipmentWithArea[];
      equipmentList.forEach((eq) => {
        eq.area_name   = eq.subsystem?.system?.area?.name ?? "";
        eq.system_name = eq.subsystem?.system?.name ?? "";
      });

      const filtered = filterByDiscipline(equipmentList, discipline);

      return {
        project: projectRes.data as InspeccionReportData["project"],
        contractorCompany,
        equipment: filtered,
        evidences: (evidencesRes.data ?? []) as unknown as Evidence[],
        fatTests: (fatTestsRes.data ?? []) as unknown as FatTest[],
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60_000,
  });
}
