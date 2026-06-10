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
-- Dependencias:
--   0007 → app_current_user_id(), app_user_role(), app_is_admin()
--   0009 → funciones con SECURITY DEFINER + caching de sesión
--   0018 → get_accessible_project_ids()
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════
-- BLOQUE 1: Catálogos globales
-- Lectura: cualquier usuario autenticado
-- Escritura: solo admin
-- ════════════════════════════════════════════════════════

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_read" ON roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "roles_write_admin" ON roles
  FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());


ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_read" ON permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "permissions_write_admin" ON permissions
  FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());


ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_read" ON role_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions_write_admin" ON role_permissions
  FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());


-- ════════════════════════════════════════════════════════
-- BLOQUE 2: companies
-- Dato sensible: NIT, contactos de empresas contratistas
-- ════════════════════════════════════════════════════════

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_admin" ON companies
  FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY "companies_own" ON companies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT company_id FROM public.users
      WHERE id = app_current_user_id()
    )
  );

CREATE POLICY "companies_project_peers" ON companies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT u2.company_id
      FROM public.users u2
      WHERE u2.id IN (
        SELECT pm2.user_id
        FROM project_members pm1
        JOIN project_members pm2 ON pm1.project_id = pm2.project_id
        WHERE pm1.user_id = app_current_user_id()
      )
      AND u2.company_id IS NOT NULL
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 3: user_permissions
-- Permisos individuales override — solo propio + admin
-- ════════════════════════════════════════════════════════

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_permissions_self" ON user_permissions
  FOR SELECT TO authenticated
  USING (user_id = app_current_user_id());

CREATE POLICY "user_permissions_admin" ON user_permissions
  FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());


-- ════════════════════════════════════════════════════════
-- BLOQUE 4: form_templates y form_versions
-- Datos por proyecto — acceso según membresía
-- ════════════════════════════════════════════════════════

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_templates_select" ON form_templates
  FOR SELECT TO authenticated
  USING (
    project_id IS NULL
    OR app_in_project(project_id)
  );

CREATE POLICY "form_templates_write" ON form_templates
  FOR ALL TO authenticated
  USING (
    (project_id IS NULL AND app_is_admin())
    OR (project_id IS NOT NULL
        AND app_user_role() IN ('admin', 'supervisor')
        AND app_in_project(project_id))
  )
  WITH CHECK (
    (project_id IS NULL AND app_is_admin())
    OR (project_id IS NOT NULL
        AND app_user_role() IN ('admin', 'supervisor')
        AND app_in_project(project_id))
  );


ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_versions_select" ON form_versions
  FOR SELECT TO authenticated
  USING (
    template_id IN (
      SELECT id FROM form_templates
      WHERE project_id IS NULL OR app_in_project(project_id)
    )
  );

