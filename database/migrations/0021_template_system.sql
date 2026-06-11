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
--
-- Nota: todas las referencias usan public.<tabla> explícitamente
--   para garantizar compatibilidad con cualquier search_path.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TIPOS DE EQUIPO
-- ============================================================

CREATE TABLE public.equipment_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  discipline  TEXT        NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.equipment_types IS
  'Catálogo global de tipos de equipo. Los tipos son compartidos entre proyectos.';

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS equipment_type_id UUID REFERENCES public.equipment_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_type ON public.equipment(project_id, equipment_type_id)
  WHERE deleted_at IS NULL;

INSERT INTO public.equipment_types (code, name, discipline, icon, sort_order) VALUES
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
-- ============================================================

CREATE TABLE public.template_sections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  description  TEXT,
  is_universal BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.section_fields (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID        NOT NULL REFERENCES public.template_sections(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  type        public.field_type NOT NULL,
  required    BOOLEAN     NOT NULL DEFAULT FALSE,
  options     JSONB,
  validations JSONB,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  hint        TEXT,
  UNIQUE(section_id, key)
);

INSERT INTO public.template_sections (code, name, is_universal, sort_order) VALUES
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

INSERT INTO public.section_fields (section_id, key, label, type, required, sort_order)
SELECT ts.id, v.key, v.label, v.type::public.field_type, v.required, v.sort_order
FROM (VALUES
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
JOIN public.template_sections ts ON ts.code = v.sec_code
ON CONFLICT (section_id, key) DO NOTHING;

INSERT INTO public.section_fields (section_id, key, label, type, required, options, sort_order)
SELECT ts.id, v.key, v.label, v.type::public.field_type, v.required, v.options::jsonb, v.sort_order
FROM (VALUES
  ('INSPECCION_VISUAL', 'limpieza',          'Limpieza general',              'checkbox', true,  '["SI","NO","N/A"]', 10),
  ('INSPECCION_VISUAL', 'pintura',           'Estado de pintura',             'checkbox', true,  '["SI","NO","N/A"]', 20),
  ('INSPECCION_VISUAL', 'identificacion',    'Placa de identificación',       'checkbox', true,  '["SI","NO","N/A"]', 30),
  ('INSPECCION_VISUAL', 'danos_fisicos',     'Sin daños físicos visibles',    'checkbox', true,  '["SI","NO","N/A"]', 40),
  ('INSPECCION_VISUAL', 'resultado_visual',  'Resultado Inspección Visual',   'select',   true,  '["APROBADO","RECHAZADO"]', 90),
  ('INSPECCION_VISUAL', 'observaciones',     'Observaciones',                 'textarea', false, NULL, 100)
) AS v(sec_code, key, label, type, required, options, sort_order)
JOIN public.template_sections ts ON ts.code = v.sec_code
ON CONFLICT (section_id, key) DO NOTHING;

INSERT INTO public.section_fields (section_id, key, label, type, required, sort_order)
SELECT ts.id, v.key, v.label, v.type::public.field_type, v.required, v.sort_order
FROM (VALUES
  ('FIRMAS', 'firma_ingeniero',      'Firma Ingeniero PreCommissioning', 'firma', true,  10),
  ('FIRMAS', 'firma_constructor',    'Firma Representante Constructor',  'firma', true,  20),
  ('FIRMAS', 'firma_interventoria',  'Firma Interventoría (si aplica)',  'firma', false, 30)
) AS v(sec_code, key, label, type, required, sort_order)
JOIN public.template_sections ts ON ts.code = v.sec_code
ON CONFLICT (section_id, key) DO NOTHING;


-- ============================================================
-- 3. ASIGNACIÓN DE SECCIONES A PLANTILLAS (N:M)
-- ============================================================

CREATE TABLE public.form_template_sections (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID    NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  section_id  UUID    NOT NULL REFERENCES public.template_sections(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(template_id, section_id)
);

CREATE INDEX idx_form_template_sections_tmpl ON public.form_template_sections(template_id);
CREATE INDEX idx_form_template_sections_sect ON public.form_template_sections(section_id);


-- ============================================================
-- 4. TIPOS DE EQUIPO ↔ PLANTILLAS (N:M)
-- ============================================================

CREATE TABLE public.equipment_type_templates (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type_id UUID    NOT NULL REFERENCES public.equipment_types(id) ON DELETE CASCADE,
  template_id       UUID    NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(equipment_type_id, template_id)
);

CREATE INDEX idx_equip_type_templates_type ON public.equipment_type_templates(equipment_type_id);
CREATE INDEX idx_equip_type_templates_tmpl ON public.equipment_type_templates(template_id);


-- ============================================================
-- 5. EQUIPOS ↔ PLANTILLAS (N:M directo)
-- ============================================================

CREATE TABLE public.equipment_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID        NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  template_id  UUID        NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  assigned_by  UUID        REFERENCES public.users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(equipment_id, template_id)
);

CREATE INDEX idx_equipment_templates_equip ON public.equipment_templates(equipment_id);
CREATE INDEX idx_equipment_templates_tmpl  ON public.equipment_templates(template_id);


-- ============================================================
-- 6. CERTIFICADOS
-- ============================================================

CREATE TABLE public.certificates (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  test_id            UUID        NOT NULL UNIQUE REFERENCES public.tests(id),
  certificate_number TEXT        NOT NULL,
  type               TEXT        NOT NULL CHECK (type IN (
                       'precomisionamiento','comisionamiento',
                       'puesta_en_marcha','inspeccion_electrica',
                       'inspeccion_instrumentacion','protocolo_prueba'
                     )),
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by          UUID        REFERENCES public.users(id),
  storage_path       TEXT,
  status             TEXT        NOT NULL DEFAULT 'emitido'
                       CHECK (status IN ('borrador','emitido','anulado')),
  anulled_at         TIMESTAMPTZ,
  anulled_by         UUID        REFERENCES public.users(id),
  anull_reason       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, certificate_number)
);

CREATE INDEX idx_certificates_project ON public.certificates(project_id, status);
CREATE INDEX idx_certificates_test    ON public.certificates(test_id);


-- ============================================================
-- 7. DOSSIERS Y CONTENIDO
-- ============================================================

CREATE TABLE public.dossiers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  scope        TEXT        NOT NULL CHECK (scope IN (
                 'project','area','system','subsystem','location','discipline'
               )),
  scope_id     TEXT,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'en_preparacion'
                 CHECK (status IN ('en_preparacion','completo','entregado','archivado')),
  generated_at TIMESTAMPTZ,
  storage_path TEXT,
  created_by   UUID        REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.dossier_items (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID    NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  item_type  TEXT    NOT NULL CHECK (item_type IN ('test','certificate','document','punch_item')),
  item_id    UUID    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(dossier_id, item_type, item_id)
);

CREATE INDEX idx_dossiers_project    ON public.dossiers(project_id, status);
CREATE INDEX idx_dossier_items_doss  ON public.dossier_items(dossier_id);


-- ============================================================
-- 8. RLS
-- ============================================================

ALTER TABLE public.equipment_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_fields            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_sections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_type_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_items             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_types_read" ON public.equipment_types
  FOR SELECT USING (true);

CREATE POLICY "equipment_types_write" ON public.equipment_types
  FOR ALL USING (public.app_is_admin());

CREATE POLICY "template_sections_read" ON public.template_sections
  FOR SELECT USING (true);

CREATE POLICY "section_fields_read" ON public.section_fields
  FOR SELECT USING (true);

CREATE POLICY "fts_select" ON public.form_template_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.form_templates ft ON ft.id = form_template_sections.template_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = ft.project_id
    )
  );

