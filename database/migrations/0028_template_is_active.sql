-- ============================================================
-- 0028 — is_active en template_sections y section_fields
--
-- Permite a los administradores activar/desactivar secciones
-- y campos de plantillas sin eliminarlos.
-- El formulario de inspección respeta estos flags:
--   - Sección inactiva → marcador de posición (no bloquea avance)
--   - Campo inactivo   → oculto/deshabilitado en el formulario
-- ============================================================

BEGIN;

ALTER TABLE public.template_sections
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.section_fields
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_template_sections_active
  ON public.template_sections(is_active)
  WHERE is_active = FALSE;

CREATE INDEX IF NOT EXISTS idx_section_fields_active
  ON public.section_fields(section_id, is_active)
  WHERE is_active = FALSE;

COMMIT;
