-- ============================================================
-- 0011 — [A-004 FIX] Corregir trigger de auditoría
-- Excluir columnas binarias para evitar crecimiento explosivo
-- ============================================================

create or replace function fn_audit() returns trigger as $$
declare
  v_user   uuid;
  v_after  jsonb;
  v_before jsonb;
  -- Columnas a excluir: datos binarios, URLs largas, JSONB de respuestas
  -- que generarían audit_log de tamaño incontrolable
  EXCLUDED constant text[] := array[
    'local_blob_ref',    -- referencia IndexedDB (solo temporal)
    'storage_url',       -- URL del archivo (cambia con cada versión)
    'data',              -- respuestas del formulario (puede ser JSONB enorme)
    'annotations',       -- anotaciones sobre imágenes
    'metadata',          -- metadatos técnicos del equipo (jsonb)
    'equipment_snapshot' -- snapshot completo del equipo (jsonb)
  ];
begin
  -- Leer usuario actual de la sesión
  begin
    v_user := nullif(current_setting('app.current_user', true), '')::uuid;
  exception when others then
    v_user := null;
  end;

  if (tg_op = 'INSERT') then
    -- [A-004 FIX] Excluir columnas binarias del JSONB
    v_after := to_jsonb(new) - EXCLUDED;
    insert into audit_log(user_id, entity, entity_id, action, after)
      values (v_user, tg_table_name, new.id, 'INSERT', v_after);
    return new;

  elsif (tg_op = 'UPDATE') then
    v_before := to_jsonb(old) - EXCLUDED;
    v_after  := to_jsonb(new) - EXCLUDED;
    -- Optimización: solo registrar si realmente hubo cambios relevantes
    if v_before IS DISTINCT FROM v_after then
      insert into audit_log(user_id, entity, entity_id, action, before, after)
        values (v_user, tg_table_name, new.id, 'UPDATE', v_before, v_after);
    end if;
    return new;

  elsif (tg_op = 'DELETE') then
    v_before := to_jsonb(old) - EXCLUDED;
    insert into audit_log(user_id, entity, entity_id, action, before)
      values (v_user, tg_table_name, old.id, 'DELETE', v_before);
    return old;
  end if;

  return null;
end;
$$ language plpgsql;

-- Los triggers existentes ya apuntan a fn_audit() y se actualizan
-- automáticamente al reemplazar la función. No se necesita recrearlos.

-- ROLLBACK:
-- Restaurar la versión anterior de fn_audit() desde 0006_audit_sync_triggers.sql
