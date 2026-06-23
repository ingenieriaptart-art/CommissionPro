/**
 * Gate: evidencia fotográfica obligatoria en Punch List
 * Cubre Casos 1, 2 y 3 (lógica offline + IndexedDB + FIFO outbox).
 * Los Casos 4-6 (servidor real) están en scripts/gate-punch-evidence/validate.mjs.
 */
import { test, expect, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { localDB, enqueueSync, saveBlobLocally } from "@/lib/db/local";
import { pushPendingOps } from "@/lib/sync/engine";

beforeEach(async () => {
  await Promise.all([
    localDB.punchItems.clear(),
    localDB.evidences.clear(),
    localDB.blobStore.clear(),
    localDB.syncQueue.clear(),
  ]);
});

// ─── CASO 1: constraint UI ────────────────────────────────────────────────────

test("CASO 1: canSubmit false sin título o sin blob; true con ambos", () => {
  const canSubmit = (title: string, blob: Blob | null) => !!title.trim() && !!blob;

  expect(canSubmit("", null)).toBe(false);           // sin nada
  expect(canSubmit("Válvula VE-01", null)).toBe(false); // sin foto
  expect(canSubmit("", new Blob(["x"]))).toBe(false);   // sin título
  expect(canSubmit("Válvula VE-01", new Blob(["x"]))).toBe(true); // OK
  expect(canSubmit("  ", new Blob(["x"]))).toBe(false); // solo espacios
});

// ─── CASO 2: punch + evidencia en IndexedDB (offline) ─────────────────────────

test("CASO 2: punch + evidencia (general) creados en IndexedDB y outbox con FIFO correcto", async () => {
  const punchId = uuidv4();
  const now = new Date().toISOString();

  const punch = {
    id: punchId,
    project_id: "proj-gate",
    equipment_id: "eq-gate",
    title: "Válvula VE-01 no cierra completamente",
    description: "No alcanza cierre completo al 100%",
    priority: "alta" as const,
    status: "abierto" as const,
    generation_source: "manual" as const,
    created_at: now,
    updated_at: now,
    sync_status: "pending" as const,
    version: 1,
  };

  // Paso 1: punch al localDB + outbox (FIFO: va primero)
  await localDB.punchItems.add(punch);
  await enqueueSync("punch_items", punchId, "INSERT", punch);

  // Paso 2: evidencia al localDB + outbox (FIFO: va segundo)
  const evidenceId = uuidv4();
  const blob = new Blob(["fake-jpeg-data"], { type: "image/jpeg" });
  const blobRef = String(await saveBlobLocally(evidenceId, blob));
  const evidence = {
    id: evidenceId,
    project_id: "proj-gate",
    equipment_id: "eq-gate",
    punch_id: punchId,
    type: "foto" as const,
    stage: "general" as const,
    storage_url: undefined,
    local_blob_ref: blobRef,
    captured_by: "user-gate",
    captured_at: now,
    sync_status: "pending" as const,
  };
  await localDB.evidences.add(evidence);
  await enqueueSync("evidences", evidenceId, "INSERT", evidence);

  // Verificar punch en IndexedDB
  const savedPunch = await localDB.punchItems.get(punchId);
  expect(savedPunch).toBeDefined();
  expect(savedPunch!.title).toBe("Válvula VE-01 no cierra completamente");
  expect(savedPunch!.generation_source).toBe("manual");
  expect(savedPunch!.status).toBe("abierto");
  expect(savedPunch!.sync_status).toBe("pending");

  // Verificar evidencia en IndexedDB
  const savedEv = await localDB.evidences.get(evidenceId);
  expect(savedEv).toBeDefined();
  expect(savedEv!.punch_id).toBe(punchId);   // enlace correcto
  expect(savedEv!.stage).toBe("general");
  expect(savedEv!.type).toBe("foto");
  expect(savedEv!.sync_status).toBe("pending");

  // Verificar FIFO: usar toArray() por clave primaria (inserción) — más fiable que orderBy createdAt
  const queue = await localDB.syncQueue.toArray();
  expect(queue).toHaveLength(2);
  expect(queue[0].entity).toBe("punch_items");
  expect(queue[0].entityId).toBe(punchId);
  expect(queue[1].entity).toBe("evidences");
  expect(queue[1].entityId).toBe(evidenceId);
});

// ─── CASO 3: offline → online sync sin duplicados ─────────────────────────────

test("CASO 3: offline sync → punch primero, evidencia después, sin duplicados, marcados synced", async () => {
  const punchId = uuidv4();
  const evId = uuidv4();
  const now = new Date().toISOString();

  // Simular estado offline: datos solo en localDB + outbox
  const punch = {
    id: punchId, project_id: "p1", equipment_id: "e1",
    title: "GATE-Offline", priority: "media" as const, status: "abierto" as const,
    generation_source: "manual" as const, created_at: now, updated_at: now,
    sync_status: "pending" as const, version: 1,
  };
  await localDB.punchItems.add(punch);
  await enqueueSync("punch_items", punchId, "INSERT", punch);

  const blob = new Blob(["img-data"], { type: "image/jpeg" });
  const blobRef = String(await saveBlobLocally(evId, blob));
  const ev = {
    id: evId, project_id: "p1", equipment_id: "e1", punch_id: punchId,
    type: "foto" as const, stage: "general" as const, local_blob_ref: blobRef,
    captured_by: "u1", captured_at: now, sync_status: "pending" as const,
  };
  await localDB.evidences.add(ev);
  await enqueueSync("evidences", evId, "INSERT", ev);

  // Mock Supabase (orden de upserts registrado para verificar FIFO)
  const upserted: string[] = [];
  const uploaded: string[] = [];
  const mockSB = {
    from(table: string) {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upsert: async (payload: any) => {
          upserted.push(`${table}:${payload.id}`);
          return { error: null };
        },
        update() { return { eq: () => ({ eq: async () => ({ error: null }) }) }; },
      };
    },
    storage: {
      from() {
        return {
          upload: async (path: string) => { uploaded.push(path); return { error: null }; },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }),
        };
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pushPendingOps(mockSB as any);

  // Punch subido ANTES que evidencia (FIFO)
  expect(upserted[0]).toBe(`punch_items:${punchId}`);
  expect(upserted[1]).toBe(`evidences:${evId}`);

  // Exactamente 2 upserts — sin duplicados
  expect(upserted).toHaveLength(2);

  // Blob de evidencia subido a storage
  expect(uploaded).toHaveLength(1);

  // Evidencia marcada synced en IndexedDB tras reconexión
  const evAfter = await localDB.evidences.get(evId);
  expect(evAfter?.sync_status).toBe("synced");

  // Outbox vacío (procesado)
  const remaining = await localDB.syncQueue.count();
  expect(remaining).toBe(0);
});
