-- ============================================================
-- 0022 — RLS: 14 tablas sin Row-Level Security
--
-- Tablas corregidas:
--   roles, permissions, role_permissions  → catálogos globales
--   companies                             → NIT y contactos
--   user_permissions                      → permisos individuales
--   form_templates, form_versions         → plantillas por proyecto
--   form_fields                           → campos de formularios
--   checklist_items                       → datos de campo por test
--   approvals                             → flujo de aprobación multinivel
--   document_versions                     → historial de documentos
--   audit_log, access_log                 → bitácoras sensibles
--   sync_log                              → metadatos de dispositivos
--
-- Nota: todas las referencias usan public.<tabla> explícitamente.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════
-- BLOQUE 1: Catálogos globales
-- ════════════════════════════════════════════════════════

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_read" ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "roles_write_admin" ON public.roles
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_read" ON public.permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "permissions_write_admin" ON public.permissions
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_read" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions_write_admin" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ════════════════════════════════════════════════════════
-- BLOQUE 2: companies
-- ════════════════════════════════════════════════════════

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_admin" ON public.companies
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());

CREATE POLICY "companies_own" ON public.companies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT company_id FROM public.users
      WHERE id = public.app_current_user_id()
    )
  );

CREATE POLICY "companies_project_peers" ON public.companies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT u2.company_id
      FROM public.users u2
      WHERE u2.id IN (
        SELECT pm2.user_id
        FROM public.project_members pm1
        JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
        WHERE pm1.user_id = public.app_current_user_id()
      )
      AND u2.company_id IS NOT NULL
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 3: user_permissions
-- ════════════════════════════════════════════════════════

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_permissions_self" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = public.app_current_user_id());

CREATE POLICY "user_permissions_admin" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ════════════════════════════════════════════════════════
-- BLOQUE 4: form_templates y form_versions
-- ════════════════════════════════════════════════════════

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_templates_select" ON public.form_templates
  FOR SELECT TO authenticated
  USING (
    project_id IS NULL
    OR public.app_in_project(project_id)
  );

CREATE POLICY "form_templates_write" ON public.form_templates
  FOR ALL TO authenticated
  USING (
    (project_id IS NULL AND public.app_is_admin())
    OR (project_id IS NOT NULL
        AND public.app_user_role() IN ('admin', 'supervisor')
        AND public.app_in_project(project_id))
  )
  WITH CHECK (
    (project_id IS NULL AND public.app_is_admin())
    OR (project_id IS NOT NULL
        AND public.app_user_role() IN ('admin', 'supervisor')
        AND public.app_in_project(project_id))
  );


ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_versions_select" ON public.form_versions
  FOR SELECT TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.form_templates
      WHERE project_id IS NULL OR public.app_in_project(project_id)
    )
  );

