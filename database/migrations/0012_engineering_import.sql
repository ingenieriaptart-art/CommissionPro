-- ============================================================
-- 0012 — Motor de Importación Documental de Ingeniería
-- Tablas: tag_pattern_rules, engineering_document_entities,
--         engineering_extracted_tags
-- Extiende: documents (campos de procesamiento)
-- ============================================================

BEGIN;

-- ── Extender tabla documents ─────────────────────────────────
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS processing_status   TEXT    NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS processing_error    TEXT,
  ADD COLUMN IF NOT EXISTS processing_metadata JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS file_size           BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type           TEXT,
  ADD COLUMN IF NOT EXISTS storage_path        TEXT;

-- ── Patrones de extracción configurables por proyecto ────────
-- project_id NULL → patrón global (aplica a todos los proyectos)
CREATE TABLE IF NOT EXISTS tag_pattern_rules (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID        REFERENCES projects(id) ON DELETE CASCADE,
  name                   TEXT        NOT NULL,
  regex_pattern          TEXT        NOT NULL,
  detected_type          TEXT        NOT NULL,
  description_hint       TEXT,
  priority               INT         NOT NULL DEFAULT 0,
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  auto_approve_threshold FLOAT,   -- reservado para futura auto-aprobación
  created_by             UUID        REFERENCES users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único para patrones globales (sin proyecto)
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_pattern_name
  ON tag_pattern_rules(name) WHERE project_id IS NULL;

-- Patrones globales de fallback para PTAR/PTAP
INSERT INTO tag_pattern_rules (name, regex_pattern, detected_type, priority, description_hint)
VALUES
  ('Motor / Bomba',           '\b(MOT|BBA|PMP|BOM)-?\d{2,4}[A-Z]?\b',              'motor',         10, 'Motor eléctrico o bomba'),
  ('Válvula de control',      '\b(FCV|PCV|LCV|TCV|XCV|HCV|SDV|ECV)-?\d{2,4}\b',   'valvula',        10, 'Válvula de control automático'),
  ('Válvula general',         '\b(VLV|VN|VR|VC|VB|VE|AGV|BGV)-?\d{2,4}[A-Z]?\b', 'valvula',         8, 'Válvula manual o de aislamiento'),
  ('Transmisor de campo',     '\b(TT|PT|FT|LT|AT|ST|IT|DT|QT)-\d{3,5}[A-Z]?\b',  'sensor',          9, 'Transmisor de proceso'),
  ('Indicador / Controlador', '\b(TIC|PIC|FIC|LIC|AIC|TI|PI|FI|LI)-\d{3,5}\b',   'instrumento',     8, 'Instrumento indicador o controlador'),
  ('Panel / Tablero eléctrico','\b(CCM|MCC|PLC|RTU|UPS|PCL|TAB|CUB|QE|QS)-?\d{2,4}\b','panel',     10, 'Tablero o centro de control de motores'),
  ('Transformador',           '\b(TRF|TR|XF|XFM|TXFM)-?\d{2,4}[A-Z]?\b',          'transformador',  10, 'Transformador de potencia o distribución'),
  ('Instrumento ISA genérico','\b[A-Z]{1,2}[A-Z]-\d{3,5}[A-Z]?\b',               'instrumento',     5, 'Instrumento según nomenclatura ISA'),
  ('Cable de control',        '\b(CC|CA|CP|CW)-?\d{3,6}\b',                         'cable',           7, 'Cable de control o señal'),
  ('Cable de potencia',       '\b(CP|PA|PB|PC|PD)-?\d{3,6}\b',                      'cable',           7, 'Cable de potencia')
ON CONFLICT (name) WHERE project_id IS NULL DO NOTHING;

-- ── Trazabilidad documental (una fila por ocurrencia) ────────
CREATE TABLE IF NOT EXISTS engineering_document_entities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  document_id UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT,
  source_text TEXT        NOT NULL,
  location_x  FLOAT,
  location_y  FLOAT,
  entity_type TEXT        NOT NULL DEFAULT 'TAG',
  raw_value   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Bandeja de revisión de ingeniería ────────────────────────
-- Estados: pending_review | approved | rejected | merged
CREATE TABLE IF NOT EXISTS engineering_extracted_tags (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  document_id           UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entity_id             UUID        REFERENCES engineering_document_entities(id),
  tag                   TEXT        NOT NULL,
  detected_type         TEXT,
  description           TEXT,
  -- Confianza granular (0.0 – 1.0)
  tag_confidence        FLOAT       NOT NULL DEFAULT 0,
  type_confidence       FLOAT       NOT NULL DEFAULT 0,
  description_confidence FLOAT      NOT NULL DEFAULT 0,
  extracted_data_json   JSONB       NOT NULL DEFAULT '{}',
  -- Flujo de revisión
  status                TEXT        NOT NULL DEFAULT 'pending_review',
  reviewed_by           UUID        REFERENCES users(id),
  reviewed_at           TIMESTAMPTZ,
  review_notes          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un TAG no se duplica dentro del mismo documento
  CONSTRAINT uq_tag_per_document UNIQUE (project_id, document_id, tag)
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tag_patterns_project
  ON tag_pattern_rules(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_doc_entities_document
  ON engineering_document_entities(document_id);

CREATE INDEX IF NOT EXISTS idx_doc_entities_project
  ON engineering_document_entities(project_id);

CREATE INDEX IF NOT EXISTS idx_eng_tags_project
  ON engineering_extracted_tags(project_id);

CREATE INDEX IF NOT EXISTS idx_eng_tags_document
  ON engineering_extracted_tags(document_id);

CREATE INDEX IF NOT EXISTS idx_eng_tags_status
  ON engineering_extracted_tags(project_id, status);

CREATE INDEX IF NOT EXISTS idx_documents_processing
  ON documents(project_id, processing_status);

-- ── Trigger updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_eng_tags_updated_at   ON engineering_extracted_tags;
DROP TRIGGER IF EXISTS trg_tag_patterns_updated_at ON tag_pattern_rules;

CREATE TRIGGER trg_eng_tags_updated_at
  BEFORE UPDATE ON engineering_extracted_tags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tag_patterns_updated_at
  BEFORE UPDATE ON tag_pattern_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE tag_pattern_rules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_document_entities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_extracted_tags      ENABLE ROW LEVEL SECURITY;

-- tag_pattern_rules: globales visibles a todos; las de proyecto, solo a miembros
CREATE POLICY rls_tag_patterns_select ON tag_pattern_rules
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR auth.uid() IN (
    SELECT u.auth_user_id FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    WHERE pm.project_id = tag_pattern_rules.project_id
  ));

CREATE POLICY rls_tag_patterns_modify ON tag_pattern_rules
  FOR ALL TO authenticated
  USING (project_id IS NOT NULL AND auth.uid() IN (
    SELECT u.auth_user_id FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    WHERE pm.project_id = tag_pattern_rules.project_id
  ));

-- engineering_document_entities: miembros del proyecto
CREATE POLICY rls_doc_entities_all ON engineering_document_entities
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT u.auth_user_id FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    WHERE pm.project_id = engineering_document_entities.project_id
  ));

-- engineering_extracted_tags: miembros del proyecto
CREATE POLICY rls_eng_tags_all ON engineering_extracted_tags
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT u.auth_user_id FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    WHERE pm.project_id = engineering_extracted_tags.project_id
  ));

COMMIT;

-- ── ROLLBACK ─────────────────────────────────────────────────
-- ALTER TABLE documents
--   DROP COLUMN IF EXISTS processing_status,
--   DROP COLUMN IF EXISTS processing_error,
--   DROP COLUMN IF EXISTS processing_metadata,
--   DROP COLUMN IF EXISTS file_size,
--   DROP COLUMN IF EXISTS mime_type,
--   DROP COLUMN IF EXISTS storage_path;
-- DROP TABLE IF EXISTS engineering_extracted_tags;
-- DROP TABLE IF EXISTS engineering_document_entities;
-- DROP TABLE IF EXISTS tag_pattern_rules;
