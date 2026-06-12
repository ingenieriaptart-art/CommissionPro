-- ============================================================
-- 0026 — Seed equipment_type_templates + project fallback defaults
--
-- Requiere: 0021 + 0022 + 0023 ejecutados.
--
-- Cambios:
--   1. Vincula tipos de equipo a plantillas globales
--      (equipment_type_templates)
--   2. Agrega plantilla fallback por proyecto
--      (project_default_templates — P_MEC_001 para todos)
--
-- Por qué es necesario:
--   Las migraciones 0021–0023 crean las tablas y semillan los catálogos
--   (equipment_types, form_templates, template_sections) pero no crean
--   las asignaciones tipo→plantilla. Sin estas filas, get_equipment_templates
--   devuelve vacío para cualquier equipo sin asignación directa.
-- ============================================================

BEGIN;

DO $$
DECLARE
  t_mec1 UUID; t_mec2 UUID; t_ic1 UUID; t_ele1 UUID;
  et_bomba    UUID; et_motor      UUID; et_compresor  UUID; et_soplador   UUID;
  et_filtro   UUID; et_chiller    UUID; et_caldera    UUID; et_tea        UUID;
  et_laguna   UUID; et_tanque     UUID; et_torre      UUID;
  et_ccm      UUID; et_tab480     UUID; et_tab208     UUID; et_tab_plc    UUID;
  et_trafo_p  UUID; et_trafo_s    UUID; et_generador  UUID;
  et_plc      UUID; et_variador   UUID; et_scada      UUID;
  et_caudal   UUID; et_presion    UUID; et_temp       UUID; et_valvula    UUID;
  et_cable    UUID; et_tierra     UUID; et_capacitor  UUID;
