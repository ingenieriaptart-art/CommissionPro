-- ============================================================
-- 0003 — Jerarquía: Proyecto > Área > Sistema > Subsistema > Equipo
-- ============================================================

create table projects (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,
  name              text not null,
  client_company_id uuid references companies(id),
  location          text,
  description       text,
  start_date        date,
  end_date          date,
  status            project_status not null default 'planificacion',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  created_by        uuid references users(id),
  updated_by        uuid references users(id)
);

-- Miembros del proyecto (qué usuarios ven/operan el proyecto)
create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  role_id    uuid references roles(id),
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table areas (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code       text not null,
  name       text not null,
  description text,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (project_id, code)
);

create table systems (
  id         uuid primary key default gen_random_uuid(),
  area_id    uuid not null references areas(id) on delete cascade,
  code       text not null,
  name       text not null,
  description text,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table subsystems (
  id         uuid primary key default gen_random_uuid(),
  system_id  uuid not null references systems(id) on delete cascade,
  code       text not null,
  name       text not null,
  description text,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table equipment (
  id            uuid primary key default gen_random_uuid(),
  subsystem_id  uuid not null references subsystems(id) on delete cascade,
  tag           text not null,
  name          text not null,
  manufacturer  text,
  model         text,
  serial_number text,
  power         text,
  voltage       text,
  current       text,
  criticality   criticality not null default 'media',
  status        equipment_status not null default 'pendiente',
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  created_by    uuid references users(id),
  updated_by    uuid references users(id)
);

create index idx_areas_project on areas(project_id);
create index idx_systems_area on systems(area_id);
create index idx_subsystems_system on subsystems(system_id);
create index idx_equipment_subsystem on equipment(subsystem_id);
create index idx_equipment_tag on equipment(tag);
create unique index uq_equipment_tag_project on equipment(subsystem_id, tag) where deleted_at is null;
