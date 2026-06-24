-- ============================================================
-- 0056 — Jerarquía Brasil LDC + reasignación de equipos
-- Idempotente: ON CONFLICT DO NOTHING + UPDATE WHERE EXISTS
-- ============================================================
BEGIN;

DO $$
DECLARE
  v_project_id          uuid;
  -- Áreas
  v_area_civil          uuid;
  v_area_equipos        uuid;
  v_area_instrumentos   uuid;
  -- Sistemas
  v_sys_electricos      uuid;
  v_sys_procesos        uuid;
  v_sys_bg_inst         uuid;  -- INSTRUMENTOS > BIOGAS-AIRE
  v_sys_ld_inst         uuid;  -- INSTRUMENTOS > LODOS-EFLUENTES
  -- Subsistemas
  v_sub_svc_gen         uuid;  -- ELECTRICOS > SERVICIOS-GENERALES
  v_sub_proc_bg         uuid;  -- PROCESOS > BIOGAS-AIRE
  v_sub_proc_ld         uuid;  -- PROCESOS > LODOS-EFLUENTES
  v_sub_trans_bg        uuid;  -- INST BIOGAS > TRANSMISORES
  v_sub_valv_bg         uuid;  -- INST BIOGAS > VALVULAS-ACTUADAS
  v_sub_sens_bg         uuid;  -- INST BIOGAS > SENSORES-POSICION
  v_sub_trans_ld        uuid;  -- INST LODOS > TRANSMISORES
  v_sub_valv_ld         uuid;  -- INST LODOS > VALVULAS-ACTUADAS
  v_sub_sens_ld         uuid;  -- INST LODOS > SENSORES-POSICION
