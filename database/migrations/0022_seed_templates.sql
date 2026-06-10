-- ============================================================
-- 0022 — Seed plantillas de inspección para PTAR Zipaquirá
--
-- Requiere: 0021 ejecutado (template_sections, section_fields,
--           form_template_sections, equipment_templates).
--
-- Crea:
--   - 4 form_templates (P_MEC_001, P_MEC_002, P_IC_001, P_ELE_001)
--   - Campos para secciones no-universales
--   - form_template_sections (solo secciones no-universales;
--     las universales aparecen automáticamente vía get_template_sections)
--   - equipment_templates bulk por prefijo de TAG
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_zip  UUID := '9023a92f-5294-4a20-ac20-1c579662340a';

  -- template IDs
  t_mec1 UUID; t_mec2 UUID; t_ic1 UUID; t_ele1 UUID;

  -- section IDs (no-universales)
  s_an UUID;  -- ANCLAJE_NIVELACION  (universal pero con sort_order override)
  s_pa UUID;  -- PRUEBA_AISLAMIENTO
  s_pc UUID;  -- PRUEBA_CONTINUIDAD
  s_pt UUID;  -- PUESTA_TIERRA
  s_lc UUID;  -- LOOP_CHECK
  s_op UUID;  -- PRUEBA_OPERATIVA
  s_al UUID;  -- ALINEAMIENTO
