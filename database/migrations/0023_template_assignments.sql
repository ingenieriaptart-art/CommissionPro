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
-- Nota: todas las referencias usan public.<tabla> explícitamente.
-- ============================================================

BEGIN;

-- ── 1. Audit columns en equipment_type_templates ─────────────────────────────

ALTER TABLE public.equipment_type_templates
  ADD COLUMN IF NOT EXISTS assigned_by UUID        REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- ── 2. system_templates ──────────────────────────────────────────────────────

CREATE TABLE public.system_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id    UUID        NOT NULL REFERENCES public.systems(id)        ON DELETE CASCADE,
  project_id   UUID        NOT NULL REFERENCES public.projects(id)       ON DELETE CASCADE,
  template_id  UUID        NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN     NOT NULL DEFAULT TRUE,
  assigned_by  UUID        REFERENCES public.users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(system_id, template_id)
);

CREATE INDEX idx_sys_tmpl_system  ON public.system_templates(system_id);
CREATE INDEX idx_sys_tmpl_project ON public.system_templates(project_id);
CREATE INDEX idx_sys_tmpl_tmpl    ON public.system_templates(template_id);

COMMENT ON COLUMN public.system_templates.project_id IS
  'Denormalizado desde systems→areas→projects para RLS O(1). Auto-rellenado por trigger.';

CREATE OR REPLACE FUNCTION public._fill_system_template_project()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    SELECT a.project_id INTO STRICT NEW.project_id
    FROM public.systems s JOIN public.areas a ON a.id = s.area_id
    WHERE s.id = NEW.system_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sys_tmpl_project_id
  BEFORE INSERT ON public.system_templates
  FOR EACH ROW EXECUTE FUNCTION public._fill_system_template_project();


-- ── 3. subsystem_templates ────────────────────────────────────────────────────

CREATE TABLE public.subsystem_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subsystem_id UUID        NOT NULL REFERENCES public.subsystems(id)     ON DELETE CASCADE,
  project_id   UUID        NOT NULL REFERENCES public.projects(id)       ON DELETE CASCADE,
  template_id  UUID        NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN     NOT NULL DEFAULT TRUE,
  assigned_by  UUID        REFERENCES public.users(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subsystem_id, template_id)
);

CREATE INDEX idx_sub_tmpl_subsystem ON public.subsystem_templates(subsystem_id);
CREATE INDEX idx_sub_tmpl_project   ON public.subsystem_templates(project_id);
CREATE INDEX idx_sub_tmpl_tmpl      ON public.subsystem_templates(template_id);

CREATE OR REPLACE FUNCTION public._fill_subsystem_template_project()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    SELECT a.project_id INTO STRICT NEW.project_id
    FROM public.subsystems sub
    JOIN public.systems s ON s.id = sub.system_id
    JOIN public.areas a ON a.id = s.area_id
    WHERE sub.id = NEW.subsystem_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sub_tmpl_project_id
  BEFORE INSERT ON public.subsystem_templates
  FOR EACH ROW EXECUTE FUNCTION public._fill_subsystem_template_project();


-- ── 4. project_default_templates ─────────────────────────────────────────────

CREATE TABLE public.project_default_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id)       ON DELETE CASCADE,
  template_id UUID        NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  assigned_by UUID        REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, template_id)
);

CREATE INDEX idx_proj_default_tmpl_proj ON public.project_default_templates(project_id);
CREATE INDEX idx_proj_default_tmpl_tmpl ON public.project_default_templates(template_id);

COMMENT ON TABLE public.project_default_templates IS
  'Template fallback de último recurso para equipos sin ninguna asignación específica.';


-- ── 5. Índices de soporte para los RPCs ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_equipment_subsystem_id
  ON public.equipment(subsystem_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_type_id
  ON public.equipment(equipment_type_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_project_tag
  ON public.equipment(project_id, tag) WHERE deleted_at IS NULL;


-- ── 6. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.system_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsystem_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_default_templates  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sys_tmpl_rw" ON public.system_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.project_id = system_templates.project_id
    )
  );

CREATE POLICY "sub_tmpl_rw" ON public.subsystem_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.project_id = subsystem_templates.project_id
    )
  );

CREATE POLICY "proj_default_tmpl_rw" ON public.project_default_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.project_id = project_default_templates.project_id
    )
  );

DROP POLICY IF EXISTS "ett_write_admin" ON public.equipment_type_templates;
CREATE POLICY "ett_write" ON public.equipment_type_templates
  FOR ALL USING (public.app_is_admin());

DROP POLICY IF EXISTS "form_templates_write_admin" ON public.form_templates;
CREATE POLICY "form_templates_rw" ON public.form_templates
  FOR ALL USING (
    public.app_is_admin()
    OR
    (
      project_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.user_id = auth.uid()
          AND pm.project_id = form_templates.project_id
      )
    )
  );


-- ── 7. get_equipment_templates — 5 niveles con auditoría ─────────────────────

DROP FUNCTION IF EXISTS public.get_equipment_templates(UUID);

