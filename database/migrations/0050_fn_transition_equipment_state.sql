-- ============================================================
-- 0050 — RPC autoritativo de transición de estado + timeline
-- Valida la FSM (mismas reglas que lib/state/equipmentFsm.ts) y G-OFFLINE.
-- ============================================================
-- NOTA (desviación del plan): "punch abierto" = status <> 'cerrado'.
-- El plan referenciaba ('verificado','cerrado'), pero 'verificado' NO existe
-- en el enum punch_status (abierto|en_proceso|corregido|cerrado). Se usa el
-- mismo criterio que la vista de stats (punch_critico_abierto: status <> 'cerrado').
BEGIN;

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

  -- G-OFFLINE: la transición se calculó contra un estado que ya cambió en servidor
  IF p_from_status IS NOT NULL AND p_from_status <> v_cur::text THEN
    INSERT INTO public.equipment_status_history(equipment_id,project_id,from_status,to_status,event,guard_result,reason,actor_id,source,context,occurred_at)
    VALUES (p_equipment_id, v_proj, v_cur, NULL, p_event, 'rejected', 'stale_state', app_current_user_id(), p_source, p_context, p_occurred_at);
    RETURN jsonb_build_object('applied', false, 'status', v_cur, 'reason', 'stale_state');
  END IF;

  -- Flags derivados
  SELECT count(*) INTO v_open FROM public.punch_items
    WHERE equipment_id = p_equipment_id AND deleted_at IS NULL AND status <> 'cerrado';
  SELECT EXISTS(SELECT 1 FROM public.tests t WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
                AND t.status IN ('aprob_supervisor','aprob_qaqc','aprob_cliente','cerrado')) INTO v_appr;
  SELECT EXISTS(SELECT 1 FROM public.tests t WHERE t.equipment_id = p_equipment_id AND t.deleted_at IS NULL
                AND t.status <> 'borrador') INTO v_ever;

  -- Matriz de transición (espejo de equipmentFsm.ts)
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

CREATE OR REPLACE VIEW public.v_equipment_timeline AS
  SELECT h.equipment_id, h.occurred_at, h.from_status, h.to_status, h.event, h.guard_result,
         h.reason, h.actor_id, h.source, h.context
  FROM public.equipment_status_history h
  ORDER BY h.equipment_id, h.occurred_at;

COMMIT;
