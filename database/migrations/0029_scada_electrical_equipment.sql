-- Migración 0029: Equipos eléctricos del unifilar SCADA Potencia (LDC)
-- Todos los bloques del diagrama unifilar ahora tienen precomisionamiento
-- Ejecutar en Supabase SQL Editor
--
-- project_id LDC: eba099c0-32ca-4be7-823f-4ab7f3480004
-- Subsistemas usados:
--   CELDA MT              93d88588-3e29-4e03-8896-0b33d1627257
--   DISTRIBUCIÓN BT       cf20af75-148d-4f0c-a099-ef32b3e9d609
--   GENERACIÓN EMERGENCIA 3bdc8a16-188a-45ef-be4f-047e7a68badb
--   CCM1N                 c94dbb0f-3cd1-4e32-93d4-485fbe81616d
--   CCM1E                 b03f09c8-9344-438e-bd64-37067f8b037f
--   CCM2N                 0c5692cd-cdaa-41da-b173-1a13db056531
--   CCM2E                 442da245-e843-4007-91f0-17f146cb04a6
--   CCM3N                 d693fe82-caeb-409c-93be-4c7c701b528b
--   CCM3E                 d59c575a-0fe4-4583-8d43-60161fcd9ba6

INSERT INTO public.equipment
  (id, project_id, subsystem_id, tag, name, criticality, status, voltage, power_kw, created_at, updated_at)
VALUES

-- ── CELDA MT (Media Tensión 13.8 kV) ──────────────────────────────────────
(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','93d88588-3e29-4e03-8896-0b33d1627257',
 'REMONTE',  'Celda de remonte 13.8 kV', 'alta','pendiente','13.8 kV', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','93d88588-3e29-4e03-8896-0b33d1627257',
 'C-MEDIDA', 'Celda de medida kWh/kVArh Siemens', 'alta','pendiente','13.8 kV', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','93d88588-3e29-4e03-8896-0b33d1627257',
 'C-PROTEC', 'Celda de proteccion 8MF8SE ANSI 50/51', 'alta','pendiente','13.8 kV', NULL, now(), now()),

-- ── DISTRIBUCIÓN BT (440 V Normal) ────────────────────────────────────────
(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','cf20af75-148d-4f0c-a099-ef32b3e9d609',
 'TR-1',     'Transformador principal 2000 KVA 13.8→440V', 'alta','pendiente','13.8/0.44 kV', 2000, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','cf20af75-148d-4f0c-a099-ef32b3e9d609',
 'TGD440',   'Tablero General de Distribucion 440V Normal', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','cf20af75-148d-4f0c-a099-ef32b3e9d609',
 'BB-TRAFO', 'Blindobarra Trafo Principal 440V', 'media','pendiente','440 V', NULL, now(), now()),

-- ── GENERACIÓN / TRANSFERENCIA / EMERGENCIA ───────────────────────────────
(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'ATS',      'Tablero de Transferencia Automatica 440V', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'BB-GEN',   'Blindobarra Generador 440V Emergencia', 'media','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'GED',      'Generador Diesel de Emergencia 1200 KW', 'alta','pendiente','440 V', 1200, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'BB-TGE',   'Blindobarra al TGE440 Emergencia', 'media','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'TGE440',   'Tablero General de Emergencia 440V', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'BC-COND',  'Banco de Condensadores ~254 KVAR correccion FP', 'media','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'TR2-E',    'Transformador Emergencia 440→220V', 'alta','pendiente','440/220 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'TGD220-E', 'Tablero General 220V Emergencia', 'alta','pendiente','220 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'UPS',      'UPS 6 KVA Alimentacion Regulada', 'alta','pendiente','220 V', 6, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'TR1',      'Tablero Regulado UPS', 'media','pendiente','220 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'TN1-E',    'Tablero Auxiliares 1 Emergencia', 'media','pendiente','220 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'TN2-E',    'Tablero Auxiliares 2 Emergencia', 'media','pendiente','220 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','3bdc8a16-188a-45ef-be4f-047e7a68badb',
 'TAUX-E',   'Tablero de Auxiliares Emergencia', 'media','pendiente','220 V', NULL, now(), now()),

-- ── CENTROS DE CONTROL DE MOTORES (como equipos en sus propios subsistemas) ─
(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','c94dbb0f-3cd1-4e32-93d4-485fbe81616d',
 'CCM1N',    'Centro de Control de Motores 1 Normal 1200A - Alimentacion Crudo', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','b03f09c8-9344-438e-bd64-37067f8b037f',
 'CCM1E',    'Centro de Control de Motores 1 Emergencia 1200A - Alimentacion Crudo', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','0c5692cd-cdaa-41da-b173-1a13db056531',
 'CCM2N',    'Centro de Control de Motores 2 Normal - Lodos y Nutrientes', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','442da245-e843-4007-91f0-17f146cb04a6',
 'CCM2E',    'Centro de Control de Motores 2 Emergencia - Lodos y Nutrientes', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','d693fe82-caeb-409c-93be-4c7c701b528b',
 'CCM3N',    'Centro de Control de Motores 3 Normal 1200A - Biogas y Filtracion', 'alta','pendiente','440 V', NULL, now(), now()),

(gen_random_uuid(),'eba099c0-32ca-4be7-823f-4ab7f3480004','d59c575a-0fe4-4583-8d43-60161fcd9ba6',
 'CCM3E',    'Centro de Control de Motores 3 Emergencia 2000A - Biogas y Filtracion', 'alta','pendiente','440 V', NULL, now(), now())

ON CONFLICT (project_id, tag) DO NOTHING;
