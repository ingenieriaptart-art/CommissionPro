import { localDB, enqueueSync, saveBlobLocally } from "@/lib/db/local";
import { v4 as uuidv4 } from "uuid";

/**
 * Captura una evidencia de punch (blob local + fila evidences + outbox).
 * Devuelve el evidenceId.
 *
 * Orden de operaciones: blob → evidences row → outbox (FIFO). El worker de
 * sincronización procesará en este orden garantizando que la evidencia exista
 * en el servidor antes de que se aplique la transición de estado del punch.
 */
export async function capturePunchEvidence(args: {
  punchId: string;
  projectId: string;
  equipmentId: string;
  blob: Blob;
  stage: "correccion" | "verificacion";
  userId: string;
  observations?: string;
}): Promise<string> {
  const evidenceId = uuidv4();
  const now = new Date().toISOString();

  await saveBlobLocally(evidenceId, args.blob);

  const row = {
    id: evidenceId,
    project_id: args.projectId,
    equipment_id: args.equipmentId,
    punch_id: args.punchId,
    test_id: undefined,
    type: "foto" as const,
    stage: args.stage,
    storage_url: undefined,
    captured_by: args.userId,
    captured_at: now,
    observations: args.observations,
    sync_status: "pending" as const,
  };

  await localDB.evidences.add(row);
  await enqueueSync("evidences", evidenceId, "INSERT", row);

  return evidenceId;
}
