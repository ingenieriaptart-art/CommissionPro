-- ============================================================
-- 0058 — Guard de corrección: solo admin/director editan data/result
--        de inspecciones ya enviadas (status >= 'ejecutado').
-- Idempotente (CREATE OR REPLACE).
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_inspection_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  -- Solo nos importa cuando la fila YA estaba enviada y cambian data/result.
  IF OLD.status <> 'borrador'
     AND (NEW.data IS DISTINCT FROM OLD.data
          OR NEW.result_summary IS DISTINCT FROM OLD.result_summary) THEN
    SELECT app_user_role() INTO v_role;
    IF NOT (public.app_is_admin() OR v_role = 'director') THEN
      RAISE EXCEPTION 'Solo admin/director pueden corregir una inspección enviada'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_inspection_correction ON public.tests;
CREATE TRIGGER trg_guard_inspection_correction
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.guard_inspection_correction();

COMMIT;
