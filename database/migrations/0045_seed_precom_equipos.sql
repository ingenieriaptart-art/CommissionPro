-- ============================================================
-- 0045 — Seed: 7 formatos de pre-comisionamiento de equipos
-- Generado por scripts/gen-precom-equipos-sql.cjs desde scripts/formatos-nuevos/.
-- Re-ejecutable: borra y recrea solo estos formatos (no toca universales).
-- ============================================================

BEGIN;

-- Limpieza idempotente (cascade borra form_template_sections y section_fields)
DELETE FROM public.form_templates  WHERE key IN ('P_EFL-019', 'P_BIO-006', 'P_BIO-005', 'P_ELE-025', 'P_BIO-020', 'P_BIO-010', 'P_BIO-002') AND project_id IS NULL;
DELETE FROM public.template_sections WHERE code LIKE 'P_EFL-019-S%';
DELETE FROM public.template_sections WHERE code LIKE 'P_BIO-006-S%';
DELETE FROM public.template_sections WHERE code LIKE 'P_BIO-005-S%';
DELETE FROM public.template_sections WHERE code LIKE 'P_ELE-025-S%';
DELETE FROM public.template_sections WHERE code LIKE 'P_BIO-020-S%';
DELETE FROM public.template_sections WHERE code LIKE 'P_BIO-010-S%';
DELETE FROM public.template_sections WHERE code LIKE 'P_BIO-002-S%';

