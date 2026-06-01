-- ============================================================
-- 0013 — Sprint de Corrección: Endurecimiento del Módulo
--        de Ingeniería Digital
-- Dependencias:
--   0006 → fn_audit(), set_updated_at() (no se redefinen)
--   0007 → policies base de documents_select (no se toca)
--   0009 → app_in_project(), app_is_admin() con SECURITY DEFINER
--           y caching de sesión (versión definitiva)
--   0012 → tablas y políticas que se corrigen aquí
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- FASE A · SEGURIDAD Y RLS
-- ════════════════════════════════════════════════════════════

-- ── A3-A4: Eliminar políticas de 0012 (subqueries inline) ───
-- Las políticas de 0012 duplican la lógica de app_in_project()
-- con subqueries no cacheadas. Se reemplazan por el helper 0009.

DROP POLICY IF EXISTS rls_tag_patterns_select ON tag_pattern_rules;
DROP POLICY IF EXISTS rls_tag_patterns_modify  ON tag_pattern_rules;
DROP POLICY IF EXISTS rls_doc_entities_all     ON engineering_document_entities;
DROP POLICY IF EXISTS rls_eng_tags_all         ON engineering_extracted_tags;

-- ── tag_pattern_rules: SELECT / INSERT / UPDATE / DELETE ─────
-- Globales (project_id IS NULL): visibles a todos, modificables solo por admin
-- De proyecto: visibles y modificables por miembros del proyecto

CREATE POLICY rls_patterns_select ON tag_pattern_rules
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR app_in_project(project_id));

CREATE POLICY rls_patterns_insert ON tag_pattern_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    (project_id IS NULL  AND app_is_admin())
    OR
    (project_id IS NOT NULL AND app_in_project(project_id))
  );

CREATE POLICY rls_patterns_update ON tag_pattern_rules
  FOR UPDATE TO authenticated
  USING (
    (project_id IS NULL  AND app_is_admin())
    OR
    (project_id IS NOT NULL AND app_in_project(project_id))
  )
  WITH CHECK (
    (project_id IS NULL  AND app_is_admin())
    OR
    (project_id IS NOT NULL AND app_in_project(project_id))
  );

-- Solo admin puede eliminar patrones (globales o de proyecto)
CREATE POLICY rls_patterns_delete ON tag_pattern_rules
  FOR DELETE TO authenticated
  USING (app_is_admin());

-- ── engineering_document_entities: SELECT / INSERT / DELETE ──
-- Creadas exclusivamente por el API route (service role), pero
-- se necesita SELECT para que los hooks del cliente puedan leerlas.

CREATE POLICY rls_entities_select ON engineering_document_entities
  FOR SELECT TO authenticated
  USING (app_in_project(project_id));

CREATE POLICY rls_entities_insert ON engineering_document_entities
  FOR INSERT TO authenticated
  WITH CHECK (app_in_project(project_id));

-- DELETE físico solo para admin (el API route usa service role y bypasa RLS)
CREATE POLICY rls_entities_delete ON engineering_document_entities
  FOR DELETE TO authenticated
  USING (app_is_admin());

-- ── engineering_extracted_tags: USING y WITH CHECK separados ─
-- USING controla qué filas el usuario puede ver/modificar
-- WITH CHECK controla qué filas puede escribir

CREATE POLICY rls_tags_select ON engineering_extracted_tags
  FOR SELECT TO authenticated
  USING (app_in_project(project_id));

CREATE POLICY rls_tags_insert ON engineering_extracted_tags
  FOR INSERT TO authenticated
  WITH CHECK (app_in_project(project_id));

CREATE POLICY rls_tags_update ON engineering_extracted_tags
  FOR UPDATE TO authenticated
  USING (app_in_project(project_id))
  WITH CHECK (app_in_project(project_id));

-- DELETE solo para admin (status changes son UPDATE, no DELETE)
CREATE POLICY rls_tags_delete ON engineering_extracted_tags
  FOR DELETE TO authenticated
  USING (app_is_admin());

-- ── A5: Políticas INSERT y UPDATE para tabla documents ───────
-- 0007 solo creó documents_select. El hook useUploadDocument
-- requiere INSERT; useDeleteDocument (soft delete) requiere UPDATE.
-- El service role del API route bypasa RLS para processing_status.

CREATE POLICY documents_insert ON documents
  FOR INSERT TO authenticated
  WITH CHECK (app_in_project(project_id));

CREATE POLICY documents_update ON documents
  FOR UPDATE TO authenticated
  USING  (app_in_project(project_id))
  WITH CHECK (app_in_project(project_id));


-- ════════════════════════════════════════════════════════════
-- FASE B · INTEGRIDAD DE DATOS
-- ════════════════════════════════════════════════════════════

-- ── B1: Corregir FKs sin ON DELETE SET NULL ──────────────────
-- PostgreSQL nombra FKs automáticamente como {tabla}_{columna}_fkey.
-- DROP + ADD para cambiar el comportamiento ON DELETE.

-- engineering_extracted_tags.reviewed_by → users(id)
ALTER TABLE engineering_extracted_tags
  DROP CONSTRAINT IF EXISTS engineering_extracted_tags_reviewed_by_fkey;
ALTER TABLE engineering_extracted_tags
  ADD  CONSTRAINT engineering_extracted_tags_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- engineering_extracted_tags.entity_id → engineering_document_entities(id)
