-- ============================================================
-- 0021 — Sistema de Plantillas de Precomisionamiento
--
-- Construye sobre el esquema existente (0001-0020):
--   form_templates, form_versions, form_fields, tests,
--   evidences, signatures, approvals, punch_items, documents
--
-- Agrega:
--   equipment_types          — catálogo de tipos de equipo
--   template_sections        — secciones reutilizables (grafo: comunidad 0, 71 nodos)
--   section_fields           — campos dentro de cada sección
--   form_template_sections   — N:M form_templates ↔ template_sections
--   equipment_type_templates — N:M equipment_types ↔ form_templates
--   equipment_templates      — N:M equipment ↔ form_templates (asignación directa)
--   certificates             — certificados emitidos al completar tests
--   dossiers                 — paquetes de entrega por área/sistema/subsistema
--   dossier_items            — contenidos de cada dossier
--
-- Compatibilidad multi-proyecto:
--   Todas las tablas catálogo (equipment_types, template_sections)
--   son globales (project_id NULL = disponible para todos los proyectos).
--   Las asignaciones sí son por proyecto vía form_templates.project_id.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TIPOS DE EQUIPO
-- Catálogo maestro reutilizable entre proyectos.
-- Hallazgo grafo: 6 motores eléctricos tienen estructura idéntica
-- → un solo tipo MOTOR_ELECTRICO con una plantilla.
-- ============================================================

CREATE TABLE equipment_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,  -- BOMBA_CENTRIFUGA, MOTOR_ELECTRICO, etc.
  name        TEXT        NOT NULL,
  discipline  TEXT        NOT NULL,         -- Mecánica, Eléctrica, I&C, Proceso, Civil
  description TEXT,
  icon        TEXT,                          -- nombre de ícono Lucide para la UI
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE equipment_types IS
  'Catálogo global de tipos de equipo. project_id no existe aquí: los tipos son compartidos entre proyectos (BOMBA_CENTRIFUGA aplica a PTAR Bojacá y a PTAR Zipaquirá por igual).';

-- Vincular equipment existente a su tipo
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS equipment_type_id UUID REFERENCES equipment_types(id) ON DELETE SET NULL;

CREATE INDEX idx_equipment_type ON equipment(project_id, equipment_type_id)
  WHERE deleted_at IS NULL;

-- Seed: tipos detectados por el grafo
INSERT INTO equipment_types (code, name, discipline, icon, sort_order) VALUES
  ('BOMBA_CENTRIFUGA',         'Bomba Centrífuga',               'Mecánica',   'pump',         10),
  ('MOTOR_ELECTRICO',          'Motor Eléctrico',                'Eléctrica',  'zap',          20),
  ('COMPRESOR_BIOGAS',         'Compresor de Biogás',            'Mecánica',   'wind',         30),
  ('SOPLADOR',                 'Soplador',                       'Mecánica',   'wind',         40),
  ('FILTRO',                   'Filtro',                         'Mecánica',   'filter',       50),
  ('SEPARADOR_HUMEDAD',        'Separador de Humedad',           'Mecánica',   'droplets',     60),
  ('CHILLER',                  'Chiller / Enfriador',            'Mecánica',   'thermometer',  70),
  ('CALDERA',                  'Caldera',                        'Proceso',    'flame',        80),
  ('TEA',                      'Tea / Antorcha de Biogás',       'Proceso',    'flame',        90),
  ('LAGUNA',                   'Laguna / Biodigestor',           'Proceso',    'waves',       100),
  ('TANQUE',                   'Tanque / Pozo',                  'Proceso',    'cylinder',    110),
  ('TUBERIA',                  'Línea / Tubería',                'Proceso',    'minus',       120),
  ('TORRE_ENFRIAMIENTO',       'Torre de Enfriamiento',          'Proceso',    'building-2',  130),
  ('TRANSFORMADOR_POTENCIA',   'Transformador de Potencia',      'Eléctrica',  'zap',         140),
  ('TRANSFORMADOR_SECO',       'Transformador Seco',             'Eléctrica',  'zap',         150),
  ('CCM',                      'Centro de Control de Motores',   'Eléctrica',  'panel-top',   160),
  ('TABLERO_480V',             'Tablero de Potencia 480V',       'Eléctrica',  'panel-top',   170),
  ('TABLERO_208V',             'Tablero de Distribución 208V',   'Eléctrica',  'panel-top',   180),
  ('TABLERO_PLC',              'Tablero PLC',                    'I&C',        'cpu',         190),
  ('PLC',                      'PLC / Controlador',              'I&C',        'cpu',         200),
  ('VARIADOR_AC',              'Variador de Frecuencia AC',      'I&C',        'activity',    210),
  ('SCADA',                    'PC SCADA / HMI',                 'I&C',        'monitor',     220),
  ('MEDIDOR_CAUDAL',           'Medidor de Caudal',              'I&C',        'gauge',       230),
  ('TRANSMISOR_PRESION',       'Transmisor de Presión',          'I&C',        'gauge',       240),
  ('TRANSMISOR_TEMPERATURA',   'Transmisor / Medidor de Temperatura', 'I&C',  'thermometer', 250),
  ('DETECTOR_VALVULA',         'Detector de Estado de Válvula',  'I&C',        'toggle-left', 260),
  ('GENERADOR_EMERGENCIA',     'Generador de Emergencia',        'Eléctrica',  'zap',         270),
  ('CABLE',                    'Cable / Acometida',              'Eléctrica',  'cable',       280),
  ('MALLA_TIERRA',             'Malla de Tierra / Puesta a Tierra','Eléctrica','shield',      290),
  ('BANCO_CAPACITORES',        'Banco de Capacitores',           'Eléctrica',  'zap',         300)
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 2. SECCIONES REUTILIZABLES
-- Hallazgo grafo: comunidad 0 (71 nodos) = secciones universales
-- compartidas por TODOS los formatos (Inspección Visual, Anclaje,
-- Cambios Diseño/Redline, Prueba Aislamiento, Firma base).
-- ============================================================

