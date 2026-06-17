import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  showEquipmentNav: boolean;
  setTheme: (t: UIState["theme"]) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  toggleEquipmentNav: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarOpen: true,
      showEquipmentNav: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleEquipmentNav: () => set((s) => ({ showEquipmentNav: !s.showEquipmentNav })),
    }),
    { name: "cp-ui" }
  )
);
