-- ============================================================
-- 0054 — EPIC-002 Fase C · Trigger de ciclo de vida + vista board
-- Autoridad de transiciones de punch (offline-optimista; server reconcilia).
-- Idempotente (CREATE OR REPLACE).
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_punch_lifecycle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- first_raised_at es inmutable
  NEW.first_raised_at := OLD.first_raised_at;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'corregido' THEN
      IF NOT EXISTS (SELECT 1 FROM public.evidences e
                     WHERE e.punch_id = NEW.id AND e.stage = 'correccion' AND e.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'punch %: se requiere evidencia de corrección', NEW.id USING ERRCODE = 'check_violation';
      END IF;
      NEW.corrected_at := COALESCE(NEW.corrected_at, now());
      NEW.corrected_by := app_current_user_id();

    ELSIF NEW.status = 'cerrado' THEN
      IF OLD.status <> 'corregido' THEN
        RAISE EXCEPTION 'punch %: solo se cierra desde corregido', NEW.id USING ERRCODE = 'check_violation';
      END IF;
      IF NOT public.app_can_full(NEW.project_id, 'punch') THEN
        RAISE EXCEPTION 'punch %: se requiere control total para cerrar', NEW.id USING ERRCODE = 'insufficient_privilege';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.evidences e
                     WHERE e.punch_id = NEW.id AND e.stage = 'correccion' AND e.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'punch %: cierre requiere evidencia de corrección', NEW.id USING ERRCODE = 'check_violation';
      END IF;
      NEW.closed_at := COALESCE(NEW.closed_at, now());
      NEW.closed_by := app_current_user_id();

    ELSIF NEW.status IN ('abierto','en_proceso') AND OLD.status IN ('corregido','cerrado') THEN
      IF NOT public.app_can_full(NEW.project_id, 'punch') THEN
        RAISE EXCEPTION 'punch %: se requiere control total para reabrir', NEW.id USING ERRCODE = 'insufficient_privilege';
      END IF;
      NEW.reopened_at := now();
      NEW.reopened_by := app_current_user_id();
      NEW.raised_at   := now();
      NEW.corrected_at := NULL; NEW.corrected_by := NULL;
      NEW.closed_at := NULL;    NEW.closed_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_punch_lifecycle ON public.punch_items;
CREATE TRIGGER trg_guard_punch_lifecycle
  BEFORE UPDATE ON public.punch_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_punch_lifecycle();

CREATE OR REPLACE VIEW public.v_punch_board WITH (security_invoker = true) AS
SELECT
  p.id AS punch_id, p.project_id, p.equipment_id, e.tag AS equipment_tag,
  e.subsystem_id, ss.name AS subsystem_name,
  sy.id AS system_id, sy.name AS system_name,
  ar.id AS area_id, ar.name AS area_name,
  p.code, p.title, p.priority, p.status, p.generation_source, p.commissioning_category,
  p.source_test_id, p.source_item_key, p.responsible_id,
  p.first_raised_at, p.raised_at, p.corrected_at, p.corrected_by,
  p.closed_at, p.closed_by, p.reopened_at, p.reopened_by, p.created_by, p.verification_notes,
  (p.status <> 'cerrado')                                        AS is_open,
  (p.responsible_id IS NULL)                                     AS unassigned,
  GREATEST(0, EXTRACT(DAY FROM now() - p.raised_at))::int        AS age_days,
  GREATEST(0, EXTRACT(DAY FROM now() - p.first_raised_at))::int  AS age_days_total
FROM public.punch_items p
JOIN public.equipment e   ON e.id = p.equipment_id
LEFT JOIN public.subsystems ss ON ss.id = e.subsystem_id
LEFT JOIN public.systems    sy ON sy.id = ss.system_id
LEFT JOIN public.areas      ar ON ar.id = sy.area_id
WHERE p.deleted_at IS NULL;

COMMIT;
