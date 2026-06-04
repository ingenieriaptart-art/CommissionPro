-- ============================================================
-- 0017 — Jerarquía "SIN CLASIFICAR" por proyecto
-- Crea una área/sistema/subsistema placeholder para equipos
-- importados desde documentos sin clasificación de jerarquía.
-- La función es idempotente y segura para llamadas concurrentes.
-- ============================================================

BEGIN;

-- Constraints necesarios para ON CONFLICT en sistemas y subsistemas
ALTER TABLE systems
  ADD CONSTRAINT IF NOT EXISTS uq_systems_area_code
    UNIQUE (area_id, code);

ALTER TABLE subsystems
  ADD CONSTRAINT IF NOT EXISTS uq_subsystems_system_code
    UNIQUE (system_id, code);

-- Función: obtener o crear jerarquía SIN CLASIFICAR para un proyecto
CREATE OR REPLACE FUNCTION get_or_create_unclassified_subsystem(
  p_project_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_code       CONSTANT text := '__UNCLASSIFIED__';
  c_name       CONSTANT text := 'SIN CLASIFICAR';
  v_area_id    uuid;
  v_system_id  uuid;
  v_subsys_id  uuid;
BEGIN
  -- 1. Área
  INSERT INTO areas (project_id, code, name, sort_order)
  VALUES (p_project_id, c_code, c_name, 9999)
  ON CONFLICT (project_id, code) DO NOTHING;

  SELECT id INTO v_area_id
  FROM areas
  WHERE project_id = p_project_id AND code = c_code;

  -- 2. Sistema
  INSERT INTO systems (area_id, code, name, sort_order)
  VALUES (v_area_id, c_code, c_name, 9999)
  ON CONFLICT (area_id, code) DO NOTHING;

  SELECT id INTO v_system_id
  FROM systems
  WHERE area_id = v_area_id AND code = c_code;

  -- 3. Subsistema
  INSERT INTO subsystems (system_id, code, name, sort_order)
  VALUES (v_system_id, c_code, c_name, 9999)
  ON CONFLICT (system_id, code) DO NOTHING;

  SELECT id INTO v_subsys_id
  FROM subsystems
  WHERE system_id = v_system_id AND code = c_code;

  RETURN v_subsys_id;
END;
$$;

-- Pre-seed: crear jerarquía para proyectos existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM projects WHERE deleted_at IS NULL LOOP
    PERFORM get_or_create_unclassified_subsystem(r.id);
  END LOOP;
END;
$$;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_or_create_unclassified_subsystem(uuid);
-- ALTER TABLE systems    DROP CONSTRAINT IF EXISTS uq_systems_area_code;
-- ALTER TABLE subsystems DROP CONSTRAINT IF EXISTS uq_subsystems_system_code;
-- COMMIT;
