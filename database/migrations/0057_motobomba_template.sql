-- ============================================================
-- 0057 — Template MOTOBOMBA (Motor + Bomba) reutilizable
--
-- Crea un template GLOBAL (project_id NULL) "P_MEC_010 · Motobomba",
-- SIN asignar a ningún equipo (no afecta a nadie hasta asignarlo
-- por el módulo de Templates).
--
-- Secciones dedicadas (no universales) para no contaminar otros templates:
--   DATOS_BOMBA, DATOS_MOTOR, FOTOS_MOTOBOMBA,
--   INSP_VISUAL_BOMBA, INSP_VISUAL_MOTOR
--
-- Universales que aparecen automáticamente (is_universal=TRUE):
--   DATOS_GENERALES, INSPECCION_VISUAL, ANCLAJE_NIVELACION,
--   CAMBIOS_DISENO_REDLINE, FIRMAS.
--
-- NOTA IMPORTANTE (dependencia 0038):
--   El apagado de secciones POR PLANTILLA (form_template_sections.is_active)
--   requiere la migración 0038. Si 0038 NO está aplicada, esta migración
--   NO usa is_active (todas las secciones enlazadas quedan activas) y las
--   secciones de prueba (Alineamiento/Operativa/Aislamiento/Continuidad/
--   Tierra) NO se enlazan (se agregan luego, cuando se quiera comisionar).
--   Para ocultar la INSPECCION_VISUAL universal (redundante con las
--   versiones Bomba/Motor): aplicar 0038 y luego un override is_active=false.
--
-- Idempotente: ON CONFLICT DO NOTHING.
-- ============================================================
BEGIN;

DO $$
DECLARE
  v_template_id uuid;
  v_s_bomba     uuid;
  v_s_motor     uuid;
  v_s_fotos     uuid;
  v_s_vis_bom   uuid;
  v_s_vis_mot   uuid;
