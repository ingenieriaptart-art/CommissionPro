-- ============================================================
-- 0004 — Formularios dinámicos, pruebas, checklists, evidencias
-- ============================================================

create table form_templates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  key         text not null,
  name        text not null,
  test_type   test_type,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  created_by  uuid references users(id)
);

create table form_versions (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references form_templates(id) on delete cascade,
  version     int not null,
  is_published boolean not null default false,
  schema      jsonb not null default '{}'::jsonb,  -- definición completa (JSON Schema-like)
  created_at  timestamptz not null default now(),
  created_by  uuid references users(id),
  unique (template_id, version)
);

-- Campos normalizados (además del schema jsonb, para consultas/reportes)
create table form_fields (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references form_versions(id) on delete cascade,
  key         text not null,
  label       text not null,
  type        field_type not null,
  required    boolean not null default false,
  options     jsonb,            -- para select/radio/checkbox
  validations jsonb,
  sort_order  int default 0,
  unique (version_id, key)
);

create table tests (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  equipment_id    uuid references equipment(id) on delete cascade,
  form_version_id uuid references form_versions(id),
  type            test_type not null,
  code            text,
  status          test_status not null default 'borrador',
  assigned_to     uuid references users(id),
  executed_by     uuid references users(id),
  executed_at     timestamptz,
  data            jsonb default '{}'::jsonb,  -- respuestas del formulario
  result_summary  checklist_result,
  -- columnas de sincronización offline
  version          int not null default 1,
  sync_status      record_sync_status not null default 'synced',
  origin_device_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  created_by      uuid references users(id),
  updated_by      uuid references users(id)
);

create table checklist_items (
  id           uuid primary key default gen_random_uuid(),
  test_id      uuid not null references tests(id) on delete cascade,
  item_key     text not null,
  description  text not null,
  result       checklist_result,
  observation  text,
  responsible  uuid references users(id),
  sort_order   int default 0,
  created_at   timestamptz not null default now()
);

create table evidences (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  test_id      uuid references tests(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete cascade,
  punch_id     uuid,                       -- FK añadida en 0005
  type         evidence_type not null default 'foto',
  stage        evidence_stage not null default 'general',
  storage_url  text,
  local_blob_ref text,                     -- referencia IndexedDB mientras offline
  gps_lat      double precision,
  gps_lng      double precision,
  annotations  jsonb,
  observations text,
  captured_by  uuid references users(id),
  captured_at  timestamptz not null default now(),
  sync_status  record_sync_status not null default 'synced',
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- Firmas electrónicas
create table signatures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id),
  test_id      uuid references tests(id) on delete cascade,
  role_at_sign text,
  image_url    text,
  signed_at    timestamptz not null default now(),
  ip           inet,
  device       text
);

-- Flujo de aprobación multinivel (1..7)
create table approvals (
  id           uuid primary key default gen_random_uuid(),
  test_id      uuid not null references tests(id) on delete cascade,
  level        int not null,         -- 1 ejecutado .. 7 cerrado
  level_name   text not null,
  status       approval_status not null default 'pendiente',
  approver_id  uuid references users(id),
  approved_at  timestamptz,
  observations text,
  unique (test_id, level)
);

create index idx_tests_project on tests(project_id);
create index idx_tests_equipment on tests(equipment_id);
create index idx_tests_status on tests(status);
create index idx_tests_sync on tests(sync_status);
create index idx_checklist_test on checklist_items(test_id);
create index idx_evidences_test on evidences(test_id);
create index idx_evidences_equipment on evidences(equipment_id);
create index idx_approvals_test on approvals(test_id);
