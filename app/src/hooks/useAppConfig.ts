"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface UIPrefs {
  showEquipmentNav: boolean;
}

const DEFAULT_UI_PREFS: UIPrefs = { showEquipmentNav: false };

export function useAppUIPrefs() {
  return useQuery({
    queryKey: ["app_config", "ui_prefs"],
    queryFn: async (): Promise<UIPrefs> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "ui_prefs")
        .single();
      return (data?.value as UIPrefs) ?? DEFAULT_UI_PREFS;
    },
    staleTime: 5 * 60_000,
  });
}

export function useSetAppUIPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Partial<UIPrefs>) => {
      const supabase = createClient();
      const { data: current } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "ui_prefs")
        .single();
      const merged: UIPrefs = { ...DEFAULT_UI_PREFS, ...(current?.value ?? {}), ...prefs };
      const { error } = await supabase
        .from("app_config")
        .upsert({ key: "ui_prefs", value: merged, updated_at: new Date().toISOString() });
      if (error) throw error;
      return merged;
    },
    onMutate: async (prefs) => {
      await qc.cancelQueries({ queryKey: ["app_config", "ui_prefs"] });
      const prev = qc.getQueryData<UIPrefs>(["app_config", "ui_prefs"]);
      qc.setQueryData<UIPrefs>(["app_config", "ui_prefs"], (old) => ({
        ...DEFAULT_UI_PREFS, ...(old ?? {}), ...prefs,
      }));
      return { prev };
    },
    onError: (_err, _prefs, ctx) => {
      if (ctx?.prev) qc.setQueryData(["app_config", "ui_prefs"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["app_config", "ui_prefs"] }),
  });
}
