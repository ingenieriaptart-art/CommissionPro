-- ============================================================
-- 0018 — RLS: project_members, signatures, mv_project_stats
-- ============================================================
-- SECURITY DEFINER en get_accessible_project_ids() rompe la recursión:
-- las subqueries inline de otras tablas que consultan project_members
-- seguirán funcionando porque SECURITY DEFINER bypasea RLS.
-- ============================================================

-- ── Helper SECURITY DEFINER ────────────────────────────────
-- Devuelve los project_ids accesibles para auth.uid().
-- NO aplica RLS al consultar project_members → rompe la recursión.
CREATE OR REPLACE FUNCTION get_accessible_project_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT project_id
  FROM public.project_members
  WHERE user_id = auth.uid();
$$;

-- ── project_members ────────────────────────────────────────
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Un usuario ve los miembros de todos los proyectos a los que pertenece.
-- La policy llama a get_accessible_project_ids() (SECURITY DEFINER)
-- para evitar recursión.
CREATE POLICY project_members_select ON project_members
  FOR SELECT USING (
    project_id IN (SELECT get_accessible_project_ids())
  );

-- INSERT/DELETE de miembros: solo via service_role (gestión admin).
-- Se amplía en sprint futuro cuando se implemente UI de gestión de miembros.

-- ── signatures ─────────────────────────────────────────────
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- Un usuario ve firmas de tests que pertenezcan a sus proyectos.
CREATE POLICY signatures_select ON signatures
  FOR SELECT USING (
    test_id IN (
      SELECT t.id
      FROM tests t
      WHERE t.project_id IN (SELECT get_accessible_project_ids())
        AND t.deleted_at IS NULL
    )
  );

-- Un usuario puede insertar su propia firma en tests de sus proyectos.
CREATE POLICY signatures_insert ON signatures
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND test_id IN (
      SELECT t.id
      FROM tests t
      WHERE t.project_id IN (SELECT get_accessible_project_ids())
        AND t.deleted_at IS NULL
    )
  );

-- ── mv_project_stats (vista materializada) ─────────────────
ALTER TABLE mv_project_stats ENABLE ROW LEVEL SECURITY;

-- Un usuario solo ve stats de proyectos a los que pertenece.
CREATE POLICY mv_project_stats_select ON mv_project_stats
  FOR SELECT USING (
    project_id IN (SELECT get_accessible_project_ids())
  );

-- ── ROLLBACK ───────────────────────────────────────────────
-- DROP POLICY IF EXISTS project_members_select ON project_members;
-- ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS signatures_select ON signatures;
-- DROP POLICY IF EXISTS signatures_insert ON signatures;
-- ALTER TABLE signatures DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS mv_project_stats_select ON mv_project_stats;
-- ALTER TABLE mv_project_stats DISABLE ROW LEVEL SECURITY;
-- DROP FUNCTION IF EXISTS get_accessible_project_ids();