BEGIN

  -- ── 0. Localizar proyecto ──────────────────────────────────
  SELECT id INTO v_project_id
  FROM projects
  WHERE (name ILIKE '%SISTEMA ANAEROBIO%' OR name ILIKE '%LDC%' OR name ILIKE '%BIOGAS%')
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Proyecto Brasil no encontrado. Verificar nombre en tabla projects.';
  END IF;

  RAISE NOTICE 'Usando project_id = %', v_project_id;

  -- ── 1. Áreas ───────────────────────────────────────────────
  INSERT INTO areas (project_id, code, name, sort_order)
  VALUES
    (v_project_id, 'CIVIL',         'CIVIL',         10),
    (v_project_id, 'EQUIPOS',       'EQUIPOS',       20),
    (v_project_id, 'INSTRUMENTOS',  'INSTRUMENTOS',  30)
  ON CONFLICT (project_id, code) DO NOTHING;

  SELECT id INTO v_area_civil        FROM areas WHERE project_id = v_project_id AND code = 'CIVIL';
  SELECT id INTO v_area_equipos      FROM areas WHERE project_id = v_project_id AND code = 'EQUIPOS';
  SELECT id INTO v_area_instrumentos FROM areas WHERE project_id = v_project_id AND code = 'INSTRUMENTOS';

  -- ── 2. Sistemas ────────────────────────────────────────────
  INSERT INTO systems (area_id, code, name, sort_order)
  VALUES
    (v_area_civil,         'OBRAS-CIVILES',   'OBRAS-CIVILES',   10),
    (v_area_equipos,       'ELECTRICOS',      'ELECTRICOS',      10),
    (v_area_equipos,       'PROCESOS',        'PROCESOS',        20),
    (v_area_instrumentos,  'BIOGAS-AIRE',     'BIOGAS-AIRE',     10),
    (v_area_instrumentos,  'LODOS-EFLUENTES', 'LODOS-EFLUENTES', 20)
  ON CONFLICT (area_id, code) DO NOTHING;

  SELECT id INTO v_sys_electricos FROM systems WHERE area_id = v_area_equipos      AND code = 'ELECTRICOS';
  SELECT id INTO v_sys_procesos   FROM systems WHERE area_id = v_area_equipos      AND code = 'PROCESOS';
  SELECT id INTO v_sys_bg_inst    FROM systems WHERE area_id = v_area_instrumentos AND code = 'BIOGAS-AIRE';
  SELECT id INTO v_sys_ld_inst    FROM systems WHERE area_id = v_area_instrumentos AND code = 'LODOS-EFLUENTES';

  -- ── 3. Subsistemas ─────────────────────────────────────────
  -- CIVIL
  INSERT INTO subsystems (system_id, code, name, sort_order)
  SELECT id, 'GENERAL', 'GENERAL', 10
  FROM systems WHERE area_id = v_area_civil AND code = 'OBRAS-CIVILES'
  ON CONFLICT (system_id, code) DO NOTHING;

  -- EQUIPOS
  INSERT INTO subsystems (system_id, code, name, sort_order)
  VALUES
    (v_sys_electricos, 'SERVICIOS-GENERALES', 'SERVICIOS-GENERALES', 10),
    (v_sys_procesos,   'BIOGAS-AIRE',         'BIOGAS-AIRE',         10),
    (v_sys_procesos,   'LODOS-EFLUENTES',     'LODOS-EFLUENTES',     20)
  ON CONFLICT (system_id, code) DO NOTHING;

  SELECT id INTO v_sub_svc_gen  FROM subsystems WHERE system_id = v_sys_electricos AND code = 'SERVICIOS-GENERALES';
  SELECT id INTO v_sub_proc_bg  FROM subsystems WHERE system_id = v_sys_procesos   AND code = 'BIOGAS-AIRE';
  SELECT id INTO v_sub_proc_ld  FROM subsystems WHERE system_id = v_sys_procesos   AND code = 'LODOS-EFLUENTES';

  -- INSTRUMENTOS
  INSERT INTO subsystems (system_id, code, name, sort_order)
  VALUES
    (v_sys_bg_inst, 'TRANSMISORES',      'TRANSMISORES',      10),
    (v_sys_bg_inst, 'VALVULAS-ACTUADAS', 'VALVULAS-ACTUADAS', 20),
    (v_sys_bg_inst, 'SENSORES-POSICION', 'SENSORES-POSICION', 30),
    (v_sys_ld_inst, 'TRANSMISORES',      'TRANSMISORES',      10),
    (v_sys_ld_inst, 'VALVULAS-ACTUADAS', 'VALVULAS-ACTUADAS', 20),
    (v_sys_ld_inst, 'SENSORES-POSICION', 'SENSORES-POSICION', 30)
  ON CONFLICT (system_id, code) DO NOTHING;

  SELECT id INTO v_sub_trans_bg FROM subsystems WHERE system_id = v_sys_bg_inst AND code = 'TRANSMISORES';
  SELECT id INTO v_sub_valv_bg  FROM subsystems WHERE system_id = v_sys_bg_inst AND code = 'VALVULAS-ACTUADAS';
  SELECT id INTO v_sub_sens_bg  FROM subsystems WHERE system_id = v_sys_bg_inst AND code = 'SENSORES-POSICION';
  SELECT id INTO v_sub_trans_ld FROM subsystems WHERE system_id = v_sys_ld_inst AND code = 'TRANSMISORES';
  SELECT id INTO v_sub_valv_ld  FROM subsystems WHERE system_id = v_sys_ld_inst AND code = 'VALVULAS-ACTUADAS';
  SELECT id INTO v_sub_sens_ld  FROM subsystems WHERE system_id = v_sys_ld_inst AND code = 'SENSORES-POSICION';

  -- ── 4. Renombrar TAGs: SB1–SB6 → S1–S6 ───────────────────
  UPDATE equipment SET tag = 'S1', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SB1' AND deleted_at IS NULL;
  UPDATE equipment SET tag = 'S2', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SB2' AND deleted_at IS NULL;
  UPDATE equipment SET tag = 'S3', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SB3' AND deleted_at IS NULL;
  UPDATE equipment SET tag = 'S4', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SB4' AND deleted_at IS NULL;
  UPDATE equipment SET tag = 'S5', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SB5' AND deleted_at IS NULL;
  UPDATE equipment SET tag = 'S6', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SB6' AND deleted_at IS NULL;

  -- ── 5. Corregir nombres B1–B4 (quitar prefijo splitting box) ─
  UPDATE equipment SET name = 'Bomba de alimentación crudo #1', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'B1' AND deleted_at IS NULL;
  UPDATE equipment SET name = 'Bomba de alimentación crudo #2', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'B2' AND deleted_at IS NULL;
  UPDATE equipment SET name = 'Bomba de alimentación crudo #3', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'B3' AND deleted_at IS NULL;
  UPDATE equipment SET name = 'Bomba de alimentación crudo #4', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'B4' AND deleted_at IS NULL;

  -- ── 6. B2 → status futuro ─────────────────────────────────
  UPDATE equipment SET status = 'futuro', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'B2' AND deleted_at IS NULL;

  -- ── 7. Actualizar descripciones sensores SC-VB / SO-VB ────
  UPDATE equipment
  SET name = regexp_replace(name, 'SB([1-6])', 'S\1', 'g'), updated_at = now()
  WHERE project_id = v_project_id
    AND tag ~ '^(SC|SO)-VB-'
    AND name ~ 'SB[1-6]'
    AND deleted_at IS NULL;

  -- ── 8. Reasignar equipos de proceso (UPDATE + INSERT) ─────
  -- Patrón: UPDATE si existe, INSERT si no existe.
  -- Se usa un bloque por subsistema para claridad.

  -- ─ ELECTRICOS > SERVICIOS-GENERALES ─
  UPDATE equipment SET subsystem_id = v_sub_svc_gen, power_installed_kw = 100, updated_at = now()
    WHERE project_id = v_project_id AND tag = 'TDG-01' AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_svc_gen, 'TDG-01', 'Servicios generales', 100, 'media', 'pendiente'
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND tag = 'TDG-01' AND deleted_at IS NULL);

  -- ─ PROCESOS > BIOGAS-AIRE ─
  -- Sopladores de aire
  UPDATE equipment SET subsystem_id = v_sub_proc_bg, power_installed_kw = 4, name = 'Soplador de aire #1 para RAFAC 1 a RAFAC 3', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SA1' AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_bg, 'SA1', 'Soplador de aire #1 para RAFAC 1 a RAFAC 3', 4, 'media', 'pendiente'
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND tag = 'SA1' AND deleted_at IS NULL);

  UPDATE equipment SET subsystem_id = v_sub_proc_bg, power_installed_kw = 4, name = 'Soplador de aire #2 para RAFAC 1 a RAFAC 3', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SA2' AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_bg, 'SA2', 'Soplador de aire #2 para RAFAC 1 a RAFAC 3', 4, 'media', 'pendiente'
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND tag = 'SA2' AND deleted_at IS NULL);

  UPDATE equipment SET subsystem_id = v_sub_proc_bg, power_installed_kw = 4, name = 'Soplador de aire #3 para RAFAC 1 a RAFAC 3', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'SA3' AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_bg, 'SA3', 'Soplador de aire #3 para RAFAC 1 a RAFAC 3', 4, 'media', 'pendiente'
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND tag = 'SA3' AND deleted_at IS NULL);

  -- Bombas torre de lavado biogás
  UPDATE equipment SET subsystem_id = v_sub_proc_bg, power_installed_kw = 40, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('B11','B12','B13','B14') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_bg, t.tag, t.name, 40, 'media', 'pendiente'
  FROM (VALUES
    ('B11', 'Bomba para torre de lavado #1 - filtración biogas'),
    ('B12', 'Bomba para torre de lavado #1 - filtración biogas'),
    ('B13', 'Bomba para torre de lavado #2 - filtración biogas'),
    ('B14', 'Bomba para torre de lavado #2 - filtración biogas')
  ) AS t(tag, name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Aireadores
  UPDATE equipment SET subsystem_id = v_sub_proc_bg, power_installed_kw = 3, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('A1','A2') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_bg, t.tag, t.name, 3, 'media', 'pendiente'
  FROM (VALUES
    ('A1', 'Aireador para lodos activados - filtración biogas'),
    ('A2', 'Aireador para lodos activados - filtración biogas')
  ) AS t(tag, name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Secador + Chiller
  UPDATE equipment SET subsystem_id = v_sub_proc_bg, power_installed_kw = 90, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('SC1','SC2') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_bg, t.tag, t.name, 90, 'media', 'pendiente'
  FROM (VALUES
    ('SC1', 'Secador + Chiller - Linea de filtración 1'),
    ('SC2', 'Secador + Chiller - Linea de filtración 2')
  ) AS t(tag, name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Sopladores de biogás (ya renombrados a S1–S6 en step 4)
  UPDATE equipment SET subsystem_id = v_sub_proc_bg, power_installed_kw = 75, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('S1','S2','S3','S4','S5','S6') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_bg, t.tag, t.name, 75, 'media', 'pendiente'
  FROM (VALUES
    ('S1', 'Soplador de biogás #1 - 1.125 m3/h'),
    ('S2', 'Soplador de biogás #2 - 1.125 m3/h'),
    ('S3', 'Soplador de biogás #3 - 1.125 m3/h'),
    ('S4', 'Soplador de biogás #4 - 1.125 m3/h'),
    ('S5', 'Soplador de biogás #5 - 1.125 m3/h'),
    ('S6', 'Soplador de biogás #6 - 1.125 m3/h')
  ) AS t(tag, name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- ─ PROCESOS > LODOS-EFLUENTES ─
  -- Bombas alimentación crudo (nombres ya corregidos en step 5, B2 ya en futuro en step 6)
  UPDATE equipment SET subsystem_id = v_sub_proc_ld, power_installed_kw = 145, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('B1','B2','B3','B4') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_ld, t.tag, t.name, 145, 'media', t.st::equipment_status
  FROM (VALUES
    ('B1', 'Bomba de alimentación crudo #1', 'pendiente'),
    ('B2', 'Bomba de alimentación crudo #2', 'futuro'),
    ('B3', 'Bomba de alimentación crudo #3', 'pendiente'),
    ('B4', 'Bomba de alimentación crudo #4', 'pendiente')
  ) AS t(tag, name, st)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Bombas purga lodos
  UPDATE equipment SET subsystem_id = v_sub_proc_ld, power_installed_kw = 4.5, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('B5','B6','B7','B8') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_ld, t.tag, t.name, 4.5, 'media', 'pendiente'
  FROM (VALUES
    ('B5', 'Bomba purga de lodos desde decantador #1'),
    ('B6', 'Bomba purga de lodos desde decantador #1'),
    ('B7', 'Bomba purga de lodos desde decantador #2'),
    ('B8', 'Bomba purga de lodos desde decantador #2')
  ) AS t(tag, name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Bombas nutrientes
  UPDATE equipment SET subsystem_id = v_sub_proc_ld, power_installed_kw = 2, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('B9','B10') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_ld, t.tag, t.name, 2, 'media', 'pendiente'
  FROM (VALUES
    ('B9',  'Bomba para inyección de nutrientes #1'),
    ('B10', 'Bomba para inyección de nutrientes #2')
  ) AS t(tag, name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Agitador
  UPDATE equipment SET subsystem_id = v_sub_proc_ld, power_installed_kw = 2, name = 'Agitador sistema de nutrientes', updated_at = now()
    WHERE project_id = v_project_id AND tag = 'AG1' AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_ld, 'AG1', 'Agitador sistema de nutrientes', 2, 'media', 'pendiente'
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND tag = 'AG1' AND deleted_at IS NULL);

  -- Deshidratadores
  UPDATE equipment SET subsystem_id = v_sub_proc_ld, power_installed_kw = 20.9, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('DL1','DL2') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_ld, t.tag, t.name, 20.9, 'media', 'pendiente'
  FROM (VALUES ('DL1','Deshidratador de lodos #1'), ('DL2','Deshidratador de lodos #2')) AS t(tag,name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Dosificadores
  UPDATE equipment SET subsystem_id = v_sub_proc_ld, power_installed_kw = 2, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('DOS01','DOS02') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_ld, t.tag, t.name, 2, 'media', 'pendiente'
  FROM (VALUES ('DOS01','Dosificador #1'), ('DOS02','Dosificador #2')) AS t(tag,name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- Secadores de lodos
  UPDATE equipment SET subsystem_id = v_sub_proc_ld, power_installed_kw = 100, updated_at = now()
    WHERE project_id = v_project_id AND tag IN ('SEC01','SEC02') AND deleted_at IS NULL;
  INSERT INTO equipment (project_id, subsystem_id, tag, name, power_installed_kw, criticality, status)
  SELECT v_project_id, v_sub_proc_ld, t.tag, t.name, 100, 'media', 'pendiente'
  FROM (VALUES ('SEC01','Secador de Lodos #1'), ('SEC02','Secador de Lodos #2')) AS t(tag,name)
  WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE project_id = v_project_id AND equipment.tag = t.tag AND deleted_at IS NULL);

  -- ── 9. Reasignar instrumentos I&C si ya existen en BD ─────
  -- BIOGAS-AIRE: TRANSMISORES
  UPDATE equipment SET subsystem_id = v_sub_trans_bg, updated_at = now()
  WHERE project_id = v_project_id AND deleted_at IS NULL
    AND tag ~ '^(FIT-2|PIT-2|PI-2|TI-2|TIT-2)';

  -- BIOGAS-AIRE: VALVULAS-ACTUADAS
  UPDATE equipment SET subsystem_id = v_sub_valv_bg, updated_at = now()
  WHERE project_id = v_project_id AND deleted_at IS NULL
    AND tag ~ '^(VB[1-9]$|VA-|VB-4[5-6])';

  -- BIOGAS-AIRE: SENSORES-POSICION
  UPDATE equipment SET subsystem_id = v_sub_sens_bg, updated_at = now()
  WHERE project_id = v_project_id AND deleted_at IS NULL
    AND tag ~ '^(SC|SO)-VB-';

  -- LODOS-EFLUENTES: TRANSMISORES
  UPDATE equipment SET subsystem_id = v_sub_trans_ld, updated_at = now()
  WHERE project_id = v_project_id AND deleted_at IS NULL
    AND tag ~ '^(FIT-1|LS-1)';

  -- LODOS-EFLUENTES: VALVULAS-ACTUADAS
  UPDATE equipment SET subsystem_id = v_sub_valv_ld, updated_at = now()
  WHERE project_id = v_project_id AND deleted_at IS NULL
    AND tag ~ '^(VE-1|VL-1)';

  -- LODOS-EFLUENTES: SENSORES-POSICION
  UPDATE equipment SET subsystem_id = v_sub_sens_ld, updated_at = now()
  WHERE project_id = v_project_id AND deleted_at IS NULL
    AND tag ~ '^(SC|SO)-VL-';

  RAISE NOTICE 'Migración 0056 completada para project_id = %', v_project_id;
END;
$$;

COMMIT;

-- ============================================================
-- VERIFICACIÓN (ejecutar manualmente en Supabase SQL Editor
-- DESPUÉS de aplicar la migración)
-- ============================================================

-- Verificar áreas creadas
-- SELECT a.code, a.name, COUNT(s.id) AS sistemas
-- FROM areas a
-- LEFT JOIN systems s ON s.area_id = a.id
-- WHERE a.project_id = (SELECT id FROM projects WHERE name ILIKE '%SISTEMA ANAEROBIO%' LIMIT 1)
-- GROUP BY a.code, a.name ORDER BY a.sort_order;

-- Verificar equipos de proceso por subsistema
-- SELECT sub.code AS subsistema, COUNT(e.id) AS equipos
-- FROM equipment e
-- JOIN subsystems sub ON sub.id = e.subsystem_id
-- JOIN systems sys ON sys.id = sub.system_id
-- JOIN areas ar ON ar.id = sys.area_id
-- WHERE ar.code IN ('EQUIPOS','INSTRUMENTOS')
--   AND e.deleted_at IS NULL
-- GROUP BY ar.code, sys.code, sub.code
-- ORDER BY ar.code, sys.code, sub.code;

-- Verificar TAGs S1–S6 y que SB1–SB6 ya no existen
-- SELECT tag, name, power_installed_kw FROM equipment
-- WHERE project_id = (SELECT id FROM projects WHERE name ILIKE '%SISTEMA ANAEROBIO%' LIMIT 1)
--   AND tag ~ '^S[1-6]$' AND deleted_at IS NULL;

-- Verificar B2 futuro
-- SELECT tag, status FROM equipment
-- WHERE project_id = (SELECT id FROM projects WHERE name ILIKE '%SISTEMA ANAEROBIO%' LIMIT 1)
--   AND tag = 'B2';

-- Resultado esperado:
-- - 3 áreas: CIVIL (1 sistema), EQUIPOS (2 sistemas), INSTRUMENTOS (2 sistemas)
-- - PROCESOS > BIOGAS-AIRE: 17 equipos
-- - PROCESOS > LODOS-EFLUENTES: 17 equipos
-- - ELECTRICOS > SERVICIOS-GENERALES: 1 equipo (TDG-01)
-- - S1–S6 presentes con 75 kW; ninguna fila con tag SB1–SB6
-- - B2 con status = 'futuro'
