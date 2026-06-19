-- ============================================================
-- 0047 — Snapshot de plantilla por inspección (trazabilidad)
-- Aditivo/nullable. No modifica RLS ni el enum record_sync_status.
-- Nota: 0044-0046 quedan reservadas por el PR #1 (import de formatos de
-- pre-comisionamiento de equipos), aún sin mergear; por eso esta migración
-- usa 0047 y no el siguiente número libre en master (0044).
-- ============================================================
BEGIN;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS template_id        uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_revision  text,
  ADD COLUMN IF NOT EXISTS template_hash      text,
  ADD COLUMN IF NOT EXISTS template_snapshot  jsonb;

CREATE INDEX IF NOT EXISTS idx_tests_template_id ON public.tests(template_id);

COMMENT ON COLUMN public.tests.template_snapshot IS
  'Copia inmutable de la plantilla (definición + meta) tal como la vio el inspector.';

COMMIT;
