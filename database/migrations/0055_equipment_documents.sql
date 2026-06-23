-- Migración 0055: tabla de documentos técnicos por equipo
-- Soporta múltiples documentos por equipo (unifilares, catálogos, FAT, manuales, etc.)

CREATE TABLE IF NOT EXISTS public.equipment_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id    UUID        NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id      UUID        NOT NULL REFERENCES public.projects(id)  ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  document_type   TEXT        NOT NULL DEFAULT 'unifilar'
                              CHECK (document_type IN ('unifilar','catalogo','fat','manual','otro')),
  storage_url     TEXT        NOT NULL,
  file_size_bytes INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID        REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS equipment_documents_equipment_id_idx
  ON public.equipment_documents(equipment_id);

CREATE INDEX IF NOT EXISTS equipment_documents_project_id_idx
  ON public.equipment_documents(project_id);

-- RLS
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_documents_select ON public.equipment_documents
  FOR SELECT USING (app_in_project(project_id));

CREATE POLICY equipment_documents_insert ON public.equipment_documents
  FOR INSERT WITH CHECK (
    app_in_project(project_id) AND
    app_user_role() IN ('admin', 'supervisor', 'tecnico')
  );

CREATE POLICY equipment_documents_delete ON public.equipment_documents
  FOR DELETE USING (
    app_user_role() IN ('admin', 'supervisor')
  );
