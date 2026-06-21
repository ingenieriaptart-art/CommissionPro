-- ============================================================
-- 0053 — EPIC-002 Fase C · Modelo de Punch Automático
-- Columnas de origen/idempotencia/trazabilidad + placeholder A/B/C.
-- Idempotente (re-ejecutable).
-- ============================================================
-- evidence_stage: agregar valores ANTES de la transacción (no se usan en esta migración)
ALTER TYPE public.evidence_stage ADD VALUE IF NOT EXISTS 'correccion';
ALTER TYPE public.evidence_stage ADD VALUE IF NOT EXISTS 'verificacion';

BEGIN;

ALTER TABLE public.punch_items
  ADD COLUMN IF NOT EXISTS source_test_id         uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_item_key        text,
  ADD COLUMN IF NOT EXISTS generation_source      text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS commissioning_category text,
  ADD COLUMN IF NOT EXISTS raised_at              timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_raised_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS corrected_at           timestamptz,
  ADD COLUMN IF NOT EXISTS corrected_by           uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS closed_by              uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS reopened_at            timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by            uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS verification_notes     text;

ALTER TABLE public.punch_items DROP CONSTRAINT IF EXISTS punch_generation_source_chk;
ALTER TABLE public.punch_items ADD CONSTRAINT punch_generation_source_chk
  CHECK (generation_source IN ('auto_inspection','manual','imported'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_punch_source
  ON public.punch_items (source_test_id, source_item_key);

CREATE INDEX IF NOT EXISTS idx_punch_equipment_status ON public.punch_items(equipment_id, status);
CREATE INDEX IF NOT EXISTS idx_punch_unassigned
  ON public.punch_items(project_id) WHERE responsible_id IS NULL AND deleted_at IS NULL;

COMMIT;
