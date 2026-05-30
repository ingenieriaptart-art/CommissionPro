// ============================================================
// Motor de sincronización Offline → Cloud
// [A-002 FIX] Pull paginado (200 reg/ciclo) — sin colapso de RAM
// [A-007 FIX] Web Locks API — exclusividad entre pestañas
// [A-008 FIX] Pull cursors en IndexedDB — no en localStorage
// ============================================================
"use client";

import { localDB, type SyncOperation } from "@/lib/db/local";
import { createClient } from "@/lib/supabase/client";

export type SyncState = "idle" | "syncing" | "error" | "success";

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

// [A-002] Tamaño de página para pull paginado
const PULL_PAGE_SIZE = 200;

// [A-007] Flag local de sincronización en curso (primera capa de protección)
let isSyncing = false;

// -------------------- CURSORES EN INDEXEDDB [A-008 FIX] --------------------
// Los cursors se guardan en Dexie, no en localStorage (que puede borrarse)

async function getPullCursor(entity: string): Promise<string> {
  try {
    const record = await localDB.syncCursors.get(entity);
    return record?.cursor ?? "1970-01-01T00:00:00Z";
  } catch {
    return "1970-01-01T00:00:00Z";
  }
}

async function savePullCursor(entity: string, timestamp: string): Promise<void> {
  try {
    await localDB.syncCursors.put({
      entity,
      cursor: timestamp,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Silencioso: sync continúa aunque el cursor no se guarde
  }
}

// -------------------- ENTIDADES SINCRONIZABLES --------------------
const SYNCABLE_ENTITIES = [
  "projects", "areas", "systems", "subsystems",
  "equipment", "tests", "punch_items", "evidences",
] as const;

type SyncableEntity = typeof SYNCABLE_ENTITIES[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLocalTable(entity: SyncableEntity): any {
  const map = {
    projects:    localDB.projects,
    areas:       localDB.areas,
    systems:     localDB.systems,
    subsystems:  localDB.subsystems,
    equipment:   localDB.equipment,
    tests:       localDB.tests,
    punch_items: localDB.punchItems,
    evidences:   localDB.evidences,
  };
  return map[entity];
}

// -------------------- PUSH --------------------
async function pushPendingOps(
  supabase: ReturnType<typeof createClient>
): Promise<{ pushed: number; errors: string[] }> {
  const ops = await localDB.syncQueue
    .orderBy("createdAt")
    .toArray() as SyncOperation[];

  let pushed = 0;
  const errors: string[] = [];

  for (const op of ops) {
    // Omitir operaciones con demasiados intentos fallidos (se revisarán manualmente)
    if (op.attempts >= 5) {
      errors.push(`[SKIP] ${op.entity}/${op.entityId}: excedió 5 intentos`);
      continue;
    }
    try {
      if (op.operation === "INSERT" || op.operation === "UPDATE") {
        const { error } = await supabase
          .from(op.entity)
          .upsert(op.payload as Record<string, unknown>, { onConflict: "id" });
        if (error) throw error;
      } else if (op.operation === "DELETE") {
        const { error } = await supabase
          .from(op.entity)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", (op.payload as Record<string, unknown>).id);
        if (error) throw error;
      }
      await localDB.syncQueue.delete(op.id!);
      pushed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${op.entity}/${op.entityId}: ${msg}`);
      await localDB.syncQueue.update(op.id!, {
        attempts: op.attempts + 1,
        lastError: msg,
      });
    }
  }
  return { pushed, errors };
}

// -------------------- PULL PAGINADO [A-002 FIX] --------------------
async function pullChanges(
  supabase: ReturnType<typeof createClient>
): Promise<{ pulled: number }> {
  let pulled = 0;

  for (const entity of SYNCABLE_ENTITIES) {
    const since = await getPullCursor(entity);
    const table = getLocalTable(entity);
    let offset = 0;
    let hasMore = true;
    let lastTimestamp = since;

    // Paginar hasta que la respuesta tenga menos de PAGE_SIZE registros
    while (hasMore) {
      const { data, error } = await supabase
        .from(entity)
        .select("*")
        .gt("updated_at", since)
        .order("updated_at", { ascending: true })
        .range(offset, offset + PULL_PAGE_SIZE - 1);  // ← [A-002]: paginación

      if (error || !data) break;

      // Procesar página por página SIN acumular todo en memoria
      for (const record of data) {
        await table.put({ ...record, sync_status: "synced" });
        pulled++;
        lastTimestamp = record.updated_at;
      }

      // ¿Hay más páginas?
      hasMore = data.length === PULL_PAGE_SIZE;
      offset += PULL_PAGE_SIZE;

      // Guardar cursor después de cada página (progreso incremental)
      if (data.length > 0) {
        await savePullCursor(entity, lastTimestamp);
      }
    }
  }
  return { pulled };
}

// -------------------- SYNC INTERNO (sin lock) --------------------
async function runSyncInternal(
  onStateChange?: (state: SyncState, result?: SyncResult) => void
): Promise<SyncResult> {
  const supabase = createClient();
  const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    onStateChange?.("error");
    return result;
  }

  onStateChange?.("syncing");

  try {
    const { pushed, errors } = await pushPendingOps(supabase);
    result.pushed = pushed;
    result.errors = errors;

    const { pulled } = await pullChanges(supabase);
    result.pulled = pulled;

    onStateChange?.("success", result);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    onStateChange?.("error", result);
  }

  return result;
}

// -------------------- SYNC PRINCIPAL CON LOCK [A-007 FIX] --------------------
export async function runSync(
  onStateChange?: (state: SyncState, result?: SyncResult) => void
): Promise<SyncResult> {
  // [A-007] Capa 1: flag local (protección dentro de la misma pestaña)
  if (isSyncing) {
    return { pushed: 0, pulled: 0, conflicts: 0, errors: ["sync_already_running"] };
  }

  // [A-007] Capa 2: Web Locks API (protección entre pestañas y workers)
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return navigator.locks.request(
      "cp_sync_lock",
      { ifAvailable: true },
      async (lock) => {
        // Si no se pudo obtener el lock, otra pestaña ya está sincronizando
        if (!lock) {
          return { pushed: 0, pulled: 0, conflicts: 0, errors: ["sync_locked_by_another_tab"] };
        }
        isSyncing = true;
        try {
          return await runSyncInternal(onStateChange);
        } finally {
          isSyncing = false;
        }
      }
    );
  }

  // Fallback sin Web Locks (navegadores muy antiguos)
  isSyncing = true;
  try {
    return await runSyncInternal(onStateChange);
  } finally {
    isSyncing = false;
  }
}

// -------------------- AUTO-SYNC con reconexión --------------------
export function setupAutoSync(callback?: (result: SyncResult) => void) {
  let timeoutId: ReturnType<typeof setTimeout>;

  const handleOnline = () => {
    // Debounce: esperar 1.5s antes de disparar (red puede fluctuar)
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      const result = await runSync();
      if (result.pushed > 0 || result.pulled > 0) {
        callback?.(result);
      }
    }, 1500);
  };

  window.addEventListener("online", handleOnline);
  if (navigator.onLine) handleOnline();

  return () => {
    window.removeEventListener("online", handleOnline);
    clearTimeout(timeoutId);
  };
}