-- ───────── P_EFL-019: Bomba de Recirculación de Lodos ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES
  ('44dc3a8e-f832-57c8-8d29-6db594b7bfea', NULL, 'P_EFL-019', 'Bomba de Recirculación de Lodos', 'precomisionamiento', 'Jun-09 (versión cero)', 'B1 a B10 FormatoPre-ComisionaBombaRECIRCULACION.xls', NULL,
   (SELECT id FROM public.equipment_types WHERE code = 'BOMBA_CENTRIFUGA'));

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('f66da1e0-599a-5fe8-83c4-baba50d1dbf8', 'P_EFL-019-S1', 'Datos de Placa', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('44dc3a8e-f832-57c8-8d29-6db594b7bfea', 'f66da1e0-599a-5fe8-83c4-baba50d1dbf8', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('dda6116f-eddb-50fd-8942-3143146c56e0', 'f66da1e0-599a-5fe8-83c4-baba50d1dbf8', 'placa_1', 'Tipo de bomba', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('9c35d365-14d7-582d-89a1-6ced8cbf8662', 'f66da1e0-599a-5fe8-83c4-baba50d1dbf8', 'placa_2', 'Presión nominal', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('16ca43c8-4e8b-551e-8568-f2722867c6fc', 'P_EFL-019-S2', 'Instalaciones y estructuras para la bomba', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('44dc3a8e-f832-57c8-8d29-6db594b7bfea', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('2bbe3d95-cb79-570a-8aed-ff477765e157', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it1', 'Se han realizado cambios a los diseños, soportados con planos red line o as built', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('532c4d27-c2af-5544-8241-248eb55b4a9f', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('d6e5b61d-8ad5-53de-8a93-dea05b35a5f9', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it2', 'Estan reportados en todos los frentes (Ingenieria de diseño, construccion civil, electrico, I&C...), todos los cambios a los diseños y planos.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('bce5bba6-d209-5def-8966-e3cdfedb7a59', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('645a6d0b-ccc4-5485-8890-15856620d7ef', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it3', 'Recinto de ubicación de la bomba esta construido de acuerdo al plano (si se considera en los diseños)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('3dd1a9ba-9ed0-519f-8c4f-49142e78dae8', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('dbb7b327-a400-5e7d-8e09-d7a70df22eee', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it4', 'La soporteria de la bomba, esta construida de acuerdo al diseño y planos', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('7ea4847e-5a90-5ee7-8c82-1774fc043101', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('e1a4370e-0f28-58ee-846e-80e966ace608', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it5', 'El pozo de bombeo de recirculacion, esta construido de acuerdo a las especificiones y planos de diseño.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('de84c023-9c34-53c8-8bd0-93bce4a5a0e0', '16ca43c8-4e8b-551e-8568-f2722867c6fc', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('a7ffd34e-7e54-5820-86ee-da6d62478fef', 'P_EFL-019-S3', 'Bomba', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('44dc3a8e-f832-57c8-8d29-6db594b7bfea', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('f8bd4355-cdf1-5a9a-8521-f0d7b90ae9c8', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it1', 'La Bomba cumple con las especificaciones del diseño', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('0aad7883-4203-5f27-892e-84069db76145', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('a1338add-4b61-56f7-83bb-7fea476eb88a', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it2', 'Esta el conjunto correctamente alineado(verificar registros u ordenar su ejecucion)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('f38d62be-278d-5c4f-8241-92c8b8a7b1d8', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('a332f39b-7c73-5c09-849f-ddb1fc91ff0d', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it3', 'La Carcaza de la bomba esta buenas condiciones sin golpes ni fisuras', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('01aebe36-193d-59f8-86bd-c2c2ae1e98ae', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('c8e41a25-1867-5821-809c-8a3e7cdb932f', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it4', 'La pintura y acabados de la bomba estan en buenas condiciones, no se presenta corrosion.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('229c4ee7-ecd4-5ec9-88d3-37e01b4ca72a', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('b3f8f526-40bd-516f-8fe1-6980e8f2e049', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it5', 'Los elementos de sujeción de la bomba, tornillos, pernos de anclaje, abrazaderas, estan completos y ajustados.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('ba450d90-b825-5f8f-8edc-3984f5a54f54', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('2255840b-d3ca-51f9-8945-cd2f301ab705', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it6', 'Los elementos de sujeción de tuberias y cables de conexión tales como abrazaderas, estan adecuadamente colocadas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 110),
  ('bdc10f73-bc4b-5d50-8788-b0a9ba8d5a32', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('37225b71-7f01-528d-8a20-7d7adaa50032', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it7', 'Los sellos estan correctamente instalados no se ven fugas de lubricante', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 130),
  ('928c65c7-16e0-5084-8ccb-229d8a990bb3', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('5b25de4c-bf02-5313-8d28-4aec98aabc8e', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it8', 'Los Rodamientos estan protegidos', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 150),
  ('4308e926-3b6c-562d-8ad4-0a3811d71f57', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('7915f250-8ff9-53c2-8682-5dc0eb48e6cc', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it9', 'Están instalas las válvulas succión y descarga.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 170),
  ('a89687c8-ab37-5524-8207-542d2004539e', 'a7ffd34e-7e54-5820-86ee-da6d62478fef', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 'P_EFL-019-S4', 'Insntrumentos e Instrumentacion Bomba', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('44dc3a8e-f832-57c8-8d29-6db594b7bfea', 'cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('cfb5a8e5-bf2f-590c-8cfc-eb87e6a308dc', 'cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 'it1', 'Estan instalados los dispositivos de control de la bomba (cajas de control, contactores, psv)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('e38e8ddc-a74b-50e6-83e6-20f02ef4788a', 'cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('88f5e1cb-a270-59b0-86d6-19fbbbd95c60', 'cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 'it2', 'Estan conectados los manometros (si aplica de acuerdo a planos)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('a3874dbb-8b48-58cf-899c-b66889facace', 'cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('0f28b245-5f39-5e9e-8f75-4aeeb0de5b8c', 'cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 'it3', 'Estan conectados los indicadores de acuerdo a los diseños (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('5eab8a0d-afab-55be-8725-bf6a3417fe81', 'cb08a97d-eeb2-5199-8b1f-ce14edf8f1b1', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'P_EFL-019-S5', 'Motor de Bomba (completar con formato inspeccion motor, parte electrica)', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('44dc3a8e-f832-57c8-8d29-6db594b7bfea', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('8e2873dc-a62d-5ad3-8939-7e0290b30b0b', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it1', 'El dispositivo de Acople con el motor esta en perfectas condiciones, conectado y asegurado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('f694eeca-a7e5-5449-87b2-87f4ffbbfc29', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('cfcd9e8e-35ea-5b36-8e16-c15a17f38c8b', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it2', 'Esta el motor electrico instalado y conectado de acuerdo al diseño', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('f7f14e35-617d-5b98-8af6-4573457f4537', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('4841ae8c-7164-5fa4-81c4-254180c08634', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it3', 'La pintura y acabados del motor estan en buenas condiciones, no se presenta corrosion.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('ac21242c-c07b-5e91-8b32-f9354e962214', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('450be45b-87e3-5a8b-88fd-893a13740f05', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it4', 'Los Rodamientos estan protegidos', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('22665e76-1632-5316-86c1-681752ec7c2c', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('33e58467-010c-5c5f-8e6f-a532c69f1d44', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it5', 'Los elementos de sujecion de tuberias y cables de conexión tales como abrazaderas, estan adecuadamente colocadas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('9ecbe029-e7a2-53f6-8649-e89a536385af', '79d9c26a-53f7-5cd8-8fe6-e3cbfa68fd93', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('15c1308b-1a26-5ea3-8bd9-68955dd230aa', 'P_EFL-019-S6', 'Documentacion', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('44dc3a8e-f832-57c8-8d29-6db594b7bfea', '15c1308b-1a26-5ea3-8bd9-68955dd230aa', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('ed046f26-d081-5f17-8806-39d0d97979c5', '15c1308b-1a26-5ea3-8bd9-68955dd230aa', 'it1', 'Existen en la planta planos de instalacion y memorias tecnicas de bomba', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('72560e76-1c95-5ebd-8511-4925843fb19c', '15c1308b-1a26-5ea3-8bd9-68955dd230aa', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('f1523f87-1415-5ccd-89a9-03ae9ae63136', '15c1308b-1a26-5ea3-8bd9-68955dd230aa', 'it2', 'Existe manual de funcionamiento de la bomba', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('c9b0ce0a-6104-516c-8c82-5626d2b182f7', '15c1308b-1a26-5ea3-8bd9-68955dd230aa', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40);

-- ───────── P_BIO-006: Chiller — Bomba e Instrumentación (con instrumentos) ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES
  ('f643ff25-5e18-51b1-8881-769a062db69b', NULL, 'P_BIO-006', 'Chiller — Bomba e Instrumentación (con instrumentos)', 'precomisionamiento', 'Jun-09 (versión cero)', 'SC1 y SC2 parte 2 FormatoPre-ComisionaBombaCHILLER.xls', 'con_instrumentos',
   (SELECT id FROM public.equipment_types WHERE code = 'CHILLER'));

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('f4d9087e-369e-57e0-847d-b6980c530d4f', 'P_BIO-006-S1', 'Datos de Placa', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('f643ff25-5e18-51b1-8881-769a062db69b', 'f4d9087e-369e-57e0-847d-b6980c530d4f', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('c3792d74-ee68-5dd6-892d-0f83e81a68fe', 'f4d9087e-369e-57e0-847d-b6980c530d4f', 'placa_1', 'Tipo de bomba', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('68cb584f-4eb4-5e55-8550-76f6adc0524c', 'f4d9087e-369e-57e0-847d-b6980c530d4f', 'placa_2', 'Presión nominal', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('b2ef6400-ad12-547a-87dc-a295925edbc6', 'P_BIO-006-S2', 'Instalaciones y estructuras para la bomba', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('f643ff25-5e18-51b1-8881-769a062db69b', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('3786f8b1-552a-5631-8521-8d111f7d8525', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it1', 'Se han realizado cambios a los diseños, soportados con planos red line o as built', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('fd0b7e34-1516-5ba7-8256-a56b9f5bfb9f', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('89123bf5-0b55-5fa2-80e5-34248407f534', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it2', 'Estan reportados en todos los frentes (Ingenieria de diseño, construccion civil, electrico, I&C...), todos los cambios a los diseños y planos.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('2d64ee1f-0ff6-517b-89e2-d3224bc70e1c', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('192a5a1c-b66d-5eab-8fe7-ddfa30662a58', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it3', 'Recinto de ubicación de la bomba esta construido de acuerdo al plano (si se considera en los diseños)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('e667eb3f-52d0-5dbe-8e94-b0074b99f96b', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('84239ccc-1383-513a-8198-95b609742e5f', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it4', 'La Base o soporteria de la bomba, esta construida de acuerdo al diseño y planos', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('2477bd2c-e237-50ba-8e77-e9446dea16dd', 'b2ef6400-ad12-547a-87dc-a295925edbc6', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'P_BIO-006-S3', 'Bomba', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('f643ff25-5e18-51b1-8881-769a062db69b', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('9e3b74f4-6d73-5855-81da-c983248ecd64', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it1', 'Esta el conjunto correctamente alineado(verificar registros u ordenar su ejecucion)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('48fd6d4f-1b03-599f-8819-ae4301e87152', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('a6cf7e46-525b-5b15-808c-74acc4b42684', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it2', 'La Carcaza de la bomba esta buenas condiciones sin golpes ni fisuras', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('72e2e6e7-de4b-5bca-8469-9ed4a8121ea0', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('175051bc-d226-577d-8888-8efe5d82022d', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it3', 'La pintura y acabados de la bomba estan en buenas condiciones, no se presenta corrosion.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('7f71c5bd-9963-5484-8d45-c7816445a415', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('802cc4bb-ed0b-58af-8812-0cea0ab11707', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it4', 'Los elementos de sujeción de la bomba, tornillos, pernos de anclaje, abrazaderas, estan completos y ajustados.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('11b50f41-be1e-554a-84d6-842e79e044d1', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('ecd8fb36-f7f8-5211-8933-2f41140159a7', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it5', 'Los elementos de sujeción de tuberias y cables de conexión tales como abrazaderas, estan adecuadamente colocadas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('836ec0be-d500-54ea-8fa3-0b7eef7b51e2', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('ccde7f84-6606-578d-82e6-8fcfbee3202e', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it6', 'Los sellos estan correctamente instalados no se ven fugas de lubricante', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 110),
  ('3871a8b1-76d2-5dff-8def-c4520544fc8d', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('a751e633-af7a-503e-8fba-514f67453d78', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it7', 'Están instalas las válvulas succión y descarga.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 130),
  ('94422467-b358-5e84-83cd-25f2c6c57f69', 'a888a1dd-1733-5c06-8ce7-9c0553b78a4e', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('1958f64f-7e8f-533c-8f18-145cc15b718e', 'P_BIO-006-S4', 'Instrumentacion Bomba', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('f643ff25-5e18-51b1-8881-769a062db69b', '1958f64f-7e8f-533c-8f18-145cc15b718e', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('52f8b61f-8599-5d4b-83dc-b8d8042ff597', '1958f64f-7e8f-533c-8f18-145cc15b718e', 'it1', 'Estan instalados los dispositivos de control de la bomba (cajas de control, contactores, psv)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('99d9b206-3540-541c-80c9-496ec5654db1', '1958f64f-7e8f-533c-8f18-145cc15b718e', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('6e00b3c3-d143-5975-8bfa-881a138e5124', '1958f64f-7e8f-533c-8f18-145cc15b718e', 'it2', 'Estan conectados los manometros (si aplica de acuerdo a planos)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('8bf4c7f7-9ef2-539d-8d15-31773c1c6115', '1958f64f-7e8f-533c-8f18-145cc15b718e', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('47d04f6d-10a4-5197-814e-db385ab6e4e8', '1958f64f-7e8f-533c-8f18-145cc15b718e', 'it3', 'Estan conectados los indicadores de acuerdo a los diseños (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('2be27da0-f87a-5293-8ecc-cd325100c0cf', '1958f64f-7e8f-533c-8f18-145cc15b718e', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('bb5facda-9922-5f23-8b4f-3ad73b342287', 'P_BIO-006-S5', 'Motor de Bomba', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('f643ff25-5e18-51b1-8881-769a062db69b', 'bb5facda-9922-5f23-8b4f-3ad73b342287', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('e40303fd-c6e9-55e9-8c39-9db7c723a2e8', 'bb5facda-9922-5f23-8b4f-3ad73b342287', 'it1', 'Esta sistema electrico instalado y conectado de acuerdo al diseño', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('365e3b4e-ce46-5b4a-8085-44f9ee0f0062', 'bb5facda-9922-5f23-8b4f-3ad73b342287', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('b88c7a13-415b-5408-8473-e44cf40cdabc', 'bb5facda-9922-5f23-8b4f-3ad73b342287', 'it2', 'La pintura y acabados del motor estan en buenas condiciones, no se presenta corrosion.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('1e273d81-397a-540e-8153-5112b3613af0', 'bb5facda-9922-5f23-8b4f-3ad73b342287', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('4cf2f97f-c0bb-52fc-8e64-92872ed00df6', 'bb5facda-9922-5f23-8b4f-3ad73b342287', 'it3', 'Los elementos de sujecion de tuberias y cables de conexión tales como abrazaderas, estan adecuadamente colocadas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('83fb3604-8cde-5b16-82ca-b7e37d88054e', 'bb5facda-9922-5f23-8b4f-3ad73b342287', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('14908e37-2486-57ad-85f3-58632b5ae979', 'P_BIO-006-S6', 'Documentacion', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('f643ff25-5e18-51b1-8881-769a062db69b', '14908e37-2486-57ad-85f3-58632b5ae979', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('3c2d33a1-b4a1-564c-8c74-0bd2d1e0289e', '14908e37-2486-57ad-85f3-58632b5ae979', 'it1', 'Existen en la planta planos de instalacion y memorias', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('8f341eaa-5752-5bc7-8538-ad58009a8b19', '14908e37-2486-57ad-85f3-58632b5ae979', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('50630192-4089-5e03-80ae-5d954346f0af', '14908e37-2486-57ad-85f3-58632b5ae979', 'it2', 'Existe manual de funcionamiento de la bomba', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('6780dce5-6fa6-5a67-8196-17b6bfb3d674', '14908e37-2486-57ad-85f3-58632b5ae979', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40);

-- ───────── P_BIO-005: Chiller — Montaje Mecánico (sin instrumentos) ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES
  ('f0e05458-4276-566f-858f-d9326ed4f11b', NULL, 'P_BIO-005', 'Chiller — Montaje Mecánico (sin instrumentos)', 'precomisionamiento', 'Jun-09 (Ver. 0)', 'SC1 y SC2 parte 1 FormatoPre-Comisionamiento Chiller.xls', 'sin_instrumentos',
   (SELECT id FROM public.equipment_types WHERE code = 'CHILLER'));

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('c604c561-95bb-5ee9-8273-41239f6dda44', 'P_BIO-005-S1', 'Instalación del Chiller', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('f0e05458-4276-566f-858f-d9326ed4f11b', 'c604c561-95bb-5ee9-8273-41239f6dda44', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('2478baaa-269b-571b-885e-99ed458e67da', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it1', 'Se han realizado cambios a los diseños, soportados con planos red line o as built', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 10),
  ('205d7394-136b-52b0-894c-0a0254373a8f', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('02ce1377-4894-5ad2-876c-fb3647e9985a', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it2', 'Estan reportados en todos los frentes (Ingenieria de diseño, construccion civil, electrico, I&C...), todos los cambios a los diseños y planos.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 30),
  ('a66c2379-42db-52eb-8b97-1004d3e4a9d8', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('6215d251-d87b-5497-8d55-818413aa4ffb', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it3', 'La ubicación del Chiller esta de acuerdo al plano', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 50),
  ('5d52dfef-2315-565b-8fc8-cc1b4e4578c6', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('e61a1354-253f-5b1f-864a-546f2544d0d7', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it4', 'La obra civil para la base del equipo esta de acuerdo al plano de ingenieria y especificaciones del proveedor', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 70),
  ('85200816-3b96-5a87-83d1-c4aa0d66172c', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('693a1e6a-6d42-5446-8f2a-320a2edf9aac', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it5', 'La tuberia de entrada al intercambiador se encuentra bien instalada y acoplada según planos de ingenieria y especificaciones de fabricante', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 90),
  ('c087379f-6406-558a-89a0-7f565013a06b', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('0fe20bfe-eb85-5bdb-8409-243910525044', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it6', 'La tuberia de salida del intercambiador se encuentra bien instalada y acoplada según especificaciones de fabricante', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 110),
  ('9da7eef6-5bf9-53c7-86af-6f4e7686935b', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('e344f8a6-47f1-5667-8095-16abc9de080c', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it7', 'Las lineas de tuberia entrada y salida del Condensador se encuentran bien instaladas y acopladas según especificaciones del proveedor (Completar con formato de inspeccion de tuberia)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 130),
  ('1f5165be-cd15-503a-8359-ef9c23c66a37', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('020544dc-b3f7-5e9c-8ee2-2b80fd8539eb', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it8', 'Las lineas de tuberia entrada y salida al recuperador de calor se encuentran bien instaladas y acopladas según especificaciones del proveedor', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 150),
  ('79e40548-4812-5d90-80d2-b31df89e13d9', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('b11aebf1-d57d-51ea-883e-91288465850a', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it9', 'La tuberia y accesorios de acople a las lineas de entrada y salida de las bombas del recuperador estan instaladas según especificaciones del proveedor', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 170),
  ('6473c8db-93b9-5f49-8fa9-d5eeab19484f', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('0322dfdd-e350-5f8d-8925-5040199a502f', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it10', 'Las Lineas de llegada y salida al Intercambiador lado refrigerante estan instaladas según especificaciones del proveedor', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 190),
  ('0459a347-3562-5aae-8309-0244f46147d1', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('609f521e-5c7e-5f1c-8e98-4007939e1ec6', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it11', 'Las lineas de llegada al Intercambiador provenientes de lal tanque de almacenamiento agua caliente, se encuentran instalados según planos del proveedor', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 210),
  ('c994ba7e-091a-5c27-8587-6d6ba6203b24', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it11_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 220),
  ('f4a6621a-7547-521c-8480-c59c409a9b5c', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it12', 'Las bombas del recuperador se encuentran bien alineadas (Completar con formato de inspeccion de bomba chiller)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 230),
  ('7c64d932-07d4-5b46-8661-7ec5bccb4eeb', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it12_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 240),
  ('04196cf0-8b05-5941-8280-9faae541982c', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it13', 'Las bombas del recuperador se encuentran bien ancladas y libres de vibraciones', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 250),
  ('1bd84064-8a16-54be-8371-3e2f7266ff8b', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it13_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 260),
  ('7565046a-dd82-55c7-82c0-243a72ffd096', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it14', 'Las bombas del intercambiador se encuentran bien alineadas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 270),
  ('cf9df0dc-182f-54fd-8f81-6aadbc7b97c3', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it14_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 280),
  ('ec15ff3e-bc85-5a62-86d2-a48066e33057', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it15', 'Las bombas del intercambiador se encuentran bien ancladas y libres de vibraciones', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 290),
  ('7ced9630-6c84-59b3-8e49-bfdf66f50b43', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it15_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 300),
  ('0602deec-7333-5529-8c02-249fb264fb10', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it16', 'La tuberia de entrada al evaporador resulto bien despues de fase de limpieza.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 310),
  ('4cab1898-1526-55f9-85eb-9d56125c038c', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it16_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 320),
  ('923983fb-43c0-59bb-8a8d-0273324247d4', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it17', 'La tuberia de entrada al Intercambiador resulto bien despues de fase de limpieza.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 330),
  ('1c00fa72-f574-58d1-843d-83cc7dc62ff0', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it17_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 340),
  ('36caf971-b101-50d6-8427-8cf6b33eaaec', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it18', 'Resulto correcta la prueba estatica de la Linea de tuberia entrada al Chiller', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 350),
  ('c3487785-adfd-5974-88fd-a8722621aec3', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it18_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 360),
  ('6ff864e4-f10b-5cb5-8be8-3d2080618cb0', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it19', 'Resulto correcta la prueba estatica de la Linea de tuberia salida del Chiller', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 370),
  ('73c5563a-fd3c-53eb-85e3-5c3ce61b308b', 'c604c561-95bb-5ee9-8273-41239f6dda44', 'it19_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 380);

-- ───────── P_ELE-025: Generador de Emergencia ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', NULL, 'P_ELE-025', 'Generador de Emergencia', 'precomisionamiento', 'Jun-09 (versión cero)', 'GE-01 Formato Pre-ComisionaGeneradorEmergencia.xls', NULL,
   (SELECT id FROM public.equipment_types WHERE code = 'GENERADOR_EMERGENCIA'));

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('e8426b1d-1fd7-5d81-8097-6889cb67f378', 'P_ELE-025-S1', 'Datos de Placa', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', 'e8426b1d-1fd7-5d81-8097-6889cb67f378', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('99bee1b4-1d49-5467-8d32-317856b672b9', 'e8426b1d-1fd7-5d81-8097-6889cb67f378', 'placa_1', 'RPM', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('d80eb180-4cf2-5d98-8b05-e0e7b198a206', 'e8426b1d-1fd7-5d81-8097-6889cb67f378', 'placa_2', 'Dimensiones', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('9ba7b5d0-41be-57fa-883b-b04632e312ce', 'P_ELE-025-S2', 'Instalaciones y estructuras', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('5ddc0607-93da-53ea-8fb5-d00e79db3e0f', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it1', 'Se han realizado cambios a los diseños, soportados con planos red line o as built', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('583208fb-6c3e-5a22-8196-0e23bfec9671', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('7691dbaa-bffb-522d-83fc-c0032d1d0268', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it2', 'Estan reportados en todos los frentes (Ingenieria de diseño, construccion civil, electrico, I&C...), todos los cambios a los diseños y planos.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('4b06959f-7a7f-535c-8843-5e3562bb246d', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('b1f58128-1de9-547b-843d-246e75b289c6', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it3', 'Recinto de ubicación del sistema de generacion esta construido de acuerdo al plano', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('5e45a3b8-8ecc-5a96-8520-5b22c2da48c4', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('1822a7ef-8f45-54f2-8778-ff1252ab1cab', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it4', 'La Base o soporteria del grupo generador, esta de acuerdo al diseño y planos', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('4b1b735a-4e1b-5d09-8091-bdbede851528', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('2b2055e5-d26c-5ebf-8b7f-fdaa594a912e', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it5', 'Esta el conjunto correctamente alineado(verificar registros u ordenar su ejecucion)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('342f4a52-e777-5e17-8947-5b51a01d3f40', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('684229c4-0c16-59bc-8e15-d3eab2853afb', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it6', 'El conjunto esta nivelado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 110),
  ('6c6f3500-be93-51ee-892b-488690cb1f1e', '9ba7b5d0-41be-57fa-883b-b04632e312ce', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('99bb0701-2093-58c9-8510-f326d6c5d171', 'P_ELE-025-S3', 'Motor del Grupo', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', '99bb0701-2093-58c9-8510-f326d6c5d171', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('94b64028-5aaf-5fdd-8a16-379b55690ad9', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it1', 'La Carcaza del motor esta buenas condiciones sin golpes, ni roturas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('9b29d7af-0a45-582b-891c-cedadb813c94', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('f06151b8-3947-54bd-86f6-2aa093166be6', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it2', 'La pintura y acabados estan en buenas condiciones, no se presenta corrosion.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('d76c6aa4-ce21-50c5-8868-1ee5c9d8b772', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('aa6f73d0-7a98-59eb-863c-fb6455dc0d56', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it3', 'Los elementos de sujeción, tornillos, pernos de anclaje, abrazaderas, estan completos y ajustados.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('8b789a42-fb4b-56e5-89df-6685437f099b', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('ba5eff48-0e65-5d3d-8dfb-4de1e685be9f', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it4', 'Los elementos de sujeción de tuberias y cables de conexión tales como abrazaderas, estan adecuadamente colocadas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('e0c5e686-1247-5c52-8acb-ef8b26f9334c', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('883591ca-cd73-5300-846e-a93d92b7fc3f', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it5', 'Las empaquetaduras estan correctamente instalados no se ven fugas de lubricante', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('347ada86-b35a-54c8-86f8-5147d0833ee1', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('5dc5e964-4408-51cb-8eaf-54d0ea505edd', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it6', 'Los Rodamientos estan protegidos', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 110),
  ('8f761d0f-fe5a-5b06-86af-dd79a6492c84', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('3c1decc6-f5b6-5459-8b14-fa9344f96e87', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it7', 'Soportes de motor', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 130),
  ('d84ad40d-9ef5-5681-83d4-8d3af15bda7a', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('0f71b0d4-22a3-50c1-893e-3ae27256a6a0', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it8', 'Motor de arranque instalado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 150),
  ('2a989abf-01b9-5717-8543-63512f512919', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('404db33f-8267-5d8f-8685-7821b43b3996', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it9', 'Alternador instalado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 170),
  ('dcb4885b-08bb-51b5-844c-9ca2370b7353', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('89ae711f-a9cf-5a57-8e90-27b59ed78139', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it10', 'Sistema eléctrico completo y bien conectado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 190),
  ('d8853b42-095d-59ed-80e5-84267a4b808f', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('fbb02937-f276-56fe-85b3-613b3951a584', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it11', 'Baterías en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 210),
  ('c89044e2-6309-5b6b-8d2b-fb48fe90d3e4', '99bb0701-2093-58c9-8510-f326d6c5d171', 'it11_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 220);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('ff9bee06-af0e-545d-84ed-13434e9f0964', 'P_ELE-025-S4', 'Sistema de alimentacion de Combustible', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', 'ff9bee06-af0e-545d-84ed-13434e9f0964', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('5298d0e3-e6fc-52c6-8343-d60b64e8f5fa', 'ff9bee06-af0e-545d-84ed-13434e9f0964', 'it1', 'Filtros de aire en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('f01fe1d5-96cb-5208-8564-b6d379ec20ef', 'ff9bee06-af0e-545d-84ed-13434e9f0964', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('b16d3bb4-7623-5cf6-8179-bf69e121f00c', 'ff9bee06-af0e-545d-84ed-13434e9f0964', 'it2', 'Mangueras Combustible', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('0de7d80f-6a95-5a85-8ef3-3667f2ebe25f', 'ff9bee06-af0e-545d-84ed-13434e9f0964', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('2084b377-4111-553d-80be-d905e01c643d', 'ff9bee06-af0e-545d-84ed-13434e9f0964', 'it3', 'Niveles de aceite', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('96f265da-c69f-5455-8963-c1822dfe78f6', 'ff9bee06-af0e-545d-84ed-13434e9f0964', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('a0fa679a-2c3e-5474-8680-94a1e768211c', 'P_ELE-025-S5', 'Exhosto', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('cdb7f169-15c7-5370-8273-0a862d3a5766', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it1', 'Mofle de escape sin fugas y con soportes antivibraciones (no debe estar totalmente rigido)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('bc5fa840-b88b-58d6-83b3-d72af2d1fb46', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('a276468b-cc17-5364-8cb5-e1ec53c2e969', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it2', 'Radiador en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('9d1868eb-57d4-5fc3-818b-e1e44fe9cc54', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('9b7a4577-2d17-5f1b-844a-4cd1c53676c3', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it3', 'Nivel del refrigerante', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('13169b6c-8b09-5017-8b26-286b44318c7e', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('286654cd-4dff-5895-8919-c7478c4e97d5', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it4', 'Guardas de protección', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('75721239-0258-597e-8a3f-5b8798dd94dd', 'a0fa679a-2c3e-5474-8680-94a1e768211c', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('26652680-893d-5578-8535-4b1e107d00c0', 'P_ELE-025-S6', 'Generador', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', '26652680-893d-5578-8535-4b1e107d00c0', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('f87c5fbf-f45e-545b-826c-385b6721d1e4', '26652680-893d-5578-8535-4b1e107d00c0', 'it1', 'Soporte de generador', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('6f6ced56-0472-5bf3-8329-0d0601260b64', '26652680-893d-5578-8535-4b1e107d00c0', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('0e775ecb-6754-5a0e-88df-8123d0c01b80', '26652680-893d-5578-8535-4b1e107d00c0', 'it2', 'La Carcaza del generador esta buenas condiciones sin golpes, ni roturas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('7d141899-1d5b-569a-8e43-d543d868e016', '26652680-893d-5578-8535-4b1e107d00c0', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('a9630bcc-9f9b-5a06-8116-2101dfa2bb50', '26652680-893d-5578-8535-4b1e107d00c0', 'it3', 'La pintura y acabados del generador estan en buenas condiciones, no se presenta corrosion.', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('0ac8ab6b-dd41-5ab0-8f0b-e2ddc8ad6953', '26652680-893d-5578-8535-4b1e107d00c0', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('089f7b92-93b6-5771-80c6-6ec6d6baf9fc', '26652680-893d-5578-8535-4b1e107d00c0', 'it4', 'Los Rodamientos estan protegidos', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('8479fa6f-c095-52d0-879e-95d620025172', '26652680-893d-5578-8535-4b1e107d00c0', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('08dd1d52-ad1e-5985-83ab-4bc48d76e02f', '26652680-893d-5578-8535-4b1e107d00c0', 'it5', 'Los elementos de sujecion de tuberias y cables de conexión tales como abrazaderas, estan adecuadamente colocadas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('dc43f607-7db5-50e9-8517-564c2034f43a', '26652680-893d-5578-8535-4b1e107d00c0', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('f65e9f79-1415-5667-8c27-65e77b9c8656', '26652680-893d-5578-8535-4b1e107d00c0', 'it6', 'Conexiones eléctricas completas y en buenas condiciones', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 110),
  ('6ef22138-6b59-58ff-8ae2-14208a4b2c81', '26652680-893d-5578-8535-4b1e107d00c0', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('3bed4c4b-e93b-535d-8087-b1485f01bfb1', '26652680-893d-5578-8535-4b1e107d00c0', 'it7', 'Puestas a tierra conectadas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 130),
  ('1b9b8d5a-07ad-5332-868f-4eb2a9aabe1a', '26652680-893d-5578-8535-4b1e107d00c0', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('a143fde5-dd0f-5d1c-85de-8dbdd0065ce3', '26652680-893d-5578-8535-4b1e107d00c0', 'it8', 'Insonorización (aislamiento ruido)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 150),
  ('493f54b9-ef8f-598f-841b-eccdf1759318', '26652680-893d-5578-8535-4b1e107d00c0', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('1e24ca8e-12f8-5357-8702-629291a45f4a', '26652680-893d-5578-8535-4b1e107d00c0', 'it9', 'Control Antivibraciones (Patines)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 170),
  ('5071d854-18f5-598d-82fc-6a9c0165b2ca', '26652680-893d-5578-8535-4b1e107d00c0', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('4dc49639-b27b-57e4-805c-24f3aa7711d6', '26652680-893d-5578-8535-4b1e107d00c0', 'it10', 'Caja de Totalizadores', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 190),
  ('d90488e1-ad87-51ba-815b-2129e8c02659', '26652680-893d-5578-8535-4b1e107d00c0', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('907fac65-bcbe-5e31-8167-b9d13df54e82', '26652680-893d-5578-8535-4b1e107d00c0', 'it11', 'Nivel de Ruido aceptabñe de acuerdo a los diseños', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 210),
  ('a491203a-7008-5242-8d77-dbda02fa526e', '26652680-893d-5578-8535-4b1e107d00c0', 'it11_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 220),
  ('b131cf1e-a4e9-5162-8748-dff202b4983b', '26652680-893d-5578-8535-4b1e107d00c0', 'it12', 'Insonorización (aislamiento ruido)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 230),
  ('666b5c96-3902-5aec-8cbb-9bdec877f1f2', '26652680-893d-5578-8535-4b1e107d00c0', 'it12_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 240);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('8326129c-5bdc-5dcd-801b-132ba12056a7', 'P_ELE-025-S7', 'Instrumentacion', FALSE, 70);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', '8326129c-5bdc-5dcd-801b-132ba12056a7', 70, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('3d26ce12-d324-566a-882f-a77397cdf0d1', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it1', 'Estan instalados los dispositivos de control (cajas de control, contactores, reles)', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('2ca2ede2-2388-5265-8094-060d147cb079', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('0ce30e05-79c8-50f2-8540-63b8364ea21c', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it2', 'Estan instalada la transferencia para el sistema de respaldo electrico', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('1545c568-a9ba-5574-8efd-be900a7156b0', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('347995ed-c94d-5e86-87f5-6ac22f6e0955', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it3', 'Sistema de control e Indicadores completos y en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('7c662c96-dbab-59e7-8279-65cc0a3c0cb6', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('22fa550f-87dc-591b-8e63-0a7df171d971', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it4', 'Voltimetros', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 70),
  ('1ee0a983-0321-5695-8937-60824861392f', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('e1f32665-0917-5e40-8385-1c2bb5489941', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it5', 'Amperimetros', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 90),
  ('8b25ea96-9997-5e36-8150-635abbbd568d', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('e4a1a69f-6fe2-599f-892e-662ade86d146', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it6', 'Horometros', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 110),
  ('203f6a8d-1074-5761-8cf0-338d4745dbd2', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('230f39ad-f452-5637-81f8-59e38a916998', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it7', 'Medidores deTemperatura', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 130),
  ('90d26fd2-0deb-508b-87ab-4b22c940b2bb', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('520d51e1-162e-5dfd-86af-3498ec99a15f', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it8', 'manometros', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 150),
  ('866963c4-67cd-574b-88b0-e340caa26e79', '8326129c-5bdc-5dcd-801b-132ba12056a7', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('85b0971c-4262-513f-8abf-d309b19fc72b', 'P_ELE-025-S8', 'Documentacion', FALSE, 80);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', '85b0971c-4262-513f-8abf-d309b19fc72b', 80, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('7fdcc9b7-1738-57c4-8812-c79727d8cebd', '85b0971c-4262-513f-8abf-d309b19fc72b', 'it1', 'Existe señalizacion, identificacion o señalización de ubicación de generador de emergencia', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 10),
  ('dd70a5fb-c704-53a9-836d-3482bcefa09f', '85b0971c-4262-513f-8abf-d309b19fc72b', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('1c61a6f7-80d1-5106-8dc4-002a171dbc28', '85b0971c-4262-513f-8abf-d309b19fc72b', 'it2', 'Existen en la planta planos de instalacion y memorias tecnicas', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 30),
  ('51e4acce-0dcd-50b4-8dc4-b7bb67915501', '85b0971c-4262-513f-8abf-d309b19fc72b', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('ebbfa95d-d44c-5639-8186-ec4d11914eca', '85b0971c-4262-513f-8abf-d309b19fc72b', 'it3', 'Existe manual de funcionamiento del grupo generador', 'checkbox'::public.field_type, FALSE, $j$["Cumple","No cumple","N/A"]$j$::jsonb, NULL, 50),
  ('da2bdb71-bc0e-5be1-8ecc-6a9785fba79e', '85b0971c-4262-513f-8abf-d309b19fc72b', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('4e61e796-bdab-5ccb-868d-c9991c18398b', 'P_ELE-025-S9', 'Resultado del Pre-Comisionamiento', FALSE, 90);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('176d425f-9600-5891-8287-57013de0cea5', '4e61e796-bdab-5ccb-868d-c9991c18398b', 90, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('432792fd-ea7c-5e57-87bd-9355830597b5', '4e61e796-bdab-5ccb-868d-c9991c18398b', 'resultado_final', 'Resultado', 'select'::public.field_type, TRUE, $j$["APROBADO","RECHAZADO"]$j$::jsonb, NULL, 10);

-- ───────── P_BIO-020: Tea — Aprovechamiento de Biogás ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES
  ('182f1016-2c93-54ac-8e0e-e77daaf32c2a', NULL, 'P_BIO-020', 'Tea — Aprovechamiento de Biogás', 'precomisionamiento', 'Jun-09 (versión cero)', 'TC-01 FormatoPre y Comisionamiento-TEA.xls', NULL,
   (SELECT id FROM public.equipment_types WHERE code = 'TEA'));

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('cf428c00-fa41-50f0-87dc-fad68f5ce4e1', 'P_BIO-020-S1', 'Datos de Placa', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('182f1016-2c93-54ac-8e0e-e77daaf32c2a', 'cf428c00-fa41-50f0-87dc-fad68f5ce4e1', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('ddc1853f-505a-5b2b-8ea5-3d768859f1c2', 'cf428c00-fa41-50f0-87dc-fad68f5ce4e1', 'placa_1', 'Capacidad', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('304a11ac-0727-56ed-82f5-2d8878d2255f', 'cf428c00-fa41-50f0-87dc-fad68f5ce4e1', 'placa_2', 'Dimensiones', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'P_BIO-020-S2', 'Instalaciones y estructuras soporte', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('182f1016-2c93-54ac-8e0e-e77daaf32c2a', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('13241a55-548a-5283-8378-3c16a46ce61b', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it1', 'Se han realizado cambios a los diseños, soportados con planos red line o as built', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 10),
  ('16a4887c-408f-5a19-8a2e-ffc58640e06b', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('8b88028e-3a2a-50d3-8c14-8fff36ac0a66', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it2', 'Estan reportados en todos los frentes (Ingenieria de diseño, construccion civil, electrico, I&C...), todos los cambios a los diseños y planos.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 30),
  ('93b13634-9c69-5810-830d-2531e040bdde', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('23ca7cbd-b23b-58c4-8195-b12d490f48d0', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it3', 'Recinto de ubicación esta de acuerdo al plano (si se considera en los diseños)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 50),
  ('c75e5f16-492c-597a-8eb2-3e4f27f44298', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('c1b0aac4-e968-5153-8069-fad82e4e1647', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it4', 'Pedestal, esta construido de acuerdo al diseño y planos', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 70),
  ('9988aaa1-c181-5c64-830b-fe856887d3c4', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('e48ab17d-530f-5e4d-85f1-204175992bc4', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it5', 'Vientos o retenidas construida de acuerdo al diseño y planos', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 90),
  ('c512d1cd-7f47-5752-81b8-def04e109c21', 'b8e63349-7c44-528e-8cb3-4c9fe728aed3', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('29406aac-b00b-534d-87e0-6d5eca0c8d16', 'P_BIO-020-S3', 'Cuerpoy estructura TEA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('182f1016-2c93-54ac-8e0e-e77daaf32c2a', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('ca8d1855-ac05-5ba3-8474-494d6aa41f2c', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it1', 'Las dimensiones externas de la TEA cumplen las especificaiones de diseño.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 10),
  ('73b0038c-9c9f-54a4-8af8-9cd225c00227', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('169f5c2f-280a-5b5a-8587-c6b918190df9', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it2', 'Cuerpo de la TEA esta buenas condiciones sin golpes ni deformaciones', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 30),
  ('5b8798b4-5411-57fb-84ae-6bfccb77ec69', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('4cbc1ec5-d136-5fd4-81a9-457f343e0cd0', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it3', 'Estado de las plataformas y escaleras', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 50),
  ('e8d767be-5ad4-54ea-8edf-450ff8f09d77', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('7cb07dca-af3f-5976-8881-014e31da488e', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it4', 'Sistema de seguridad para la escalera instalado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 70),
  ('0a6c05a2-39e7-5fde-840a-53bff846088e', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('c6124c28-d15e-54f3-8f6d-4393ae9aac22', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it5', 'La pintura y acabados estan en buenas condiciones, no se presenta corrosion y se cumple con las especificaciones de pintura', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 90),
  ('b51311d6-1ece-5d14-8674-941333b4fe90', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('f4a368c2-550d-5b94-8b47-5fdbf396af11', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it6', 'Quemador Instalado de acuerdo al diseño', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 110),
  ('a1c89caa-5936-57be-881f-fb0b52d2ab12', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('6b7b45f9-927a-5c63-83b7-9c573478bf85', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it7', 'Están instaladas todas las válvulas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 130),
  ('4c669616-c06f-5a15-8fa1-b31aa82b50bf', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('f0d8d2fb-42c1-526f-8069-5f1a45a6be75', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it8', 'Verificar conexión de las luces indicadoras y alarmas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 150),
  ('439fbfe5-7171-59ec-8409-16d2d04c9884', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('3c03499e-be04-54e6-81fa-7e1466279c6b', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it9', 'Trampa de llama instalado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 170),
  ('4eb88c64-0b68-5828-8857-4670fbdcb67d', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('46bcd1ea-70ec-545e-88ec-1a95cd7567d8', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it10', 'Linea piloto instalada', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 190),
  ('92aa7bdf-5a6f-5442-8649-5ad0aea7270c', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('c8d24461-63f1-5422-8983-12fcfa43f6dd', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it11', 'Todas la tuberias asociadas estan conectadas de acuerdo a los diseños', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 210),
  ('67bcbc46-216a-5dcd-83b6-9e20027e75e5', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it11_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 220),
  ('aa58b5ad-9398-55fa-8fb0-270356e9f2a0', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it12', 'Los elementos de sujeción de la valvulas y tuberia anexa a la TEA, tornillos, pernos de anclaje, abrazaderas, estan completos y ajustados.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 230),
  ('54700a70-1f74-56b1-85f2-af449d59861e', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it12_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 240),
  ('ec7afbf5-0d8d-51b6-8d8a-7e5af1a92011', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it13', 'Estan todas las bridas de acuerdo a diseños', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 250),
  ('65fdc9f0-e794-5005-816e-01779c4e75d0', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it13_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 260),
  ('fc5742d2-2e91-5add-8eb1-21ae3153f50c', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it14', 'Linea piloto esta construida de acuerdo a los diseños', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 270),
  ('62cbf3cc-a201-5387-8b69-aed535a719c5', '29406aac-b00b-534d-87e0-6d5eca0c8d16', 'it14_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 280);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'P_BIO-020-S4', 'Instrumentacion', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('182f1016-2c93-54ac-8e0e-e77daaf32c2a', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('cfcf68d6-9ec4-58f8-8d18-6635e0c8c10b', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it1', 'Revise intalacion de todos los componentes eléctricos y de instrumentacion (siga los formatos de inspecion electricos y de instrumentacion)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 10),
  ('d5589510-3058-5b68-837a-8f444b5a0e04', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('37a0b402-51e2-514f-8b28-53a290614a2a', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it2', 'Conexiones a tierra estan completas según diseños', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 30),
  ('0954c70c-7f8b-5dd7-8140-6385bbe02507', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('1af114ed-4728-5b1d-863e-dc41ab887dfc', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it3', 'Estan instalados los elementos de instrumentacion (cajas de control y sus conectores)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 50),
  ('2f09ccac-3acb-569e-83da-9f4a55561cfe', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('a9c907b9-3a66-5468-879d-acaaef885c7d', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it4', 'Estan conectados y operativos los indicadores y/o medidores de temperatura de acuerdo a los diseños', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 70),
  ('be06c8a3-db3e-5c1f-8d11-4029db6c68bf', '2db21ac0-53bf-5c9f-80b5-2fcb0f904996', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('400b813d-c374-5957-8a4a-4bf6b8e9f2c2', 'P_BIO-020-S5', 'Documentacion', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('182f1016-2c93-54ac-8e0e-e77daaf32c2a', '400b813d-c374-5957-8a4a-4bf6b8e9f2c2', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('c6db6323-6e96-521d-8fee-e0c1f706618d', '400b813d-c374-5957-8a4a-4bf6b8e9f2c2', 'it1', 'Existen en la planta planos de instalacion y memorias tecnicas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 10),
  ('cf3dda0e-338f-507e-8b7d-7405f8eefd2c', '400b813d-c374-5957-8a4a-4bf6b8e9f2c2', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('e1c0b6df-06d8-50c0-89a1-bca9ce980ee1', '400b813d-c374-5957-8a4a-4bf6b8e9f2c2', 'it2', 'Existe manual de operación de la Tea', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 30),
  ('cf5f3da3-64c7-56c8-8216-5bc726a807f7', '400b813d-c374-5957-8a4a-4bf6b8e9f2c2', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('eb10f793-76f3-5eb5-8516-dedbb2d7762a', 'P_BIO-020-S6', 'Resultado del Pre-Comisionamiento', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('182f1016-2c93-54ac-8e0e-e77daaf32c2a', 'eb10f793-76f3-5eb5-8516-dedbb2d7762a', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('78de8cb5-47c7-5b75-897a-55f00b568744', 'eb10f793-76f3-5eb5-8516-dedbb2d7762a', 'resultado_final', 'Resultado', 'select'::public.field_type, TRUE, $j$["APROBADO","RECHAZADO"]$j$::jsonb, NULL, 10);

-- ───────── P_BIO-010: Soplador de Biogás ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES
  ('0a6c8444-82e7-5a5a-8b6d-1dcb094a0a11', NULL, 'P_BIO-010', 'Soplador de Biogás', 'precomisionamiento', 'Jun-09 (Ver. 0)', 'S1 a S4 FormPre-ComisionSoplador.xls', NULL,
   (SELECT id FROM public.equipment_types WHERE code = 'SOPLADOR'));

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('a7478655-a36b-5ce8-842f-3682b50ce278', 'P_BIO-010-S1', 'Verificación del Soplador', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('0a6c8444-82e7-5a5a-8b6d-1dcb094a0a11', 'a7478655-a36b-5ce8-842f-3682b50ce278', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('db1ca240-d3aa-5e6b-8bc0-aaa0bf4d9b86', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it1', 'Se han realizado cambios a los diseños, soportados con planos red line o as built', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 10),
  ('eef13fe0-8d54-5d35-8d30-9c53ee0dd018', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('f7be7152-1864-505b-836e-483112676e35', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it2', 'Estan reportados en todos los frentes (Ingenieria de diseño, construccion civil, electrico, I&C...), todos los cambios a los diseños y planos.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 30),
  ('d9d908ba-a1ff-5abd-88ea-8fcb811d614c', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('ea02536f-ab2e-5d5e-867f-f3d32f8323fe', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it3', 'Caseta de sopladores esta construido de acuerdo al plano (si se considera en los diseños)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 50),
  ('de1267ac-44b7-50bb-8726-2953b0b4fc11', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('6c83b79c-5313-579d-8edc-5dfade90392c', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it4', 'La Base o soporteria del soplador, y las tuberias esta construida de acuerdo al diseño y planos', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 70),
  ('e4293f10-e469-5c59-8bf8-083a98cf04b4', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('3de752a7-c912-5358-8663-c32cbea335ce', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it5', 'La plataforma base esta en buen estado y se encuentra correctamente instalada', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 90),
  ('f5090de1-1f28-51ba-8079-0f957a653eca', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('3d276a37-a0d7-5ecc-860b-641b5edc600a', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it6', 'Los pernos sujetadores de la base estan en buen estado y se encuentran correctamente instalados', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 110),
  ('5633ae98-1d5c-558f-8fea-fdffdd3f6396', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('1fe39d85-cd18-5ffb-836e-6372fa10c204', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it7', 'La pintura y acabados de la bomba estan en buenas condiciones, no se presenta corrosion', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 130),
  ('692f02ce-2577-54a8-8fe2-d13c6c75591f', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('e6fd8741-6254-5d62-82e0-bf001d53d54b', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it8', 'La ubicación del Soplador esta de acuerdo al plano', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 150),
  ('1da350f4-9824-5b90-8781-fd32522f80a6', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('a1b4949b-695e-5f62-8817-e0594ccf2c40', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it9', 'Se encuentra el motor electrico instalado?', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 170),
  ('24c5cf20-4d24-5566-8fb3-bdac0619f376', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('c80f03d7-02dd-5f22-8984-799ae127e862', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it10', 'La conexión a la linea de proceso esta construido de acuerdo al plano', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 190),
  ('1f8ed9e3-03c1-5c8d-8da1-c882ac91ff1c', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('e71ea5ed-3580-5021-8a73-4c4a4bbe3d54', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it11', 'Se encuentran los tornillos para alineacion del motor instalados?', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 210),
  ('a65ccf29-40bf-51b7-8786-61533c24bb5d', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it11_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 220),
  ('77c9a00e-0d9c-58a2-8dd5-7d5ffd83c630', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it12', 'Se encuentra alineado el motor?', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 230),
  ('95b6a218-62b8-500a-863d-c0debb6d6207', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it12_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 240),
  ('757ac21a-e82b-51e2-8396-556f3bc46b47', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it13', 'El chazis se encuentra nivelado correctamente?', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 250),
  ('26214fd7-269f-5cf7-8ab6-c643c03c7410', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it13_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 260),
  ('6f1ee070-cf2c-5849-8906-52f933744244', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it14', 'Esta la transmision instalada de acuerdo al manual de instalacion del equipo?', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 270),
  ('6ee41654-fd73-54ec-821c-895d47d3ddba', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it14_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 280),
  ('6baf0d04-310d-52a3-87b4-ac9150b1b6ff', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it15', 'Estan instalados los bloques de amortiguacion o tuercas de fijacion y cuñas de nivelacion (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 290),
  ('e270567c-7927-585a-8726-c1e850230f9b', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it15_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 300),
  ('966571fe-3cf4-55db-8b8e-1f57474abbab', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it16', 'La parte exterior del Soplador esta en buen estado fisico', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 310),
  ('3b1cf268-17c7-53b9-8166-6f2e633695d1', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it16_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 320),
  ('7616bcba-2617-5b7a-8207-c8d9f5fd2fe9', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it17', 'La cubierta protectora del acople se encuentra correctamente instalada?', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 330),
  ('a859b5f5-da4f-5e44-8054-59365a3b836b', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it17_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 340),
  ('bcc5b13f-2ea8-55c8-82c7-cf313428dc89', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it18', 'La tuberia esta instalada de acuerdo al diseño', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 350),
  ('b31fb027-c3ef-5a98-80dc-d80c7b5f04e0', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it18_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 360),
  ('ec56c08e-aa7f-5608-8c00-a0af335594aa', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it19', 'Materiales de la tuberia cumple con las especificaciones tecnicas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 370),
  ('827d74c7-3737-536d-88f2-caf2f0fbc413', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it19_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 380),
  ('157a6c00-59e0-5b93-8f1b-85cb5a038ea4', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it20', 'La orientacion del equipo esta de acuerdo al sentido de flujo del proceso', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 390),
  ('7978e070-e8df-5d06-8d13-8e72c9714617', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it20_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 400),
  ('3a8b474c-1e96-5cde-8916-dbb5a9589d97', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it21', 'La válvula de entrada al equipo se encuentra en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 410),
  ('bb883570-d4ed-5b9e-8de0-372a15504741', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it21_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 420),
  ('e5a72f30-5a75-5db1-8a80-92ef39ff0224', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it22', 'La válvula de salida del equipo se encuentra en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 430),
  ('abf21507-9e5b-590b-8524-92c887e00f40', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it22_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 440),
  ('073f7c8a-b324-5db5-86cb-bb7e2b13ba58', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it23', 'Manometros y sensores instalados de acuerdo al diseño', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 450),
  ('9f471af4-d14f-5af3-8ae8-1b24c90f8caa', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it23_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 460),
  ('1d319dbc-d90c-5bc7-81bd-80e0dc39d7b0', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it24', 'Manometros y sensores en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 470),
  ('d1c07199-43d6-5a95-81bb-2463f28e726f', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it24_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 480),
  ('cba03d1a-5539-5cc9-8a63-519052e91682', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it25', 'Esta la envoltura de seguridad (los dos semicascos) instalados?', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 490),
  ('3969dad9-2f24-596c-828a-29a5498ee542', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it25_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 500),
  ('9f34d77f-195c-56cc-8bbb-04427969bd0d', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it26', 'El filtro de aire de ingreso se encuentra limpio y en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 510),
  ('6c1fde90-e0ff-50fc-8d5e-8b97cd05280a', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it26_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 520),
  ('ff9faee7-eb5a-545a-8d34-b29f7df020c3', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it27', 'Existe señalizacion, identificacion o señalización de existencia del equipo', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 530),
  ('e03a5d4e-9e18-52d8-81d7-c079fa009de0', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it27_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 540),
  ('2f051a9c-e021-5972-85d0-d805ac3423f1', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it28', 'Existen en la planta planos de instalacion y memorias de especificaciones tecnicas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 550),
  ('bbcfb6cb-6c36-59f2-8442-281393b0fa96', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it28_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 560),
  ('73c545ee-35fc-56af-871d-21b4e83a6c34', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it29', 'Existe manual de funcionamiento del soplador', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N/A"]$j$::jsonb, NULL, 570),
  ('2a855742-f868-57b6-87cb-af1b359aa37e', 'a7478655-a36b-5ce8-842f-3682b50ce278', 'it29_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 580);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('1772d9e6-10d2-59e2-8313-c80f11025f05', 'P_BIO-010-S2', 'Resultado del Pre-Comisionamiento', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('0a6c8444-82e7-5a5a-8b6d-1dcb094a0a11', '1772d9e6-10d2-59e2-8313-c80f11025f05', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('59239a27-30fe-514c-810e-97b7f940d2a8', '1772d9e6-10d2-59e2-8313-c80f11025f05', 'resultado_final', 'Resultado', 'select'::public.field_type, TRUE, $j$["APROBADO","RECHAZADO"]$j$::jsonb, NULL, 10);

-- ───────── P_BIO-002: Sopladores de Aire ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type, revision, source_doc, alcance, equipment_type_id) VALUES
  ('a2884493-4dba-54fc-81b1-06d2883c8b74', NULL, 'P_BIO-002', 'Sopladores de Aire', 'precomisionamiento', 'Jun-09 (versión cero)', 'SA1 a SA3 FormatoPre-Comisionamiento Solpadores de aire.xls', NULL,
   (SELECT id FROM public.equipment_types WHERE code = 'SOPLADOR'));

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'P_BIO-002-S1', 'Lista de Chequeo', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a2884493-4dba-54fc-81b1-06d2883c8b74', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('216a8a07-b274-5d1f-87a3-b936d84145d1', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it1', 'Se han realizado cambios a los diseños, soportados con planos red line o as built', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 10),
  ('8197b3e3-6aa7-5df7-8a92-d84d638671fe', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('199dd3a8-b3c4-533d-84ef-4c0f7ef4e704', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it2', 'Estan reportados en todos los frentes (Ingenieria de diseño, construccion civil, electrico, I&C...), todos los cambios a los diseños y planos.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 30),
  ('27e462b3-9264-5bc9-828c-ef5e6f7400b9', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('2f0a96fc-2934-5cc9-8307-2733fed6121f', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it3', 'La ubicación del Compresor esta de acuerdo al plano', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 50),
  ('2d926751-56b7-5d13-8a20-dce6117ac9f0', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('3b88c8d2-622a-542e-8ba1-ec937d076b8d', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it4', 'La obra civil para la base del equipo esta de acuerdo al plano de ingenieria y especificaciones del proveedor', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 70),
  ('c540aeb5-fad1-51dd-8e28-2c24463729b9', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('6b3f8205-a8f1-5bfa-8a47-17d7401274d2', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it5', 'Patas de anclaje en buena condición', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 90),
  ('544e9cf9-e6cf-5c17-80cf-463faf75c028', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('7880a7f5-6c2f-5815-8552-4c146ab4eeb7', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it6', 'Estructura de soporte en buena condición', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 110),
  ('f8728914-8d48-5251-88da-599ac3517998', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('da297cb2-64d1-5cc6-8961-737d347be983', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it7', 'El equipo se encuentra bien alineado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 130),
  ('1accce18-bd5a-5954-8178-da9d20fa32a2', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('a34c6658-b823-5b68-8650-c71d6ccd2a06', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it8', 'La tuberia de entrada al Compresor se encuentra bien instalada y acoplada según planos de ingenieria y especificaciones de fabricante', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 150),
  ('14ccf78c-9f13-547b-8a26-66233fec9ca3', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('ff63948e-1aec-53a5-8153-7dfab8ee33cc', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it9', 'La tuberia de salida del Compresor se encuentra bien instalada y acoplada según especificaciones de fabricante', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 170),
  ('e3ea8176-64b2-5096-8955-96ff26af254f', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('7f595548-b6cd-5ee1-836b-67626f1840c0', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it10', 'La tuberia de entrada al Compresor resulto bien despues de fase de limpieza.', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 190),
  ('36c943f2-d79f-524e-80c7-4a2826619530', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('af08d5a0-9c8f-541b-8e4b-142378726882', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it11', 'Los accesorios y valvulas de acuerdo a los diseños y especificaciones tecnicas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 210),
  ('785bb531-d799-508b-8b2b-0a681406cf68', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it11_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 220),
  ('6cbf66c4-1d2f-52ab-84ed-5fe7a831ae24', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it12', 'Bomba de compresión en buen estado', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 230),
  ('6046a0f9-a0c3-51e7-884c-183c130c1b1e', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it12_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 240),
  ('e020d879-cb02-5063-8529-3c291d211eb4', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it13', 'Motor en buen estado a la vista', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 250),
  ('eba8cfde-20bc-5823-8db8-8bc03cac177e', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it13_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 260),
  ('40ecede6-cd3f-53d0-847f-a12cda490139', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it14', 'Motor de auerdo a las especificacions tecnicas', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 270),
  ('58b390aa-0f88-53a2-856a-312c60e6b7c5', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it14_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 280),
  ('83fd3668-1d2e-5415-89b3-4b1c14db02ea', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it15', 'Encendido del motor en buena condición', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 290),
  ('c059259f-e542-5f59-8c61-b2053e83492c', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it15_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 300),
  ('4ade2029-6fda-55f4-83ff-e2532de9cf2a', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it16', 'Resguardos en los mecanismos de rotación', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 310),
  ('48855102-a961-5b7c-8f94-a197b94f6b7f', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it16_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 320),
  ('b2cf0be7-064d-53e4-807c-ce70a48c3a52', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it17', 'Acoples y empalmes de tuberias valvulas y accesorios en buena condición', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 330),
  ('07db0743-91c1-5a2a-8f8f-e528726d0154', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it17_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 340),
  ('e880b223-aa26-576f-886a-09e5009066f7', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it18', 'Aparejo de enganche o tiro instalados', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 350),
  ('c572a956-7a72-5be1-84b3-10277caec1dd', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it18_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 360),
  ('c4a6ab41-d77f-5a84-8a28-fc312b36bc86', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it19', 'Estan instaldos los indicadores de presión', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 370),
  ('1bca2e32-3fd4-5bc2-859a-f99c78046a04', '0019f2a9-105b-580e-8e84-4e3e66b16fa1', 'it19_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 380);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('7218d87e-6468-59b4-8d83-ea3db7f2703a', 'P_BIO-002-S2', 'ESPECIFICACIONES TECNICAS', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a2884493-4dba-54fc-81b1-06d2883c8b74', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('1c54adc4-3e31-59cf-8267-99c033933b77', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it1', 'TEMP. DE TRABAJO', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 10),
  ('4b7cae0a-4e9a-596e-8fe5-17309b0d967c', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('3259cf27-5910-52d3-85a7-e4a83db9b3ce', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it2', 'PRESION MAXIMA REQUERIDA OPERACIÓN CONTINUA', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 30),
  ('53edc6ae-8e5c-50dc-8c59-147a37d73800', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('06784751-ab6d-5b9b-81e9-1c0e035653fa', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it3', 'CAPACIDAD DEL COMPRESOR (LPM)', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 50),
  ('602f6e2d-e5fb-51fe-8f31-d9eaeaaec9f4', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('02a51ee8-dd84-517b-8a82-58ea37e3a060', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it4', 'DIAMETRO DE LAS CONDUCCION', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 70),
  ('beb42610-0f81-5ac1-845e-f6ac4870facd', '7218d87e-6468-59b4-8d83-ea3db7f2703a', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('0080f40b-af9e-5c76-83fc-bad2bae0c159', 'P_BIO-002-S3', 'ESPECIFICACIONES TECNICAS INDICADOR DE PRESION', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a2884493-4dba-54fc-81b1-06d2883c8b74', '0080f40b-af9e-5c76-83fc-bad2bae0c159', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('d81ff007-2fa2-548d-8744-0b82325017bf', '0080f40b-af9e-5c76-83fc-bad2bae0c159', 'it1', 'MARCA', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 10),
  ('47a88626-7b54-5ba5-831f-ab0bb308db77', '0080f40b-af9e-5c76-83fc-bad2bae0c159', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('0e6f5711-4730-5ad4-8033-2bbf88c24061', '0080f40b-af9e-5c76-83fc-bad2bae0c159', 'it2', 'REFERENCIA', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 30),
  ('4942e8a3-9cd2-535f-8146-ec5fa57d7075', '0080f40b-af9e-5c76-83fc-bad2bae0c159', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('e2bc75ed-c103-5aeb-8aba-c81db30906a3', '0080f40b-af9e-5c76-83fc-bad2bae0c159', 'it3', 'ESCALA psi', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 50),
  ('bd079888-9c77-5419-80e0-b5dcacff10eb', '0080f40b-af9e-5c76-83fc-bad2bae0c159', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('cb273553-e933-504b-83ac-967f63b15d59', 'P_BIO-002-S4', 'Documentacion', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a2884493-4dba-54fc-81b1-06d2883c8b74', 'cb273553-e933-504b-83ac-967f63b15d59', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('aa6e1db2-5bed-5585-8a30-2ad7432788cd', 'cb273553-e933-504b-83ac-967f63b15d59', 'it1', 'Existen en la planta planos de instalacion y montaje', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 10),
  ('c2c5774f-06d9-5ed6-8e8e-290b1a801486', 'cb273553-e933-504b-83ac-967f63b15d59', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('79f76d0a-12fc-5b5c-84a0-92a8d10a9a0a', 'cb273553-e933-504b-83ac-967f63b15d59', 'it2', 'Existe manual de operacion y funcionamiento', 'checkbox'::public.field_type, FALSE, $j$["Conforme","No conforme","N.A."]$j$::jsonb, NULL, 30),
  ('87e3d926-d21c-5dfd-8847-6298a25591f5', 'cb273553-e933-504b-83ac-967f63b15d59', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('f032ce36-8bba-5b1f-83ec-06dda3154df9', 'P_BIO-002-S5', 'Resultado del Pre-Comisionamiento', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a2884493-4dba-54fc-81b1-06d2883c8b74', 'f032ce36-8bba-5b1f-83ec-06dda3154df9', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('b7b2216c-0fb6-52f5-8fd9-e56ee243488f', 'f032ce36-8bba-5b1f-83ec-06dda3154df9', 'resultado_final', 'Resultado', 'select'::public.field_type, TRUE, $j$["SÍ","NO","CON RESTRICCIÓN"]$j$::jsonb, NULL, 10);

COMMIT;
