import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  sidebarAutoCloseMs: number;
  setTheme: (t: UIState["theme"]) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setSidebarAutoCloseMs: (ms: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarOpen: true,
      sidebarAutoCloseMs: 5000,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarAutoCloseMs: (sidebarAutoCloseMs) => set({ sidebarAutoCloseMs }),
    }),
    { name: "cp-ui" }
  )
);
