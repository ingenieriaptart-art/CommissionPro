-- ============================================================
-- 0052 — EPIC-002 Fase B · RPC de aprobación + G1 por config + vista
-- approve_inspection: autoritativo, atómico, online-only (lo llama el cliente).
-- Idempotente (CREATE OR REPLACE).
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1) Vista de estado de cadena por inspección VIGENTE
--    Vigente = mayor revision (no borrador, no rechazada) por (equipment_id, template_id)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_inspection_approval_status
WITH (security_invoker = true) AS
WITH vigentes AS (
  SELECT DISTINCT ON (t.equipment_id, t.template_id)
    t.id AS test_id, t.project_id, t.equipment_id, t.template_id,
    t.revision, t.code, t.status AS test_status
  FROM public.tests t
  WHERE t.deleted_at IS NULL
    AND t.status NOT IN ('borrador','rechazado')
  ORDER BY t.equipment_id, t.template_id, t.revision DESC, t.created_at DESC
)
SELECT
  v.test_id, v.project_id, v.equipment_id, e.tag AS equipment_tag,
  v.template_id, v.revision, v.code, v.test_status,
  c.level, c.level_name, c.required_role_id, c.mandatory,
  (a.status = 'aprobado') AS level_approved
FROM vigentes v
JOIN public.equipment e ON e.id = v.equipment_id
JOIN public.project_approval_config c ON c.project_id = v.project_id
LEFT JOIN public.approvals a ON a.test_id = v.test_id AND a.level = c.level;

