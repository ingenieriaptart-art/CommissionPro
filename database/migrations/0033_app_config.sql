-- ============================================================
-- 0033 — app_config: configuración global de la aplicación
-- Solo admin puede escribir; todos los usuarios autenticados leen.
-- ============================================================

CREATE TABLE app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Valor inicial: Equipos oculto por defecto
INSERT INTO app_config (key, value)
VALUES ('ui_prefs', '{"showEquipmentNav": false}');

-- RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer
CREATE POLICY "app_config_read" ON app_config
  FOR SELECT TO authenticated USING (true);

-- Solo rol admin puede escribir
CREATE POLICY "app_config_admin_write" ON app_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
        AND r.key = 'admin'
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.auth_user_id = auth.uid()
        AND r.key = 'admin'
        AND u.deleted_at IS NULL
    )
  );
