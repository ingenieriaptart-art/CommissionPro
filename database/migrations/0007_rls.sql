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