-- ------------------------------------------------------------
-- 2) RPC autoritativo de aprobación
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_inspection(
  p_test_id        uuid,
  p_level          int,
  p_decision       text,
  p_observations   text DEFAULT NULL,
  p_signature_image text DEFAULT NULL,
  p_user_agent     text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proj        uuid;
  v_equip       uuid;
  v_status      public.test_status;
  v_level_name  text;
  v_req_role    uuid;
  v_status_on   text;
  v_level_mandatory boolean;
  v_is_admin    boolean;
  v_has_role    boolean;
  v_seq         boolean;
  v_next_level  int;
  v_chain_done  boolean;
  v_eq_status   text;
  v_applied     text := NULL;
  v_res         jsonb;
BEGIN
  -- (1) Cargar test FOR UPDATE
  SELECT t.project_id, t.equipment_id, t.status
    INTO v_proj, v_equip, v_status
    FROM public.tests t
    WHERE t.id = p_test_id AND t.deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'test_not_found');
  END IF;

  -- (2) Permiso base: full sobre 'tests'
  IF NOT app_can_full(v_proj, 'tests') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_allowed');
  END IF;

  -- Config del nivel solicitado
  SELECT c.level_name, c.required_role_id, c.test_status_on_approve, c.mandatory
    INTO v_level_name, v_req_role, v_status_on, v_level_mandatory
    FROM public.project_approval_config c
    WHERE c.project_id = v_proj AND c.level = p_level;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'level_not_configured');
  END IF;

  -- (2b) Rol tipado: si el nivel exige required_role_id, el actor debe tenerlo (o ser admin)
  SELECT (r.key = 'admin') INTO v_is_admin
    FROM public.users u JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = app_current_user_id();
  v_is_admin := COALESCE(v_is_admin, false);

  -- Precedencia de rol: (1) admin siempre puede; (2) rol por proyecto (project_members.role_id);
  -- (3) rol global (users.role_id). NULL en required_role_id = cualquiera con 'full' sobre 'tests'.
  IF v_req_role IS NOT NULL AND NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.users u
        WHERE u.id = app_current_user_id() AND u.role_id = v_req_role
      UNION
      SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = v_proj AND pm.user_id = app_current_user_id()
          AND pm.role_id = v_req_role
    ) INTO v_has_role;
    IF NOT v_has_role THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_allowed');
    END IF;
  END IF;

  -- (3) Orden secuencial (O4): Fase B es SIEMPRE secuencial obligatoria.
  -- El flag de cadenas no-secuenciales queda reservado para una fase futura
  -- (cuando exista la pantalla de configuración); no se lee de projects.metadata
  -- porque esa columna no existe en el esquema. Hasta entonces, v_seq := true.
  v_seq := true;
  IF v_seq THEN
    SELECT min(c.level) INTO v_next_level
      FROM public.project_approval_config c
      WHERE c.project_id = v_proj AND c.mandatory
        AND NOT EXISTS (
          SELECT 1 FROM public.approvals a
          WHERE a.test_id = p_test_id AND a.level = c.level AND a.status = 'aprobado'
        );
    -- Para approve, si el nivel solicitado es MANDATORY debe ser el siguiente mandatory
    -- pendiente. Niveles opcionales (mandatory=false) y la re-aprobación idempotente
    -- cuando ya no quedan mandatory pendientes (v_next_level IS NULL) no se bloquean.
    -- Para rechazos no se exige orden (se puede rechazar en cualquier nivel pendiente).
    IF p_decision = 'approve' AND v_level_mandatory
       AND v_next_level IS NOT NULL AND p_level <> v_next_level THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'level_not_next');
    END IF;
  END IF;

  -- (4) Aplicar decisión
  IF p_decision = 'approve' THEN
    INSERT INTO public.approvals (test_id, level, level_name, status, approver_id, approved_at, observations)
    VALUES (p_test_id, p_level, v_level_name, 'aprobado', app_current_user_id(), now(), p_observations)
    ON CONFLICT (test_id, level)
    DO UPDATE SET status='aprobado', approver_id=app_current_user_id(),
                  approved_at=now(), observations=EXCLUDED.observations,
                  level_name=EXCLUDED.level_name;

    INSERT INTO public.signatures (user_id, test_id, role_at_sign, image_url, ip, device, user_agent)
    VALUES (app_current_user_id(), p_test_id, v_level_name, p_signature_image,
            inet_client_addr(), NULL, p_user_agent);

    UPDATE public.tests SET status = COALESCE(v_status_on::public.test_status, status), updated_at = now()
      WHERE id = p_test_id;

  ELSIF p_decision = 'request_correction' THEN
    INSERT INTO public.approvals (test_id, level, level_name, status, approver_id, approved_at, observations)
    VALUES (p_test_id, p_level, v_level_name, 'rechazado', app_current_user_id(), now(), p_observations)
    ON CONFLICT (test_id, level)
    DO UPDATE SET status='rechazado', approver_id=app_current_user_id(),
                  approved_at=now(), observations=EXCLUDED.observations,
                  level_name=EXCLUDED.level_name;

    INSERT INTO public.signatures (user_id, test_id, role_at_sign, image_url, ip, device, user_agent)
    VALUES (app_current_user_id(), p_test_id, v_level_name, p_signature_image,
            inet_client_addr(), NULL, p_user_agent);

    UPDATE public.tests SET status = 'rechazado', updated_at = now() WHERE id = p_test_id;

  ELSIF p_decision = 'reject_equipment' THEN
    INSERT INTO public.approvals (test_id, level, level_name, status, approver_id, approved_at, observations)
    VALUES (p_test_id, p_level, v_level_name, 'rechazado', app_current_user_id(), now(), p_observations)
    ON CONFLICT (test_id, level)
    DO UPDATE SET status='rechazado', approver_id=app_current_user_id(),
                  approved_at=now(), observations=EXCLUDED.observations,
                  level_name=EXCLUDED.level_name;

    INSERT INTO public.signatures (user_id, test_id, role_at_sign, image_url, ip, device, user_agent)
    VALUES (app_current_user_id(), p_test_id, v_level_name, p_signature_image,
            inet_client_addr(), NULL, p_user_agent);

  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_decision');
  END IF;

  -- (5) Estado actual del equipo (para p_from_status de la FSM)
  SELECT status::text INTO v_eq_status FROM public.equipment WHERE id = v_equip;

  -- (6) Transiciones de equipo
  IF p_decision = 'reject_equipment' THEN
    PERFORM public.transition_equipment_state(v_equip, 'EQUIPMENT_REJECTED', v_eq_status,
            p_observations, jsonb_build_object('test_id', p_test_id), now(), 'online');
    v_applied := 'EQUIPMENT_REJECTED';

  ELSIF p_decision = 'request_correction' THEN
    IF v_eq_status = 'aprobado' THEN
      PERFORM public.transition_equipment_state(v_equip, 'INSPECTION_REJECTED', v_eq_status,
              p_observations, jsonb_build_object('test_id', p_test_id), now(), 'online');
      v_applied := 'INSPECTION_REJECTED';
    END IF;

  ELSIF p_decision = 'approve' THEN
    -- ¿La cadena del equipo (todas las inspecciones vigentes) está completa?
    SELECT NOT EXISTS (
      SELECT 1 FROM public.v_inspection_approval_status s
      WHERE s.equipment_id = v_equip AND s.mandatory AND COALESCE(s.level_approved, false) = false
    ) AND EXISTS (
      SELECT 1 FROM public.v_inspection_approval_status s WHERE s.equipment_id = v_equip
    ) INTO v_chain_done;

    IF v_chain_done THEN
      PERFORM public.transition_equipment_state(v_equip, 'INSPECTION_APPROVED', v_eq_status,
              p_observations, jsonb_build_object('test_id', p_test_id), now(), 'online');
      v_applied := 'INSPECTION_APPROVED';
    END IF;
  END IF;

  -- (7) Recolectar resultado
  SELECT t.status::text INTO v_status FROM public.tests t WHERE t.id = p_test_id;
  SELECT status::text INTO v_eq_status FROM public.equipment WHERE id = v_equip;

  v_res := jsonb_build_object(
    'ok', true,
    'test_status', v_status,
    'equipment_status', v_eq_status,
    'chain_complete', COALESCE(v_chain_done, false),
    'applied_event', v_applied
  );
  RETURN v_res;
