-- ============================================================
-- 0022 — Plantillas genéricas de inspección (sin asignaciones)
--
-- Requiere: 0021 ejecutado (template_sections, section_fields, etc.)
--
-- Cambios:
--   - form_templates.project_id pasa a nullable
--   - Corrige política RLS de form_template_sections para globales
--   - Seed: 4 plantillas globales + campos de secciones no-universales
--
-- Nota: todas las referencias usan public.<tabla> explícitamente.
-- ============================================================

BEGIN;

-- ── 1. Hacer project_id nullable en form_templates ──────────────────────────

ALTER TABLE public.form_templates ALTER COLUMN project_id DROP NOT NULL;

-- ── 2. Corregir política RLS de form_template_sections ──────────────────────

DROP POLICY IF EXISTS "fts_select" ON public.form_template_sections;

CREATE POLICY "fts_select" ON public.form_template_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.form_templates ft
      WHERE ft.id = form_template_sections.template_id
        AND ft.project_id IS NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.form_templates ft ON ft.id = form_template_sections.template_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = ft.project_id
    )
  );

CREATE POLICY "fts_write_admin" ON public.form_template_sections
  FOR ALL USING (public.app_is_admin());


-- ── 3. Seed: 4 plantillas globales + campos ──────────────────────────────────

DO $$
DECLARE
  t_mec1 UUID; t_mec2 UUID; t_ic1 UUID; t_ele1 UUID;
  s_pa UUID; s_pc UUID; s_pt UUID; s_lc UUID; s_op UUID; s_al UUID;