CREATE POLICY "ett_read" ON public.equipment_type_templates
  FOR SELECT USING (true);

CREATE POLICY "equip_templates_select" ON public.equipment_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.equipment e ON e.id = equipment_templates.equipment_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = e.project_id
    )
  );

CREATE POLICY "equip_templates_write" ON public.equipment_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.equipment e ON e.id = equipment_templates.equipment_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = e.project_id
    )
  );

CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = certificates.project_id
    )
  );

CREATE POLICY "certificates_insert" ON public.certificates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = certificates.project_id
    )
  );

CREATE POLICY "dossiers_select" ON public.dossiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = dossiers.project_id
    )
  );

CREATE POLICY "dossiers_write" ON public.dossiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid() AND pm.project_id = dossiers.project_id
    )
  );

CREATE POLICY "dossier_items_write" ON public.dossier_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dossiers d
      JOIN public.project_members pm ON pm.project_id = d.project_id
      WHERE d.id = dossier_items.dossier_id AND pm.user_id = auth.uid()
    )
  );


-- ============================================================
-- 9. FUNCIÓN: templates efectivos de un equipo
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_equipment_templates(p_equipment_id UUID)
RETURNS TABLE (
  template_id   UUID,
  template_name TEXT,
  discipline    TEXT,
  is_mandatory  BOOLEAN,
  source        TEXT
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ft.id,
    ft.name,
    ft.test_type::TEXT,
    ett.is_mandatory,
    'type' AS source
  FROM public.equipment e
  JOIN public.equipment_type_templates ett ON ett.equipment_type_id = e.equipment_type_id
  JOIN public.form_templates ft ON ft.id = ett.template_id
  WHERE e.id = p_equipment_id
    AND e.deleted_at IS NULL
    AND ft.deleted_at IS NULL

  UNION

  SELECT
    ft.id,
    ft.name,
    ft.test_type::TEXT,
    TRUE,
    'direct' AS source
  FROM public.equipment_templates eqt
  JOIN public.form_templates ft ON ft.id = eqt.template_id
  WHERE eqt.equipment_id = p_equipment_id
    AND ft.deleted_at IS NULL;
$$;


-- ============================================================
-- 10. FUNCIÓN: secciones efectivas de una plantilla
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_template_sections(p_template_id UUID)
RETURNS TABLE (
  section_id   UUID,
  section_code TEXT,
  section_name TEXT,
  sort_order   INTEGER,
  is_required  BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ts.id,
    ts.code,
    ts.name,
    COALESCE(fts.sort_order, ts.sort_order) AS sort_order,
    COALESCE(fts.is_required, TRUE) AS is_required
  FROM public.template_sections ts
  LEFT JOIN public.form_template_sections fts
    ON fts.section_id = ts.id AND fts.template_id = p_template_id
  WHERE ts.is_universal = TRUE
     OR fts.template_id IS NOT NULL
  ORDER BY sort_order;
$$;

COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.get_template_sections(UUID);
-- DROP FUNCTION IF EXISTS public.get_equipment_templates(UUID);
-- DROP TABLE IF EXISTS public.dossier_items CASCADE;
-- DROP TABLE IF EXISTS public.dossiers CASCADE;
-- DROP TABLE IF EXISTS public.certificates CASCADE;
-- DROP TABLE IF EXISTS public.equipment_templates CASCADE;
-- DROP TABLE IF EXISTS public.equipment_type_templates CASCADE;
-- DROP TABLE IF EXISTS public.form_template_sections CASCADE;
-- DROP TABLE IF EXISTS public.section_fields CASCADE;
-- DROP TABLE IF EXISTS public.template_sections CASCADE;
-- ALTER TABLE public.equipment DROP COLUMN IF EXISTS equipment_type_id;
-- DROP TABLE IF EXISTS public.equipment_types CASCADE;
-- COMMIT;
-- ============================================================
