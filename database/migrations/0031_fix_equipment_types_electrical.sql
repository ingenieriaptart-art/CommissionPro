-- ============================================================
-- 0031 — Asignar equipment_type_id a los 26 equipos eléctricos LDC
--
-- Requiere: 0021 + 0022 + 0026 + 0029 + 0030 ejecutados.
--
-- Problema: la migración 0029 insertó todos los equipos eléctricos
-- del unifilar SCADA sin equipment_type_id. Sin ese campo,
-- get_equipment_templates() cae al project_default (P_MEC_001 Motor
-- Eléctrico) en vez del template correcto P_ELE_001 (Tablero / CCM).
--
-- Cambios:
--   1. Agrega 4 tipos de equipo nuevos que faltaban en el catálogo:
--        CELDA_MT       — Celda de Media Tensión
--        BLINDOBARRA_BT — Blindobarra / Barraje BT
--        ATS            — Tablero de Transferencia Automática
--        UPS_SISTEMA    — Sistema UPS
--   2. Vincula esos 4 tipos nuevos a P_ELE_001 (Tablero / CCM)
--   3. Actualiza equipment_type_id en los 26 equipos del proyecto LDC
--
-- Resultado esperado:
--   Todos los equipos eléctricos reciben P_ELE_001 como template
--   (source = "equipment_type"), salvo el GGD que es GENERADOR_EMERGENCIA
--   y recibe P_MEC_001 (Motor Eléctrico, que ya incluye meggueo + tierra).
--
-- project_id LDC: eba099c0-32ca-4be7-823f-4ab7f3480004
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Agregar tipos de equipo faltantes para eléctrica
-- ============================================================

INSERT INTO public.equipment_types (code, name, discipline, icon, sort_order)
VALUES
  ('CELDA_MT',       'Celda de Media Tensión',              'Eléctrica', 'zap',     145),
  ('BLINDOBARRA_BT', 'Blindobarra / Barraje BT',            'Eléctrica', 'minus',   165),
  ('ATS',            'Tablero de Transferencia Automática',  'Eléctrica', 'shuffle', 175),
  ('UPS_SISTEMA',    'Sistema UPS',                         'Eléctrica', 'battery', 185)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. Vincular tipos nuevos a P_ELE_001
-- ============================================================

DO $$
DECLARE
  t_ele1   UUID;
  et_celda UUID;
  et_barra UUID;
  et_ats   UUID;
  et_ups   UUID;
BEGIN
  PERFORM set_config('search_path', 'public', false);

  SELECT id INTO t_ele1   FROM public.form_templates  WHERE key = 'P_ELE_001' AND project_id IS NULL;
  SELECT id INTO et_celda FROM public.equipment_types WHERE code = 'CELDA_MT';
  SELECT id INTO et_barra FROM public.equipment_types WHERE code = 'BLINDOBARRA_BT';
  SELECT id INTO et_ats   FROM public.equipment_types WHERE code = 'ATS';
  SELECT id INTO et_ups   FROM public.equipment_types WHERE code = 'UPS_SISTEMA';

  IF t_ele1 IS NULL THEN
    RAISE EXCEPTION '0031: P_ELE_001 no encontrado — ejecutar 0022 primero';
  END IF;

  INSERT INTO public.equipment_type_templates (equipment_type_id, template_id, is_mandatory, sort_order)
  VALUES
    (et_celda, t_ele1, TRUE, 10),
    (et_barra, t_ele1, TRUE, 10),
    (et_ats,   t_ele1, TRUE, 10),
    (et_ups,   t_ele1, TRUE, 10)
  ON CONFLICT (equipment_type_id, template_id) DO NOTHING;
END $$;

-- ============================================================
-- 3. Asignar equipment_type_id a los 26 equipos eléctricos LDC
-- ============================================================

