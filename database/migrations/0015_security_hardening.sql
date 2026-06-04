-- ============================================================
-- 0015 — Sprint de Seguridad: RLS para systems, subsystems y evidences
-- Corrige:
--   E-05: systems y subsystems tienen RLS activo sin políticas (deny-all)
--   E-06: evidences no tiene política INSERT/UPDATE (captura bloqueada)
-- Añade:
--   Índice project_members(user_id) para evaluación de RLS eficiente
--   RLS básico para tabla users (lectura propia + admin total)
-- Dependencias:
--   0007 → app_current_user_id(), app_user_role(), app_is_admin(), app_in_project()
--   0009 → versión SECURITY DEFINER de las funciones RLS
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- E-05: POLÍTICAS PARA systems
-- area_id → areas.project_id para obtener el project_id
-- Sigue el patrón de areas: SELECT para miembros, ALL para admin/supervisor
-- ════════════════════════════════════════════════════════════

-- Función auxiliar para obtener project_id desde una area (inline subquery
-- en la policy es válido pero puede causar N+1; dejamos que el planner decida)

CREATE POLICY systems_select ON systems
  FOR SELECT TO authenticated
  USING (
    app_in_project(
      (SELECT a.project_id FROM areas a WHERE a.id = systems.area_id LIMIT 1)
    )
  );

CREATE POLICY systems_write ON systems
  FOR ALL TO authenticated
  USING (
    app_user_role() IN ('admin', 'supervisor')
    AND app_in_project(
      (SELECT a.project_id FROM areas a WHERE a.id = systems.area_id LIMIT 1)
    )
  )
  WITH CHECK (
    app_user_role() IN ('admin', 'supervisor')
    AND app_in_project(
      (SELECT a.project_id FROM areas a WHERE a.id = systems.area_id LIMIT 1)
    )
  );


-- ════════════════════════════════════════════════════════════
-- E-05: POLÍTICAS PARA subsystems
-- system_id → systems.area_id → areas.project_id
-- ════════════════════════════════════════════════════════════

CREATE POLICY subsystems_select ON subsystems
  FOR SELECT TO authenticated
  USING (
    app_in_project(
      (SELECT a.project_id
       FROM   systems sy
       JOIN   areas   a ON a.id = sy.area_id
       WHERE  sy.id = subsystems.system_id
       LIMIT  1)
    )
  );

CREATE POLICY subsystems_write ON subsystems
  FOR ALL TO authenticated
  USING (
    app_user_role() IN ('admin', 'supervisor')
    AND app_in_project(
      (SELECT a.project_id
       FROM   systems sy
       JOIN   areas   a ON a.id = sy.area_id
       WHERE  sy.id = subsystems.system_id
       LIMIT  1)
    )
  )
  WITH CHECK (
    app_user_role() IN ('admin', 'supervisor')
    AND app_in_project(
      (SELECT a.project_id
       FROM   systems sy
       JOIN   areas   a ON a.id = sy.area_id
       WHERE  sy.id = subsystems.system_id
       LIMIT  1)
    )
  );


-- ════════════════════════════════════════════════════════════
-- E-06: POLÍTICAS INSERT / UPDATE / DELETE PARA evidences
-- 0007 solo creó evidences_select.
-- EvidenceCapture.tsx hace INSERT con el cliente anónimo.
-- ════════════════════════════════════════════════════════════

CREATE POLICY evidences_insert ON evidences
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IS NULL OR app_in_project(project_id)
  );

CREATE POLICY evidences_update ON evidences
  FOR UPDATE TO authenticated
  USING  (project_id IS NULL OR app_in_project(project_id))
  WITH CHECK (project_id IS NULL OR app_in_project(project_id));

-- Solo admin puede eliminar evidencias físicamente
CREATE POLICY evidences_delete ON evidences
  FOR DELETE TO authenticated
  USING (app_is_admin());


-- ════════════════════════════════════════════════════════════
-- ÍNDICE: project_members(user_id)
-- app_in_project() y app_current_user_id() se evalúan en cada
-- política RLS. Sin este índice: full-scan de project_members
-- en cada acceso a cualquier tabla con RLS.
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_project_members_user
  ON project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_user
  ON project_members(project_id, user_id);


-- ════════════════════════════════════════════════════════════
-- RLS BÁSICO PARA users
-- Sin RLS, cualquier usuario autenticado puede leer todos los
-- perfiles (emails, firmas, roles). Se añaden políticas mínimas.
-- NOTA: app_current_user_id() tiene SECURITY DEFINER en 0009,
--       por lo que las queries internas de RLS no se ven afectadas.
-- ════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede ver su propio perfil
CREATE POLICY users_self ON users
  FOR SELECT TO authenticated
  USING (id = app_current_user_id());

-- Miembros de un mismo proyecto pueden verse entre sí
-- (necesario para mostrar "asignado a", "aprobado por", etc.)
CREATE POLICY users_project_peers ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm1
      JOIN   project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE  pm1.user_id = app_current_user_id()
        AND  pm2.user_id = users.id
    )
  );

-- Admin puede leer y gestionar todos los usuarios
CREATE POLICY users_admin ON users
  FOR ALL TO authenticated
  USING  (app_is_admin())
  WITH CHECK (app_is_admin());

-- UPDATE del propio perfil (cambio de contraseña, firma)
CREATE POLICY users_self_update ON users
  FOR UPDATE TO authenticated
  USING  (id = app_current_user_id())
  WITH CHECK (id = app_current_user_id());


COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────
-- BEGIN;
-- DROP POLICY IF EXISTS systems_select    ON systems;
-- DROP POLICY IF EXISTS systems_write     ON systems;
-- DROP POLICY IF EXISTS subsystems_select ON subsystems;
-- DROP POLICY IF EXISTS subsystems_write  ON subsystems;
-- DROP POLICY IF EXISTS evidences_insert  ON evidences;
-- DROP POLICY IF EXISTS evidences_update  ON evidences;
-- DROP POLICY IF EXISTS evidences_delete  ON evidences;
-- DROP POLICY IF EXISTS users_self        ON users;
-- DROP POLICY IF EXISTS users_project_peers ON users;
-- DROP POLICY IF EXISTS users_admin       ON users;
-- DROP POLICY IF EXISTS users_self_update ON users;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS idx_project_members_user;
-- DROP INDEX IF EXISTS idx_project_members_project_user;
-- COMMIT;
