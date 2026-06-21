"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ApprovalDecision = "approve" | "request_correction" | "reject_equipment";

export interface ApprovalResult {
  ok: boolean;
  reason?: string;
  test_status?: string;
  equipment_status?: string;
  chain_complete?: boolean;
  applied_event?: string | null;
}

export interface ApproveArgs {
  testId: string;
  level: number;
  decision: ApprovalDecision;
  observations?: string;
  signatureImage?: string;
}

export interface ApproveDeps {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  isOnline: () => boolean;
  userAgent: () => string | null;
}

/** Lógica pura, testeable sin DOM. El hook la envuelve con estado de React. */
export async function approveImpl(a: ApproveArgs, deps: ApproveDeps): Promise<ApprovalResult> {
  if (!deps.isOnline()) {
    return { ok: false, reason: "requires_connection" };
  }
  const { data, error } = await deps.rpc("approve_inspection", {
    p_test_id: a.testId,
    p_level: a.level,
    p_decision: a.decision,
    p_observations: a.observations ?? null,
    p_signature_image: a.signatureImage ?? null,
    p_user_agent: deps.userAgent(),
  });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "empty_response" }) as ApprovalResult;
}

export function useInspectionApproval() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async (a: ApproveArgs): Promise<ApprovalResult> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await approveImpl(a, {
        rpc: (fn, params) =>
          // Cast through unknown to bridge PostgrestFilterBuilder → Promise shape
          // while keeping ApproveDeps shape clean for tests.
          (createClient().rpc(fn, params as Parameters<ReturnType<typeof createClient>["rpc"]>[1]) as unknown as Promise<{ data: unknown; error: { message: string } | null }>),
        isOnline: () => (typeof navigator === "undefined" ? true : navigator.onLine),
        userAgent: () => (typeof navigator !== "undefined" ? navigator.userAgent : null),
      });
      if (!res.ok && res.reason) {
        setError(res.reason === "requires_connection" ? "Esta acción requiere conexión" : res.reason);
      }
      return res;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { approve, isSubmitting, error };
}