ALTER TABLE engineering_extracted_tags
  DROP CONSTRAINT IF EXISTS engineering_extracted_tags_entity_id_fkey;
ALTER TABLE engineering_extracted_tags
  ADD  CONSTRAINT engineering_extracted_tags_entity_id_fkey
    FOREIGN KEY (entity_id) REFERENCES engineering_document_entities(id)
    ON DELETE SET NULL;

-- tag_pattern_rules.created_by → users(id)
ALTER TABLE tag_pattern_rules
  DROP CONSTRAINT IF EXISTS tag_pattern_rules_created_by_fkey;
ALTER TABLE tag_pattern_rules
  ADD  CONSTRAINT tag_pattern_rules_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ── B2: Normalizar TAGs existentes (TRIM + UPPERCASE) ────────
-- Los TAGs insertados antes de este sprint pueden tener casing mixto.
-- El UNIQUE constraint es case-sensitive; esta migración garantiza
-- consistencia con el nuevo comportamiento del extractor.

UPDATE engineering_extracted_tags
  SET tag = TRIM(UPPER(tag))
  WHERE tag <> TRIM(UPPER(tag));

UPDATE engineering_document_entities
  SET raw_value = TRIM(raw_value)
  WHERE raw_value <> TRIM(raw_value);


-- ════════════════════════════════════════════════════════════
-- FASE D · RENDIMIENTO
-- ════════════════════════════════════════════════════════════

-- ── D3: Índices adicionales ───────────────────────────────────

-- Filtro por tipo detectado (TagReviewTable en proyectos grandes)
CREATE INDEX IF NOT EXISTS idx_eng_tags_type
  ON engineering_extracted_tags(project_id, detected_type);

-- Búsqueda de un TAG específico entre documentos del proyecto
CREATE INDEX IF NOT EXISTS idx_eng_tags_tag
  ON engineering_extracted_tags(project_id, tag);

-- Reportes de auditoría de revisiones por revisor y fecha
CREATE INDEX IF NOT EXISTS idx_eng_tags_reviewed
  ON engineering_extracted_tags(reviewed_by, reviewed_at)
  WHERE reviewed_by IS NOT NULL;

-- Búsqueda de ocurrencias exactas de un valor en entidades
CREATE INDEX IF NOT EXISTS idx_doc_entities_raw
  ON engineering_document_entities(document_id, raw_value);

-- Query del API route: patrones activos ordenados por prioridad
CREATE INDEX IF NOT EXISTS idx_patterns_active_priority
  ON tag_pattern_rules(is_active, priority DESC)
  WHERE is_active = TRUE;

-- Índice parcial para detector de documentos atascados
CREATE INDEX IF NOT EXISTS idx_docs_stuck
  ON documents(project_id, processing_status)
  WHERE processing_status = 'processing';

-- ── Fase E base: Triggers de auditoría para nuevas tablas ────
-- Reutiliza fn_audit() de 0006 sin modificarla.
-- Los cambios de status (approve/reject/merge) quedan en audit_log.

DROP TRIGGER IF EXISTS trg_audit_engineering_extracted_tags
  ON engineering_extracted_tags;
CREATE TRIGGER trg_audit_engineering_extracted_tags
  AFTER INSERT OR UPDATE OR DELETE ON engineering_extracted_tags
  FOR EACH ROW EXECUTE FUNCTION fn_audit();

DROP TRIGGER IF EXISTS trg_audit_engineering_document_entities
  ON engineering_document_entities;
CREATE TRIGGER trg_audit_engineering_document_entities
  AFTER INSERT OR UPDATE OR DELETE ON engineering_document_entities
  FOR EACH ROW EXECUTE FUNCTION fn_audit();

DROP TRIGGER IF EXISTS trg_audit_tag_pattern_rules ON tag_pattern_rules;
CREATE TRIGGER trg_audit_tag_pattern_rules
  AFTER INSERT OR UPDATE OR DELETE ON tag_pattern_rules
  FOR EACH ROW EXECUTE FUNCTION fn_audit();

COMMIT;

-- ── ROLLBACK ─────────────────────────────────────────────────
-- BEGIN;
-- DROP POLICY IF EXISTS rls_patterns_select ON tag_pattern_rules;
-- DROP POLICY IF EXISTS rls_patterns_insert ON tag_pattern_rules;
-- DROP POLICY IF EXISTS rls_patterns_update ON tag_pattern_rules;
-- DROP POLICY IF EXISTS rls_patterns_delete ON tag_pattern_rules;
-- DROP POLICY IF EXISTS rls_entities_select ON engineering_document_entities;
-- DROP POLICY IF EXISTS rls_entities_insert ON engineering_document_entities;
-- DROP POLICY IF EXISTS rls_entities_delete ON engineering_document_entities;
-- DROP POLICY IF EXISTS rls_tags_select  ON engineering_extracted_tags;
-- DROP POLICY IF EXISTS rls_tags_insert  ON engineering_extracted_tags;
-- DROP POLICY IF EXISTS rls_tags_update  ON engineering_extracted_tags;
-- DROP POLICY IF EXISTS rls_tags_delete  ON engineering_extracted_tags;
-- DROP POLICY IF EXISTS documents_insert ON documents;
-- DROP POLICY IF EXISTS documents_update ON documents;
-- -- Restaurar políticas originales de 0012 si es necesario
-- COMMIT;
