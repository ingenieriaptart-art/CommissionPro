-- ============================================================
-- APLICAR EN SUPABASE SQL EDITOR (proyecto nkjunkolsmjledzwuxgn)
-- Pega TODO este archivo y ejecuta. Es idempotente.
-- ============================================================

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

-- ─────────────────────────────────────────────────────────────
-- FIX latente: get_accessible_project_ids() comparaba
-- project_members.user_id = auth.uid(), pero user_id referencia users.id
-- (≠ auth_user_id). Para usuarios NO admin esto devolvía vacío y los dejaba
-- sin acceso a su propia membresía ni a datos hijos (checklist/approvals/etc.).
-- Se corrige usando app_current_user_id() (auth.uid() -> users.id) y se añade
-- que el admin ve todos los proyectos.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_accessible_project_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT pm.project_id
  FROM public.project_members pm
  WHERE pm.user_id = public.app_current_user_id()
  UNION
  SELECT p.id FROM public.projects p WHERE public.app_is_admin();
$$;

COMMIT;


-- ============================================================
-- 0040 — RLS por módulo (escrituras). Las lecturas siguen acotadas por
-- pertenencia al proyecto (no se tocan los SELECT). Solo se reemplazan las
-- políticas de escritura para gatearlas por el nivel de acceso del módulo:
--   INSERT/UPDATE -> app_can_write (edit|full)
--   DELETE        -> app_can_full  (full)
--   Aprobar test  -> app_can_full('tests')  (trigger)
-- Depende de 0039 (app_module_access / app_can_write / app_can_full).
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- EQUIPMENT  (módulo 'equipment' para edición manual u 'engineering' para import)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS equipment_insert ON public.equipment;
DROP POLICY IF EXISTS equipment_update ON public.equipment;
DROP POLICY IF EXISTS equipment_delete ON public.equipment;

CREATE POLICY equipment_insert ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK (
    app_in_project(project_id)
    AND (app_can_write(project_id, 'equipment') OR app_can_write(project_id, 'engineering'))
  );

CREATE POLICY equipment_update ON public.equipment
  FOR UPDATE TO authenticated
  USING (
    app_in_project(project_id)
    AND (app_can_write(project_id, 'equipment') OR app_can_write(project_id, 'engineering'))
  )
  WITH CHECK (
    app_in_project(project_id)
    AND (app_can_write(project_id, 'equipment') OR app_can_write(project_id, 'engineering'))
  );

CREATE POLICY equipment_delete ON public.equipment
  FOR DELETE TO authenticated
  USING (
    app_can_full(project_id, 'equipment') OR app_can_full(project_id, 'engineering')
  );

-- ─────────────────────────────────────────────────────────────
-- TESTS  (módulo 'tests')
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tests_insert ON public.tests;
DROP POLICY IF EXISTS tests_update ON public.tests;
DROP POLICY IF EXISTS tests_delete ON public.tests;

CREATE POLICY tests_insert ON public.tests
  FOR INSERT TO authenticated
  WITH CHECK (app_in_project(project_id) AND app_can_write(project_id, 'tests'));

CREATE POLICY tests_update ON public.tests
  FOR UPDATE TO authenticated
  USING  (app_in_project(project_id) AND app_can_write(project_id, 'tests'))
  WITH CHECK (app_in_project(project_id) AND app_can_write(project_id, 'tests'));

CREATE POLICY tests_delete ON public.tests
  FOR DELETE TO authenticated
  USING (app_can_full(project_id, 'tests'));

-- Aprobar/rechazar/cerrar un test requiere control total en 'tests'.
CREATE OR REPLACE FUNCTION public.guard_test_approval()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('aprob_supervisor','aprob_qaqc','aprob_cliente','cerrado','rechazado')
     AND NOT public.app_can_full(NEW.project_id, 'tests') THEN
    RAISE EXCEPTION 'Se requiere control total en Pruebas para aprobar/rechazar/cerrar (estado %).', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_test_approval ON public.tests;
CREATE TRIGGER trg_guard_test_approval
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.guard_test_approval();

-- ─────────────────────────────────────────────────────────────
-- CHECKLIST_ITEMS  (módulo 'tests', vía test padre)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "checklist_items_write" ON public.checklist_items;

CREATE POLICY checklist_items_write ON public.checklist_items
  FOR ALL TO authenticated
  USING (
    app_can_write(
      (SELECT t.project_id FROM public.tests t WHERE t.id = checklist_items.test_id),
      'tests')
  )
  WITH CHECK (
    app_can_write(
      (SELECT t.project_id FROM public.tests t WHERE t.id = checklist_items.test_id),
      'tests')
  );

-- ─────────────────────────────────────────────────────────────
-- EVIDENCES  (módulo 'tests'; project_id directo, nullable)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS evidences_insert ON public.evidences;
DROP POLICY IF EXISTS evidences_update ON public.evidences;
DROP POLICY IF EXISTS evidences_delete ON public.evidences;

