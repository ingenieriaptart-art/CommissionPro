-- ============================================================
-- 0001 — Extensiones y tipos enumerados
-- CommissionPro / Plataforma de Comisionamiento Industrial
-- ============================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "uuid-ossp";

-- ---------- ENUMs de dominio ----------
create type company_type      as enum ('cliente','contratista','integrador','epc','otro');
create type user_status        as enum ('active','inactive','blocked');
create type project_status     as enum ('planificacion','en_ejecucion','suspendido','cerrado');
create type criticality        as enum ('alta','media','baja');

create type equipment_status   as enum (
  'pendiente','en_ejecucion','aprobado','rechazado','bloqueado',
  'listo_energizacion','listo_arranque','operativo');

create type test_type          as enum (
  'precomisionamiento','fat','sat','loop_check','energizacion','funcional');

create type test_status        as enum (
  'borrador','ejecutado','revisado','aprob_supervisor',
  'aprob_qaqc','aprob_cliente','cerrado','rechazado');

create type checklist_result   as enum ('cumple','no_cumple','no_aplica');

create type field_type         as enum (
  'texto','numero','fecha','hora','moneda','select','checkbox','radio',
  'firma','imagen','video','pdf','archivo','textarea');

create type evidence_type      as enum ('foto','video','pdf','archivo');
create type evidence_stage     as enum ('antes','durante','despues','general');

create type punch_priority     as enum ('critica','alta','media','baja');
create type punch_status       as enum ('abierto','en_proceso','corregido','cerrado');

create type approval_status    as enum ('pendiente','aprobado','rechazado');
create type sync_direction     as enum ('push','pull');
create type sync_status_t      as enum ('ok','parcial','error');
create type record_sync_status as enum ('synced','pending','conflict');
-- ============================================================
-- 0002 — RBAC: empresas, usuarios, roles, permisos
-- ============================================================

create table companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         company_type not null default 'contratista',
  nit          text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table roles (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,          -- admin, supervisor, tecnico, cliente
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,          -- ej: user.create, test.approve
  description text,
  category    text
);

