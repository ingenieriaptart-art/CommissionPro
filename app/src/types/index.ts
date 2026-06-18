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
  | "bloqueado" | "listo_energizacion" | "listo_arranque" | "operativo"
  | "futuro";

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

export type { Access, ModuleAccessMap } from "@/lib/modules";

export interface ProjectMember {
  project_id:     string;
  user_id:        string;
  role_id:        string;
  added_at:       string;
  module_access?: import("@/lib/modules").ModuleAccessMap;
  project?:       Pick<Project, "id" | "name">;
  role?:          Pick<Role,    "id" | "key" | "name">;
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
  // Sprint 2: campos de ingeniería (migraciones 0016 + 0020)
  service?: string;
  io_type?: string;
  rtu_destination?: string;
  location_system?: string;
  pid_reference?: string;
  power_kw?: number;
  power_installed_kw?: number;
  ccm_panel?: string;
  catalog_url?: string;
  fat_protocol_url?: string;
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

export type DocumentProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface Document {
  id: string;
  project_id: string;
  name: string;
  file_type?: string;
  category?: string;
  storage_url?: string;
  storage_path?: string;
  version: number;
  uploaded_by?: string;
  uploaded_at: string;
  file_size?: number;
  mime_type?: string;
  processing_status?: DocumentProcessingStatus;
  processing_error?: string;
  processing_metadata?: Record<string, unknown>;
  deleted_at?: string;
}

export type TagStatus = "pending_review" | "approved" | "rejected" | "merged";

export interface TagPatternRule {
  id: string;
  project_id?: string;
  name: string;
  regex_pattern: string;
  detected_type: string;
  description_hint?: string;
  priority: number;
  is_active: boolean;
  auto_approve_threshold?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EngineeredDocumentEntity {
  id: string;
  project_id: string;
  document_id: string;
  page_number?: number;
  source_text: string;
  location_x?: number;
  location_y?: number;
  entity_type: string;
  raw_value: string;
  created_at: string;
}

export interface EngineeredTag {
  id: string;
  project_id: string;
  document_id: string;
  entity_id?: string;
  tag: string;
  detected_type?: string;
  description?: string;
  tag_confidence: number;
  type_confidence: number;
  description_confidence: number;
  extracted_data_json: {
    source_format?: string;
    pattern_name?: string;
    pattern_priority?: number;
    occurrences?: number;
    pages?: number[];
    context?: string;
    context_keywords?: string[];
  };
  status: TagStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  // relations
  document?: Document;
  entity?: EngineeredDocumentEntity;
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

// ============================================================
// Plant Map — Mapa Interactivo de Planta
// ============================================================

export type PlantMapLevel = 'visual' | 'area' | 'system';

export interface PlantMapLayout {
  id: string;
  project_id: string;
  level: PlantMapLevel;
  parent_id: string | null;
  nodes_json: PlantMapNodePosition[];
  edges_json: PlantMapEdgeConfig[];
  overlays_json: PlantMapAreaOverlay[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

/** Posición de un nodo en el canvas React Flow */
export interface PlantMapNodePosition {
  id: string;
  x: number;
  y: number;
}

/** Edge en el diagrama React Flow */
export interface PlantMapEdgeConfig {
  id: string;
  source: string;
  target: string;
}

/** Overlay rectangular sobre la imagen física — área o equipo */
export interface PlantMapAreaOverlay {
  id: string;                   // area.id cuando type='area'; equipment.id cuando type='equipment'
  type?: 'area' | 'equipment';  // ausente se trata como 'area' (backward-compatible)
  x: number;                    // píxeles desde esquina superior izquierda de la imagen original
  y: number;
  width: number;
  height: number;
}

/** Estado de navegación — qué nivel está activo en el canvas */
export type DrillLevel =
  | { level: 'visual' }
  | { level: 'area';   areaId: string; areaName: string }
  | { level: 'system'; areaId: string; areaName: string; systemId: string; systemName: string };

/** Estado del panel flotante */
export type PanelState =
  | { open: false }
  | { open: true; view: 'area';      areaId: string }
  | { open: true; view: 'equipment'; subsystemId: string }
  | { open: true; view: 'detail';    equipmentId: string };