DO $$
DECLARE
  pid          CONSTANT UUID := 'eba099c0-32ca-4be7-823f-4ab7f3480004';
  et_celda     UUID;
  et_barra     UUID;
  et_ats       UUID;
  et_ups       UUID;
  et_trafo_p   UUID;
  et_trafo_s   UUID;
  et_ccm       UUID;
  et_tab480    UUID;
  et_tab208    UUID;
  et_capacitor UUID;
  et_generador UUID;
  n_updated    INTEGER;
BEGIN
  PERFORM set_config('search_path', 'public', false);

  SELECT id INTO et_celda    FROM public.equipment_types WHERE code = 'CELDA_MT';
  SELECT id INTO et_barra    FROM public.equipment_types WHERE code = 'BLINDOBARRA_BT';
  SELECT id INTO et_ats      FROM public.equipment_types WHERE code = 'ATS';
  SELECT id INTO et_ups      FROM public.equipment_types WHERE code = 'UPS_SISTEMA';
  SELECT id INTO et_trafo_p  FROM public.equipment_types WHERE code = 'TRANSFORMADOR_POTENCIA';
  SELECT id INTO et_trafo_s  FROM public.equipment_types WHERE code = 'TRANSFORMADOR_SECO';
  SELECT id INTO et_ccm      FROM public.equipment_types WHERE code = 'CCM';
  SELECT id INTO et_tab480   FROM public.equipment_types WHERE code = 'TABLERO_480V';
  SELECT id INTO et_tab208   FROM public.equipment_types WHERE code = 'TABLERO_208V';
  SELECT id INTO et_capacitor FROM public.equipment_types WHERE code = 'BANCO_CAPACITORES';
  SELECT id INTO et_generador FROM public.equipment_types WHERE code = 'GENERADOR_EMERGENCIA';

  -- ── Media Tensión 13.8 kV ──────────────────────────────────────────────────
  -- REMONTE, C-MEDIDA, C-PROTEC → CELDA_MT → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_celda,    updated_at = now()
  WHERE project_id = pid AND tag IN ('REMONTE', 'C-MEDIDA', 'C-PROTEC');
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'CELDA_MT: % filas actualizadas (esperado 3)', n_updated;

  -- ── Transformador principal ────────────────────────────────────────────────
  -- TR-1 → TRANSFORMADOR_POTENCIA → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_trafo_p,  updated_at = now()
  WHERE project_id = pid AND tag = 'TR-1';
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'TRANSFORMADOR_POTENCIA: % filas actualizadas (esperado 1)', n_updated;

  -- ── Tableros de distribución 440 V ────────────────────────────────────────
  -- TGD440, TGE440 → TABLERO_480V → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_tab480,   updated_at = now()
  WHERE project_id = pid AND tag IN ('TGD440', 'TGE440');
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'TABLERO_480V: % filas actualizadas (esperado 2)', n_updated;

  -- ── Blindobarras / Barrajes ───────────────────────────────────────────────
  -- BB-TRAFO, BB-PRINC, BB-GEN, BB-TGE → BLINDOBARRA_BT → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_barra,    updated_at = now()
  WHERE project_id = pid AND tag IN ('BB-TRAFO', 'BB-PRINC', 'BB-GEN', 'BB-TGE');
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'BLINDOBARRA_BT: % filas actualizadas (esperado 4)', n_updated;

  -- ── Transferencia automática ──────────────────────────────────────────────
  -- ATS → ATS → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_ats,      updated_at = now()
  WHERE project_id = pid AND tag = 'ATS';
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'ATS: % filas actualizadas (esperado 1)', n_updated;

  -- ── Generador de emergencia ───────────────────────────────────────────────
  -- GGD → GENERADOR_EMERGENCIA → P_MEC_001 (incluye prueba aislamiento + tierra)
  UPDATE public.equipment SET equipment_type_id = et_generador, updated_at = now()
  WHERE project_id = pid AND tag = 'GGD';
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'GENERADOR_EMERGENCIA: % filas actualizadas (esperado 1)', n_updated;

  -- ── Banco de condensadores ────────────────────────────────────────────────
  -- BC-COND → BANCO_CAPACITORES → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_capacitor, updated_at = now()
  WHERE project_id = pid AND tag = 'BC-COND';
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'BANCO_CAPACITORES: % filas actualizadas (esperado 1)', n_updated;

  -- ── Transformador de emergencia 440→220 V ─────────────────────────────────
  -- TR2-E → TRANSFORMADOR_SECO → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_trafo_s,  updated_at = now()
  WHERE project_id = pid AND tag = 'TR2-E';
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'TRANSFORMADOR_SECO: % filas actualizadas (esperado 1)', n_updated;

  -- ── Tableros 220 V y auxiliares ───────────────────────────────────────────
  -- TGD220-E, TR1-REG, TDA-1, TDA-2, TIAE-R → TABLERO_208V → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_tab208,   updated_at = now()
  WHERE project_id = pid AND tag IN ('TGD220-E', 'TR1-REG', 'TDA-1', 'TDA-2', 'TIAE-R');
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'TABLERO_208V: % filas actualizadas (esperado 5)', n_updated;

  -- ── UPS ───────────────────────────────────────────────────────────────────
  -- UPS → UPS_SISTEMA → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_ups,      updated_at = now()
  WHERE project_id = pid AND tag = 'UPS';
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'UPS_SISTEMA: % filas actualizadas (esperado 1)', n_updated;

  -- ── CCMs Normal y Emergencia ──────────────────────────────────────────────
  -- CCM1N, CCM1E, CCM2N, CCM2E, CCM3N, CCM3E → CCM → P_ELE_001
  UPDATE public.equipment SET equipment_type_id = et_ccm,      updated_at = now()
  WHERE project_id = pid AND tag IN ('CCM1N', 'CCM1E', 'CCM2N', 'CCM2E', 'CCM3N', 'CCM3E');
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  RAISE NOTICE 'CCM: % filas actualizadas (esperado 6)', n_updated;

