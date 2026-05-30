// ============================================================
// Motor de sincronización Offline → Cloud
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

// Última vez que se hizo pull (por entidad)
const PULL_CURSORS_KEY = "cp_pull_cursors";

function getPullCursors(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PULL_CURSORS_KEY) ?? "{}");
  } catch { return {}; }
}

function savePullCursor(entity: string, timestamp: string) {
  const cursors = getPullCursors();
  cursors[entity] = timestamp;
  localStorage.setItem(PULL_CURSORS_KEY, JSON.stringify(cursors));
}

const SYNCABLE_ENTITIES = [
  "projects", "areas", "systems", "subsystems",
  "equipment", "tests", "punch_items", "evidences",
] as const;

type SyncableEntity = typeof SYNCABLE_ENTITIES[number];

// Mapeo entidad → tabla local de Dexie
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
async function pushPendingOps(supabase: ReturnType<typeof createClient>): Promise<{ pushed: number; errors: string[] }> {
  const ops = await localDB.syncQueue
    .orderBy("createdAt")
    .toArray() as SyncOperation[];

  let pushed = 0;
  const errors: string[] = [];

  for (const op of ops) {
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
      // actualizar intentos
      await localDB.syncQueue.update(op.id!, {
        attempts: op.attempts + 1,
        lastError: msg,
      });
    }
  }
  return { pushed, errors };
}

// -------------------- PULL --------------------
async function pullChanges(supabase: ReturnType<typeof createClient>): Promise<{ pulled: number }> {
  const cursors = getPullCursors();
  let pulled = 0;

  for (const entity of SYNCABLE_ENTITIES) {
    const since = cursors[entity] ?? "1970-01-01T00:00:00Z";
    const table = getLocalTable(entity);

    const { data, error } = await supabase
      .from(entity)
      .select("*")
      .gt("updated_at", since)
      .order("updated_at", { ascending: true });

    if (error || !data) continue;

    for (const record of data) {
      await table.put({ ...record, sync_status: "synced" });
      pulled++;
    }

    if (data.length > 0) {
      savePullCursor(entity, data[data.length - 1].updated_at);
    }
  }
  return { pulled };
}

// -------------------- SYNC PRINCIPAL --------------------
export async function runSync(
  onStateChange?: (state: SyncState, result?: SyncResult) => void
): Promise<SyncResult> {
  const supabase = createClient();
  const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

  // Verificar sesión activa
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

// -------------------- AUTO-SYNC con conexión --------------------
export function setupAutoSync(callback?: (result: SyncResult) => void) {
  let timeoutId: ReturnType<typeof setTimeout>;

  const handleOnline = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => runSync((_, r) => r && callback?.(r)), 1500);
  };

  window.addEventListener("online", handleOnline);
  // Si ya hay red al montar
  if (navigator.onLine) handleOnline();

  return () => {
    window.removeEventListener("online", handleOnline);
    clearTimeout(timeoutId);
  };
}