BEGIN

  -- ── 1. Secciones dedicadas (no universales) ────────────────
  INSERT INTO public.template_sections (code, name, is_universal, sort_order) VALUES
    ('DATOS_BOMBA',       'Datos de la Bomba (general + placa)', false, 12),
    ('DATOS_MOTOR',       'Datos del Motor (general + placa)',   false, 14),
    ('FOTOS_MOTOBOMBA',   'Fotografías',                         false, 16),
    ('INSP_VISUAL_BOMBA', 'Inspección Visual Bomba',             false, 22),
    ('INSP_VISUAL_MOTOR', 'Inspección Visual Motor',             false, 24)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_s_bomba   FROM public.template_sections WHERE code = 'DATOS_BOMBA';
  SELECT id INTO v_s_motor   FROM public.template_sections WHERE code = 'DATOS_MOTOR';
  SELECT id INTO v_s_fotos   FROM public.template_sections WHERE code = 'FOTOS_MOTOBOMBA';
  SELECT id INTO v_s_vis_bom FROM public.template_sections WHERE code = 'INSP_VISUAL_BOMBA';
  SELECT id INTO v_s_vis_mot FROM public.template_sections WHERE code = 'INSP_VISUAL_MOTOR';

  -- ── 2. Campos: DATOS BOMBA ─────────────────────────────────
  INSERT INTO public.section_fields (section_id, key, label, type, required, validations, sort_order)
  VALUES
    (v_s_bomba, 'tipo_bomba',      'Tipo de bomba',                 'texto',  false, NULL,                  10),
    (v_s_bomba, 'fabricante_bomba','Fabricante (bomba)',            'texto',  false, NULL,                  20),
    (v_s_bomba, 'modelo_bomba',    'Modelo (bomba)',                'texto',  false, NULL,                  30),
    (v_s_bomba, 'no_serie_bomba',  'No. de serie (bomba)',          'texto',  false, NULL,                  40),
    (v_s_bomba, 'npshr',           'NPSHr — Altura neta aspiración','numero', false, '{"unit":"m"}'::jsonb, 50),
    (v_s_bomba, 'altura_h',        'Altura manométrica H',          'numero', false, '{"unit":"m"}'::jsonb, 60)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 3. Campos: DATOS MOTOR ─────────────────────────────────
  INSERT INTO public.section_fields (section_id, key, label, type, required, validations, sort_order)
  VALUES
    (v_s_motor, 'fabricante_motor','Fabricante (motor)',  'texto',  false, NULL,                    10),
    (v_s_motor, 'modelo_motor',    'Modelo (motor)',      'texto',  false, NULL,                    20),
    (v_s_motor, 'no_serie_motor',  'No. de serie (motor)','texto',  false, NULL,                    30),
    (v_s_motor, 'potencia_kw',     'Potencia',            'numero', false, '{"unit":"kW"}'::jsonb,  40),
    (v_s_motor, 'potencia_hp',     'Potencia',            'numero', false, '{"unit":"HP"}'::jsonb,  50),
    (v_s_motor, 'velocidad_rpm',   'Velocidad nominal',   'numero', false, '{"unit":"RPM"}'::jsonb, 60),
    (v_s_motor, 'voltaje',         'Voltaje',             'numero', false, '{"unit":"V"}'::jsonb,   70),
    (v_s_motor, 'frecuencia',      'Frecuencia',          'numero', false, '{"unit":"Hz"}'::jsonb,  80),
    (v_s_motor, 'lubricacion',     'Lubricación',         'texto',  false, NULL,                    90)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 4. Campos: FOTOGRAFÍAS ─────────────────────────────────
  INSERT INTO public.section_fields (section_id, key, label, type, required, sort_order)
  VALUES
    (v_s_fotos, 'foto_bomba',       'Foto BOMBA (equipo)', 'imagen', false, 10),
    (v_s_fotos, 'foto_placa_bomba', 'Foto PLACA BOMBA',    'imagen', false, 20),
    (v_s_fotos, 'foto_motor',       'Foto MOTOR (equipo)', 'imagen', false, 30),
    (v_s_fotos, 'foto_placa_motor', 'Foto PLACA MOTOR',    'imagen', false, 40)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 5. Campos: INSPECCIÓN VISUAL BOMBA ─────────────────────
  INSERT INTO public.section_fields (section_id, key, label, type, required, options, sort_order)
  VALUES
    (v_s_vis_bom, 'limpieza_bomba',        'Limpieza general',           'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        10),
    (v_s_vis_bom, 'pintura_bomba',         'Estado de pintura',          'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        20),
    (v_s_vis_bom, 'identificacion_bomba',  'Placa de identificación',    'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        30),
    (v_s_vis_bom, 'danos_bomba',           'Sin daños físicos visibles', 'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        40),
    (v_s_vis_bom, 'resultado_visual_bomba','Resultado Inspección Bomba', 'select',   true,  '["APROBADO","RECHAZADO"]'::jsonb, 90),
    (v_s_vis_bom, 'obs_bomba',             'Observaciones',              'textarea', false, NULL,                              100)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 6. Campos: INSPECCIÓN VISUAL MOTOR ─────────────────────
  INSERT INTO public.section_fields (section_id, key, label, type, required, options, sort_order)
  VALUES
    (v_s_vis_mot, 'limpieza_motor',        'Limpieza general',           'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        10),
    (v_s_vis_mot, 'pintura_motor',         'Estado de pintura',          'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        20),
    (v_s_vis_mot, 'identificacion_motor',  'Placa de identificación',    'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        30),
    (v_s_vis_mot, 'danos_motor',           'Sin daños físicos visibles', 'checkbox', true,  '["SI","NO","N/A"]'::jsonb,        40),
    (v_s_vis_mot, 'resultado_visual_motor','Resultado Inspección Motor', 'select',   true,  '["APROBADO","RECHAZADO"]'::jsonb, 90),
    (v_s_vis_mot, 'obs_motor',             'Observaciones',              'textarea', false, NULL,                              100)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 7. Template MOTOBOMBA (global, sin asignar) ────────────
  SELECT id INTO v_template_id
  FROM public.form_templates
  WHERE key = 'P_MEC_010' AND project_id IS NULL AND deleted_at IS NULL
  LIMIT 1;

  IF v_template_id IS NULL THEN
    INSERT INTO public.form_templates (project_id, key, name, test_type)
    VALUES (NULL, 'P_MEC_010', 'Motobomba (Motor + Bomba)', 'precomisionamiento')
    RETURNING id INTO v_template_id;
  END IF;

  -- ── 8. Enlace SOLO de las secciones dedicadas ──────────────
  -- (Universales aparecen solas. Sin is_active porque 0038 puede no estar
  --  aplicada. Las secciones de prueba se omiten a propósito.)
  INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required)
  SELECT v_template_id, ts.id, v.ord, true
  FROM (VALUES
    ('DATOS_BOMBA',       12),
    ('DATOS_MOTOR',       14),
    ('FOTOS_MOTOBOMBA',   16),
    ('INSP_VISUAL_BOMBA', 22),
    ('INSP_VISUAL_MOTOR', 24)
  ) AS v(sec_code, ord)
  JOIN public.template_sections ts ON ts.code = v.sec_code
  ON CONFLICT (template_id, section_id) DO NOTHING;

  RAISE NOTICE 'Template MOTOBOMBA listo: % (key P_MEC_010, sin asignar)', v_template_id;
END;
$$;

COMMIT;

-- ============================================================
-- (OPCIONAL, requiere 0038) Apagar INSPECCION_VISUAL universal
-- y enlazar pruebas de comisionamiento apagadas, para este template:
--
-- UPDATE public.form_template_sections SET is_active = false
-- WHERE template_id = (SELECT id FROM public.form_templates WHERE key='P_MEC_010' AND project_id IS NULL)
--   AND section_id  = (SELECT id FROM public.template_sections WHERE code='INSPECCION_VISUAL');
-- ============================================================

-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DELETE FROM public.form_template_sections
--   WHERE template_id = (SELECT id FROM public.form_templates WHERE key='P_MEC_010' AND project_id IS NULL);
-- DELETE FROM public.section_fields WHERE section_id IN (
--   SELECT id FROM public.template_sections
--   WHERE code IN ('DATOS_BOMBA','DATOS_MOTOR','FOTOS_MOTOBOMBA','INSP_VISUAL_BOMBA','INSP_VISUAL_MOTOR'));
-- DELETE FROM public.template_sections
--   WHERE code IN ('DATOS_BOMBA','DATOS_MOTOR','FOTOS_MOTOBOMBA','INSP_VISUAL_BOMBA','INSP_VISUAL_MOTOR');
-- DELETE FROM public.form_templates WHERE key='P_MEC_010' AND project_id IS NULL;
-- COMMIT;
-- ============================================================
