-- ============================================================
-- 0023 — Asignaciones de templates: sistema, subsistema, default
--
-- Requiere: 0021 + 0022 ejecutados.
--
-- JERARQUÍA DE RESOLUCIÓN (prioridad descendente):
--   1. Equipo específico    (equipment_templates)
--   2. Subsistema           (subsystem_templates)
--   3. Sistema              (system_templates)
--   4. Tipo de equipo       (equipment_type_templates)
--   5. Default del proyecto (project_default_templates)
--
-- DISEÑO:
--   system_templates y subsystem_templates llevan project_id
--   denormalizado para que la política RLS sea un simple lookup
--   en project_members (O(1) con índice) sin 2-3 JOINs.
--   El trigger BEFORE INSERT auto-rellena project_id desde la
--   jerarquía, así el cliente solo pasa system_id/subsystem_id.
--
-- FUNCIONES:
--   get_equipment_templates(equipment_id)
--     → todos los templates efectivos de un equipo con fuente + auditoría
--   get_project_templates_resolution(project_id, search, limit, offset)
--     → bulk para la pantalla admin, paginado, incluye equipos sin template
-- ============================================================

BEGIN;

-- ── 1. Audit columns en equipment_type_templates ─────────────────────────────
-- (la tabla existe desde 0021 sin estos campos)

ALTER TABLE equipment_type_templates
  ADD COLUMN IF NOT EXISTS assigned_by UUID        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- ── 2. system_templates ──────────────────────────────────────────────────────

CREATE TABLE system_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id    UUID        NOT NULL REFERENCES systems(id)        ON DELETE CASCADE,
  project_id   UUID        NOT NULL REFERENCES projects(id)       ON DELETE CASCADE,
  template_id  UUID        NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN     NOT NULL DEFAULT TRUE,
  assigned_by  UUID        REFERENCES users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(system_id, template_id)
);

CREATE INDEX idx_sys_tmpl_system  ON system_templates(system_id);
CREATE INDEX idx_sys_tmpl_project ON system_templates(project_id);
CREATE INDEX idx_sys_tmpl_tmpl    ON system_templates(template_id);

COMMENT ON COLUMN system_templates.project_id IS
  'Denormalizado desde systems→areas→projects para RLS O(1). Auto-rellenado por trigger.';

-- Trigger: auto-rellena project_id cuando el cliente no lo pasa
CREATE OR REPLACE FUNCTION _fill_system_template_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    SELECT a.project_id INTO STRICT NEW.project_id
    FROM systems s JOIN areas a ON a.id = s.area_id
    WHERE s.id = NEW.system_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sys_tmpl_project_id
  BEFORE INSERT ON system_templates
  FOR EACH ROW EXECUTE FUNCTION _fill_system_template_project();


-- ── 3. subsystem_templates ────────────────────────────────────────────────────

CREATE TABLE subsystem_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subsystem_id UUID        NOT NULL REFERENCES subsystems(id)     ON DELETE CASCADE,
  project_id   UUID        NOT NULL REFERENCES projects(id)       ON DELETE CASCADE,
  template_id  UUID        NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN     NOT NULL DEFAULT TRUE,
  assigned_by  UUID        REFERENCES users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subsystem_id, template_id)
);

CREATE INDEX idx_sub_tmpl_subsystem ON subsystem_templates(subsystem_id);
CREATE INDEX idx_sub_tmpl_project   ON subsystem_templates(project_id);
CREATE INDEX idx_sub_tmpl_tmpl      ON subsystem_templates(template_id);

CREATE OR REPLACE FUNCTION _fill_subsystem_template_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    SELECT a.project_id INTO STRICT NEW.project_id
    FROM subsystems sub
    JOIN systems s ON s.id = sub.system_id
    JOIN areas a ON a.id = s.area_id
    WHERE sub.id = NEW.subsystem_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sub_tmpl_project_id
  BEFORE INSERT ON subsystem_templates
  FOR EACH ROW EXECUTE FUNCTION _fill_subsystem_template_project();