CREATE POLICY evidences_insert ON public.evidences
  FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR app_can_write(project_id, 'tests'));

CREATE POLICY evidences_update ON public.evidences
  FOR UPDATE TO authenticated
  USING  (project_id IS NULL OR app_can_write(project_id, 'tests'))
  WITH CHECK (project_id IS NULL OR app_can_write(project_id, 'tests'));

CREATE POLICY evidences_delete ON public.evidences
  FOR DELETE TO authenticated
  USING (project_id IS NOT NULL AND app_can_full(project_id, 'tests'));

-- ─────────────────────────────────────────────────────────────
-- SIGNATURES  (módulo 'tests', vía test padre; firma propia)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS signatures_insert ON public.signatures;

CREATE POLICY signatures_insert ON public.signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND app_can_write(
      (SELECT t.project_id FROM public.tests t WHERE t.id = signatures.test_id),
      'tests')
  );

-- ─────────────────────────────────────────────────────────────
-- APPROVALS  (módulo 'tests'; aprobar = full)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approvals_insert" ON public.approvals;
DROP POLICY IF EXISTS "approvals_update" ON public.approvals;

CREATE POLICY approvals_insert ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    app_can_full(
      (SELECT t.project_id FROM public.tests t WHERE t.id = approvals.test_id),
      'tests')
  );

CREATE POLICY approvals_update ON public.approvals
  FOR UPDATE TO authenticated
  USING (
    (approver_id = public.app_current_user_id() OR public.app_is_admin())
    AND app_can_full(
      (SELECT t.project_id FROM public.tests t WHERE t.id = approvals.test_id),
      'tests')
  )
  WITH CHECK (
    (approver_id = public.app_current_user_id() OR public.app_is_admin())
    AND app_can_full(
      (SELECT t.project_id FROM public.tests t WHERE t.id = approvals.test_id),
      'tests')
  );

-- ─────────────────────────────────────────────────────────────
-- PUNCH_ITEMS  (módulo 'punch')
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS punch_write  ON public.punch_items;
DROP POLICY IF EXISTS punch_insert ON public.punch_items;
DROP POLICY IF EXISTS punch_update ON public.punch_items;
DROP POLICY IF EXISTS punch_delete ON public.punch_items;

CREATE POLICY punch_insert ON public.punch_items
  FOR INSERT TO authenticated
  WITH CHECK (app_in_project(project_id) AND app_can_write(project_id, 'punch'));

CREATE POLICY punch_update ON public.punch_items
  FOR UPDATE TO authenticated
  USING  (app_in_project(project_id) AND app_can_write(project_id, 'punch'))
  WITH CHECK (app_in_project(project_id) AND app_can_write(project_id, 'punch'));

CREATE POLICY punch_delete ON public.punch_items
  FOR DELETE TO authenticated
  USING (app_can_full(project_id, 'punch'));

-- ─────────────────────────────────────────────────────────────
-- DOCUMENTS  (módulo 'documents')
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS documents_insert ON public.documents;
DROP POLICY IF EXISTS documents_update ON public.documents;
DROP POLICY IF EXISTS documents_delete ON public.documents;

CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (app_in_project(project_id) AND app_can_write(project_id, 'documents'));

CREATE POLICY documents_update ON public.documents
  FOR UPDATE TO authenticated
  USING  (app_in_project(project_id) AND app_can_write(project_id, 'documents'))
  WITH CHECK (app_in_project(project_id) AND app_can_write(project_id, 'documents'));

CREATE POLICY documents_delete ON public.documents
  FOR DELETE TO authenticated
  USING (app_can_full(project_id, 'documents'));

-- ─────────────────────────────────────────────────────────────
-- DOCUMENT_VERSIONS  (módulo 'documents', vía documento padre)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "document_versions_write" ON public.document_versions;

CREATE POLICY document_versions_write ON public.document_versions
  FOR ALL TO authenticated
  USING (
    app_can_write(
      (SELECT d.project_id FROM public.documents d WHERE d.id = document_versions.document_id),
      'documents')
  )
  WITH CHECK (
    app_can_write(
      (SELECT d.project_id FROM public.documents d WHERE d.id = document_versions.document_id),
      'documents')
  );

-- ─────────────────────────────────────────────────────────────
-- PLANT_MAP_LAYOUTS  (módulo 'plant-map')
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "project members can manage plant map" ON public.plant_map_layouts;
DROP POLICY IF EXISTS plant_map_write ON public.plant_map_layouts;

CREATE POLICY plant_map_write ON public.plant_map_layouts
  FOR ALL TO authenticated
  USING (app_in_project(project_id) AND app_can_write(project_id, 'plant-map'))
  WITH CHECK (app_in_project(project_id) AND app_can_write(project_id, 'plant-map'));

COMMIT;
