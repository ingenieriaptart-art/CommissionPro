"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDB } from "@/lib/db/local";
import type { Project } from "@/types";

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<Project | null> => {
      if (navigator.onLine) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("projects")
          .select("*, client_company:companies(name, type, nit)")
          .eq("id", projectId)
          .single();
        if (error) throw error;
        if (data) await localDB.projects.put(data as Project);
        return data as Project;
      } else {
        return (await localDB.projects.get(projectId)) ?? null;
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000, // 5 min — proyecto cambia poco
  });
}