CREATE TABLE template_sections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  description  TEXT,
  is_universal BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE template_sections IS
  'Secciones de formulario reutilizables entre plantillas. Las marcadas is_universal=true aparecen en todos los formatos sin necesidad de asignación explícita.';

-- Campos dentro de cada sección
CREATE TABLE section_fields (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID        NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  type        field_type  NOT NULL,   -- reutiliza el enum ya definido en 0001
  required    BOOLEAN     NOT NULL DEFAULT FALSE,
  options     JSONB,                   -- para select: ["APROBADO","RECHAZADO","N/A"]
  validations JSONB,                   -- {"min":0,"max":1000,"unit":"kW"}
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  hint        TEXT,
  UNIQUE(section_id, key)
);

-- Seed: secciones universales detectadas en el grafo
INSERT INTO template_sections (code, name, is_universal, sort_order) VALUES
  ('DATOS_GENERALES',          'Datos Generales del Equipo',           true,  10),
  ('INSPECCION_VISUAL',        'Inspección Visual y Mecánica',         true,  20),
  ('ANCLAJE_NIVELACION',       'Anclaje y Nivelación',                 true,  30),
  ('CAMBIOS_DISENO_REDLINE',   'Cambios de Diseño / Redline',          true,  40),
  ('PRUEBA_AISLAMIENTO',       'Prueba de Aislamiento (Meggueo)',       false, 50),
  ('PRUEBA_CONTINUIDAD',       'Prueba de Continuidad',                false, 60),
  ('PUESTA_TIERRA',            'Verificación Puesta a Tierra',         false, 70),
  ('LOOP_CHECK',               'Loop Check / Verificación de Lazos',   false, 80),
  ('PRUEBA_OPERATIVA',         'Pruebas Operativas',                   false, 90),
  ('ALINEAMIENTO',             'Verificación de Alineamiento',         false, 100),
  ('CALIBRACION',              'Calibración y Rango',                  false, 110),
  ('SINTONIZACION_LAZOS',      'Sintonización de Lazos de Control',    false, 120),
  ('FIRMAS',                   'Firmas de Aprobación',                 true,  999)
ON CONFLICT (code) DO NOTHING;

