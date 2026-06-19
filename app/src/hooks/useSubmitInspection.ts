"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync, saveBlobLocally, deleteInspectionDraft } from "@/lib/db/local";
import { runSync } from "@/lib/sync/engine";
import { computeTemplateHash } from "@/lib/sync/hash";
import { submitInspectionOffline } from "@/lib/sync/submitInspection";
import { APP_VERSION, SCHEMA_VERSION } from "@/lib/version";
import { v4 as uuidv4 } from "uuid";
import type { InspectionState, MockInspectionTemplate } from "@/types/inspection";

interface SubmitResult { testId: string; }

export function useSubmitInspection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (
    state: InspectionState,
    projectId: string,
    template: MockInspectionTemplate,
  ): Promise<SubmitResult | null> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada — iniciá sesión nuevamente");

      const result = await submitInspectionOffline(
        { state, projectId, userId: user.id, template },
        {
          db: localDB, enqueueSync, saveBlobLocally, deleteInspectionDraft,
          computeTemplateHash,
          fetchBlob: async (url) => (await fetch(url)).blob(),
          runSync,
          uuid: uuidv4,
          now: () => new Date().toISOString(),
          isOnline: () => typeof navigator === "undefined" ? true : navigator.onLine,
          appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION,
        },
      );
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error };
}