-- ── 4. project_default_templates ─────────────────────────────────────────────

CREATE TABLE project_default_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id)       ON DELETE CASCADE,
  template_id UUID        NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  assigned_by UUID        REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, template_id)
);

CREATE INDEX idx_proj_default_tmpl_proj ON project_default_templates(project_id);
CREATE INDEX idx_proj_default_tmpl_tmpl ON project_default_templates(template_id);

COMMENT ON TABLE project_default_templates IS
  'Template fallback de último recurso para equipos sin ninguna asignación específica.
   Útil para estandarizar un protocolo base en proyectos nuevos.';


-- ── 5. Índices de soporte para los RPCs ──────────────────────────────────────
-- Las consultas de los RPCs hacen JOIN desde equipment hacia subsystem, system
-- y equipment_type. Estos índices garantizan O(log n) para esas rutas.

CREATE INDEX IF NOT EXISTS idx_equipment_subsystem_id
  ON equipment(subsystem_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_type_id
  ON equipment(equipment_type_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_project_tag
  ON equipment(project_id, tag) WHERE deleted_at IS NULL;


-- ── 6. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE system_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsystem_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_default_templates  ENABLE ROW LEVEL SECURITY;

-- system_templates: usa project_id directo → O(1) con índice en project_members
CREATE POLICY "sys_tmpl_rw" ON system_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.project_id = system_templates.project_id
    )
  );

-- subsystem_templates: mismo patrón
CREATE POLICY "sub_tmpl_rw" ON subsystem_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.project_id = subsystem_templates.project_id
    )
  );

-- project_default_templates: miembros del proyecto
CREATE POLICY "proj_default_tmpl_rw" ON project_default_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.project_id = project_default_templates.project_id
    )
  );

-- equipment_type_templates: solo admin (catálogo global)
DROP POLICY IF EXISTS "ett_write_admin" ON equipment_type_templates;
CREATE POLICY "ett_write" ON equipment_type_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- form_templates globales: admin escribe; miembros leen cualquier plantilla global
DROP POLICY IF EXISTS "form_templates_write_admin" ON form_templates;
CREATE POLICY "form_templates_rw" ON form_templates
  FOR ALL USING (
    -- Admin gestiona todo
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR
    -- Miembro del proyecto gestiona plantillas de ese proyecto
    (
      project_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.user_id = auth.uid()
          AND pm.project_id = form_templates.project_id
      )
    )
  );


-- ── 7. get_equipment_templates — 5 niveles con auditoría ─────────────────────
-- Devuelve TODOS los templates efectivos de un equipo.
-- Para cada template_id, solo aparece el origen más específico (menor priority).
-- Equipos sin ningún template devuelven cero filas.

DROP FUNCTION IF EXISTS get_equipment_templates(UUID);

