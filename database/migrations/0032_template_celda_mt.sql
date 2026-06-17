-- ============================================================
-- 0032 — Template P_ELE_002: Celda de Media Tensión 13.8 kV
--
-- Requiere: 0021 + 0022 + 0026 + 0031 ejecutados.
--
-- Cambios:
--   1. Crea form_template P_ELE_002 "Celda de Media Tensión 13.8 kV"
--   2. Crea 4 secciones específicas para switchgear MT:
--        PRUEBA_AISLAMIENTO_MT    — Meggueo 2.5kV/5kV en GΩ
--        RESISTENCIA_CONTACTOS    — Micro-ohmímetro en μΩ por fase
--        VERIFICACION_PROTECCIONES — Relés ANSI 50/51, 27, 59, 81
--        PRUEBA_INTERRUPTOR_VCB   — Tiempos apertura/cierre del VCB
--   3. Reutiliza sección existente PUESTA_TIERRA
--   4. Vincula P_ELE_002 al tipo CELDA_MT (reemplaza P_ELE_001 genérico)
--   5. Actualiza los 3 equipos MT del proyecto LDC para incluir
--      asignación directa a P_ELE_002 (nivel equipment_type ya cubierto)
--
-- Secciones universales incluidas automáticamente:
--   DATOS_GENERALES, INSPECCION_VISUAL, CAMBIOS_DISENO_REDLINE, FIRMAS
--
-- project_id LDC: eba099c0-32ca-4be7-823f-4ab7f3480004
-- ============================================================

BEGIN;

DO $$
DECLARE
  t_ele2   UUID;
  -- Secciones nuevas
  s_amt    UUID;  -- PRUEBA_AISLAMIENTO_MT
  s_rc     UUID;  -- RESISTENCIA_CONTACTOS
  s_vp     UUID;  -- VERIFICACION_PROTECCIONES
  s_vcb    UUID;  -- PRUEBA_INTERRUPTOR_VCB
  -- Sección existente reutilizada
  s_pt     UUID;  -- PUESTA_TIERRA
  -- Tipo de equipo y template genérico
  et_celda UUID;
  t_ele1   UUID;
