-- ============================================================
-- 0042 — SEGURIDAD CRÍTICA: RLS en mv_project_stats
--         + fix policies que usaban auth.uid() en vez de
--           app_current_user_id() para comparar con users.id
-- ============================================================
-- APLICA EN: Supabase SQL Editor
-- ROLLBACK al final del archivo
-- ============================================================

BEGIN;

-- ─── 1. ACCESO SEGURO A mv_project_stats ────────────────────
-- PostgreSQL NO soporta ENABLE ROW LEVEL SECURITY en vistas
-- materializadas. Solución: renombrar la MV a nombre privado y
-- crear una vista security_barrier con el nombre original.
-- El código de la app NO necesita cambios.

-- 1a. Renombrar MV al nombre interno
ALTER MATERIALIZED VIEW public.mv_project_stats
  RENAME TO _mv_project_stats_raw;

-- 1b. Revocar acceso directo a la MV interna
REVOKE ALL ON public._mv_project_stats_raw FROM authenticated, anon;

-- 1c. Vista pública con filtro por membresía (security_barrier evita
--     que el planificador reordene el WHERE y filtre antes de las
--     condiciones de autorización)
CREATE VIEW public.mv_project_stats
  WITH (security_barrier = true) AS
SELECT *
FROM public._mv_project_stats_raw mv
WHERE public.app_is_admin()
   OR EXISTS (
     SELECT 1 FROM public.project_members pm
     WHERE pm.project_id = mv.project_id
       AND pm.user_id = public.app_current_user_id()
   );

GRANT SELECT ON public.mv_project_stats TO authenticated;

-- 1d. Actualizar la función de refresh para apuntar al nombre interno
CREATE OR REPLACE FUNCTION public.refresh_project_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public._mv_project_stats_raw;
END;
$$;


-- ─── 2. form_template_sections ──────────────────────────────
-- Bug: auth.uid() devuelve el auth_user_id, pero pm.user_id
-- referencia users.id (UUID distinto). Se corrige con
-- app_current_user_id() que hace la conversión.

DROP POLICY IF EXISTS "fts_select" ON public.form_template_sections;

CREATE POLICY "fts_select" ON public.form_template_sections
  FOR SELECT USING (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.form_templates ft
        ON ft.id = form_template_sections.template_id
      WHERE pm.user_id = public.app_current_user_id()
        AND pm.project_id = ft.project_id
    )
  );


-- ─── 3. equipment_templates ─────────────────────────────────

DROP POLICY IF EXISTS "equip_templates_select" ON public.equipment_templates;

CREATE POLICY "equip_templates_select" ON public.equipment_templates
  FOR SELECT USING (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.equipment e ON e.id = equipment_templates.equipment_id
      WHERE pm.user_id = public.app_current_user_id()
        AND pm.project_id = e.project_id
    )
  );

DROP POLICY IF EXISTS "equip_templates_write" ON public.equipment_templates;

CREATE POLICY "equip_templates_write" ON public.equipment_templates
  FOR ALL USING (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.equipment e ON e.id = equipment_templates.equipment_id
      WHERE pm.user_id = public.app_current_user_id()
        AND pm.project_id = e.project_id
    )
  );


-- ─── 4. certificates ────────────────────────────────────────

DROP POLICY IF EXISTS "certificates_select" ON public.certificates;

CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT USING (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = public.app_current_user_id()
        AND pm.project_id = certificates.project_id
    )
  );

DROP POLICY IF EXISTS "certificates_insert" ON public.certificates;

CREATE POLICY "certificates_insert" ON public.certificates
  FOR INSERT WITH CHECK (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = public.app_current_user_id()
        AND pm.project_id = certificates.project_id
    )
  );


-- ─── 5. dossiers ────────────────────────────────────────────

DROP POLICY IF EXISTS "dossiers_select" ON public.dossiers;

CREATE POLICY "dossiers_select" ON public.dossiers
  FOR SELECT USING (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = public.app_current_user_id()
        AND pm.project_id = dossiers.project_id
    )
  );

DROP POLICY IF EXISTS "dossiers_write" ON public.dossiers;

CREATE POLICY "dossiers_write" ON public.dossiers
  FOR ALL USING (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = public.app_current_user_id()
        AND pm.project_id = dossiers.project_id
    )
  );


-- ─── 6. dossier_items ───────────────────────────────────────

DROP POLICY IF EXISTS "dossier_items_write" ON public.dossier_items;

CREATE POLICY "dossier_items_write" ON public.dossier_items
  FOR ALL USING (
    public.app_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.dossiers d
      JOIN public.project_members pm ON pm.project_id = d.project_id
      WHERE d.id = dossier_items.dossier_id
        AND pm.user_id = public.app_current_user_id()
    )
  );


COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DROP VIEW IF EXISTS public.mv_project_stats;
-- GRANT ALL ON public._mv_project_stats_raw TO authenticated;
-- ALTER MATERIALIZED VIEW public._mv_project_stats_raw RENAME TO mv_project_stats;
-- CREATE OR REPLACE FUNCTION public.refresh_project_stats()
--   RETURNS void LANGUAGE plpgsql AS $$ BEGIN
--     REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_project_stats;
--   END; $$;
-- DROP POLICY IF EXISTS "fts_select"              ON public.form_template_sections;
-- DROP POLICY IF EXISTS "equip_templates_select"  ON public.equipment_templates;
-- DROP POLICY IF EXISTS "equip_templates_write"   ON public.equipment_templates;
-- DROP POLICY IF EXISTS "certificates_select"     ON public.certificates;
-- DROP POLICY IF EXISTS "certificates_insert"     ON public.certificates;
-- DROP POLICY IF EXISTS "dossiers_select"         ON public.dossiers;
-- DROP POLICY IF EXISTS "dossiers_write"          ON public.dossiers;
-- DROP POLICY IF EXISTS "dossier_items_write"     ON public.dossier_items;
-- COMMIT;
-- ============================================================