CREATE OR REPLACE FUNCTION public.get_equipment_templates(p_equipment_id UUID)
RETURNS TABLE (
  template_id   UUID,
  template_key  TEXT,
  template_name TEXT,
  discipline    TEXT,
  is_mandatory  BOOLEAN,
  source        TEXT,
  assignment_id UUID,
  assigned_at   TIMESTAMPTZ,
  assigned_by   UUID
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
WITH
  eq AS (
    SELECT e.id, e.subsystem_id, e.equipment_type_id, e.project_id,
           sub.system_id
    FROM public.equipment e
    LEFT JOIN public.subsystems sub ON sub.id = e.subsystem_id
    WHERE e.id = p_equipment_id
      AND e.deleted_at IS NULL
    LIMIT 1
  ),
  raw AS (

    SELECT ft.id  AS tid, ft.key, ft.name, ft.test_type,
           TRUE   AS is_mand,
           'equipment'::TEXT AS src,
           eqt.id AS asgn_id,
           eqt.assigned_at,
           eqt.assigned_by,
           1      AS prio
    FROM eq
    JOIN public.equipment_templates eqt ON eqt.equipment_id = eq.id
    JOIN public.form_templates ft ON ft.id = eqt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ft.id, ft.key, ft.name, ft.test_type,
           subt.is_mandatory, 'subsystem'::TEXT,
           subt.id, subt.assigned_at, subt.assigned_by, 2
    FROM eq
    JOIN public.subsystem_templates subt ON subt.subsystem_id = eq.subsystem_id
    JOIN public.form_templates ft ON ft.id = subt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ft.id, ft.key, ft.name, ft.test_type,
           syst.is_mandatory, 'system'::TEXT,
           syst.id, syst.assigned_at, syst.assigned_by, 3
    FROM eq
    JOIN public.system_templates syst ON syst.system_id = eq.system_id
    JOIN public.form_templates ft ON ft.id = syst.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ft.id, ft.key, ft.name, ft.test_type,
           ett.is_mandatory, 'equipment_type'::TEXT,
           ett.id, ett.assigned_at, ett.assigned_by, 4
    FROM eq
    JOIN public.equipment_type_templates ett ON ett.equipment_type_id = eq.equipment_type_id
    JOIN public.form_templates ft ON ft.id = ett.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ft.id, ft.key, ft.name, ft.test_type,
           TRUE, 'default'::TEXT,
           pdt.id, pdt.assigned_at, pdt.assigned_by, 5
    FROM eq
    JOIN public.project_default_templates pdt ON pdt.project_id = eq.project_id
    JOIN public.form_templates ft ON ft.id = pdt.template_id AND ft.deleted_at IS NULL
  ),
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

CREATE OR REPLACE FUNCTION public.get_project_templates_resolution(
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
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
WITH
  eq_page AS (
    SELECT
      e.id, e.tag, e.name,
      e.subsystem_id, e.equipment_type_id,
      sub.system_id,
      COUNT(*) OVER () AS total_count
    FROM public.equipment e
    LEFT JOIN public.subsystems sub ON sub.id = e.subsystem_id
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
  raw AS (

    SELECT ep.id AS eq_id, ep.total_count,
           ft.id AS tid, ft.key, ft.name AS tname, ft.test_type,
           'equipment'::TEXT AS src, eqt.id AS asgn_id, 1 AS prio
    FROM eq_page ep
    JOIN public.equipment_templates eqt ON eqt.equipment_id = ep.id
    JOIN public.form_templates ft ON ft.id = eqt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'subsystem'::TEXT, subt.id, 2
    FROM eq_page ep
    JOIN public.subsystem_templates subt ON subt.subsystem_id = ep.subsystem_id
    JOIN public.form_templates ft ON ft.id = subt.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'system'::TEXT, syst.id, 3
    FROM eq_page ep
    JOIN public.system_templates syst ON syst.system_id = ep.system_id
    JOIN public.form_templates ft ON ft.id = syst.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'equipment_type'::TEXT, ett.id, 4
    FROM eq_page ep
    JOIN public.equipment_type_templates ett ON ett.equipment_type_id = ep.equipment_type_id
    JOIN public.form_templates ft ON ft.id = ett.template_id AND ft.deleted_at IS NULL

    UNION ALL

    SELECT ep.id, ep.total_count,
           ft.id, ft.key, ft.name, ft.test_type,
           'default'::TEXT, pdt.id, 5
    FROM eq_page ep
    JOIN public.project_default_templates pdt ON pdt.project_id = p_project_id
    JOIN public.form_templates ft ON ft.id = pdt.template_id AND ft.deleted_at IS NULL
  ),
  dedup AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY eq_id, tid ORDER BY prio ASC) AS rn
    FROM raw
  ),
  resolved AS (
    SELECT eq_id, tid, key, tname, test_type, src, asgn_id, prio
    FROM dedup WHERE rn = 1
  )
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
-- DROP FUNCTION IF EXISTS public.get_project_templates_resolution(UUID,TEXT,INTEGER,INTEGER);
-- DROP FUNCTION IF EXISTS public.get_equipment_templates(UUID);
-- DROP TABLE IF EXISTS public.project_default_templates CASCADE;
-- DROP TABLE IF EXISTS public.subsystem_templates CASCADE;
-- DROP TABLE IF EXISTS public.system_templates CASCADE;
-- DROP FUNCTION IF EXISTS public._fill_subsystem_template_project();
-- DROP FUNCTION IF EXISTS public._fill_system_template_project();
-- COMMIT;
-- ============================================================