CREATE OR REPLACE FUNCTION get_equipment_templates(p_equipment_id UUID)
RETURNS TABLE (
  template_id   UUID,
  template_key  TEXT,
  template_name TEXT,
  discipline    TEXT,
  is_mandatory  BOOLEAN,
  source        TEXT,       -- 'equipment'|'subsystem'|'system'|'equipment_type'|'default'
  assignment_id UUID,       -- ID del registro de asignación para auditoría/depuración
  assigned_at   TIMESTAMPTZ,
  assigned_by   UUID
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
WITH
  -- Metadatos del equipo (1 fila)
  eq AS (
    SELECT e.id, e.subsystem_id, e.equipment_type_id, e.project_id,
           sub.system_id
    FROM equipment e
    LEFT JOIN subsystems sub ON sub.id = e.subsystem_id
    WHERE e.id = p_equipment_id
      AND e.deleted_at IS NULL
    LIMIT 1
  ),
  -- Todos los templates desde todos los niveles (con duplicados posibles)
  raw AS (

    -- Nivel 1: equipo directo (máxima prioridad)
    SELECT ft.id  AS tid, ft.key, ft.name, ft.test_type,
           TRUE   AS is_mand,
           'equipment'::TEXT AS src,
           eqt.id AS asgn_id,
           eqt.assigned_at,
           eqt.assigned_by,
           1      AS prio
    FROM eq
    JOIN equipment_templates eqt ON eqt.equipment_id = eq.id
    JOIN form_templates ft ON ft.id = eqt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    -- Nivel 2: subsistema
    SELECT ft.id, ft.key, ft.name, ft.test_type,
           subt.is_mandatory, 'subsystem'::TEXT,
           subt.id, subt.assigned_at, subt.assigned_by, 2
    FROM eq
    JOIN subsystem_templates subt ON subt.subsystem_id = eq.subsystem_id
    JOIN form_templates ft ON ft.id = subt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    -- Nivel 3: sistema
    SELECT ft.id, ft.key, ft.name, ft.test_type,
           syst.is_mandatory, 'system'::TEXT,
           syst.id, syst.assigned_at, syst.assigned_by, 3
    FROM eq
    JOIN system_templates syst ON syst.system_id = eq.system_id
    JOIN form_templates ft ON ft.id = syst.template_id AND ft.deleted_at IS NULL

    UNION ALL

    -- Nivel 4: tipo de equipo
    SELECT ft.id, ft.key, ft.name, ft.test_type,
           ett.is_mandatory, 'equipment_type'::TEXT,
           ett.id, ett.assigned_at, ett.assigned_by, 4
    FROM eq
    JOIN equipment_type_templates ett ON ett.equipment_type_id = eq.equipment_type_id
    JOIN form_templates ft ON ft.id = ett.template_id AND ft.deleted_at IS NULL

    UNION ALL

    -- Nivel 5: default del proyecto (fallback)
    SELECT ft.id, ft.key, ft.name, ft.test_type,
           TRUE, 'default'::TEXT,
           pdt.id, pdt.assigned_at, pdt.assigned_by, 5
    FROM eq
    JOIN project_default_templates pdt ON pdt.project_id = eq.project_id
    JOIN form_templates ft ON ft.id = pdt.template_id AND ft.deleted_at IS NULL
  ),
  -- Para cada template_id, conservar solo el origen más específico
  dedup AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY tid ORDER BY prio ASC) AS rn
    FROM raw
  )
SELECT
  tid           AS template_id,
  key           AS template_key,
  name          AS template_name,
  test_type::TEXT AS discipline,
  is_mand       AS is_mandatory,
  src           AS source,
  asgn_id       AS assignment_id,
  assigned_at,
  assigned_by
FROM dedup
WHERE rn = 1
ORDER BY prio ASC, key ASC;
$$;


-- ── 8. get_project_templates_resolution — bulk paginado para admin ────────────
-- Diseño para escalabilidad:
--   • eq_page materializa solo los N equipos de la página (LIMIT antes de JOINs)
--   • COUNT(*) OVER() en eq_page se evalúa antes del LIMIT → total correcto para paginación
--   • LEFT JOIN final preserva equipos sin ningún template (template_id = NULL)
--   • Índices: equipment(project_id,tag), subsystem_id, equipment_type_id
--
-- Retorna: una fila por (equipment × template_efectivo), equipos sin templates
--          aparecen con template_id = NULL para que el admin identifique gaps.