CREATE POLICY "form_versions_write" ON form_versions
  FOR ALL TO authenticated
  USING (
    app_user_role() IN ('admin', 'supervisor')
    AND template_id IN (
      SELECT id FROM form_templates
      WHERE project_id IS NULL OR app_in_project(project_id)
    )
  )
  WITH CHECK (
    app_user_role() IN ('admin', 'supervisor')
    AND template_id IN (
      SELECT id FROM form_templates
      WHERE project_id IS NULL OR app_in_project(project_id)
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 5: form_fields
-- ════════════════════════════════════════════════════════

ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_fields_select" ON form_fields
  FOR SELECT TO authenticated
  USING (
    version_id IN (
      SELECT fv.id FROM form_versions fv
      JOIN form_templates ft ON ft.id = fv.template_id
      WHERE ft.project_id IS NULL OR app_in_project(ft.project_id)
    )
  );

CREATE POLICY "form_fields_write" ON form_fields
  FOR ALL TO authenticated
  USING  (app_user_role() IN ('admin', 'supervisor'))
  WITH CHECK (app_user_role() IN ('admin', 'supervisor'));


-- ════════════════════════════════════════════════════════
-- BLOQUE 6: checklist_items
-- Datos de campo vinculados a tests por proyecto
-- ════════════════════════════════════════════════════════

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items_select" ON checklist_items
  FOR SELECT TO authenticated
  USING (
    test_id IN (
      SELECT id FROM tests
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "checklist_items_write" ON checklist_items
  FOR ALL TO authenticated
  USING (
    app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND test_id IN (
      SELECT id FROM tests
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND test_id IN (
      SELECT id FROM tests
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 7: approvals
-- Flujo de aprobación multinivel — acceso estricto
-- ════════════════════════════════════════════════════════

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select" ON approvals
  FOR SELECT TO authenticated
  USING (
    test_id IN (
      SELECT id FROM tests
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "approvals_insert" ON approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    app_user_role() IN ('admin', 'supervisor')
    AND test_id IN (
      SELECT id FROM tests
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "approvals_update" ON approvals
  FOR UPDATE TO authenticated
  USING (
    (approver_id = app_current_user_id() OR app_is_admin())
    AND test_id IN (
      SELECT id FROM tests
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    (approver_id = app_current_user_id() OR app_is_admin())
    AND test_id IN (
      SELECT id FROM tests
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 8: document_versions
-- ════════════════════════════════════════════════════════

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_versions_select" ON document_versions
  FOR SELECT TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT get_accessible_project_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "document_versions_write" ON document_versions
  FOR ALL TO authenticated
  USING (
    app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT get_accessible_project_ids())
    )
  )
  WITH CHECK (
    app_user_role() IN ('admin', 'supervisor', 'tecnico')
    AND document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT get_accessible_project_ids())
    )
  );


-- ════════════════════════════════════════════════════════
-- BLOQUE 9: audit_log y access_log
-- Append-only vía triggers (service_role bypasea RLS).
-- Lectura directa solo para admin.
-- ════════════════════════════════════════════════════════

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_read" ON audit_log
  FOR SELECT TO authenticated
  USING (app_is_admin());


ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_log_admin_read" ON access_log
  FOR SELECT TO authenticated
  USING (app_is_admin());


-- ════════════════════════════════════════════════════════
-- BLOQUE 10: sync_log
-- ════════════════════════════════════════════════════════

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_log_own_read" ON sync_log
  FOR SELECT TO authenticated
  USING (user_id = app_current_user_id());

CREATE POLICY "sync_log_own_insert" ON sync_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = app_current_user_id());

CREATE POLICY "sync_log_admin" ON sync_log
  FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());


COMMIT;


-- ── ROLLBACK ──────────────────────────────────────────────────
-- BEGIN;
-- DROP POLICY IF EXISTS "roles_read"                   ON roles;
-- DROP POLICY IF EXISTS "roles_write_admin"            ON roles;
-- ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "permissions_read"             ON permissions;
-- DROP POLICY IF EXISTS "permissions_write_admin"      ON permissions;
-- ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "role_permissions_read"        ON role_permissions;
-- DROP POLICY IF EXISTS "role_permissions_write_admin" ON role_permissions;
-- ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "companies_admin"              ON companies;
-- DROP POLICY IF EXISTS "companies_own"                ON companies;
-- DROP POLICY IF EXISTS "companies_project_peers"      ON companies;
-- ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "user_permissions_self"        ON user_permissions;
-- DROP POLICY IF EXISTS "user_permissions_admin"       ON user_permissions;
-- ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "form_templates_select"        ON form_templates;
-- DROP POLICY IF EXISTS "form_templates_write"         ON form_templates;
-- ALTER TABLE form_templates DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "form_versions_select"         ON form_versions;
-- DROP POLICY IF EXISTS "form_versions_write"          ON form_versions;
-- ALTER TABLE form_versions DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "form_fields_select"           ON form_fields;
-- DROP POLICY IF EXISTS "form_fields_write"            ON form_fields;
-- ALTER TABLE form_fields DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "checklist_items_select"       ON checklist_items;
-- DROP POLICY IF EXISTS "checklist_items_write"        ON checklist_items;
-- ALTER TABLE checklist_items DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "approvals_select"             ON approvals;
-- DROP POLICY IF EXISTS "approvals_insert"             ON approvals;
-- DROP POLICY IF EXISTS "approvals_update"             ON approvals;
-- ALTER TABLE approvals DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "document_versions_select"     ON document_versions;
-- DROP POLICY IF EXISTS "document_versions_write"      ON document_versions;
-- ALTER TABLE document_versions DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "audit_log_admin_read"         ON audit_log;
-- ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "access_log_admin_read"        ON access_log;
-- ALTER TABLE access_log DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "sync_log_own_read"            ON sync_log;
-- DROP POLICY IF EXISTS "sync_log_own_insert"          ON sync_log;
-- DROP POLICY IF EXISTS "sync_log_admin"               ON sync_log;
-- ALTER TABLE sync_log DISABLE ROW LEVEL SECURITY;
-- COMMIT;
