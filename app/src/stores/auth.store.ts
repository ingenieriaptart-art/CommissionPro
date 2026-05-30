import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  permissions: string[];
  setUser: (user: User | null) => void;
  setPermissions: (perms: string[]) => void;
  hasPermission: (key: string) => boolean;
  isRole: (...roles: string[]) => boolean;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      setUser: (user) => set({ user }),
      setPermissions: (permissions) => set({ permissions }),
      hasPermission: (key) => {
        const { user, permissions } = get();
        if (user?.role?.key === "admin") return true;
        return permissions.includes(key);
      },
      isRole: (...roles) => {
        const roleKey = get().user?.role?.key ?? "";
        return roles.includes(roleKey);
      },
      clear: () => set({ user: null, permissions: [] }),
    }),
    { name: "cp-auth" }
  )
);
