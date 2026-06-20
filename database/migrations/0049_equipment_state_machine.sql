-- ============================================================
-- 0049 — Máquina de estados del equipo: enum + historial
-- ============================================================
-- ALTER TYPE ADD VALUE no puede usarse en la misma tx que lo consume,
-- por eso el valor nuevo va aquí y el RPC en la migración siguiente (0050).
ALTER TYPE public.equipment_status ADD VALUE IF NOT EXISTS 'mechanical_completion' AFTER 'aprobado';

BEGIN;

CREATE TABLE IF NOT EXISTS public.equipment_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_status  public.equipment_status,
  to_status    public.equipment_status,
  event        text NOT NULL,
  guard_result text NOT NULL CHECK (guard_result IN ('applied','rejected')),
  reason       text,
  actor_id     uuid REFERENCES public.users(id),
  source       text NOT NULL DEFAULT 'online' CHECK (source IN ('online','offline_sync')),
  context      jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  applied_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eq_status_hist_eq   ON public.equipment_status_history(equipment_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_eq_status_hist_proj ON public.equipment_status_history(project_id, applied_at);

ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;

-- Append-only: lectura por miembros del proyecto; insert por miembros; sin update/delete.
CREATE POLICY "esh_select" ON public.equipment_status_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = public.app_current_user_id() AND pm.project_id = equipment_status_history.project_id
  ) OR public.app_is_admin());

CREATE POLICY "esh_insert" ON public.equipment_status_history
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = public.app_current_user_id() AND pm.project_id = equipment_status_history.project_id
  ) OR public.app_is_admin());

COMMENT ON TABLE public.equipment_status_history IS
  'Audit trail append-only de transiciones de estado del equipo (applied/rejected).';

COMMIT;
