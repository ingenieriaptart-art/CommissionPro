-- ============================================================
-- 0016 — Campos de ingeniería en equipment
-- Requeridos para importar PTAR Zipaquirá:
--   DATOS_INST: 360 instrumentos con service, io_type, rtu, location, pid
--   DATOS_POT:  29 equipos de potencia con power_kw
-- ============================================================

BEGIN;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS service         TEXT,
  ADD COLUMN IF NOT EXISTS io_type         TEXT,
  ADD COLUMN IF NOT EXISTS rtu_destination TEXT,
  ADD COLUMN IF NOT EXISTS location_system TEXT,
  ADD COLUMN IF NOT EXISTS pid_reference   TEXT,
  ADD COLUMN IF NOT EXISTS power_kw        NUMERIC(10,3);

-- Unicidad a nivel de proyecto (previene duplicados en el pipeline TAG→Equipo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_equipment_project_tag
  ON equipment(project_id, tag)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_io_type
  ON equipment(project_id, io_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_rtu
  ON equipment(project_id, rtu_destination)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_location
  ON equipment(project_id, location_system)
  WHERE deleted_at IS NULL;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- ALTER TABLE equipment
--   DROP COLUMN IF EXISTS service,
--   DROP COLUMN IF EXISTS io_type,
--   DROP COLUMN IF EXISTS rtu_destination,
--   DROP COLUMN IF EXISTS location_system,
--   DROP COLUMN IF EXISTS pid_reference,
--   DROP COLUMN IF EXISTS power_kw;
-- DROP INDEX IF EXISTS uq_equipment_project_tag;
-- DROP INDEX IF EXISTS idx_equipment_io_type;
-- DROP INDEX IF EXISTS idx_equipment_rtu;
-- DROP INDEX IF EXISTS idx_equipment_location;
-- COMMIT;
