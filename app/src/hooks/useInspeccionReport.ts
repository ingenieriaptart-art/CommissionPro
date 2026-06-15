"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Equipment, Project, Company } from "@/types";

export interface EquipmentWithArea extends Equipment {
  area_name?: string;
  subsystem?: { system?: { area?: { name: string } } };
}

export interface Evidence {
  id: string;
  equipment_id: string;
  stage: "antes" | "durante" | "despues" | "general";
  file_url: string;
  file_type: string;
}

export interface FatTest {
  id: string;
  equipment_id: string;
  code?: string;
  data?: { observations?: string } & Record<string, unknown>;
}

export interface InspeccionReportData {
  project: Project & { client_company?: Company & { logo_url?: string; metadata?: { logo_url?: string } } };
  contractorCompany?: Company & { logo_url?: string; metadata?: { logo_url?: string } };
  equipment: EquipmentWithArea[];
  evidences: Evidence[];
  fatTests: FatTest[];
}

export function useInspeccionReport(projectId: string) {
  return useQuery<InspeccionReportData | null>({
    queryKey: ["inspeccion-report", projectId],
    queryFn: async () => {
      if (!navigator.onLine) return null;
      const supabase = createClient();

      const [projectRes, equipmentRes, evidencesRes, fatTestsRes, userRes] =
        await Promise.all([
          supabase
            .from("projects")
            .select("*, client_company:companies(id, name, type, nit, metadata)")
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
            .select("id, equipment_id, stage, file_url, file_type")
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
          .select("company_id, company:companies(id, name, metadata)")
          .eq("id", userRes.data.user.id)
          .single();
        contractorCompany = userData?.company as typeof contractorCompany;
      }

      const equipmentList = (equipmentRes.data ?? []) as EquipmentWithArea[];
      equipmentList.forEach((eq) => {
        eq.area_name = eq.subsystem?.system?.area?.name ?? "";
      });

      return {
        project: projectRes.data as InspeccionReportData["project"],
        contractorCompany,
        equipment: equipmentList,
        evidences: (evidencesRes.data ?? []) as unknown as Evidence[],
        fatTests: (fatTestsRes.data ?? []) as unknown as FatTest[],
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60_000,
  });
}
