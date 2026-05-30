-- ============================================================
-- 0005 — Punch list, repositorio documental, notificaciones
-- ============================================================

create table punch_items (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  equipment_id  uuid references equipment(id) on delete set null,
  test_id       uuid references tests(id) on delete set null,
  code          text,
  title         text not null,
  description   text,
  priority      punch_priority not null default 'media',
  status        punch_status not null default 'abierto',
  responsible_id uuid references users(id),
  due_date      date,
  closed_at     timestamptz,
  version       int not null default 1,
  sync_status   record_sync_status not null default 'synced',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  created_by    uuid references users(id),
  updated_by    uuid references users(id)
);

-- ahora sí enlazamos evidences.punch_id
alter table evidences
  add constraint fk_evidences_punch
  foreign key (punch_id) references punch_items(id) on delete cascade;

create table documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  scope       text,                  -- area/system/subsystem/equipment ref opcional
  scope_ref   uuid,
  name        text not null,
  file_type   text,                  -- pdf, xlsx, docx, dwg, jpg, mp4...
  category    text,                  -- plano, certificado, manual, datasheet
  storage_url text,
  version     int not null default 1,
  uploaded_by uuid references users(id),
  uploaded_at timestamptz not null default now(),
  deleted_at  timestamptz
);

create table document_versions (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version     int not null,
  storage_url text not null,
  uploaded_by uuid references users(id),
  uploaded_at timestamptz not null default now(),
  notes       text,
  unique (document_id, version)
);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null,        -- test_assigned, test_approved, punch_critical...
  title       text not null,
  body        text,
  entity      text,
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_punch_project on punch_items(project_id);
create index idx_punch_status on punch_items(status);
create index idx_documents_project on documents(project_id);
create index idx_notifications_user on notifications(user_id) where read_at is null;