-- Seed campos de la sección DATOS_GENERALES
INSERT INTO section_fields (section_id, key, label, type, required, sort_order)
SELECT id, key, label, type::field_type, required, sort_order FROM (
  VALUES
    ('DATOS_GENERALES', 'tag',            'TAG del Equipo',              'texto',   true,  10),
    ('DATOS_GENERALES', 'nombre_equipo',  'Nombre / Descripción',        'texto',   false, 20),
    ('DATOS_GENERALES', 'fabricante',     'Fabricante',                  'texto',   false, 30),
    ('DATOS_GENERALES', 'modelo',         'Modelo',                      'texto',   false, 40),
    ('DATOS_GENERALES', 'no_serie',       'No. de Serie',                'texto',   false, 50),
    ('DATOS_GENERALES', 'pid_referencia', 'Referencia P&ID',             'texto',   false, 60),
    ('DATOS_GENERALES', 'ubicacion',      'Ubicación / Sistema',         'texto',   false, 70),
    ('DATOS_GENERALES', 'fecha_inicio',   'Fecha Inicio',                'fecha',   true,  80),
    ('DATOS_GENERALES', 'fecha_fin',      'Fecha Terminación',           'fecha',   false, 90)
) AS v(sec_code, key, label, type, required, sort_order)
JOIN template_sections ts ON ts.code = v.sec_code
ON CONFLICT (section_id, key) DO NOTHING;

-- Seed campos de INSPECCION_VISUAL
INSERT INTO section_fields (section_id, key, label, type, required, options, sort_order)
SELECT ts.id, v.key, v.label, v.type::field_type, v.required, v.options::jsonb, v.sort_order
FROM (VALUES
  ('INSPECCION_VISUAL', 'limpieza',          'Limpieza general',              'checkbox', true,  '["SI","NO","N/A"]', 10),
  ('INSPECCION_VISUAL', 'pintura',           'Estado de pintura',             'checkbox', true,  '["SI","NO","N/A"]', 20),
  ('INSPECCION_VISUAL', 'identificacion',    'Placa de identificación',       'checkbox', true,  '["SI","NO","N/A"]', 30),
  ('INSPECCION_VISUAL', 'danos_fisicos',     'Sin daños físicos visibles',    'checkbox', true,  '["SI","NO","N/A"]', 40),
  ('INSPECCION_VISUAL', 'resultado_visual',  'Resultado Inspección Visual',   'select',   true,  '["APROBADO","RECHAZADO"]', 90),
  ('INSPECCION_VISUAL', 'observaciones',     'Observaciones',                 'textarea', false, NULL, 100)
) AS v(sec_code, key, label, type, required, options, sort_order)
JOIN template_sections ts ON ts.code = v.sec_code
ON CONFLICT (section_id, key) DO NOTHING;

-- Seed campos de FIRMAS
INSERT INTO section_fields (section_id, key, label, type, required, sort_order)
SELECT ts.id, v.key, v.label, v.type::field_type, v.required, v.sort_order
FROM (VALUES
  ('FIRMAS', 'firma_ingeniero',      'Firma Ingeniero PreCommissioning', 'firma', true,  10),
  ('FIRMAS', 'firma_constructor',    'Firma Representante Constructor',  'firma', true,  20),
  ('FIRMAS', 'firma_interventoria',  'Firma Interventoría (si aplica)',  'firma', false, 30)
) AS v(sec_code, key, label, type, required, sort_order)
JOIN template_sections ts ON ts.code = v.sec_code
ON CONFLICT (section_id, key) DO NOTHING;


-- ============================================================
-- 3. ASIGNACIÓN DE SECCIONES A PLANTILLAS (N:M)
-- Hallazgo grafo: un form_template hereda secciones reutilizables
-- en lugar de duplicar los mismos campos en cada plantilla.
-- ============================================================

CREATE TABLE form_template_sections (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID    NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  section_id  UUID    NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(template_id, section_id)
);

CREATE INDEX idx_form_template_sections_tmpl ON form_template_sections(template_id);
CREATE INDEX idx_form_template_sections_sect ON form_template_sections(section_id);


-- ============================================================
-- 4. TIPOS DE EQUIPO ↔ PLANTILLAS (N:M)
-- Hallazgo grafo: 6 motores eléctricos (P_ELE-026 a 031)
-- tienen estructura idéntica → 1 tipo MOTOR_ELECTRICO con
-- plantillas asignadas para Eléctrica + Proceso según el equipo.
-- ============================================================

CREATE TABLE equipment_type_templates (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type_id UUID    NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  template_id       UUID    NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(equipment_type_id, template_id)
);

