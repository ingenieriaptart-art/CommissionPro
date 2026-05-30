import { create } from "zustand";
import type { SyncState, SyncResult } from "@/lib/sync/engine";

interface SyncStore {
  state: SyncState;
  lastResult: SyncResult | null;
  pendingCount: number;
  setState: (s: SyncState) => void;
  setResult: (r: SyncResult) => void;
  setPending: (n: number) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  state: "idle",
  lastResult: null,
  pendingCount: 0,
  setState: (state) => set({ state }),
  setResult: (lastResult) => set({ lastResult }),
  setPending: (pendingCount) => set({ pendingCount }),
}));