BEGIN

  PERFORM set_config('search_path', 'public', false);

  -- ── 1. Crear form_template P_ELE_002 ─────────────────────────────────────
  INSERT INTO public.form_templates (key, name, test_type)
    VALUES ('P_ELE_002', 'Celda de Media Tensión 13.8 kV', 'precomisionamiento')
    ON CONFLICT DO NOTHING
    RETURNING id INTO t_ele2;
  IF t_ele2 IS NULL THEN
    SELECT id INTO t_ele2 FROM public.form_templates WHERE key = 'P_ELE_002' AND project_id IS NULL;
  END IF;
  RAISE NOTICE 'P_ELE_002 id: %', t_ele2;

  -- ── 2. Crear secciones específicas MT ────────────────────────────────────

  -- 2a. Meggueo de Media Tensión (tensiones de prueba altas, resultado en GΩ)
  INSERT INTO public.template_sections (code, name, is_universal, sort_order)
    VALUES ('PRUEBA_AISLAMIENTO_MT', 'Prueba de Aislamiento MT (Meggueo)', false, 50)
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO s_amt;
  IF s_amt IS NULL THEN
    SELECT id INTO s_amt FROM public.template_sections WHERE code = 'PRUEBA_AISLAMIENTO_MT';
  END IF;

  -- 2b. Resistencia de contactos con micro-ohmímetro
  INSERT INTO public.template_sections (code, name, is_universal, sort_order)
    VALUES ('RESISTENCIA_CONTACTOS', 'Resistencia de Contactos (Micro-ohmímetro)', false, 60)
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO s_rc;
  IF s_rc IS NULL THEN
    SELECT id INTO s_rc FROM public.template_sections WHERE code = 'RESISTENCIA_CONTACTOS';
  END IF;

  -- 2c. Verificación de relés de protección
  INSERT INTO public.template_sections (code, name, is_universal, sort_order)
    VALUES ('VERIFICACION_PROTECCIONES', 'Verificación de Relés de Protección', false, 70)
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO s_vp;
  IF s_vp IS NULL THEN
    SELECT id INTO s_vp FROM public.template_sections WHERE code = 'VERIFICACION_PROTECCIONES';
  END IF;

  -- 2d. Prueba del interruptor de vacío (VCB)
  INSERT INTO public.template_sections (code, name, is_universal, sort_order)
    VALUES ('PRUEBA_INTERRUPTOR_VCB', 'Prueba del Interruptor de Vacío (VCB)', false, 80)
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO s_vcb;
  IF s_vcb IS NULL THEN
    SELECT id INTO s_vcb FROM public.template_sections WHERE code = 'PRUEBA_INTERRUPTOR_VCB';
  END IF;

  -- Sección existente PUESTA_TIERRA
  SELECT id INTO s_pt FROM public.template_sections WHERE code = 'PUESTA_TIERRA';

  -- ── 3. Campos de PRUEBA_AISLAMIENTO_MT ───────────────────────────────────
  -- Tensión de prueba más alta que BT (2500V o 5000V), resultado en GΩ
  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order, hint) VALUES
    (s_amt, 'tension_prueba_mt',    'Tensión de prueba',           'select',   true,
      '["2500V","5000V"]', NULL, 10, 'Según norma IEC 62271'),
    (s_amt, 'fase_r_tierra',        'Fase R → Tierra',             'numero',   true,
      NULL, '{"unit":"GΩ","min":0}', 20, 'Mínimo aceptable: 1 GΩ'),
    (s_amt, 'fase_s_tierra',        'Fase S → Tierra',             'numero',   true,
      NULL, '{"unit":"GΩ","min":0}', 30, NULL),
    (s_amt, 'fase_t_tierra',        'Fase T → Tierra',             'numero',   true,
      NULL, '{"unit":"GΩ","min":0}', 40, NULL),
    (s_amt, 'fase_r_fase_s',        'Fase R → Fase S',             'numero',   false,
      NULL, '{"unit":"GΩ","min":0}', 50, NULL),
    (s_amt, 'fase_s_fase_t',        'Fase S → Fase T',             'numero',   false,
      NULL, '{"unit":"GΩ","min":0}', 60, NULL),
    (s_amt, 'fase_r_fase_t',        'Fase R → Fase T',             'numero',   false,
      NULL, '{"unit":"GΩ","min":0}', 70, NULL),
    (s_amt, 'temperatura_ambiente', 'Temperatura ambiente',        'numero',   false,
      NULL, '{"unit":"°C"}', 80, 'Registrar para corrección por temperatura'),
    (s_amt, 'humedad_relativa',     'Humedad relativa',            'numero',   false,
      NULL, '{"unit":"%","min":0,"max":100}', 90, NULL),
    (s_amt, 'obs_aislamiento_mt',   'Observaciones',               'textarea', false,
      NULL, NULL, 100, NULL),
    (s_amt, 'resultado_aislamiento_mt', 'Resultado',               'select',   true,
      '["APROBADO","RECHAZADO"]', NULL, 110, NULL)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 4. Campos de RESISTENCIA_CONTACTOS ───────────────────────────────────
  -- Micro-ohmímetro: valor en μΩ; referencia fabricante típica < 100 μΩ
  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order, hint) VALUES
    (s_rc, 'corriente_prueba_rc',   'Corriente de prueba',         'select',   true,
      '["100A","200A","500A"]', NULL, 10, 'Según capacidad del equipo de medición'),
    (s_rc, 'resist_contactos_r',    'Resistencia contactos Fase R', 'numero',  true,
      NULL, '{"unit":"μΩ","min":0}', 20, 'Valor típico < 100 μΩ'),
    (s_rc, 'resist_contactos_s',    'Resistencia contactos Fase S', 'numero',  true,
      NULL, '{"unit":"μΩ","min":0}', 30, NULL),
    (s_rc, 'resist_contactos_t',    'Resistencia contactos Fase T', 'numero',  true,
      NULL, '{"unit":"μΩ","min":0}', 40, NULL),
    (s_rc, 'valor_referencia_rc',   'Valor referencia fabricante', 'numero',   false,
      NULL, '{"unit":"μΩ","min":0}', 50, NULL),
    (s_rc, 'obs_resistencia',       'Observaciones',               'textarea', false,
      NULL, NULL, 60, NULL),
    (s_rc, 'resultado_resistencia', 'Resultado',                   'select',   true,
      '["APROBADO","RECHAZADO"]', NULL, 70, NULL)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 5. Campos de VERIFICACION_PROTECCIONES ────────────────────────────────
  -- Relés ANSI 50/51 (sobrecorriente), 27 (subtensión), 59 (sobretensión), 81 (frecuencia)
  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order, hint) VALUES
    (s_vp, 'modelo_rele',           'Modelo del relé',             'texto',    true,
      NULL, NULL, 10, 'Ej: Siemens 7SJ85, SEL-351'),
    (s_vp, 'ansi_50_51',            'Relé ANSI 50/51 (sobrecorriente)', 'checkbox', true,
      '["VERIFICADO","FALLA","N/A"]', NULL, 20, 'Protección de sobrecorriente instantánea y temporizada'),
    (s_vp, 'pickup_50_51',          'Pickup corriente (50/51)',    'numero',   false,
      NULL, '{"unit":"A"}', 30, NULL),
    (s_vp, 'tiempo_op_50_51',       'Tiempo de operación (51)',    'numero',   false,
      NULL, '{"unit":"ms"}', 40, NULL),
    (s_vp, 'ansi_27',               'Relé ANSI 27 (subtensión)',   'checkbox', false,
      '["VERIFICADO","FALLA","N/A"]', NULL, 50, 'Protección por caída de tensión'),
    (s_vp, 'pickup_27',             'Pickup tensión (27)',         'numero',   false,
      NULL, '{"unit":"kV"}', 60, NULL),
    (s_vp, 'ansi_59',               'Relé ANSI 59 (sobretensión)', 'checkbox', false,
      '["VERIFICADO","FALLA","N/A"]', NULL, 70, 'Protección por sobretensión'),
    (s_vp, 'pickup_59',             'Pickup tensión (59)',         'numero',   false,
      NULL, '{"unit":"kV"}', 80, NULL),
    (s_vp, 'ansi_81',               'Relé ANSI 81 (frecuencia)',   'checkbox', false,
      '["VERIFICADO","FALLA","N/A"]', NULL, 90, 'Protección por sub/sobrefrecuencia'),
    (s_vp, 'prueba_disparo',        'Prueba de disparo al relé',   'checkbox', true,
      '["OK","FALLA","N/A"]', NULL, 100, 'Verificar que el interruptor abre al comando del relé'),
    (s_vp, 'obs_protecciones',      'Observaciones',               'textarea', false,
      NULL, NULL, 110, NULL),
    (s_vp, 'resultado_protecciones','Resultado',                   'select',   true,
      '["APROBADO","RECHAZADO"]', NULL, 120, NULL)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 6. Campos de PRUEBA_INTERRUPTOR_VCB ──────────────────────────────────
  -- Interruptor de vacío: tiempos de apertura y cierre, número de operaciones
  INSERT INTO public.section_fields (section_id, key, label, type, required, options, validations, sort_order, hint) VALUES
    (s_vcb, 'tipo_interruptor',     'Tipo de interruptor',         'select',   true,
      '["Vacío (VCB)","SF6","Aire"]', NULL, 10, NULL),
    (s_vcb, 'tension_nominal_vcb',  'Tensión nominal',             'numero',   true,
      NULL, '{"unit":"kV"}', 20, NULL),
    (s_vcb, 'corriente_nominal_vcb','Corriente nominal',           'numero',   true,
      NULL, '{"unit":"A"}', 30, NULL),
    (s_vcb, 'tiempo_apertura',      'Tiempo de apertura',          'numero',   true,
      NULL, '{"unit":"ms","min":0}', 40, 'Referencia típica: 40–60 ms'),
    (s_vcb, 'tiempo_cierre',        'Tiempo de cierre',            'numero',   true,
      NULL, '{"unit":"ms","min":0}', 50, 'Referencia típica: 60–80 ms'),
    (s_vcb, 'num_operaciones',      'N° de operaciones realizadas','numero',   false,
      NULL, '{"min":0}', 60, NULL),
    (s_vcb, 'mecanismo_carga',      'Mecanismo de carga del resorte', 'checkbox', true,
      '["OK","FALLA","N/A"]', NULL, 70, NULL),
    (s_vcb, 'indicador_posicion',   'Indicador de posición (abierto/cerrado)', 'checkbox', true,
      '["OK","FALLA","N/A"]', NULL, 80, NULL),
    (s_vcb, 'enclavamientos',       'Enclavamientos mecánicos/eléctricos', 'checkbox', true,
      '["OK","FALLA","N/A"]', NULL, 90, NULL),
    (s_vcb, 'obs_interruptor',      'Observaciones',               'textarea', false,
      NULL, NULL, 100, NULL),
    (s_vcb, 'resultado_interruptor','Resultado',                   'select',   true,
      '["APROBADO","RECHAZADO"]', NULL, 110, NULL)
  ON CONFLICT (section_id, key) DO NOTHING;

  -- ── 7. Componer el template (solo secciones no-universales) ───────────────
  -- Las universales (DATOS_GENERALES, INSPECCION_VISUAL, CAMBIOS_DISENO_REDLINE, FIRMAS)
  -- se incluyen automáticamente por el hook useInspectionTemplate
  INSERT INTO public.form_template_sections (template_id, section_id, sort_order) VALUES
    (t_ele2, s_amt,  50),
    (t_ele2, s_rc,   60),
    (t_ele2, s_vp,   70),
    (t_ele2, s_vcb,  80),
    (t_ele2, s_pt,   90)
  ON CONFLICT (template_id, section_id) DO NOTHING;

  -- ── 8. Asignar P_ELE_002 al tipo CELDA_MT ────────────────────────────────
  SELECT id INTO et_celda FROM public.equipment_types WHERE code = 'CELDA_MT';
  SELECT id INTO t_ele1   FROM public.form_templates   WHERE key  = 'P_ELE_001' AND project_id IS NULL;

  -- Quitar P_ELE_001 (genérico) de CELDA_MT — ya tienen template específico
  DELETE FROM public.equipment_type_templates
  WHERE equipment_type_id = et_celda AND template_id = t_ele1;

  -- Asignar P_ELE_002 como template principal de CELDA_MT
  INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
    VALUES (et_celda, t_ele2, true, 10)
    ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

  RAISE NOTICE 'Template P_ELE_002 creado y asignado a CELDA_MT';
  RAISE NOTICE 'Secciones: PRUEBA_AISLAMIENTO_MT + RESISTENCIA_CONTACTOS + VERIFICACION_PROTECCIONES + PRUEBA_INTERRUPTOR_VCB + PUESTA_TIERRA';

