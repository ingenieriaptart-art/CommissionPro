import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { accessOf, type Access, type ModuleAccessMap } from "@/lib/modules";

interface AuthState {
  user: User | null;
  permissions: string[];
  /** Acceso por módulo del usuario actual, indexado por projectId. */
  moduleAccess: Record<string, ModuleAccessMap>;
  setUser: (user: User | null) => void;
  setPermissions: (perms: string[]) => void;
  setModuleAccess: (projectId: string, map: ModuleAccessMap) => void;
  hasPermission: (key: string) => boolean;
  isRole: (...roles: string[]) => boolean;
  /** Nivel de acceso del usuario al módulo en el proyecto. Admin => 'full'. */
  getAccess: (projectId: string, moduleKey: string) => Access;
  canRead: (projectId: string, moduleKey: string) => boolean;
  canWrite: (projectId: string, moduleKey: string) => boolean;
  canFull: (projectId: string, moduleKey: string) => boolean;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      moduleAccess: {},
      setUser: (user) => set({ user }),
      setPermissions: (permissions) => set({ permissions }),
      setModuleAccess: (projectId, map) =>
        set((s) => ({ moduleAccess: { ...s.moduleAccess, [projectId]: map } })),
      hasPermission: (key) => {
        const { user, permissions } = get();
        if (user?.role?.key === "admin") return true;
        return permissions.includes(key);
      },
      isRole: (...roles) => {
        const roleKey = get().user?.role?.key ?? "";
        return roles.includes(roleKey);
      },
      getAccess: (projectId, moduleKey) => {
        if (get().user?.role?.key === "admin") return "full";
        return accessOf(get().moduleAccess[projectId], moduleKey);
      },
      canRead:  (projectId, moduleKey) => {
        const a = get().getAccess(projectId, moduleKey);
        return a === "read" || a === "edit" || a === "full";
      },
      canWrite: (projectId, moduleKey) => {
        const a = get().getAccess(projectId, moduleKey);
        return a === "edit" || a === "full";
      },
      canFull:  (projectId, moduleKey) => get().getAccess(projectId, moduleKey) === "full",
      clear: () => set({ user: null, permissions: [], moduleAccess: {} }),
    }),
    { name: "cp-auth" }
  )
);
