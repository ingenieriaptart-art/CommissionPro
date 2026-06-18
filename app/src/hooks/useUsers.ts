"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User, Role, ProjectMember, ModuleAccessMap } from "@/types";

async function getToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...init.headers,
    },
  });
}

export function useUserList() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("*, role:roles(id,key,name), company:companies(name)")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as User[];
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async (): Promise<Role[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("roles")
        .select("id, key, name")
        .eq("is_system", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Role[];
    },
  });
}

export function useUserProjects(userId: string | null) {
  return useQuery({
    queryKey: ["user-projects", userId],
    queryFn: async (): Promise<ProjectMember[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_members")
        .select("*, project:projects(id,name), role:roles(id,key,name)")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as ProjectMember[];
    },
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string; password: string; full_name: string;
      role_id: string; position?: string; phone?: string;
    }): Promise<User> => {
      const res = await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al crear usuario");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<Pick<User, "full_name" | "position" | "phone" | "role_id" | "status">>
    ): Promise<User> => {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al actualizar usuario");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useAssignProject(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      project_id: string; role_id: string; module_access?: ModuleAccessMap;
    }): Promise<ProjectMember> => {
      const res = await adminFetch(`/api/admin/users/${userId}/projects`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al asignar proyecto");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-projects", userId] }),
  });
}

/** Edita la jerarquía (role_id) y/o la matriz de acceso (module_access) de una membresía. */
export function useUpdateMembership(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      projectId: string; role_id?: string; module_access?: ModuleAccessMap;
    }): Promise<ProjectMember> => {
      const { projectId, ...rest } = payload;
      const res = await adminFetch(`/api/admin/users/${userId}/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(rest),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al actualizar acceso");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-projects", userId] }),
  });
}

export function useRemoveProject(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const res = await adminFetch(`/api/admin/users/${userId}/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const { error } = await res.json();
        throw new Error(error ?? "Error al remover proyecto");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-projects", userId] }),
  });
}
