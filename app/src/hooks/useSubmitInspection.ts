"use client";
import { useState } from "react";
import { localDB, enqueueSync, saveBlobLocally, deleteInspectionDraft, enqueueTransition } from "@/lib/db/local";
import { runSync } from "@/lib/sync/engine";
import { computeTemplateHash } from "@/lib/sync/hash";
import { submitInspectionOffline } from "@/lib/sync/submitInspection";
import { nextState } from "@/lib/state/equipmentFsm";
import { useAuthStore } from "@/stores/auth.store";
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
      // executed_by/created_by/captured_by referencian public.users(id) — NO el
      // id de auth.users. El store (zustand persist 'cp-auth') tiene la fila de
      // public.users del usuario actual y funciona offline (sobrevive F5).
      const appUser = useAuthStore.getState().user;
      if (!appUser?.id) throw new Error("Sesión expirada — iniciá sesión nuevamente");

      const result = await submitInspectionOffline(
        { state, projectId, userId: appUser.id, template },
        {
          db: localDB, enqueueSync, saveBlobLocally, deleteInspectionDraft,
          computeTemplateHash,
          fetchBlob: async (url) => (await fetch(url)).blob(),
          runSync,
          uuid: uuidv4,
          now: () => new Date().toISOString(),
          getMaxRevision: async (equipmentId, templateId) => {
            const rows = await localDB.tests
              .filter((r) => (r as { equipment_id?: string }).equipment_id === equipmentId
                && (r as { template_id?: string }).template_id === templateId)
              .toArray();
            return rows.reduce((m, r) => Math.max(m, (r as { revision?: number }).revision ?? 1), 0);
          },
          isOnline: () => typeof navigator === "undefined" ? true : navigator.onLine,
          appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION,
          // INSPECTION_EXECUTED no depende de flags derivados; valores neutros.
          nextState: (from, event) =>
            nextState(from as never, event as never, { hasOpenPunch: false, approvalsComplete: false, everInspected: true }),
          enqueueTransition,
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
