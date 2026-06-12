"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InspectionState } from "@/types/inspection";

interface SubmitResult {
  testId: string;
}

export function useSubmitInspection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const submit = async (
    state:      InspectionState,
    projectId:  string,
    templateKey: string,
  ): Promise<SubmitResult | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada — iniciá sesión nuevamente");

      const hasFailures = Object.values(state.answers).some(
        v => v === "FALLA" || v === "NO" || v === "RECHAZADO"
      );

      // ── 1. INSERT test ──────────────────────────────────────────────────────
      const code = `PRE-${templateKey}-${new Date().toISOString().slice(0, 10)}`;

      const { data: test, error: testErr } = await supabase
        .from("tests")
        .insert({
          project_id:     projectId,
          equipment_id:   state.equipmentId,
          type:           "precomisionamiento",
          code,
          status:         "ejecutado",
          executed_by:    user.id,
          executed_at:    new Date().toISOString(),
          data:           state.answers,
          result_summary: hasFailures ? "no_cumple" : "cumple",
          created_by:     user.id,
        })
        .select("id")
        .single();

      if (testErr || !test) throw new Error(testErr?.message ?? "Error al guardar la inspección");

      // ── 2. Upload evidences → Storage → INSERT evidences ───────────────────
      const evidenceRows: {
        project_id: string; test_id: string; equipment_id: string;
        type: string; stage: string; storage_url: string;
        captured_by: string; captured_at: string;
      }[] = [];

      for (const [fieldKey, items] of Object.entries(state.evidences)) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.url.startsWith("blob:")) continue;
          try {
            const resp = await fetch(item.url);
            const blob = await resp.blob();
            const ext  = blob.type.split("/")[1] ?? "jpg";
            const path = `${projectId}/${state.equipmentId}/${test.id}/${fieldKey}_${i}.${ext}`;

            const { error: uploadErr } = await supabase.storage
              .from("evidences")
              .upload(path, blob, { upsert: true, contentType: blob.type });

            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from("evidences").getPublicUrl(path);
              evidenceRows.push({
                project_id:   projectId,
                test_id:      test.id,
                equipment_id: state.equipmentId,
                type:         "foto",
                stage:        item.stage,
                storage_url:  urlData.publicUrl,
                captured_by:  user.id,
                captured_at:  item.timestamp,
              });
            }
          } catch { /* falla silenciosa — no bloquea el guardado */ }
        }
      }

      if (evidenceRows.length > 0) {
        await supabase.from("evidences").insert(evidenceRows);
      }

      return { testId: test.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error };
}
