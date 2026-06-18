"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import type { ModuleAccessMap } from "@/lib/modules";

/**
 * Carga el acceso por módulo del usuario actual para `projectId` y lo guarda
 * en el auth store. Admin no necesita esto (getAccess() devuelve 'full'),
 * pero igual se ejecuta sin daño. Devuelve el estado de la query.
 */
export function useMyModuleAccess(projectId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const setModuleAccess = useAuthStore((s) => s.setModuleAccess);
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["my-module-access", projectId, userId],
    enabled: !!projectId && !!userId,
    queryFn: async (): Promise<ModuleAccessMap> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_members")
        .select("module_access")
        .eq("project_id", projectId!)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.module_access as ModuleAccessMap) ?? {};
    },
  });

  useEffect(() => {
    if (projectId && query.data) setModuleAccess(projectId, query.data);
  }, [projectId, query.data, setModuleAccess]);

  return query;
}
