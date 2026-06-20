-- Test transaccional de approve_inspection (rollback al final, NO muta datos).
-- Ejecutar: psql <conn> -f database/tests/0052_approve_inspection_test.sql
-- O pegar completo en el SQL Editor de Supabase contra una rama de pruebas.
BEGIN;

-- (Si tu RLS requiere actor, fijá aquí el usuario admin de pruebas)
-- SELECT set_config('request.jwt.claims', json_build_object('sub', '<auth_uuid_admin>')::text, true);

DO $$
DECLARE
  v_proj uuid; v_eq uuid; v_tpl uuid := gen_random_uuid();
  v_sup uuid; v_test uuid; v_res jsonb; v_eqs text;
BEGIN
  -- Datos mínimos
  SELECT id INTO v_sup FROM public.roles WHERE key='supervisor';
  INSERT INTO public.projects(id, name, status) VALUES (gen_random_uuid(), 'TEST-FASEB', 'activo') RETURNING id INTO v_proj;
  -- seed default de config la deja en 1 nivel Supervisor (lo creó 0051); asegurarla:
  INSERT INTO public.project_approval_config(project_id, level, level_name, required_role_id, test_status_on_approve, mandatory)
  VALUES (v_proj, 1, 'Supervisor', v_sup, 'aprob_supervisor', true)
  ON CONFLICT (project_id, level) DO NOTHING;

  INSERT INTO public.equipment(id, project_id, tag, status)
  VALUES (gen_random_uuid(), v_proj, 'TST-001', 'en_ejecucion') RETURNING id INTO v_eq;

  INSERT INTO public.tests(id, project_id, equipment_id, type, status, template_id, revision)
  VALUES (gen_random_uuid(), v_proj, v_eq, 'precomisionamiento', 'ejecutado', v_tpl, 1)
  RETURNING id INTO v_test;

  -- (A) approve nivel 1 (único mandatory) → cadena completa → equipo aprobado
  v_res := public.approve_inspection(v_test, 1, 'approve', 'ok', NULL, 'vitest-UA');
  IF (v_res->>'ok') <> 'true' THEN RAISE EXCEPTION 'approve falló: %', v_res; END IF;
  IF (v_res->>'chain_complete') <> 'true' THEN RAISE EXCEPTION 'chain no completa: %', v_res; END IF;
  SELECT status::text INTO v_eqs FROM public.equipment WHERE id=v_eq;
  IF v_eqs <> 'aprobado' THEN RAISE EXCEPTION 'equipo no quedó aprobado: %', v_eqs; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.equipment_status_history
                 WHERE equipment_id=v_eq AND event='INSPECTION_APPROVED' AND guard_result='applied')
    THEN RAISE EXCEPTION 'historial INSPECTION_APPROVED ausente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.signatures WHERE test_id=v_test AND user_agent='vitest-UA')
    THEN RAISE EXCEPTION 'firma con user_agent ausente'; END IF;

  -- (B) request_correction sobre equipo aprobado → tests rechazado + equipo en_ejecucion
  v_res := public.approve_inspection(v_test, 1, 'request_correction', 'rehacer', NULL, 'UA2');
  IF (v_res->>'ok') <> 'true' THEN RAISE EXCEPTION 'request_correction falló: %', v_res; END IF;
  IF (SELECT status::text FROM public.tests WHERE id=v_test) <> 'rechazado'
    THEN RAISE EXCEPTION 'test no quedó rechazado'; END IF;
  IF (SELECT status::text FROM public.equipment WHERE id=v_eq) <> 'en_ejecucion'
    THEN RAISE EXCEPTION 'equipo no volvió a en_ejecucion'; END IF;

  -- (C) Rework: nueva inspección revision 2 (la vieja rechazada NO bloquea)
  INSERT INTO public.tests(id, project_id, equipment_id, type, status, template_id, revision)
  VALUES (gen_random_uuid(), v_proj, v_eq, 'precomisionamiento', 'ejecutado', v_tpl, 2)
  RETURNING id INTO v_test;
  v_res := public.approve_inspection(v_test, 1, 'approve', 'ok2', NULL, 'UA3');
  IF (v_res->>'chain_complete') <> 'true' THEN RAISE EXCEPTION 'rework no completó cadena: %', v_res; END IF;
  IF (SELECT status::text FROM public.equipment WHERE id=v_eq) <> 'aprobado'
    THEN RAISE EXCEPTION 'rework no dejó equipo aprobado'; END IF;

  -- (D) reject_equipment → equipo rechazado
  v_res := public.approve_inspection(v_test, 1, 'reject_equipment', 'no conforme', NULL, 'UA4');
  IF (SELECT status::text FROM public.equipment WHERE id=v_eq) <> 'rechazado'
    THEN RAISE EXCEPTION 'reject_equipment no dejó equipo rechazado'; END IF;

  -- (E) Guarda secuencial: 3 niveles (L1 mandatory, L2 mandatory, L3 optional)
  --     E1: L2 antes de L1 → bloqueado (reason='level_not_next')
  --     E2: L3 opcional luego de todos los mandatory → permitido
  DECLARE
    v_proj2 uuid; v_eq2 uuid; v_tpl2 uuid := gen_random_uuid();
    v_test2 uuid;
  BEGIN
    INSERT INTO public.projects(id, name, status)
      VALUES (gen_random_uuid(), 'TEST-FASEB-E', 'activo') RETURNING id INTO v_proj2;

    INSERT INTO public.project_approval_config(project_id, level, level_name, required_role_id, test_status_on_approve, mandatory)
      VALUES (v_proj2, 1, 'Supervisor', v_sup, 'aprob_supervisor', true),
             (v_proj2, 2, 'QA',        NULL,   NULL,               true),
             (v_proj2, 3, 'Cliente',   NULL,   NULL,               false);

    INSERT INTO public.equipment(id, project_id, tag, status)
      VALUES (gen_random_uuid(), v_proj2, 'TST-002', 'en_ejecucion') RETURNING id INTO v_eq2;

    INSERT INTO public.tests(id, project_id, equipment_id, type, status, template_id, revision)
      VALUES (gen_random_uuid(), v_proj2, v_eq2, 'precomisionamiento', 'ejecutado', v_tpl2, 1)
      RETURNING id INTO v_test2;

    -- E1: intentar aprobar L2 antes de L1 → debe bloquear
    IF (public.approve_inspection(v_test2, 2, 'approve', NULL, NULL, 'UA') ->> 'reason') <> 'level_not_next' THEN
      RAISE EXCEPTION 'E1: L2 antes de L1 deberia bloquear';
    END IF;

    -- Aprobar L1 y L2 en orden correcto
    v_res := public.approve_inspection(v_test2, 1, 'approve', NULL, NULL, 'UA');
    IF (v_res->>'ok') <> 'true' THEN RAISE EXCEPTION 'E: L1 approve falló: %', v_res; END IF;
    v_res := public.approve_inspection(v_test2, 2, 'approve', NULL, NULL, 'UA');
    IF (v_res->>'ok') <> 'true' THEN RAISE EXCEPTION 'E: L2 approve falló: %', v_res; END IF;

    -- E2: L3 es opcional y todos los mandatory ya están aprobados → debe permitir
    IF (public.approve_inspection(v_test2, 3, 'approve', NULL, NULL, 'UA') ->> 'ok') <> 'true' THEN
      RAISE EXCEPTION 'E2: nivel opcional L3 deberia poder aprobarse';
    END IF;
  END;

  RAISE NOTICE 'OK approve_inspection (A,B,C,D,E)';
END $$;

ROLLBACK;
