-- Migración 0035: URLs de documentos técnicos por equipo
-- Agrega columnas para manual del catálogo y protocolo FAT

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS catalog_url       TEXT,
  ADD COLUMN IF NOT EXISTS fat_protocol_url  TEXT;

COMMENT ON COLUMN equipment.catalog_url      IS 'URL pública del manual/catálogo del fabricante (PDF)';
COMMENT ON COLUMN equipment.fat_protocol_url IS 'URL pública del protocolo de pruebas FAT (PDF)';