BEGIN

  PERFORM set_config('search_path', 'public', false);

  -- ── Template IDs ──────────────────────────────────────────────────────────
  SELECT id INTO t_mec1 FROM public.form_templates WHERE key = 'P_MEC_001' AND project_id IS NULL;
  SELECT id INTO t_mec2 FROM public.form_templates WHERE key = 'P_MEC_002' AND project_id IS NULL;
  SELECT id INTO t_ic1  FROM public.form_templates WHERE key = 'P_IC_001'  AND project_id IS NULL;
  SELECT id INTO t_ele1 FROM public.form_templates WHERE key = 'P_ELE_001' AND project_id IS NULL;

  IF t_mec1 IS NULL OR t_mec2 IS NULL OR t_ic1 IS NULL OR t_ele1 IS NULL THEN
    RAISE EXCEPTION '0026: faltan plantillas globales (0022 no ejecutado)';
  END IF;

  -- ── Equipment type IDs ────────────────────────────────────────────────────
  SELECT id INTO et_bomba     FROM public.equipment_types WHERE code = 'BOMBA_CENTRIFUGA';
  SELECT id INTO et_motor     FROM public.equipment_types WHERE code = 'MOTOR_ELECTRICO';
  SELECT id INTO et_compresor FROM public.equipment_types WHERE code = 'COMPRESOR_BIOGAS';
  SELECT id INTO et_soplador  FROM public.equipment_types WHERE code = 'SOPLADOR';
  SELECT id INTO et_filtro    FROM public.equipment_types WHERE code = 'FILTRO';
  SELECT id INTO et_chiller   FROM public.equipment_types WHERE code = 'CHILLER';
  SELECT id INTO et_caldera   FROM public.equipment_types WHERE code = 'CALDERA';
  SELECT id INTO et_tea       FROM public.equipment_types WHERE code = 'TEA';
  SELECT id INTO et_laguna    FROM public.equipment_types WHERE code = 'LAGUNA';
  SELECT id INTO et_tanque    FROM public.equipment_types WHERE code = 'TANQUE';
  SELECT id INTO et_torre     FROM public.equipment_types WHERE code = 'TORRE_ENFRIAMIENTO';
  SELECT id INTO et_trafo_p   FROM public.equipment_types WHERE code = 'TRANSFORMADOR_POTENCIA';
  SELECT id INTO et_trafo_s   FROM public.equipment_types WHERE code = 'TRANSFORMADOR_SECO';
  SELECT id INTO et_ccm       FROM public.equipment_types WHERE code = 'CCM';
  SELECT id INTO et_tab480    FROM public.equipment_types WHERE code = 'TABLERO_480V';
  SELECT id INTO et_tab208    FROM public.equipment_types WHERE code = 'TABLERO_208V';
  SELECT id INTO et_tab_plc   FROM public.equipment_types WHERE code = 'TABLERO_PLC';
  SELECT id INTO et_generador FROM public.equipment_types WHERE code = 'GENERADOR_EMERGENCIA';
  SELECT id INTO et_plc       FROM public.equipment_types WHERE code = 'PLC';
  SELECT id INTO et_variador  FROM public.equipment_types WHERE code = 'VARIADOR_AC';
  SELECT id INTO et_scada     FROM public.equipment_types WHERE code = 'SCADA';
  SELECT id INTO et_caudal    FROM public.equipment_types WHERE code = 'MEDIDOR_CAUDAL';
  SELECT id INTO et_presion   FROM public.equipment_types WHERE code = 'TRANSMISOR_PRESION';
  SELECT id INTO et_temp      FROM public.equipment_types WHERE code = 'TRANSMISOR_TEMPERATURA';
  SELECT id INTO et_valvula   FROM public.equipment_types WHERE code = 'DETECTOR_VALVULA';
  SELECT id INTO et_cable     FROM public.equipment_types WHERE code = 'CABLE';
  SELECT id INTO et_tierra    FROM public.equipment_types WHERE code = 'MALLA_TIERRA';
  SELECT id INTO et_capacitor FROM public.equipment_types WHERE code = 'BANCO_CAPACITORES';

  -- ── 1. Mecánica rotativa: Motor Eléctrico (prueba aislamiento + continuidad + tierra) ─
  -- MOTOR_ELECTRICO, SOPLADOR, COMPRESOR_BIOGAS, GENERADOR, TEA
  INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
  VALUES
    (et_motor,     t_mec1, TRUE, 10),
    (et_soplador,  t_mec1, TRUE, 10),
    (et_compresor, t_mec1, TRUE, 10),
    (et_generador, t_mec1, TRUE, 10),
    (et_tea,       t_mec1, TRUE, 10)
  ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

  -- ── 2. Mecánica hidráulica: Bomba Centrífuga (alineamiento + prueba operativa) ─
  -- BOMBA, FILTRO, CHILLER, CALDERA, LAGUNA, TANQUE, TORRE
  INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
  VALUES
    (et_bomba,   t_mec2, TRUE, 10),
    (et_filtro,  t_mec2, TRUE, 10),
    (et_chiller, t_mec2, TRUE, 10),
    (et_caldera, t_mec2, TRUE, 10),
    (et_laguna,  t_mec2, TRUE, 10),
    (et_tanque,  t_mec2, TRUE, 10),
    (et_torre,   t_mec2, TRUE, 10)
  ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

  -- ── 3. I&C: Instrumento (loop check) ─────────────────────────────────────
  INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
  VALUES
    (et_plc,      t_ic1, TRUE, 10),
    (et_variador, t_ic1, TRUE, 10),
    (et_scada,    t_ic1, TRUE, 10),
    (et_caudal,   t_ic1, TRUE, 10),
    (et_presion,  t_ic1, TRUE, 10),
    (et_temp,     t_ic1, TRUE, 10),
    (et_valvula,  t_ic1, TRUE, 10)
  ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

  -- ── 4. Eléctrica: Tablero / CCM (prueba aislamiento + continuidad + tierra) ─
  INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
  VALUES
    (et_ccm,      t_ele1, TRUE, 10),
    (et_tab480,   t_ele1, TRUE, 10),
    (et_tab208,   t_ele1, TRUE, 10),
    (et_tab_plc,  t_ele1, TRUE, 10),
    (et_trafo_p,  t_ele1, TRUE, 10),
    (et_trafo_s,  t_ele1, TRUE, 10),
    (et_cable,    t_ele1, TRUE, 10),
    (et_tierra,   t_ele1, TRUE, 10),
    (et_capacitor,t_ele1, TRUE, 10)
  ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

  -- Motores también llevan P_ELE_001 (revisión de cables + puesta a tierra)
  INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
  VALUES (et_motor, t_ele1, FALSE, 20)
  ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

END $$;


-- ── 2. Project default templates (fallback para equipos sin tipo asignado) ──

DO $$
DECLARE
  t_mec1 UUID;
BEGIN
  PERFORM set_config('search_path', 'public', false);

  SELECT id INTO t_mec1 FROM public.form_templates WHERE key = 'P_MEC_001' AND project_id IS NULL;
  IF t_mec1 IS NULL THEN RETURN; END IF;

  -- Insertar P_MEC_001 como fallback para todos los proyectos que aún no tienen default
  INSERT INTO public.project_default_templates (project_id, template_id, sort_order)
  SELECT p.id, t_mec1, 0
  FROM   public.projects p
  WHERE  NOT EXISTS (
    SELECT 1 FROM public.project_default_templates pdt WHERE pdt.project_id = p.id
  )
  ON CONFLICT (project_id, template_id) DO NOTHING;
END $$;

COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DELETE FROM public.equipment_type_templates;
-- DELETE FROM public.project_default_templates;
-- COMMIT;
-- ============================================================
