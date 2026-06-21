import { test, expect, vi } from "vitest";
import { approveImpl } from "@/hooks/useInspectionApproval";

function deps(opts: { online?: boolean; data?: unknown; error?: { message: string } | null }) {
  const rpc = vi.fn(async () => ({ data: opts.data ?? null, error: opts.error ?? null }));
  return {
    rpc,
    isOnline: () => opts.online ?? true,
    userAgent: () => "test-agent",
  };
}

test("online: envía payload con p_user_agent y mapea el resultado ok", async () => {
  const d = deps({ data: { ok: true, test_status: "aprob_supervisor", equipment_status: "aprobado", chain_complete: true, applied_event: "INSPECTION_APPROVED" } });
  const res = await approveImpl({ testId: "T1", level: 1, decision: "approve", observations: "ok" }, d);
  expect(d.rpc).toHaveBeenCalledWith("approve_inspection", {
    p_test_id: "T1", p_level: 1, p_decision: "approve",
    p_observations: "ok", p_signature_image: null, p_user_agent: "test-agent",
  });
  expect(res.ok).toBe(true);
  expect(res.equipment_status).toBe("aprobado");
});

test("offline: no llama al rpc y retorna ok:false requires_connection", async () => {
  const d = deps({ online: false });
  const res = await approveImpl({ testId: "T1", level: 1, decision: "approve" }, d);
  expect(d.rpc).not.toHaveBeenCalled();
  expect(res.ok).toBe(false);
  expect(res.reason).toBe("requires_connection");
});

test("error del rpc: ok:false con el message del error", async () => {
  const d = deps({ error: { message: "boom" } });
  const res = await approveImpl({ testId: "T1", level: 1, decision: "approve" }, d);
  expect(res.ok).toBe(false);
  expect(res.reason).toBe("boom");
});

test("optional args ausentes → p_observations y p_signature_image van null", async () => {
  const d = deps({ data: { ok: true } });
  await approveImpl({ testId: "T9", level: 2, decision: "reject_equipment" }, d);
  expect(d.rpc).toHaveBeenCalledWith("approve_inspection", {
    p_test_id: "T9", p_level: 2, p_decision: "reject_equipment",
    p_observations: null, p_signature_image: null, p_user_agent: "test-agent",
  });
});
