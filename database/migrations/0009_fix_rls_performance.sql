-- ============================================================
-- 0009 — [A-001 FIX] Corregir RLS con JOINs por fila
-- Agregar project_id en equipment y simplificar policies
-- ============================================================

-- 1. Agregar project_id directamente en equipment
alter table equipment
  add column if not exists project_id uuid references projects(id);

-- 2. Poblar project_id en registros existentes (una sola vez)
update equipment e
set project_id = (
  select a.project_id
  from subsystems s
  join systems sy on sy.id = s.system_id
  join areas a    on a.id  = sy.area_id
  where s.id = e.subsystem_id
)
where project_id is null;

-- 3. Índice para la nueva columna (soporte a RLS y queries de app)
create index if not exists idx_equipment_project
  on equipment(project_id)
  where deleted_at is null;

-- 4. Índice compuesto para filtros combinados (dashboard, listas)
create index if not exists idx_equipment_project_status
  on equipment(project_id, status)
  where deleted_at is null;

-- 5. Mejorar funciones RLS con caching de sesión
create or replace function app_current_user_id() returns uuid as $$
declare
  v_cached text;
  v_id uuid;
begin
  -- Intentar leer del cache de sesión primero
  v_cached := nullif(current_setting('app.uid_cache', true), '');
  if v_cached is not null then
    return v_cached::uuid;
  end if;
  -- Si no hay cache, consultar y guardar
  select id into v_id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
  -- Guardar en la sesión actual
  perform set_config('app.uid_cache', coalesce(v_id::text, ''), true);
  return v_id;
end;
$$ language plpgsql stable security definer;

create or replace function app_user_role() returns text as $$
declare
  v_cached text;
  v_role text;
begin
  v_cached := nullif(current_setting('app.role_cache', true), '');
  if v_cached is not null then
    return v_cached;
  end if;
  select r.key into v_role
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
  limit 1;
  perform set_config('app.role_cache', coalesce(v_role, ''), true);
  return v_role;
end;
$$ language plpgsql stable security definer;

create or replace function app_is_admin() returns boolean as $$
  select coalesce(app_user_role() = 'admin', false);
$$ language sql stable security definer;

create or replace function app_in_project(p uuid) returns boolean as $$
  select app_is_admin() or exists (
    select 1 from public.project_members m
    where m.project_id = p
      and m.user_id = app_current_user_id()
  );
$$ language sql stable security definer;

-- 6. Eliminar policy antigua de equipment (con JOIN costoso)
drop policy if exists equipment_select on equipment;

-- 7. Crear policy nueva SIMPLE usando project_id directo
create policy equipment_select on equipment
  for select using (app_in_project(project_id));

create policy equipment_insert on equipment
  for insert with check (
    app_user_role() in ('admin', 'supervisor', 'tecnico')
    and app_in_project(project_id)
  );

create policy equipment_update on equipment
  for update using (
    app_user_role() in ('admin', 'supervisor', 'tecnico')
    and app_in_project(project_id)
  );

-- 8. ROLLBACK (documentado):
-- drop policy equipment_select on equipment;
-- drop policy equipment_insert on equipment;
-- drop policy equipment_update on equipment;
-- alter table equipment drop column project_id;
-- (recrear policy original con JOINs desde 0007_rls.sql)