BEGIN

  -- Forzar search_path para este bloque
  PERFORM set_config('search_path', 'public', false);

  -- form_templates globales (project_id = NULL)
  INSERT INTO public.form_templates (key, name, test_type)
    VALUES ('P_MEC_001', 'Motor Eléctrico', 'precomisionamiento')
    ON CONFLICT DO NOTHING
    RETURNING id INTO t_mec1;
  IF t_mec1 IS NULL THEN
    SELECT id INTO t_mec1 FROM public.form_templates WHERE key = 'P_MEC_001' AND project_id IS NULL;
  END IF;

  INSERT INTO public.form_templates (key, name, test_type)
    VALUES ('P_MEC_002', 'Bomba Centrífuga', 'precomisionamiento')
    ON CONFLICT DO NOTHING
    RETURNING id INTO t_mec2;
  IF t_mec2 IS NULL THEN
    SELECT id INTO t_mec2 FROM public.form_templates WHERE key = 'P_MEC_002' AND project_id IS NULL;
  END IF;

  INSERT INTO public.form_templates (key, name, test_type)
    VALUES ('P_IC_001', 'Instrumento I&C', 'precomisionamiento')
    ON CONFLICT DO NOTHING
    RETURNING id INTO t_ic1;
  IF t_ic1 IS NULL THEN
    SELECT id INTO t_ic1 FROM public.form_templates WHERE key = 'P_IC_001' AND project_id IS NULL;
  END IF;

  INSERT INTO public.form_templates (key, name, test_type)
    VALUES ('P_ELE_001', 'Tablero / CCM', 'precomisionamiento')
    ON CONFLICT DO NOTHING
    RETURNING id INTO t_ele1;
  IF t_ele1 IS NULL THEN
    SELECT id INTO t_ele1 FROM public.form_templates WHERE key = 'P_ELE_001' AND project_id IS NULL;
  END IF;

  -- IDs de secciones no-universales
  SELECT id INTO s_pa FROM public.template_sections WHERE code = 'PRUEBA_AISLAMIENTO';
  SELECT id INTO s_pc FROM public.template_sections WHERE code = 'PRUEBA_CONTINUIDAD';
  SELECT id INTO s_pt FROM public.template_sections WHERE code = 'PUESTA_TIERRA';
  SELECT id INTO s_lc FROM public.template_sections WHERE code = 'LOOP_CHECK';
  SELECT id INTO s_op FROM public.template_sections WHERE code = 'PRUEBA_OPERATIVA';
  SELECT id INTO s_al FROM public.template_sections WHERE code = 'ALINEAMIENTO';

  -- Campos de secciones no-universales
  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_pa, 'resistencia_f1',        'Resistencia Fase R',    'numero',   true,  NULL, '{"unit":"MΩ","min":0}', 10),
    (s_pa, 'resistencia_f2',        'Resistencia Fase S',    'numero',   true,  NULL, '{"unit":"MΩ","min":0}', 20),
    (s_pa, 'resistencia_f3',        'Resistencia Fase T',    'numero',   true,  NULL, '{"unit":"MΩ","min":0}', 30),
    (s_pa, 'tension_prueba',        'Tensión de prueba',     'select',   true,  '["500V","1000V","2500V"]', NULL, 40),
    (s_pa, 'obs_aislamiento',       'Observaciones',         'textarea', false, NULL, NULL, 50),
    (s_pa, 'resultado_aislamiento', 'Resultado',             'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 60)
  ON CONFLICT (section_id, key) DO NOTHING;

  INSERT INTO public.section_fields (section_id, key, label, type, required, validations, sort_order) VALUES
    (s_pc, 'continuidad_f1',        'Continuidad Fase R', 'numero',   true, '{"unit":"Ω","min":0}', 10),
    (s_pc, 'continuidad_f2',        'Continuidad Fase S', 'numero',   true, '{"unit":"Ω","min":0}', 20),
    (s_pc, 'continuidad_f3',        'Continuidad Fase T', 'numero',   true, '{"unit":"Ω","min":0}', 30),
    (s_pc, 'obs_continuidad',       'Observaciones',      'textarea', false, NULL, 40),
    (s_pc, 'resultado_continuidad', 'Resultado',          'select',   true, NULL, 50)
  ON CONFLICT (section_id, key) DO NOTHING;

  UPDATE public.section_fields SET options = '["APROBADO","RECHAZADO"]'
  WHERE section_id = s_pc AND key = 'resultado_continuidad' AND options IS NULL;

  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_pt, 'resistencia_tierra', 'Resistencia de tierra', 'numero',   true,  NULL, '{"unit":"Ω","min":0}', 10),
    (s_pt, 'conexion_tierra',    'Conexión a tierra',     'checkbox', true,  '["OK","FALLA","N/A"]', NULL, 20),
    (s_pt, 'obs_tierra',         'Observaciones',         'textarea', false, NULL, NULL, 30),
    (s_pt, 'resultado_tierra',   'Resultado',             'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 40)
  ON CONFLICT (section_id, key) DO NOTHING;

  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_lc, 'lazo_verificado', 'Lazo verificado',    'checkbox', true,  '["OK","FALLA","N/A"]', NULL, 10),
    (s_lc, 'senal_origen',    'Señal origen',       'numero',   false, NULL, '{"unit":"mA"}', 20),
    (s_lc, 'senal_destino',   'Señal en destino',   'numero',   false, NULL, '{"unit":"mA"}', 30),
    (s_lc, 'error_senal',     'Error de señal',     'numero',   false, NULL, '{"unit":"%"}', 40),
    (s_lc, 'obs_loop',        'Observaciones',      'textarea', false, NULL, NULL, 50),
    (s_lc, 'resultado_loop',  'Resultado',          'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 60)
  ON CONFLICT (section_id, key) DO NOTHING;

  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_op, 'arranque_prueba',    'Arranque de prueba',      'checkbox', true,  '["OK","FALLA","N/A"]', NULL, 10),
    (s_op, 'temp_rodamientos',   'Temperatura rodamientos', 'numero',   false, NULL, '{"unit":"°C"}', 20),
    (s_op, 'vibracion',          'Vibración',               'numero',   false, NULL, '{"unit":"mm/s"}', 30),
    (s_op, 'amperaje',           'Amperaje medido',         'numero',   false, NULL, '{"unit":"A"}', 40),
    (s_op, 'obs_operativa',      'Observaciones',           'textarea', false, NULL, NULL, 50),
    (s_op, 'resultado_operativa','Resultado',               'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 60)
  ON CONFLICT (section_id, key) DO NOTHING;

  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order) VALUES
    (s_al, 'offset_radial',          'Offset radial',          'numero',   false, NULL, '{"unit":"mm"}', 10),
    (s_al, 'offset_angular',         'Offset angular',         'numero',   false, NULL, '{"unit":"mm"}', 20),
    (s_al, 'alineamiento_laser',     'Alineamiento con láser', 'checkbox', true,  '["OK","FALLA","N/A"]', NULL, 30),
    (s_al, 'obs_alineamiento',       'Observaciones',          'textarea', false, NULL, NULL, 40),
    (s_al, 'resultado_alineamiento', 'Resultado',              'select',   true,  '["APROBADO","RECHAZADO"]', NULL, 50)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- form_template_sections (solo secciones NO-universales)
  INSERT INTO public.form_template_sections (template_id, section_id, sort_order) VALUES
    (t_mec1, s_pa, 50), (t_mec1, s_pc, 60), (t_mec1, s_pt, 70)
  ON CONFLICT (template_id, section_id) DO NOTHING;

  INSERT INTO public.form_template_sections (template_id, section_id, sort_order) VALUES
    (t_mec2, s_al, 50), (t_mec2, s_op, 60)
  ON CONFLICT (template_id, section_id) DO NOTHING;

  INSERT INTO public.form_template_sections (template_id, section_id, sort_order) VALUES
    (t_ic1, s_lc, 80)
  ON CONFLICT (template_id, section_id) DO NOTHING;

  INSERT INTO public.form_template_sections (template_id, section_id, sort_order) VALUES
    (t_ele1, s_pa, 50), (t_ele1, s_pc, 60), (t_ele1, s_pt, 70)
  ON CONFLICT (template_id, section_id) DO NOTHING;

END $$;

COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DELETE FROM public.form_template_sections
--   WHERE template_id IN (
--     SELECT id FROM public.form_templates WHERE key IN ('P_MEC_001','P_MEC_002','P_IC_001','P_ELE_001')
--   );
-- DELETE FROM public.form_templates
--   WHERE key IN ('P_MEC_001','P_MEC_002','P_IC_001','P_ELE_001') AND project_id IS NULL;
-- ALTER TABLE public.form_templates ALTER COLUMN project_id SET NOT NULL;
-- COMMIT;
-- ============================================================
