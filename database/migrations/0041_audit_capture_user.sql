-- ============================================================
-- 0041 — Bitácora: atribuir el usuario en fn_audit()
-- Antes leía solo current_setting('app.current_user') (que la app no setea)
-- => user_id quedaba NULL. Ahora cae a app_current_user_id() (auth.uid()->users.id),
-- atribuyendo toda acción hecha por un usuario autenticado desde la app.
-- No cambia la estructura de audit_log (append-only).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_audit() RETURNS trigger AS $$
declare
  v_user uuid;
begin
  begin
    v_user := COALESCE(
      nullif(current_setting('app.current_user', true), '')::uuid,
      public.app_current_user_id()
    );
  exception when others then v_user := null; end;

  if (tg_op = 'INSERT') then
    insert into public.audit_log(user_id, entity, entity_id, action, after)
      values (v_user, tg_table_name, new.id, 'INSERT', to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log(user_id, entity, entity_id, action, before, after)
      values (v_user, tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(user_id, entity, entity_id, action, before)
      values (v_user, tg_table_name, old.id, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end; $$ language plpgsql security definer;

COMMIT;