CREATE INDEX idx_equip_type_templates_type ON equipment_type_templates(equipment_type_id);
CREATE INDEX idx_equip_type_templates_tmpl ON equipment_type_templates(template_id);


-- ============================================================
-- 5. EQUIPOS ↔ PLANTILLAS (N:M directo)
-- Hallazgo grafo (Puente 2): Cable Profibus es inspeccionado
-- por Eléctrica (P_ELE_021) Y por I&C (P_I&C_003 PLC).
-- La relación Equipment ↔ Template DEBE ser N:M.
-- ============================================================

CREATE TABLE equipment_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID       NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  template_id  UUID       NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  assigned_by  UUID       REFERENCES users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(equipment_id, template_id)
);

CREATE INDEX idx_equipment_templates_equip ON equipment_templates(equipment_id);
CREATE INDEX idx_equipment_templates_tmpl  ON equipment_templates(template_id);


-- ============================================================
-- 6. CERTIFICADOS
-- Salida formal de un test completado y aprobado.
-- Un test genera exactamente 1 certificado.
-- Los certificados se incluyen en dossiers de entrega.
-- ============================================================

CREATE TABLE certificates (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  test_id            UUID        NOT NULL UNIQUE REFERENCES tests(id),
  certificate_number TEXT        NOT NULL,
  type               TEXT        NOT NULL CHECK (type IN (
                       'precomisionamiento','comisionamiento',
                       'puesta_en_marcha','inspeccion_electrica',
                       'inspeccion_instrumentacion','protocolo_prueba'
                     )),
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by          UUID        REFERENCES users(id),
  storage_path       TEXT,         -- ruta en Supabase Storage: certs/{project_id}/{num}.pdf
  status             TEXT        NOT NULL DEFAULT 'emitido'
                       CHECK (status IN ('borrador','emitido','anulado')),
  anulled_at         TIMESTAMPTZ,
  anulled_by         UUID        REFERENCES users(id),
  anull_reason       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, certificate_number)
);

CREATE INDEX idx_certificates_project ON certificates(project_id, status);
CREATE INDEX idx_certificates_test    ON certificates(test_id);


-- ============================================================
-- 7. DOSSIERS Y CONTENIDO
-- Hallazgo grafo (Puente 3): el Cuarto de Control y Potencia
-- es inspeccionado por Eléctrica e I&C → agrupar por
-- location_system genera el dossier natural de entrega.
--
-- scope puede ser: project, area, system, subsystem,
--                  location (= location_system), discipline
-- ============================================================

CREATE TABLE dossiers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  scope        TEXT        NOT NULL CHECK (scope IN (
                 'project','area','system','subsystem','location','discipline'
               )),
  scope_id     TEXT,         -- UUID como text (area/system/subsystem) o valor libre (discipline, location)
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'en_preparacion'
                 CHECK (status IN ('en_preparacion','completo','entregado','archivado')),
  generated_at TIMESTAMPTZ,
  storage_path TEXT,         -- ZIP o PDF consolidado en Storage
  created_by   UUID        REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dossier_items (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID    NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  item_type  TEXT    NOT NULL CHECK (item_type IN ('test','certificate','document','punch_item')),
  item_id    UUID    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(dossier_id, item_type, item_id)
);

CREATE INDEX idx_dossiers_project    ON dossiers(project_id, status);
CREATE INDEX idx_dossier_items_doss  ON dossier_items(dossier_id);


-- ============================================================
-- 8. RLS
-- ============================================================

ALTER TABLE equipment_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_fields            ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_template_sections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_type_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_items             ENABLE ROW LEVEL SECURITY;

-- equipment_types: lectura global, escritura solo admin
CREATE POLICY "equipment_types_read" ON equipment_types
  FOR SELECT USING (true);

CREATE POLICY "equipment_types_write" ON equipment_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- template_sections y section_fields: lectura global
CREATE POLICY "template_sections_read" ON template_sections
  FOR SELECT USING (true);

CREATE POLICY "section_fields_read" ON section_fields
  FOR SELECT USING (true);

-- form_template_sections: miembro del proyecto puede leer
CREATE POLICY "fts_select" ON form_template_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN form_templates ft ON ft.id = form_template_sections.template_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = ft.project_id
    )
  );

-- equipment_type_templates: lectura global
CREATE POLICY "ett_read" ON equipment_type_templates
  FOR SELECT USING (true);

