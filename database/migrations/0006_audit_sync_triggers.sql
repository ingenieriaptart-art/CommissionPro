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