END $$;

COMMIT;


-- ============================================================
-- VERIFICACIÓN (ejecutar después del COMMIT):
-- ============================================================
--
-- -- 1. Confirmar template creado con sus secciones
-- SELECT ft.key, ft.name, ts.code, ts.name, fts.sort_order
-- FROM   public.form_templates ft
-- JOIN   public.form_template_sections fts ON fts.template_id = ft.id
-- JOIN   public.template_sections ts ON ts.id = fts.section_id
-- WHERE  ft.key = 'P_ELE_002'
-- ORDER  BY fts.sort_order;
--
-- -- 2. Confirmar que REMONTE, C-MEDIDA, C-PROTEC resuelven P_ELE_002
-- SELECT e.tag, r.*
-- FROM   public.equipment e
-- CROSS JOIN LATERAL public.get_equipment_templates(e.id) r
-- WHERE  e.project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004'
--   AND  e.tag IN ('REMONTE','C-MEDIDA','C-PROTEC');
--
-- ============================================================
-- ROLLBACK:
-- ============================================================
--
-- BEGIN;
-- DELETE FROM public.form_template_sections WHERE template_id IN (
--   SELECT id FROM public.form_templates WHERE key = 'P_ELE_002'
-- );
-- DELETE FROM public.equipment_type_templates WHERE template_id IN (
--   SELECT id FROM public.form_templates WHERE key = 'P_ELE_002'
-- );
-- DELETE FROM public.form_templates WHERE key = 'P_ELE_002' AND project_id IS NULL;
-- DELETE FROM public.template_sections WHERE code IN (
--   'PRUEBA_AISLAMIENTO_MT','RESISTENCIA_CONTACTOS',
--   'VERIFICACION_PROTECCIONES','PRUEBA_INTERRUPTOR_VCB'
-- );
-- -- Restaurar P_ELE_001 para CELDA_MT:
-- INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
-- SELECT et.id, ft.id, true, 10
-- FROM   public.equipment_types et, public.form_templates ft
-- WHERE  et.code = 'CELDA_MT' AND ft.key = 'P_ELE_001';
-- COMMIT;
