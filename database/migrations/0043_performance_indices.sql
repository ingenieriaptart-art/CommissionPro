-- ============================================================
-- 0043 — ÍNDICES DE PERFORMANCE
--        audit_log, tests, punch_items
-- ============================================================
-- APLICA EN: Supabase SQL Editor
-- Se usa CREATE INDEX (sin CONCURRENTLY) para poder ejecutar
-- todo de una sola vez en el SQL Editor.
-- ============================================================

BEGIN;

-- ─── audit_log ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_user_date
  ON public.audit_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_date_id
  ON public.audit_log (created_at DESC, id DESC);


-- ─── tests ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tests_project_status
  ON public.tests (project_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tests_project_type
  ON public.tests (project_id, type)
  WHERE deleted_at IS NULL;


-- ─── punch_items ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_punch_project_status
  ON public.punch_items (project_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_punch_project_priority
  ON public.punch_items (project_id, priority)
  WHERE deleted_at IS NULL;

COMMIT;
