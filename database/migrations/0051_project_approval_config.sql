-- ============================================================
-- 0051 — EPIC-002 Fase B · Modelo de cadena de aprobación
-- Tabla configurable por proyecto + seed default + alters de trazabilidad.
-- Idempotente (re-ejecutable).
-- ============================================================
BEGIN;

-- 1) Tabla de configuración de la cadena (1..3 niveles por proyecto)
CREATE TABLE IF NOT EXISTS public.project_approval_config (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  level            int  NOT NULL,                       -- orden de la cadena (1,2,3)
  level_name       text NOT NULL,                       -- "Supervisor", "QA/QC", "Cliente"
  required_role_id uuid REFERENCES public.roles(id),    -- O3: rol tipado; NULL = cualquiera con 'full'
  test_status_on_approve text,                          -- espejo: aprob_supervisor|aprob_qaqc|aprob_cliente|cerrado (o NULL)
  mandatory        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, level)
);
CREATE INDEX IF NOT EXISTS idx_pac_project ON public.project_approval_config(project_id, level);

-- 2) RLS: SELECT para miembros del proyecto o admin; escritura solo admin
ALTER TABLE public.project_approval_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pac_select ON public.project_approval_config;
CREATE POLICY pac_select ON public.project_approval_config FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.project_members m
            WHERE m.project_id = project_approval_config.project_id
              AND m.user_id = app_current_user_id())
    OR EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
               WHERE u.id = app_current_user_id() AND r.key = 'admin')
  );

DROP POLICY IF EXISTS pac_write ON public.project_approval_config;
CREATE POLICY pac_write ON public.project_approval_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
                 WHERE u.id = app_current_user_id() AND r.key = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
                      WHERE u.id = app_current_user_id() AND r.key = 'admin'));

-- 3) Seed default idempotente: 1 nivel "Supervisor" para cada proyecto sin config
INSERT INTO public.project_approval_config (project_id, level, level_name, required_role_id, test_status_on_approve, mandatory)
SELECT p.id, 1, 'Supervisor',
       (SELECT id FROM public.roles WHERE key = 'supervisor'),
       'aprob_supervisor', true
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_approval_config c WHERE c.project_id = p.id
);

-- 4) O2 — trazabilidad de firma: user_agent
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS user_agent text;

-- 5) O1 — revisión de inspección (ciclo de rework)
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS revision int NOT NULL DEFAULT 1;

COMMIT;