BEGIN

  -- ── 1. form_templates ──────────────────────────────────────────────────────
  INSERT INTO form_templates (key, name, test_type, project_id)
    VALUES ('P_MEC_001', 'Motor Eléctrico',    'precomisionamiento', v_zip) RETURNING id INTO t_mec1;

  INSERT INTO form_templates (key, name, test_type, project_id)
    VALUES ('P_MEC_002', 'Bomba Centrífuga',   'precomisionamiento', v_zip) RETURNING id INTO t_mec2;

  INSERT INTO form_templates (key, name, test_type, project_id)
    VALUES ('P_IC_001',  'Instrumento I&C',    'precomisionamiento', v_zip) RETURNING id INTO t_ic1;

  INSERT INTO form_templates (key, name, test_type, project_id)
    VALUES ('P_ELE_001', 'Tablero / CCM',      'precomisionamiento', v_zip) RETURNING id INTO t_ele1;


  -- ── 2. IDs de secciones ────────────────────────────────────────────────────
  SELECT id INTO s_an FROM template_sections WHERE code = 'ANCLAJE_NIVELACION';
  SELECT id INTO s_pa FROM template_sections WHERE code = 'PRUEBA_AISLAMIENTO';
  SELECT id INTO s_pc FROM template_sections WHERE code = 'PRUEBA_CONTINUIDAD';
  SELECT id INTO s_pt FROM template_sections WHERE code = 'PUESTA_TIERRA';
  SELECT id INTO s_lc FROM template_sections WHERE code = 'LOOP_CHECK';
  SELECT id INTO s_op FROM template_sections WHERE code = 'PRUEBA_OPERATIVA';
  SELECT id INTO s_al FROM template_sections WHERE code = 'ALINEAMIENTO';


  -- ── 3. Campos de secciones no-universales ──────────────────────────────────

  -- ANCLAJE_NIVELACION
  INSERT INTO section_fields (section_id, key, label, type, required, options, sort_order) VALUES
    (s_an, 'pernos_anclaje',  'Pernos de anclaje',   'checkbox', true,  '["OK","FALLA","N/A"]', 10),
    (s_an, 'nivelacion',      'Nivelación correcta', 'checkbox', true,  '["OK","FALLA","N/A"]', 20),
    (s_an, 'alineacion_base', 'Alineación con base', 'checkbox', true,  '["OK","FALLA","N/A"]', 30),
    (s_an, 'obs_anclaje',     'Observaciones',       'textarea', false, NULL,                   40)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- PRUEBA_AISLAMIENTO
  INSERT INTO section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_pa, 'resistencia_f1',        'Resistencia Fase R',    'numero',   true,  NULL, '{"unit":"MΩ","min":0}', 10),
    (s_pa, 'resistencia_f2',        'Resistencia Fase S',    'numero',   true,  NULL, '{"unit":"MΩ","min":0}', 20),
    (s_pa, 'resistencia_f3',        'Resistencia Fase T',    'numero',   true,  NULL, '{"unit":"MΩ","min":0}', 30),
    (s_pa, 'tension_prueba',        'Tensión de prueba',     'select',   true,  '["500V","1000V","2500V"]', NULL, 40),
    (s_pa, 'obs_aislamiento',       'Observaciones',         'textarea', false, NULL, NULL, 50),
    (s_pa, 'resultado_aislamiento', 'Resultado',             'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 60)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- PRUEBA_CONTINUIDAD
  INSERT INTO section_fields (section_id, key, label, type, required, validations, sort_order) VALUES
    (s_pc, 'continuidad_f1',        'Continuidad Fase R', 'numero',   true, '{"unit":"Ω","min":0}', 10),
    (s_pc, 'continuidad_f2',        'Continuidad Fase S', 'numero',   true, '{"unit":"Ω","min":0}', 20),
    (s_pc, 'continuidad_f3',        'Continuidad Fase T', 'numero',   true, '{"unit":"Ω","min":0}', 30),
    (s_pc, 'obs_continuidad',       'Observaciones',      'textarea', false, NULL, 40),
    (s_pc, 'resultado_continuidad', 'Resultado',          'select',   true, NULL, 50)
  ON CONFLICT (section_id, key) DO NOTHING;

  UPDATE section_fields SET options = '["APROBADO","RECHAZADO"]'
  WHERE section_id = s_pc AND key = 'resultado_continuidad' AND options IS NULL;

  -- PUESTA_TIERRA
  INSERT INTO section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_pt, 'resistencia_tierra', 'Resistencia de tierra', 'numero',   true,  NULL, '{"unit":"Ω","min":0}', 10),
    (s_pt, 'conexion_tierra',    'Conexión a tierra',     'checkbox', true,  '["OK","FALLA","N/A"]', NULL, 20),
    (s_pt, 'obs_tierra',         'Observaciones',         'textarea', false, NULL, NULL, 30),
    (s_pt, 'resultado_tierra',   'Resultado',             'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 40)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- LOOP_CHECK
  INSERT INTO section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_lc, 'lazo_verificado', 'Lazo verificado',    'checkbox', true,  '["OK","FALLA","N/A"]', NULL, 10),
    (s_lc, 'senal_origen',    'Señal origen',       'numero',   false, NULL, '{"unit":"mA"}', 20),
    (s_lc, 'senal_destino',   'Señal en destino',   'numero',   false, NULL, '{"unit":"mA"}', 30),
    (s_lc, 'error_senal',     'Error de señal',     'numero',   false, NULL, '{"unit":"%"}', 40),
    (s_lc, 'obs_loop',        'Observaciones',      'textarea', false, NULL, NULL, 50),
    (s_lc, 'resultado_loop',  'Resultado',          'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 60)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- PRUEBA_OPERATIVA
  INSERT INTO section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_op, 'arranque_prueba',    'Arranque de prueba',      'checkbox', true,  '["OK","FALLA","N/A"]', NULL, 10),
    (s_op, 'temp_rodamientos',   'Temperatura rodamientos', 'numero',   false, NULL, '{"unit":"°C"}', 20),
    (s_op, 'vibracion',          'Vibración',               'numero',   false, NULL, '{"unit":"mm/s"}', 30),
    (s_op, 'amperaje',           'Amperaje medido',         'numero',   false, NULL, '{"unit":"A"}', 40),
    (s_op, 'obs_operativa',      'Observaciones',           'textarea', false, NULL, NULL, 50),
    (s_op, 'resultado_operativa','Resultado',               'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 60)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ALINEAMIENTO
  INSERT INTO section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_al, 'offset_radial',          'Offset radial',         'numero',   false, NULL, '{"unit":"mm"}', 10),
    (s_al, 'offset_angular',         'Offset angular',        'numero',   false, NULL, '{"unit":"mm"}', 20),
    (s_al, 'alineamiento_laser',     'Alineamiento con láser','checkbox', true,  '["OK","FALLA","N/A"]', NULL, 30),
    (s_al, 'obs_alineamiento',       'Observaciones',         'textarea', false, NULL, NULL, 40),
    (s_al, 'resultado_alineamiento', 'Resultado',             'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 50)
  ON CONFLICT (section_id, key) DO NOTHING;


  -- ── 4. form_template_sections (solo secciones NO-universales) ─────────────
  -- Las secciones universales (DATOS_GENERALES, INSPECCION_VISUAL,
  -- ANCLAJE_NIVELACION, CAMBIOS_DISENO_REDLINE, FIRMAS) aparecen
  -- automáticamente vía get_template_sections().

  -- P_MEC_001: Motor Eléctrico
  INSERT INTO form_template_sections (template_id, section_id, sort_order) VALUES
    (t_mec1, s_pa, 50),
    (t_mec1, s_pc, 60),
    (t_mec1, s_pt, 70)
  ON CONFLICT (template_id, section_id) DO NOTHING;

  -- P_MEC_002: Bomba Centrífuga
  INSERT INTO form_template_sections (template_id, section_id, sort_order) VALUES
    (t_mec2, s_al, 50),
    (t_mec2, s_op, 60)
  ON CONFLICT (template_id, section_id) DO NOTHING;

  -- P_IC_001: Instrumento I&C
  INSERT INTO form_template_sections (template_id, section_id, sort_order) VALUES
    (t_ic1, s_lc, 80)
  ON CONFLICT (template_id, section_id) DO NOTHING;

  -- P_ELE_001: Tablero / CCM
  INSERT INTO form_template_sections (template_id, section_id, sort_order) VALUES
    (t_ele1, s_pa, 50),
    (t_ele1, s_pc, 60),
    (t_ele1, s_pt, 70)
  ON CONFLICT (template_id, section_id) DO NOTHING;


  -- ── 5. equipment_templates — asignación bulk por prefijo de TAG ────────────

  -- Instrumentos → P_IC_001
  INSERT INTO equipment_templates (equipment_id, template_id)
  SELECT e.id, t_ic1 FROM equipment e
  WHERE e.project_id = v_zip
    AND e.deleted_at IS NULL
    AND e.tag ~ '^(FT|PT|LT|AT|TT|CT|XT|QT|WT|PIC|TIC|LIC|FIC|AIC|FI|PI|LI|AI|TI|II|ZI|ZT|ST|CV|SP)\-'
  ON CONFLICT (equipment_id, template_id) DO NOTHING;

  -- Motores → P_MEC_001
  INSERT INTO equipment_templates (equipment_id, template_id)
  SELECT e.id, t_mec1 FROM equipment e
  WHERE e.project_id = v_zip
    AND e.deleted_at IS NULL
    AND e.tag ~ '^(MTR|MCC|ME|MOT|MV)\-'
  ON CONFLICT (equipment_id, template_id) DO NOTHING;

  -- Bombas / compresores / sopladores / válvulas → P_MEC_002
  INSERT INTO equipment_templates (equipment_id, template_id)
  SELECT e.id, t_mec2 FROM equipment e
  WHERE e.project_id = v_zip
    AND e.deleted_at IS NULL
    AND e.tag ~ '^(BBA|BOM|COM|SOP|BLO|SOB|AG)\-'
  ON CONFLICT (equipment_id, template_id) DO NOTHING;

  -- Tableros / CCM / PLC / drives → P_ELE_001
  INSERT INTO equipment_templates (equipment_id, template_id)
  SELECT e.id, t_ele1 FROM equipment e
  WHERE e.project_id = v_zip
    AND e.deleted_at IS NULL
    AND e.tag ~ '^(CCM|PLC|SWG|TD|TBL|PCM|SCADA|UPS|GEN|VFD|VSD|ATS|TR|TRS|GE|GA|GB)\-'
  ON CONFLICT (equipment_id, template_id) DO NOTHING;

  -- Resto sin template asignado → P_IC_001 como fallback
  INSERT INTO equipment_templates (equipment_id, template_id)
  SELECT e.id, t_ic1 FROM equipment e
  WHERE e.project_id = v_zip
    AND e.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM equipment_templates et WHERE et.equipment_id = e.id
    )
  ON CONFLICT (equipment_id, template_id) DO NOTHING;

END $$;

COMMIT;
