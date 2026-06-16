-- Migración 0030: Agregar Blindobarra Principal faltante + corregir tags eléctricos
-- Proyecto LDC: eba099c0-32ca-4be7-823f-4ab7f3480004
-- Subsistemas:
--   DISTRIBUCIÓN BT  cf20af75-148d-4f0c-a099-ef32b3e9d609
--   GEN / EMERGENCIA 3bdc8a16-188a-45ef-be4f-047e7a68badb

-- ── 1. Insertar BB-PRINC (Blindobarra / Barraje Principal 440V) ────────────
INSERT INTO public.equipment
  (id, project_id, subsystem_id, tag, name, criticality, status, voltage, power_kw, created_at, updated_at)
VALUES
(gen_random_uuid(), 'eba099c0-32ca-4be7-823f-4ab7f3480004', 'cf20af75-148d-4f0c-a099-ef32b3e9d609',
 'BB-PRINC', 'Blindobarra Principal 440V - Barraje Principal TGD440', 'alta', 'pendiente', '440 V', NULL, now(), now())
ON CONFLICT (project_id, tag) DO NOTHING;

-- ── 2. Corregir tags para que coincidan con el SCADA unifilar ─────────────
-- GED → GGD  (Generador Diesel de Emergencia)
UPDATE public.equipment
SET tag = 'GGD', updated_at = now()
WHERE project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004' AND tag = 'GED';

-- TR1 → TDA-0  (Tablero Regulado UPS — no existe en SCADA como TR-1 independiente)
-- Nota: TR-1 en SCADA es el trafo principal; el tablero regulado se llama TR-1 en SCADA tab auxiliares
-- Solo renombramos para evitar colisión con el trafo principal
UPDATE public.equipment
SET tag = 'TR1-REG', name = 'Tablero Regulado UPS', updated_at = now()
WHERE project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004' AND tag = 'TR1';

-- TN1-E → TDA-1  (Tablero Auxiliares 1 Emergencia)
UPDATE public.equipment
SET tag = 'TDA-1', updated_at = now()
WHERE project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004' AND tag = 'TN1-E';

-- TN2-E → TDA-2  (Tablero Auxiliares 2 Emergencia)
UPDATE public.equipment
SET tag = 'TDA-2', updated_at = now()
WHERE project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004' AND tag = 'TN2-E';

-- TAUX-E → TIAE-R  (Tablero de Auxiliares Emergencia)
UPDATE public.equipment
SET tag = 'TIAE-R', updated_at = now()
WHERE project_id = 'eba099c0-32ca-4be7-823f-4ab7f3480004' AND tag = 'TAUX-E';
