-- ============================================================
-- 0025 — Roles: director + renombrar cliente → invitado
-- ============================================================

BEGIN;

-- 1. Renombrar cliente → invitado
UPDATE public.roles
SET key = 'invitado', name = 'Invitado'
WHERE key = 'cliente';

-- 2. Agregar rol director
INSERT INTO public.roles (key, name, description, is_system)
VALUES ('director', 'Director', 'Supervisión total sin gestión de usuarios', true)
ON CONFLICT (key) DO NOTHING;

-- 3. Permisos del director: todos excepto usuario.*
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'director'
  AND p.key NOT IN ('usuario.create', 'usuario.edit', 'usuario.delete')
ON CONFLICT DO NOTHING;

-- 4. RLS: permitir a admin escribir en project_members
DROP POLICY IF EXISTS "pm_admin_write" ON public.project_members;
CREATE POLICY "pm_admin_write" ON public.project_members
  FOR ALL
  USING  (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

COMMIT;