END $$;

COMMIT;


-- ============================================================
-- VERIFICACIÓN (ejecutar después del COMMIT para confirmar):
-- ============================================================
--
-- SELECT e.tag, e.name, et.code AS tipo, et.discipline,
--        ft.key AS template, ft.name AS template_nombre
-- FROM   public.equipment e
-- LEFT JOIN public.equipment_types et ON et.id = e.equipment_type_id
-- LEFT JOIN public.equipment_type_templates ett ON ett.equipment_type_id = et.id AND ett.is_mandatory
-- LEFT JOIN public.form_templates ft ON ft.id = ett.template_id
-- WHERE  e.project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004'
-- ORDER  BY et.sort_order NULLS LAST, e.tag;
--
-- Resultado esperado:
--   25 filas con template_nombre = 'Tablero / CCM' (P_ELE_001)
--    1 fila  con template_nombre = 'Motor Eléctrico' (P_MEC_001) — el GGD
--    0 filas con equipment_type_id NULL
--
-- ============================================================
-- ROLLBACK (si algo falla):
-- ============================================================
--
-- BEGIN;
-- UPDATE public.equipment
-- SET equipment_type_id = NULL, updated_at = now()
-- WHERE project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004'
--   AND tag IN (
--     'REMONTE','C-MEDIDA','C-PROTEC','TR-1','TGD440','BB-TRAFO','BB-PRINC',
--     'ATS','BB-GEN','GGD','BB-TGE','TGE440','BC-COND','TR2-E','TGD220-E',
--     'UPS','TR1-REG','TDA-1','TDA-2','TIAE-R','CCM1N','CCM1E','CCM2N',
--     'CCM2E','CCM3N','CCM3E'
--   );
-- DELETE FROM public.equipment_type_templates
-- WHERE equipment_type_id IN (
--   SELECT id FROM public.equipment_types WHERE code IN ('CELDA_MT','BLINDOBARRA_BT','ATS','UPS_SISTEMA')
-- );
-- DELETE FROM public.equipment_types WHERE code IN ('CELDA_MT','BLINDOBARRA_BT','ATS','UPS_SISTEMA');
-- COMMIT;