END $$;

-- ------------------------------------------------------------
-- 3) G1 por config en transition_equipment_state (CREATE OR REPLACE)
--    Solo cambia el cálculo de v_appr; el resto es idéntico a 0050.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_equipment_state(
  p_equipment_id uuid,
  p_event        text,
  p_from_status  text,
  p_reason       text DEFAULT NULL,
  p_context      jsonb DEFAULT NULL,
  p_occurred_at  timestamptz DEFAULT now(),
  p_source       text DEFAULT 'online'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cur     public.equipment_status;
  v_proj    uuid;
  v_to      public.equipment_status;
  v_open    int;
  v_appr    boolean;
  v_ever    boolean;
  v_reason  text := NULL;
BEGIN
  SELECT status, project_id INTO v_cur, v_proj
    FROM public.equipment WHERE id = p_equipment_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'status', NULL, 'reason', 'equipment_not_found');
  END IF;

  IF p_from_status IS NOT NULL AND p_from_status <> v_cur::text THEN
    INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
    VALUES (p_equipment_id, v_proj, v_cur, NULL, p_event, 'rejected', 'stale_state', app_current_user_id(), p_source, p_context, p_occurred_at);
    RETURN jsonb_build_object('applied', false, 'status', v_cur, 'reason', 'stale_state');
  END IF;

  SELECT count(*) INTO v_open FROM public.punch_items
    WHERE equipment_id = p_equipment_id AND deleted_at IS NULL AND status <> 'cerrado';

  -- G1 (Fase B): completitud por config sobre inspecciones VIGENTES
  -- vigente = mayor revision (no borrador, no rechazada) por (equipment_id, template_id)
  WITH vigentes AS (
    SELECT DISTINCT ON (t.template_id) t.id, t.project_id
    FROM public.tests t
    WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
      AND t.status NOT IN ('borrador','rechazado')
    ORDER BY t.template_id, t.revision DESC, t.created_at DESC
  )
  SELECT (EXISTS (SELECT 1 FROM vigentes))
     AND NOT EXISTS (
       SELECT 1 FROM vigentes v
       JOIN public.project_approval_config c ON c.project_id = v.project_id AND c.mandatory
       WHERE NOT EXISTS (
         SELECT 1 FROM public.approvals a
         WHERE a.test_id = v.id AND a.level = c.level AND a.status = 'aprobado'
       )
     )
  INTO v_appr;

  SELECT EXISTS(SELECT 1 FROM public.tests t WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
                AND t.status <> 'borrador') INTO v_ever;

  v_to := NULL;
  IF p_event = 'BLOCK' AND v_cur <> 'operativo' AND v_cur <> 'bloqueado' THEN
    v_to := 'bloqueado';
  ELSIF p_event = 'UNBLOCK' AND v_cur = 'bloqueado' THEN
    v_to := CASE WHEN v_ever THEN 'en_ejecucion' ELSE 'pendiente' END;
  ELSIF p_event = 'PUNCH_RAISED' AND v_cur = 'mechanical_completion' THEN
    v_to := 'aprobado';
  ELSE
    v_to := CASE
      WHEN v_cur = 'pendiente'    AND p_event = 'INSPECTION_EXECUTED' THEN 'en_ejecucion'
      WHEN v_cur = 'pendiente'    AND p_event = 'EQUIPMENT_REJECTED'  THEN 'rechazado'
      WHEN v_cur = 'en_ejecucion' AND p_event = 'INSPECTION_APPROVED' AND v_appr THEN 'aprobado'
      WHEN v_cur = 'en_ejecucion' AND p_event = 'EQUIPMENT_REJECTED'  THEN 'rechazado'
      WHEN v_cur = 'aprobado'     AND p_event = 'MC_COMPLETED' AND v_open = 0 THEN 'mechanical_completion'
      WHEN v_cur = 'aprobado'     AND p_event = 'INSPECTION_REJECTED' THEN 'en_ejecucion'
      WHEN v_cur = 'aprobado'     AND p_event = 'INSPECTION_EXECUTED' THEN 'en_ejecucion'
      WHEN v_cur = 'aprobado'     AND p_event = 'EQUIPMENT_REJECTED'  THEN 'rechazado'
      WHEN v_cur = 'mechanical_completion' AND p_event = 'RFC_GRANTED' THEN 'listo_energizacion'
      WHEN v_cur = 'mechanical_completion' AND p_event = 'MC_REVOKED'  THEN 'aprobado'
      WHEN v_cur = 'mechanical_completion' AND p_event = 'EQUIPMENT_REJECTED' THEN 'rechazado'
      WHEN v_cur = 'listo_energizacion' AND p_event = 'RFSU_GRANTED' THEN 'listo_arranque'
      WHEN v_cur = 'listo_energizacion' AND p_event = 'RFC_REVOKED'  THEN 'mechanical_completion'
      WHEN v_cur = 'listo_arranque' AND p_event = 'COMMISSIONED'  THEN 'operativo'
      WHEN v_cur = 'listo_arranque' AND p_event = 'RFSU_REVOKED'  THEN 'listo_energizacion'
      WHEN v_cur = 'rechazado'   AND p_event = 'EQUIPMENT_REOPENED' THEN 'en_ejecucion'
      ELSE NULL
    END;
  END IF;

  IF v_to IS NULL THEN
    IF p_event = 'INSPECTION_APPROVED' AND v_cur = 'en_ejecucion' AND NOT v_appr THEN v_reason := 'approvals_incomplete';
    ELSIF p_event = 'MC_COMPLETED' AND v_cur = 'aprobado' AND v_open > 0 THEN v_reason := 'open_punch';
    ELSE v_reason := 'not_allowed'; END IF;
    INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
    VALUES (p_equipment_id, v_proj, v_cur, NULL, p_event, 'rejected', v_reason, app_current_user_id(), p_source, p_context, p_occurred_at);
    RETURN jsonb_build_object('applied', false, 'status', v_cur, 'reason', v_reason);
  END IF;

  UPDATE public.equipment SET status = v_to, updated_at = now() WHERE id = p_equipment_id;
  INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
  VALUES (p_equipment_id, v_proj, v_cur, v_to, p_event, 'applied', p_reason, app_current_user_id(), p_source, p_context, p_occurred_at);
  RETURN jsonb_build_object('applied', true, 'status', v_to, 'reason', NULL);
END $$;

COMMIT;
