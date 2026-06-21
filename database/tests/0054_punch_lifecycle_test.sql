-- Test transaccional de Punch Automático (rollback al final).
-- Ejecutar: psql <conn> -f database/tests/0054_punch_lifecycle_test.sql
BEGIN;
-- (Si tu RLS requiere actor, fijá el usuario admin de pruebas)
-- SELECT set_config('request.jwt.claims', json_build_object('sub','<auth_uuid_admin>')::text, true);

DO $$
DECLARE
  v_proj uuid; v_sub uuid; v_eq uuid; v_test uuid; v_punch uuid := gen_random_uuid(); v_ev uuid;
  v_first_raised timestamptz;
BEGIN
  -- Jerarquía mínima
  INSERT INTO public.projects(id,code,name,status) VALUES (gen_random_uuid(),'PCH-TST-'||substr(gen_random_uuid()::text,1,8),'PCH','en_ejecucion') RETURNING id INTO v_proj;
  INSERT INTO public.areas(id,project_id,name,code) VALUES (gen_random_uuid(),v_proj,'A','A1') RETURNING id INTO v_sub; -- reusar var temporal
  -- system + subsystem
  WITH s AS (INSERT INTO public.systems(id,area_id,name,code) VALUES (gen_random_uuid(),v_sub,'S','S1') RETURNING id)
  INSERT INTO public.subsystems(id,system_id,name,code) SELECT gen_random_uuid(), s.id,'SS','SS1' FROM s RETURNING id INTO v_sub;
  INSERT INTO public.equipment(id,subsystem_id,project_id,tag,name,status)
    VALUES (gen_random_uuid(),v_sub,v_proj,'PCH-EQ','eq','en_ejecucion') RETURNING id INTO v_eq;
  INSERT INTO public.tests(id,project_id,equipment_id,type,status,revision)
    VALUES (gen_random_uuid(),v_proj,v_eq,'precomisionamiento','ejecutado',1) RETURNING id INTO v_test;

  -- (A) Auto-punch + idempotencia
  INSERT INTO public.punch_items(id,project_id,equipment_id,test_id,source_test_id,source_item_key,generation_source,title,status,priority)
    VALUES (v_punch,v_proj,v_eq,v_test,v_test,'item1','auto_inspection','Hallazgo 1','abierto','media');
  BEGIN
    INSERT INTO public.punch_items(id,project_id,equipment_id,test_id,source_test_id,source_item_key,generation_source,title,status,priority)
      VALUES (gen_random_uuid(),v_proj,v_eq,v_test,v_test,'item1','auto_inspection','dup','abierto','media');
    RAISE EXCEPTION 'A: el UNIQUE(source_test_id,source_item_key) debió bloquear el duplicado';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- (B) → corregido sin evidencia debe fallar
  BEGIN
    UPDATE public.punch_items SET status='corregido' WHERE id=v_punch;
    RAISE EXCEPTION 'B: corregido sin evidencia debió fallar';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (C) con evidencia → corregido ok + materializa
  INSERT INTO public.evidences(id,project_id,equipment_id,punch_id,type,stage,captured_at)
    VALUES (gen_random_uuid(),v_proj,v_eq,v_punch,'foto','correccion',now()) RETURNING id INTO v_ev;
  UPDATE public.punch_items SET status='corregido' WHERE id=v_punch;
  IF (SELECT corrected_at FROM public.punch_items WHERE id=v_punch) IS NULL
    THEN RAISE EXCEPTION 'C: corrected_at no materializado'; END IF;

  -- (D) → cerrado ok (admin = full) + materializa closed_*
  UPDATE public.punch_items SET status='cerrado', verification_notes='Probado en marcha' WHERE id=v_punch;
  IF (SELECT closed_at FROM public.punch_items WHERE id=v_punch) IS NULL
    THEN RAISE EXCEPTION 'D: closed_at no materializado'; END IF;

  -- (E) reapertura → raised_at nuevo, first_raised_at intacto
  PERFORM pg_sleep(0.01);
  SELECT first_raised_at INTO v_first_raised FROM public.punch_items WHERE id=v_punch;
  UPDATE public.punch_items SET status='abierto' WHERE id=v_punch;
  IF (SELECT first_raised_at FROM public.punch_items WHERE id=v_punch) IS DISTINCT FROM v_first_raised
    THEN RAISE EXCEPTION 'E: first_raised_at fue mutado por la reapertura'; END IF;
  IF (SELECT reopened_at FROM public.punch_items WHERE id=v_punch) IS NULL
    THEN RAISE EXCEPTION 'E: reopened_at no materializado'; END IF;

  -- (F) Guard MC: con punch != cerrado, INSPECTION_APPROVED no debe llevar a MC (queda fuera de alcance del RPC MC),
  --     pero verificamos que el equipo tiene punch abierto contado por la regla
  IF (SELECT count(*) FROM public.punch_items WHERE equipment_id=v_eq AND status<>'cerrado' AND deleted_at IS NULL) = 0
    THEN RAISE EXCEPTION 'F: debería haber al menos 1 punch abierto'; END IF;

  RAISE NOTICE 'OK punch lifecycle (A,B,C,D,E,F)';
END $$;

ROLLBACK;