CREATE POLICY "form_versions_write" ON public.form_versions
  FOR ALL TO authenticated
  USING (
    public.app_user_role() IN ('admin', 'supervisor')
    AND template_id IN (
      SELECT id FROM public.form_templates
      WHERE project_id IS NULL OR public.app_in_project(project_id)
    )
  )
  WITH CHECK (
    public.app_user_role() IN ('admin', 'supervisor')
    AND template_id IN (
      SELECT id FROM public.form_templates
      WHERE project_id IS NULL OR public.app_in_project(project_id)
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 5: form_fields
-- ════════════════════════════════════════════════════════

ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_fields_select" ON public.form_fields
  FOR SELECT TO authenticated
  USING (
    version_id IN (
      SELECT fv.id FROM public.form_versions fv
      JOIN public.form_templates ft ON ft.id = fv.template_id
      WHERE ft.project_id IS NULL OR public.app_in_project(ft.project_id)
    )
  );

CREATE POLICY "form_fields_write" ON public.form_fields
  FOR ALL TO authenticated
  USING  (public.app_user_role() IN ('admin', 'supervisor'))
  WITH CHECK (public.app_user_role() IN ('admin', 'supervisor'));


-- ════════════════════════════════════════════════════════
-- BLOQUE 6: checklist_items
-- ════════════════════════════════════════════════════════

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items_select" ON public.checklist_items
  FOR SELECT TO authenticated
  USING (
    test_id IN (
      SELECT id FROM public.tests
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "checklist_items_write" ON public.checklist_items
  FOR ALL TO authenticated
  USING (
    public.app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND test_id IN (
      SELECT id FROM public.tests
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    public.app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND test_id IN (
      SELECT id FROM public.tests
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 7: approvals
-- ════════════════════════════════════════════════════════

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select" ON public.approvals
  FOR SELECT TO authenticated
  USING (
    test_id IN (
      SELECT id FROM public.tests
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "approvals_insert" ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    public.app_user_role() IN ('admin', 'supervisor')
    AND test_id IN (
      SELECT id FROM public.tests
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "approvals_update" ON public.approvals
  FOR UPDATE TO authenticated
  USING (
    (approver_id = public.app_current_user_id() OR public.app_is_admin())
    AND test_id IN (
      SELECT id FROM public.tests
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    (approver_id = public.app_current_user_id() OR public.app_is_admin())
    AND test_id IN (
      SELECT id FROM public.tests
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 8: document_versions
-- ════════════════════════════════════════════════════════

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_versions_select" ON public.document_versions
  FOR SELECT TO authenticated
  USING (
    document_id IN (
      SELECT id FROM public.documents
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "document_versions_write" ON public.document_versions
  FOR ALL TO authenticated
  USING (
    public.app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND document_id IN (
      SELECT id FROM public.documents
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
    )
  )
  WITH CHECK (
    public.app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND document_id IN (
      SELECT id FROM public.documents
      WHERE project_id IN (SELECT public.get_accessible_project_ids())
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 9: audit_log y access_log
-- ════════════════════════════════════════════════════════

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.app_is_admin());


ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_log_admin_read" ON public.access_log
  FOR SELECT TO authenticated
  USING (public.app_is_admin());


-- ════════════════════════════════════════════════════════
-- BLOQUE 10: sync_log
-- ════════════════════════════════════════════════════════

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_log_own_read" ON public.sync_log
  FOR SELECT TO authenticated
  USING (user_id = public.app_current_user_id());

CREATE POLICY "sync_log_own_insert" ON public.sync_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.app_current_user_id());

CREATE POLICY "sync_log_admin" ON public.sync_log
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


COMMIT;


-- ── ROLLBACK ──────────────────────────────────────────────────
-- BEGIN;
-- DROP POLICY IF EXISTS "roles_read"                   ON public.roles;
-- DROP POLICY IF EXISTS "roles_write_admin"            ON public.roles;
-- ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "permissions_read"             ON public.permissions;
-- DROP POLICY IF EXISTS "permissions_write_admin"      ON public.permissions;
-- ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "role_permissions_read"        ON public.role_permissions;
-- DROP POLICY IF EXISTS "role_permissions_write_admin" ON public.role_permissions;
-- ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "companies_admin"              ON public.companies;
-- DROP POLICY IF EXISTS "companies_own"                ON public.companies;
-- DROP POLICY IF EXISTS "companies_project_peers"      ON public.companies;
-- ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "user_permissions_self"        ON public.user_permissions;
-- DROP POLICY IF EXISTS "user_permissions_admin"       ON public.user_permissions;
-- ALTER TABLE public.user_permissions DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "form_templates_select"        ON public.form_templates;
-- DROP POLICY IF EXISTS "form_templates_write"         ON public.form_templates;
-- ALTER TABLE public.form_templates DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "form_versions_select"         ON public.form_versions;
-- DROP POLICY IF EXISTS "form_versions_write"          ON public.form_versions;
-- ALTER TABLE public.form_versions DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "form_fields_select"           ON public.form_fields;
-- DROP POLICY IF EXISTS "form_fields_write"            ON public.form_fields;
-- ALTER TABLE public.form_fields DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "checklist_items_select"       ON public.checklist_items;
-- DROP POLICY IF EXISTS "checklist_items_write"        ON public.checklist_items;
-- ALTER TABLE public.checklist_items DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "approvals_select"             ON public.approvals;
-- DROP POLICY IF EXISTS "approvals_insert"             ON public.approvals;
-- DROP POLICY IF EXISTS "approvals_update"             ON public.approvals;
-- ALTER TABLE public.approvals DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "document_versions_select"     ON public.document_versions;
-- DROP POLICY IF EXISTS "document_versions_write"      ON public.document_versions;
-- ALTER TABLE public.document_versions DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "audit_log_admin_read"         ON public.audit_log;
-- ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "access_log_admin_read"        ON public.access_log;
-- ALTER TABLE public.access_log DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "sync_log_own_read"            ON public.sync_log;
-- DROP POLICY IF EXISTS "sync_log_own_insert"          ON public.sync_log;
-- DROP POLICY IF EXISTS "sync_log_admin"               ON public.sync_log;
-- ALTER TABLE public.sync_log DISABLE ROW LEVEL SECURITY;
-- COMMIT;
