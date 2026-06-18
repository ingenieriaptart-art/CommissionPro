-- ============================================================
-- 0039 — Acceso por módulo: columna JSONB en project_members + helpers RLS
-- module_access = {"tests":"full","punch":"edit","reports":"read", ...}
-- Niveles: none | read | edit | full. Clave ausente => 'none'.
-- ============================================================

BEGIN;

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS module_access jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Nivel de acceso del usuario actual a (proyecto, módulo). Admin => 'full'.
CREATE OR REPLACE FUNCTION public.app_module_access(p uuid, m text)
RETURNS text AS $$
  SELECT CASE
    WHEN public.app_is_admin() THEN 'full'
    ELSE COALESCE(
      (SELECT module_access->>m FROM public.project_members
        WHERE project_id = p AND user_id = public.app_current_user_id()),
      'none')
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Puede escribir (crear/editar) en el módulo: edit o full.
CREATE OR REPLACE FUNCTION public.app_can_write(p uuid, m text)
RETURNS boolean AS $$
  SELECT public.app_module_access(p, m) IN ('edit','full');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Control total (aprobar/borrar): solo full.
CREATE OR REPLACE FUNCTION public.app_can_full(p uuid, m text)
RETURNS boolean AS $$
  SELECT public.app_module_access(p, m) = 'full';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMIT;
