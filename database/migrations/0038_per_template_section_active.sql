-- ============================================================
-- 0038 — Activación de secciones POR PLANTILLA (no global)
--
-- Problema: template_sections.is_active es global; desactivar una sección
-- universal (p.ej. "Anclaje y Nivelación") la quitaba de TODOS los equipos.
--
-- Solución: override por plantilla en form_template_sections.is_active.
--   get_template_sections resuelve: override de plantilla → global → TRUE.
-- Compatibilidad: si no hay override, se respeta el is_active global previo.
-- ============================================================

BEGIN;

ALTER TABLE public.form_template_sections
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Reescribir el RPC para devolver is_active resuelto por plantilla
DROP FUNCTION IF EXISTS public.get_template_sections(UUID);

CREATE FUNCTION public.get_template_sections(p_template_id UUID)
RETURNS TABLE (
  section_id   UUID,
  section_code TEXT,
  section_name TEXT,
  sort_order   INTEGER,
  is_required  BOOLEAN,
  is_active    BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ts.id,
    ts.code,
    ts.name,
    COALESCE(fts.sort_order, ts.sort_order)        AS sort_order,
    COALESCE(fts.is_required, TRUE)                AS is_required,
    COALESCE(fts.is_active, ts.is_active, TRUE)    AS is_active
  FROM public.template_sections ts
  LEFT JOIN public.form_template_sections fts
    ON fts.section_id = ts.id AND fts.template_id = p_template_id
  WHERE ts.is_universal = TRUE
     OR fts.template_id IS NOT NULL
  ORDER BY sort_order;
$$;

COMMIT;

-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.get_template_sections(UUID);
-- -- (recrear la versión 0021 sin is_active si se requiere revertir)
-- ALTER TABLE public.form_template_sections DROP COLUMN IF EXISTS is_active;
-- COMMIT;
-- ============================================================