CREATE OR REPLACE FUNCTION get_project_templates_resolution(
  p_project_id  UUID,
  p_search      TEXT    DEFAULT NULL,
  p_limit       INTEGER DEFAULT 50,
  p_offset      INTEGER DEFAULT 0
)
RETURNS TABLE (
  equipment_id   UUID,
  equipment_tag  TEXT,
  equipment_name TEXT,
  template_id    UUID,
  template_key   TEXT,
  template_name  TEXT,
  discipline     TEXT,
  source         TEXT,
  assignment_id  UUID,
  total_count    BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
WITH
  -- Equipos de la página (LIMIT aplicado aquí, antes de JOINs masivos)
  eq_page AS (
    SELECT
      e.id, e.tag, e.name,
      e.subsystem_id, e.equipment_type_id,
      sub.system_id,
      COUNT(*) OVER () AS total_count   -- total antes del LIMIT
    FROM equipment e
    LEFT JOIN subsystems sub ON sub.id = e.subsystem_id
    WHERE e.project_id = p_project_id
      AND e.deleted_at IS NULL
      AND (
        p_search IS NULL OR p_search = ''
        OR e.tag  ILIKE '%' || p_search || '%'
        OR e.name ILIKE '%' || p_search || '%'
      )
    ORDER BY e.tag
    LIMIT  p_limit
    OFFSET p_offset
  ),
  -- Templates desde todos los niveles para los equipos de esta página
  raw AS (

    SELECT ep.id AS eq_id, ep.total_count,
           ft.id AS tid, ft.key, ft.name AS tname, ft.test_type,
           'equipment'::TEXT AS src, eqt.id AS asgn_id, 1 AS prio
    FROM eq_page ep
    JOIN equipment_templates eqt ON eqt.equipment_id = ep.id
    JOIN form_templates ft ON ft.id = eqt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'subsystem'::TEXT, subt.id, 2
    FROM eq_page ep
    JOIN subsystem_templates subt ON subt.subsystem_id = ep.subsystem_id
    JOIN form_templates ft ON ft.id = subt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'system'::TEXT, syst.id, 3
    FROM eq_page ep
    JOIN system_templates syst ON syst.system_id = ep.system_id
    JOIN form_templates ft ON ft.id = syst.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'equipment_type'::TEXT, ett.id, 4
    FROM eq_page ep
    JOIN equipment_type_templates ett ON ett.equipment_type_id = ep.equipment_type_id
    JOIN form_templates ft ON ft.id = ett.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'default'::TEXT, pdt.id, 5
    FROM eq_page ep
    JOIN project_default_templates pdt ON pdt.project_id = p_project_id
    JOIN form_templates ft ON ft.id = pdt.template_id AND ft.deleted_at IS NULL
  ),
  -- Deduplicar: por (equipment, template), conservar el origen más específico
  dedup AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY eq_id, tid ORDER BY prio ASC) AS rn
    FROM raw
  ),
  resolved AS (
    SELECT eq_id, tid, key, tname, test_type, src, asgn_id
    FROM dedup WHERE rn = 1
  )
-- LEFT JOIN para incluir equipos sin ningún template (template_id NULL → gap visible)
SELECT
  ep.id            AS equipment_id,
  ep.tag           AS equipment_tag,
  ep.name          AS equipment_name,
  r.tid            AS template_id,
  r.key            AS template_key,
  r.tname          AS template_name,
  r.test_type::TEXT AS discipline,
  r.src            AS source,
  r.asgn_id        AS assignment_id,
  ep.total_count
FROM eq_page ep
LEFT JOIN resolved r ON r.eq_id = ep.id
ORDER BY ep.tag ASC, r.prio ASC NULLS LAST, r.key ASC NULLS LAST;
$$;

COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_project_templates_resolution(UUID,TEXT,INTEGER,INTEGER);
-- DROP FUNCTION IF EXISTS get_equipment_templates(UUID);
-- DROP TABLE IF EXISTS project_default_templates CASCADE;
-- DROP TABLE IF EXISTS subsystem_templates CASCADE;
-- DROP TABLE IF EXISTS system_templates CASCADE;
-- DROP FUNCTION IF EXISTS _fill_subsystem_template_project();
-- DROP FUNCTION IF EXISTS _fill_system_template_project();
-- COMMIT;
-- Luego restaurar get_equipment_templates de 0021.
-- ============================================================
