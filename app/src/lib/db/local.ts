// ============================================================
// Base de datos local (Dexie/IndexedDB) — motor Offline First
// ============================================================
import Dexie, { type EntityTable } from "dexie";
import type {
  Project, Area, System, Subsystem, Equipment,
  Test, ChecklistItem, Evidence, PunchItem,
  Notification, FormTemplate,
} from "@/types";

// Tipo para la cola de sincronización (outbox)
export interface SyncOperation {
  id?: number;           // autoincrement
  entity: string;
  entityId: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface LocalBlobStore {
  id?: number;
  evidenceId: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

// [A-008 FIX] Cursores de sync almacenados en IndexedDB (no localStorage)
export interface SyncCursor {
  entity: string;   // clave primaria
  cursor: string;   // ISO timestamp del último registro recibido
  updatedAt: string;
}

class CommissionProDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  areas!: EntityTable<Area, "id">;
  systems!: EntityTable<System, "id">;
  subsystems!: EntityTable<Subsystem, "id">;
  equipment!: EntityTable<Equipment, "id">;
  tests!: EntityTable<Test, "id">;
  checklistItems!: EntityTable<ChecklistItem, "id">;
  evidences!: EntityTable<Evidence, "id">;
  punchItems!: EntityTable<PunchItem, "id">;
  notifications!: EntityTable<Notification, "id">;
  formTemplates!: EntityTable<FormTemplate, "id">;
  syncQueue!: EntityTable<SyncOperation, "id">;
  blobStore!: EntityTable<LocalBlobStore, "id">;
  syncCursors!: EntityTable<SyncCursor, "entity">;

  constructor() {
    super("CommissionProDB");

    this.version(1).stores({
      projects:      "id, code, status",
      areas:         "id, project_id",
      systems:       "id, area_id",
      subsystems:    "id, system_id",
      equipment:     "id, subsystem_id, tag, status, sync_status",
      tests:         "id, project_id, equipment_id, type, status, sync_status",
      checklistItems:"id, test_id",
      evidences:     "id, test_id, equipment_id, punch_id, sync_status",
      punchItems:    "id, project_id, status, priority, sync_status",
      notifications: "id, user_id, read_at",
      formTemplates: "id, project_id, test_type",
      syncQueue:     "++id, entity, operation, createdAt",
      blobStore:     "++id, evidenceId",
    });

    // [A-005 FIX] v2: project_id como índice en equipment
    this.version(2).stores({
      equipment: "id, project_id, subsystem_id, tag, status, sync_status",
    });

    // [A-008 FIX] v3: tabla syncCursors en IndexedDB (reemplaza localStorage)
    this.version(3).stores({
      syncCursors: "entity",  // clave primaria: nombre de la entidad
    });
  }
}

export const localDB = new CommissionProDB();

// -------------------- helpers --------------------
export async function enqueueSync(
  entity: string,
  entityId: string,
  operation: SyncOperation["operation"],
  payload: unknown
) {
  await localDB.syncQueue.add({
    entity,
    entityId,
    operation,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}

export async function saveBlobLocally(evidenceId: string, blob: Blob): Promise<number> {
  const id = await localDB.blobStore.add({
    evidenceId,
    blob,
    mimeType: blob.type,
    createdAt: new Date().toISOString(),
  });
  return id as number;
}

export async function getBlobForEvidence(evidenceId: string): Promise<Blob | undefined> {
  const record = await localDB.blobStore
    .where("evidenceId").equals(evidenceId).first();
  return record?.blob;
}