create table role_permissions (
  role_id       uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table users (
  id                   uuid primary key default gen_random_uuid(),
  auth_user_id         uuid unique,           -- enlace a auth.users de Supabase
  company_id           uuid references companies(id),
  role_id              uuid references roles(id),
  full_name            text not null,
  position             text,                  -- cargo
  email                text unique not null,
  phone                text,
  signature_url        text,
  status               user_status not null default 'active',
  must_change_password boolean not null default true,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

-- Permisos extra/override por usuario (grant o revoke explícito)
create table user_permissions (
  user_id       uuid references users(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  granted       boolean not null default true,
  primary key (user_id, permission_id)
);

create index idx_users_company on users(company_id);
create index idx_users_role on users(role_id);
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
-- ============================================================
-- 0006 — Auditoría, sincronización y triggers comunes
-- ============================================================

-- Bitácora de auditoría (append-only; nunca se borra físicamente)
create table audit_log (
  id         bigserial primary key,
  user_id    uuid,
  entity     text not null,
  entity_id  uuid,
  action     text not null,          -- INSERT, UPDATE, DELETE(lógico), LOGIN...
  before     jsonb,
  after      jsonb,
  ip         inet,
  device     text,
  created_at timestamptz not null default now()
);

create table access_log (
  id         bigserial primary key,
  user_id    uuid,
  email      text,
  event      text not null,          -- login_ok, login_fail, logout, pwd_reset
  ip         inet,
  device     text,
  created_at timestamptz not null default now()
);

create table sync_log (
  id          uuid primary key default gen_random_uuid(),
  device_id   text,
  user_id     uuid references users(id),
  direction   sync_direction not null,
  entity      text,
  records     int default 0,
  conflicts   int default 0,
  status      sync_status_t not null default 'ok',
  detail      jsonb,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

create index idx_audit_entity on audit_log(entity, entity_id);
create index idx_audit_user on audit_log(user_id);
create index idx_audit_created on audit_log(created_at);

-- ---------- Trigger: updated_at automático ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

-- ---------- Trigger: auditoría genérica ----------
create or replace function fn_audit() returns trigger as $$
declare
  v_user uuid;
begin
  begin
    v_user := nullif(current_setting('app.current_user', true), '')::uuid;
  exception when others then v_user := null; end;

  if (tg_op = 'INSERT') then
    insert into audit_log(user_id, entity, entity_id, action, after)
      values (v_user, tg_table_name, new.id, 'INSERT', to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into audit_log(user_id, entity, entity_id, action, before, after)
      values (v_user, tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into audit_log(user_id, entity, entity_id, action, before)
      values (v_user, tg_table_name, old.id, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end; $$ language plpgsql;

-- Aplicar triggers a tablas clave
do $$
declare t text;
begin
  foreach t in array array[
    'companies','users','projects','areas','systems','subsystems','equipment',
    'form_templates','form_versions','tests','checklist_items','evidences',
    'signatures','approvals','punch_items','documents']
  loop
    -- updated_at (solo donde existe la columna)
    if exists (select 1 from information_schema.columns
               where table_name=t and column_name='updated_at') then
      execute format('drop trigger if exists trg_updated_%1$s on %1$s;', t);
      execute format('create trigger trg_updated_%1$s before update on %1$s
                      for each row execute function set_updated_at();', t);
    end if;
    -- auditoría
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s
                    for each row execute function fn_audit();', t);
  end loop;
end $$;
-- ============================================================
-- 0007 — Row Level Security (RLS)
-- Modelo: el JWT de Supabase identifica al auth user; mapeamos
-- a public.users para conocer rol y membresías de proyecto.
-- ============================================================

-- Helper: id de usuario de aplicación a partir del auth.uid()
create or replace function app_current_user_id() returns uuid as $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$ language sql stable;

create or replace function app_user_role() returns text as $$
  select r.key from public.users u
  join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid() limit 1;
$$ language sql stable;

create or replace function app_is_admin() returns boolean as $$
  select coalesce(app_user_role() = 'admin', false);
$$ language sql stable;

-- ¿el usuario pertenece al proyecto?
create or replace function app_in_project(p uuid) returns boolean as $$
  select app_is_admin() or exists (
    select 1 from public.project_members m
    where m.project_id = p and m.user_id = app_current_user_id());
$$ language sql stable;

-- Activar RLS en tablas sensibles
alter table projects        enable row level security;
alter table areas           enable row level security;
alter table systems         enable row level security;
alter table subsystems      enable row level security;
alter table equipment       enable row level security;
alter table tests           enable row level security;
alter table punch_items     enable row level security;
alter table documents       enable row level security;
alter table evidences       enable row level security;
alter table notifications   enable row level security;

-- Proyectos: miembros (o admin) ven; admin/supervisor escriben
create policy projects_select on projects for select
  using (app_in_project(id));
create policy projects_write on projects for all
  using (app_is_admin()) with check (app_is_admin());

-- Jerarquía: ligada a la membresía del proyecto
create policy areas_select on areas for select using (app_in_project(project_id));
create policy areas_write  on areas for all
  using (app_user_role() in ('admin','supervisor'))
  with check (app_user_role() in ('admin','supervisor'));

create policy equipment_select on equipment for select using (
  app_in_project((select a.project_id from subsystems s
     join systems sy on sy.id=s.system_id
     join areas a on a.id=sy.area_id where s.id = equipment.subsystem_id)));

-- Tests: miembros del proyecto ven; cliente solo lectura
create policy tests_select on tests for select using (app_in_project(project_id));
create policy tests_insert on tests for insert
  with check (app_user_role() in ('admin','supervisor','tecnico') and app_in_project(project_id));
create policy tests_update on tests for update
  using (app_user_role() in ('admin','supervisor','tecnico') and app_in_project(project_id));

-- Punch / documentos / evidencias: por proyecto
create policy punch_select on punch_items for select using (app_in_project(project_id));
create policy punch_write  on punch_items for all
  using (app_user_role() in ('admin','supervisor','tecnico'))
  with check (app_in_project(project_id));

create policy documents_select on documents for select using (app_in_project(project_id));
create policy evidences_select on evidences for select using (
  project_id is null or app_in_project(project_id));

-- Notificaciones: cada quien ve las suyas
create policy notifications_own on notifications for select using (user_id = app_current_user_id());

-- NOTA: audit_log y access_log NO tienen políticas de delete/update:
-- son append-only. Acceso de lectura se concede solo a admin vía vistas/API.
-- ============================================================
-- SEED — Roles y permisos base
-- ============================================================

insert into roles (key, name, description, is_system) values
  ('admin',      'Administrador General', 'Acceso total al sistema', true),
  ('supervisor', 'Supervisor',            'Asigna, revisa y aprueba', true),
  ('tecnico',    'Técnico',               'Ejecuta pruebas y evidencias', true),
  ('cliente',    'Cliente',               'Solo lectura', true)
on conflict (key) do nothing;

insert into permissions (key, category, description) values
  ('user.create','usuarios','Crear usuarios'),
  ('user.edit','usuarios','Editar usuarios'),
  ('user.delete','usuarios','Eliminar usuarios'),
  ('project.create','proyectos','Crear proyectos'),
  ('project.edit','proyectos','Editar proyectos'),
  ('form.configure','formularios','Configurar formularios'),
  ('test.create','pruebas','Crear/ejecutar pruebas'),
  ('test.execute','pruebas','Ejecutar pruebas'),
  ('test.approve','pruebas','Aprobar pruebas'),
  ('test.reject','pruebas','Rechazar pruebas'),
  ('checklist.fill','pruebas','Completar checklists'),
  ('evidence.upload','evidencias','Subir fotografías/evidencias'),
  ('punch.create','punch','Crear punch list'),
  ('punch.manage','punch','Gestionar punch list'),
  ('report.generate','informes','Generar informes'),
  ('report.export','informes','Exportar información'),
  ('dashboard.view','dashboard','Ver dashboards'),
  ('document.download','documental','Descargar documentos'),
  ('permission.configure','seguridad','Configurar permisos')
on conflict (key) do nothing;

-- admin: todos los permisos
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='admin'), p.id from permissions p
on conflict do nothing;

-- supervisor
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='supervisor'), p.id from permissions p
where p.key in ('test.approve','test.reject','test.create','checklist.fill',
  'punch.create','punch.manage','report.generate','dashboard.view',
  'document.download','evidence.upload')
on conflict do nothing;

-- tecnico
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='tecnico'), p.id from permissions p
where p.key in ('test.execute','test.create','checklist.fill','evidence.upload',
  'punch.create','dashboard.view','document.download')
on conflict do nothing;

-- cliente (solo lectura)
insert into role_permissions (role_id, permission_id)
select (select id from roles where key='cliente'), p.id from permissions p
where p.key in ('dashboard.view','document.download','report.export')
on conflict do nothing;
