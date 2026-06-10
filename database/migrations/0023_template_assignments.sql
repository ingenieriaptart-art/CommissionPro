-- ============================================================
-- 0023 — Asignaciones de plantillas a sistema y subsistema
--
-- Requiere: 0022 ejecutado.
--
-- Agrega:
--   system_templates    — N:M systems ↔ form_templates
--   subsystem_templates — N:M subsystems ↔ form_templates
--
-- Actualiza get_equipment_templates() para incluir los 4 niveles
-- de herencia:
--   1. Tipo de equipo  (equipment_type_templates)   — heredado
--   2. Sistema         (system_templates)            — heredado
--   3. Subsistema      (subsystem_templates)         — heredado
--   4. Equipo directo  (equipment_templates)         — directo
--
-- Todos los niveles se unen (UNION) y se muestran con su fuente.
-- El FloatingEquipmentPanel mostrará todas las plantillas aplicables.
-- ============================================================

BEGIN;

-- ── 1. system_templates ──────────────────────────────────────────────────────

CREATE TABLE system_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id   UUID        NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  template_id UUID        NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN    NOT NULL DEFAULT TRUE,
  assigned_by UUID        REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(system_id, template_id)
);

CREATE INDEX idx_system_templates_sys  ON system_templates(system_id);
CREATE INDEX idx_system_templates_tmpl ON system_templates(template_id);

COMMENT ON TABLE system_templates IS
  'Plantillas aplicables a todos los equipos dentro de un sistema.
   Nivel 2 de herencia (sistema > subsistema > equipo directo).';


-- ── 2. subsystem_templates ────────────────────────────────────────────────────

CREATE TABLE subsystem_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subsystem_id UUID        NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  template_id  UUID        NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN     NOT NULL DEFAULT TRUE,
  assigned_by  UUID        REFERENCES users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subsystem_id, template_id)
);

CREATE INDEX idx_subsystem_templates_sub  ON subsystem_templates(subsystem_id);
CREATE INDEX idx_subsystem_templates_tmpl ON subsystem_templates(template_id);

COMMENT ON TABLE subsystem_templates IS
  'Plantillas aplicables a todos los equipos dentro de un subsistema.
   Nivel 3 de herencia (sistema > subsistema > equipo directo).';


-- ── 3. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE system_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsystem_templates ENABLE ROW LEVEL SECURITY;

-- system_templates: miembros del proyecto pueden leer y escribir
CREATE POLICY "sys_templates_select" ON system_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN systems s ON s.id = system_templates.system_id
      JOIN areas a ON a.id = s.area_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = a.project_id
    )
  );

CREATE POLICY "sys_templates_write" ON system_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN systems s ON s.id = system_templates.system_id
      JOIN areas a ON a.id = s.area_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = a.project_id
    )
  );

-- subsystem_templates: miembros del proyecto pueden leer y escribir
CREATE POLICY "sub_templates_select" ON subsystem_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN subsystems sub ON sub.id = subsystem_templates.subsystem_id
      JOIN systems s ON s.id = sub.system_id
      JOIN areas a ON a.id = s.area_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = a.project_id
    )
  );

CREATE POLICY "sub_templates_write" ON subsystem_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN subsystems sub ON sub.id = subsystem_templates.subsystem_id
      JOIN systems s ON s.id = sub.system_id
      JOIN areas a ON a.id = s.area_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = a.project_id
    )
  );

-- Políticas de escritura para equipment_type_templates (solo admin)
-- (Ya existe la política de lectura "ett_read" de 0021)
CREATE POLICY "ett_write_admin" ON equipment_type_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Políticas de escritura para form_templates globales (solo admin)
CREATE POLICY "form_templates_write_admin" ON form_templates
  FOR ALL USING (
    -- Admin puede gestionar cualquier plantilla
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR
    -- Miembro del proyecto puede gestionar plantillas de su proyecto
    (
      project_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.user_id = auth.uid() AND pm.project_id = form_templates.project_id
      )
    )
  );


-- ── 4. Actualizar get_equipment_templates() ───────────────────────────────────
-- Ahora incluye los 4 niveles: tipo > sistema > subsistema > directo.

CREATE OR REPLACE FUNCTION get_equipment_templates(p_equipment_id UUID)
RETURNS TABLE (
  template_id   UUID,
  template_name TEXT,
  template_key  TEXT,
  discipline    TEXT,
  is_mandatory  BOOLEAN,
  source        TEXT    -- 'type' | 'system' | 'subsystem' | 'direct'
) LANGUAGE sql STABLE SECURITY DEFINER AS $$

  -- 1. Desde el tipo del equipo
  SELECT
    ft.id,
    ft.name,
    ft.key,
    ft.test_type::TEXT,
    ett.is_mandatory,
    'type'::TEXT AS source
  FROM equipment e
  JOIN equipment_type_templates ett ON ett.equipment_type_id = e.equipment_type_id
  JOIN form_templates ft ON ft.id = ett.template_id
  WHERE e.id = p_equipment_id
    AND e.deleted_at IS NULL
    AND ft.deleted_at IS NULL

  UNION

  -- 2. Desde el sistema (vía subsistema del equipo)
  SELECT
    ft.id,
    ft.name,
    ft.key,
    ft.test_type::TEXT,
    st.is_mandatory,
    'system'::TEXT AS source
  FROM equipment e
  JOIN subsystems sub ON sub.id = e.subsystem_id
  JOIN system_templates st ON st.system_id = sub.system_id
  JOIN form_templates ft ON ft.id = st.template_id
  WHERE e.id = p_equipment_id
    AND e.deleted_at IS NULL
    AND ft.deleted_at IS NULL

  UNION

  -- 3. Desde el subsistema del equipo
  SELECT
    ft.id,
    ft.name,
    ft.key,
    ft.test_type::TEXT,
    subt.is_mandatory,
    'subsystem'::TEXT AS source
  FROM equipment e
  JOIN subsystem_templates subt ON subt.subsystem_id = e.subsystem_id
  JOIN form_templates ft ON ft.id = subt.template_id
  WHERE e.id = p_equipment_id
    AND e.deleted_at IS NULL
    AND ft.deleted_at IS NULL

  UNION

  -- 4. Asignados directamente al equipo
  SELECT
    ft.id,
    ft.name,
    ft.key,
    ft.test_type::TEXT,
    TRUE,
    'direct'::TEXT AS source
  FROM equipment_templates eqt
  JOIN form_templates ft ON ft.id = eqt.template_id
  WHERE eqt.equipment_id = p_equipment_id
    AND ft.deleted_at IS NULL;

$$;

COMMIT;


-- ============================================================
-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_equipment_templates(UUID);
-- DROP TABLE IF EXISTS subsystem_templates CASCADE;
-- DROP TABLE IF EXISTS system_templates CASCADE;
-- COMMIT;
-- Luego re-crear get_equipment_templates con la versión de 0021.
-- ============================================================
