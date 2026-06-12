-- Agrega 'futuro' al enum equipment_status para equipos no instalados aún
ALTER TYPE equipment_status ADD VALUE IF NOT EXISTS 'futuro';
