-- ============================================================
-- 0020 — Campo ccm_panel en equipment
-- Almacena el CCM (Centro de Control de Motores) o tablero
-- que alimenta cada equipo, extraído del Instrument Index.
-- ============================================================

BEGIN;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS ccm_panel TEXT;

CREATE INDEX IF NOT EXISTS idx_equipment_ccm_panel
  ON equipment(project_id, ccm_panel)
  WHERE deleted_at IS NULL AND ccm_panel IS NOT NULL;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- ALTER TABLE equipment DROP COLUMN IF EXISTS ccm_panel;
-- DROP INDEX IF EXISTS idx_equipment_ccm_panel;
-- COMMIT;
