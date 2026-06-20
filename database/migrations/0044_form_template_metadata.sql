-- ============================================================
-- 0044 — Metadatos de plantilla para diferenciación de formatos
-- Añade revisión, documento origen, tipo de equipo y alcance.
-- Re-ejecutable (IF NOT EXISTS). No toca datos existentes.
-- ============================================================

BEGIN;

ALTER TABLE public.form_templates
  ADD COLUMN IF NOT EXISTS revision          text,
  ADD COLUMN IF NOT EXISTS source_doc        text,
  ADD COLUMN IF NOT EXISTS equipment_type_id uuid REFERENCES public.equipment_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alcance           text;  -- 'con_instrumentos' | 'sin_instrumentos' | NULL

CREATE INDEX IF NOT EXISTS idx_form_templates_equipment_type
  ON public.form_templates(equipment_type_id);

COMMENT ON COLUMN public.form_templates.alcance IS
  'Diferencia variantes de un mismo tipo (p. ej. Chiller con/sin instrumentos).';

COMMIT;