-- equipment_templates: miembro del proyecto
CREATE POLICY "equip_templates_select" ON equipment_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN equipment e ON e.id = equipment_templates.equipment_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = e.project_id
    )
  );

CREATE POLICY "equip_templates_write" ON equipment_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN equipment e ON e.id = equipment_templates.equipment_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = e.project_id
    )
  );

-- certificates: miembro del proyecto
CREATE POLICY "certificates_select" ON certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = certificates.project_id
    )
  );

CREATE POLICY "certificates_insert" ON certificates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = certificates.project_id
    )
  );

-- dossiers: miembro del proyecto
CREATE POLICY "dossiers_select" ON dossiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = dossiers.project_id
    )
  );

CREATE POLICY "dossiers_write" ON dossiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = dossiers.project_id
    )
  );

CREATE POLICY "dossier_items_write" ON dossier_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dossiers d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = dossier_items.dossier_id AND pm.user_id = auth.uid()
    )
  );


-- ============================================================
-- 9. FUNCIÓN HELPER: templates efectivos de un equipo
-- Devuelve todos los form_templates aplicables combinando:
--   a) los del tipo del equipo  (equipment_type_templates)
--   b) los asignados directamente (equipment_templates)
-- ============================================================

CREATE OR REPLACE FUNCTION get_equipment_templates(p_equipment_id UUID)
RETURNS TABLE (
  template_id   UUID,
  template_name TEXT,
  discipline    TEXT,
  is_mandatory  BOOLEAN,
  source        TEXT    -- 'type' | 'direct'
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  -- Desde el tipo del equipo
  SELECT
    ft.id,
    ft.name,
    ft.test_type::TEXT,
    ett.is_mandatory,
    'type' AS source
  FROM equipment e
  JOIN equipment_type_templates ett ON ett.equipment_type_id = e.equipment_type_id
  JOIN form_templates ft ON ft.id = ett.template_id
  WHERE e.id = p_equipment_id
    AND e.deleted_at IS NULL
    AND ft.deleted_at IS NULL

  UNION

  -- Asignados directamente al equipo
  SELECT
    ft.id,
    ft.name,
    ft.test_type::TEXT,
    TRUE,
    'direct' AS source
  FROM equipment_templates eqt
  JOIN form_templates ft ON ft.id = eqt.template_id
  WHERE eqt.equipment_id = p_equipment_id
    AND ft.deleted_at IS NULL;
$$;


-- ============================================================
-- 10. FUNCIÓN HELPER: secciones efectivas de una plantilla
-- Combina secciones universales (is_universal=true) con
-- las asignadas explícitamente a la plantilla.
-- ============================================================

CREATE OR REPLACE FUNCTION get_template_sections(p_template_id UUID)
RETURNS TABLE (
  section_id   UUID,
  section_code TEXT,
  section_name TEXT,
  sort_order   INTEGER,
  is_required  BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    ts.id,
    ts.code,
    ts.name,
    COALESCE(fts.sort_order, ts.sort_order) AS sort_order,
    COALESCE(fts.is_required, TRUE) AS is_required
  FROM template_sections ts
  LEFT JOIN form_template_sections fts
    ON fts.section_id = ts.id AND fts.template_id = p_template_id
  WHERE ts.is_universal = TRUE
     OR fts.template_id IS NOT NULL
  ORDER BY sort_order;
$$;

COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_template_sections(UUID);
-- DROP FUNCTION IF EXISTS get_equipment_templates(UUID);
-- DROP TABLE IF EXISTS dossier_items CASCADE;
-- DROP TABLE IF EXISTS dossiers CASCADE;
-- DROP TABLE IF EXISTS certificates CASCADE;
-- DROP TABLE IF EXISTS equipment_templates CASCADE;
-- DROP TABLE IF EXISTS equipment_type_templates CASCADE;
-- DROP TABLE IF EXISTS form_template_sections CASCADE;
-- DROP TABLE IF EXISTS section_fields CASCADE;
-- DROP TABLE IF EXISTS template_sections CASCADE;
-- ALTER TABLE equipment DROP COLUMN IF EXISTS equipment_type_id;
-- DROP TABLE IF EXISTS equipment_types CASCADE;
-- COMMIT;
-- ============================================================
