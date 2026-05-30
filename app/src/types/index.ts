// ============================================================
// Tipos TypeScript centrales — CommissionPro
// ============================================================

// -------------------- ENUMS --------------------
export type CompanyType = "cliente" | "contratista" | "integrador" | "epc" | "otro";
export type UserStatus = "active" | "inactive" | "blocked";
export type ProjectStatus = "planificacion" | "en_ejecucion" | "suspendido" | "cerrado";
export type Criticality = "alta" | "media" | "baja";

export type EquipmentStatus =
  | "pendiente" | "en_ejecucion" | "aprobado" | "rechazado"
  | "bloqueado" | "listo_energizacion" | "listo_arranque" | "operativo";

export type TestType =
  | "precomisionamiento" | "fat" | "sat"
  | "loop_check" | "energizacion" | "funcional";

export type TestStatus =
  | "borrador" | "ejecutado" | "revisado"
  | "aprob_supervisor" | "aprob_qaqc" | "aprob_cliente"
  | "cerrado" | "rechazado";

export type ChecklistResult = "cumple" | "no_cumple" | "no_aplica";
export type FieldType =
  | "texto" | "numero" | "fecha" | "hora" | "moneda"
  | "select" | "checkbox" | "radio" | "firma"
  | "imagen" | "video" | "pdf" | "archivo" | "textarea";

export type EvidenceType = "foto" | "video" | "pdf" | "archivo";
export type EvidenceStage = "antes" | "durante" | "despues" | "general";
export type PunchPriority = "critica" | "alta" | "media" | "baja";
export type PunchStatus = "abierto" | "en_proceso" | "corregido" | "cerrado";
export type ApprovalStatus = "pendiente" | "aprobado" | "rechazado";
export type SyncStatus = "synced" | "pending" | "conflict";

// -------------------- ENTIDADES --------------------
export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  nit?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_system: boolean;
}

export interface Permission {
  id: string;
  key: string;
  description?: string;
  category?: string;
}

export interface User {
  id: string;
  company_id?: string;
  role_id?: string;
  full_name: string;
  position?: string;
  email: string;
  phone?: string;
  signature_url?: string;
  status: UserStatus;
  must_change_password: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  // relaciones
  company?: Company;
  role?: Role;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client_company_id?: string;
  location?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  client_company?: Company;
}

export interface Area {
  id: string;
  project_id: string;
  code: string;
  name: string;
  description?: string;
  sort_order: number;
}

export interface System {
  id: string;
  area_id: string;
  code: string;
  name: string;
  description?: string;
  sort_order: number;
}

export interface Subsystem {
  id: string;
  system_id: string;
  code: string;
  name: string;
  description?: string;
  sort_order: number;
}

export interface Equipment {
  id: string;
  // [A-001 FIX] project_id desnormalizado para RLS eficiente sin JOINs
  project_id: string;
  subsystem_id: string;
  tag: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  power?: string;
  voltage?: string;
  current?: string;
  criticality: Criticality;
  status: EquipmentStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // sync
  version?: number;
  sync_status?: SyncStatus;
}

export interface FormField {
  id: string;
  version_id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  validations?: Record<string, unknown>;
  sort_order: number;
}

export interface FormVersion {
  id: string;
  template_id: string;
  version: number;
  is_published: boolean;
  schema: Record<string, unknown>;
  fields?: FormField[];
}

export interface FormTemplate {
  id: string;
  project_id?: string;
  key: string;
  name: string;
  test_type?: TestType;
  description?: string;
  current_version?: FormVersion;
}

export interface Test {
  id: string;
  project_id: string;
  equipment_id?: string;
  // [A-006 FIX] Snapshot del equipo al momento de ejecutar la prueba.
  // Preserva trazabilidad si el equipo se modifica o elimina.
  equipment_snapshot?: Partial<Equipment>;
  form_version_id?: string;
  type: TestType;
  code?: string;
  status: TestStatus;
  assigned_to?: string;
  executed_by?: string;
  executed_at?: string;
  data?: Record<string, unknown>;
  result_summary?: ChecklistResult;
  created_at: string;
  updated_at: string;
  // sync
  version: number;
  sync_status: SyncStatus;
  origin_device_id?: string;
  // relaciones
  equipment?: Equipment;
  checklist_items?: ChecklistItem[];
  evidences?: Evidence[];
  approvals?: Approval[];
}

export interface ChecklistItem {
  id: string;
  test_id: string;
  item_key: string;
  description: string;
  result?: ChecklistResult;
  observation?: string;
  responsible?: string;
  sort_order: number;
}

export interface Evidence {
  id: string;
  project_id?: string;
  test_id?: string;
  equipment_id?: string;
  punch_id?: string;
  type: EvidenceType;
  stage: EvidenceStage;
  storage_url?: string;
  local_blob_ref?: string;
  gps_lat?: number;
  gps_lng?: number;
  annotations?: Record<string, unknown>;
  observations?: string;
  captured_by?: string;
  captured_at: string;
  sync_status: SyncStatus;
}

export interface Signature {
  id: string;
  user_id?: string;
  test_id?: string;
  role_at_sign?: string;
  image_url?: string;
  signed_at: string;
  ip?: string;
  device?: string;
}

export interface Approval {
  id: string;
  test_id: string;
  level: number;
  level_name: string;
  status: ApprovalStatus;
  approver_id?: string;
  approved_at?: string;
  observations?: string;
}

export interface PunchItem {
  id: string;
  project_id: string;
  equipment_id?: string;
  test_id?: string;
  code?: string;
  title: string;
  description?: string;
  priority: PunchPriority;
  status: PunchStatus;
  responsible_id?: string;
  due_date?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  version?: number;
  sync_status: SyncStatus;
  evidences?: Evidence[];
}

export interface Document {
  id: string;
  project_id: string;
  name: string;
  file_type?: string;
  category?: string;
  storage_url?: string;
  version: number;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  entity?: string;
  entity_id?: string;
  read_at?: string;
  created_at: string;
}

// -------------------- UI helpers --------------------
export interface SelectOption { value: string; label: string; }
export interface KpiCard { label: string; value: number | string; total?: number; color?: string; }
