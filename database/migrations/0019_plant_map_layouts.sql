-- database/migrations/0019_plant_map_layouts.sql

CREATE TABLE IF NOT EXISTS plant_map_layouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level          TEXT NOT NULL CHECK (level IN ('visual', 'area', 'system')),
  parent_id      UUID DEFAULT NULL,
  nodes_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  overlays_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un solo layout por proyecto / nivel / padre
CREATE UNIQUE INDEX IF NOT EXISTS uq_plant_map_layout
  ON plant_map_layouts (
    project_id,
    level,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Índice para queries por proyecto
CREATE INDEX IF NOT EXISTS idx_plant_map_layouts_project
  ON plant_map_layouts (project_id);

ALTER TABLE plant_map_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can manage plant map"
  ON plant_map_layouts
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
