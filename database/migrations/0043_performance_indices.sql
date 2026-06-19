-- ============================================================
-- 0043 — ÍNDICES DE PERFORMANCE
--        audit_log, tests, punch_items
-- ============================================================
-- APLICA EN: Supabase SQL Editor
-- NOTA: CREATE INDEX CONCURRENTLY no puede ejecutarse dentro
--       de un bloque BEGIN/COMMIT. Ejecutar estas sentencias
--       una por una o todas juntas sin transacción envolvente.
-- ============================================================

-- ─── audit_log ───────────────────────────────────────────────
-- Bitácora filtrada por usuario + rango de fechas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_date
  ON public.audit_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ORDER BY created_at DESC, id DESC (paginación futura)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_date_id
  ON public.audit_log (created_at DESC, id DESC);


-- ─── tests ───────────────────────────────────────────────────
-- Dashboard: filtro por status (pendiente / aprobado / rechazado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tests_project_status
  ON public.tests (project_id, status)
  WHERE deleted_at IS NULL;

-- useTestsPaged: filtro por tipo de prueba
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tests_project_type
  ON public.tests (project_id, type)
  WHERE deleted_at IS NULL;


-- ─── punch_items ─────────────────────────────────────────────
-- usePunchPaged: filtro por status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_punch_project_status
  ON public.punch_items (project_id, status)
  WHERE deleted_at IS NULL;

-- usePunchPaged: filtro por prioridad
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_punch_project_priority
  ON public.punch_items (project_id, priority)
  WHERE deleted_at IS NULL;
