-- ============================================================
-- 0008 — [A-006 FIX] Corregir FK CASCADE en tests → equipment
-- Proteger integridad legal de protocolos firmados
-- ============================================================

-- 1. Eliminar el constraint actual de CASCADE
alter table tests
  drop constraint if exists tests_equipment_id_fkey;

-- 2. Recrear con SET NULL (el test queda intacto si el equipo se elimina)
alter table tests
  add constraint tests_equipment_id_fkey
  foreign key (equipment_id)
  references equipment(id)
  on delete set null;

-- 3. Agregar columna equipment_snapshot para preservar datos históricos
--    del equipo al momento de ejecutar la prueba
alter table tests
  add column if not exists equipment_snapshot jsonb default null;

comment on column tests.equipment_snapshot is
  'Snapshot de los datos del equipo al momento de ejecutar la prueba. '
  'Preserva trazabilidad si el equipo se modifica o elimina posteriormente.';

-- 4. ROLLBACK (documentado):
-- alter table tests drop constraint tests_equipment_id_fkey;
-- alter table tests add constraint tests_equipment_id_fkey
--   foreign key (equipment_id) references equipment(id) on delete cascade;
-- alter table tests drop column equipment_snapshot;
