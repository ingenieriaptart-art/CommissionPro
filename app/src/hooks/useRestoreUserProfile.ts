"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import type { User } from "@/types";

/**
 * Si hay sesión Supabase activa pero el store no tiene el role cargado,
 * re-fetch el perfil completo desde la tabla users.
 */
export function useRestoreUserProfile() {
  const { user, setUser, setPermissions } = useAuthStore();

  useEffect(() => {
    if (user?.role?.key) return; // ya tiene role, nada que hacer

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user;
      if (!authUser) return;

      const { data: userData } = await supabase
        .from("users")
        .select("*, role:roles(*, role_permissions(permission:permissions(*)))")
        .eq("auth_user_id", authUser.id)
        .single();

      if (userData) {
        const perms = (userData.role?.role_permissions ?? [])
          .map((rp: { permission: { key: string } }) => rp.permission.key);
        setUser(userData as User);
        setPermissions(perms);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
