-- ============================================================
-- 0036 — Seed: 12 formularios de precomisionamiento de instrumentos
-- Generado por scripts/gen-instrument-forms-sql.cjs desde el Excel BIOTEC.
-- Re-ejecutable: borra y recrea solo los CHK-* (no toca formularios universales).
-- ============================================================

BEGIN;

-- Limpieza idempotente (cascade borra form_template_sections y section_fields)
DELETE FROM public.form_templates  WHERE key LIKE 'CHK-%' AND project_id IS NULL;
DELETE FROM public.template_sections WHERE code LIKE 'CHK%';

-- ───────── CHK-211: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('3a5fd1b5-b48f-52f8-8225-1576873c0a0f', NULL, 'CHK-211', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('f8b0c0f1-9bb4-5643-82f6-88df5c370834', 'CHK-211-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('3a5fd1b5-b48f-52f8-8225-1576873c0a0f', 'f8b0c0f1-9bb4-5643-82f6-88df5c370834', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('480944ce-bc32-5e59-87d8-a5daf8cd503e', 'f8b0c0f1-9bb4-5643-82f6-88df5c370834', 'tipo_de_sensor', 'Tipo de Sensor', 'select'::public.field_type, FALSE, $j$["Pt100","Pt1000","Termocupla","Otro"]$j$::jsonb, NULL, 10),
  ('5ad73f96-5608-5099-8721-80b196287f68', 'f8b0c0f1-9bb4-5643-82f6-88df5c370834', 'rango_de_temperatura', 'Rango de Temperatura', 'texto'::public.field_type, FALSE, NULL, NULL, 20),
  ('92ce3061-bad9-5f07-8ab4-fc58ab112621', 'f8b0c0f1-9bb4-5643-82f6-88df5c370834', 'clasificacion_de_area', 'Clasificación de Área', 'texto'::public.field_type, FALSE, NULL, NULL, 30),
  ('bfad4349-fc57-5b37-8a7d-60562c8a20f6', 'f8b0c0f1-9bb4-5643-82f6-88df5c370834', 'zona_ex', 'Zona Ex', 'texto'::public.field_type, FALSE, NULL, NULL, 40);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'CHK-211-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('3a5fd1b5-b48f-52f8-8225-1576873c0a0f', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('645a46bb-c996-5846-8750-b38187ecea2a', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it1', 'Instalación conforme a P&ID y planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('88fe267a-5192-555d-824d-96bd64992057', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('8866b37f-a3e7-5aa8-8167-857609a5b3a7', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it2', 'Termopozo o conexión al proceso correctamente instalado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('f3d58976-ca1e-56c9-8d0e-92945ec460b0', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('cb1a8f5b-6338-5283-8dce-412f2551a218', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it3', 'Longitud de inserción conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('a12f25a8-8c5b-5fe2-8f64-2be575d1c212', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('2ba875dd-0c92-555b-8cad-9e138e3111b9', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it4', 'Accesorios mecánicos correctamente ajustados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('7215f84a-4e08-5e10-8411-a35b34996c5c', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('f4aea277-308b-5d88-8fb3-09fbb8151080', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it5', 'Ausencia de fugas en conexiones al proceso', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('8fc101a3-50db-572b-8fcb-4b33b9f1cc80', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('e7fbb982-803b-5e48-8bb4-be37b374fa5d', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it6', 'Identificación del instrumento visible y legible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('59ac3bf4-979c-5023-8d3c-3d948cd8f8f1', '4639be9e-9c14-55ff-8f4a-36cd24ddd44d', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('11902922-0825-5959-8a1d-a4d0d4f38bb5', 'CHK-211-S2', 'VERIFICACIÓN EX E INTRÍNSECA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('3a5fd1b5-b48f-52f8-8225-1576873c0a0f', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('d5872791-8a1d-5141-8eae-7102c65da07f', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it1', 'Certificado Ex del instrumento disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('29caf6aa-f903-5369-88e9-1562ce5b4fe4', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('482343ea-d49c-54e9-8153-5cdf60588031', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it2', 'Certificado de la barrera disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('af8f3045-55ff-5905-81a7-c248b9226e9a', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('bf17b7fd-98b3-53f1-8921-566f66848481', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it3', 'Compatibilidad entidad instrumento–barrera verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('d4c967e1-1545-5fca-8d5f-eff69ea9c3dc', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('82469495-7bea-5974-837c-09eae1775bae', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it4', 'Circuito intrínsecamente seguro identificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('ab030e01-36bc-58fa-8982-0156c0e721c1', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('a083f6e4-5d66-52ba-8e81-5f3733d7093b', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it5', 'Segregación de cableado IS conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('c9c38bb5-255f-5af6-8c76-def493b853fe', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('da4f73e4-0e10-50cf-8265-c25cef562da1', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it6', 'Sistema de puesta a tierra de la barrera verificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('f8452c4f-3e0b-523f-82f2-1fba436d4f98', '11902922-0825-5959-8a1d-a4d0d4f38bb5', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('6ad24e05-612f-5877-8c5c-105b2951cb05', 'CHK-211-S3', 'VERIFICACIÓN ELÉCTRICA', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('3a5fd1b5-b48f-52f8-8225-1576873c0a0f', '6ad24e05-612f-5877-8c5c-105b2951cb05', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('07d66978-699e-5a3a-8d80-5468ee5f2ddd', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it1', 'Cableado conforme a diagramas aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('0d47623b-e08f-5595-87ae-dd3529079bed', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('070d212e-80c4-5da6-8aca-8a41111f5758', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it2', 'Tipo de conexión RTD o TC correcto', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('6c19abe1-de7e-5d29-89f0-26e16f56ba0a', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('ecc7b805-e2d3-5b95-8ce7-f51d246f2369', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it3', 'Polaridad correcta (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('43bb0c45-770e-50c2-8609-a69fd6f95a03', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('f91aa947-8722-507c-8fe3-564412ea1c93', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it4', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('3d99ed8e-90da-5966-87c3-f469a3a88160', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('83403241-74ea-559f-8671-be867178952f', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it5', 'Bornes identificados y ajustados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('d4ff672c-db3e-53ea-8e58-a9ebfc6836ed', '6ad24e05-612f-5877-8c5c-105b2951cb05', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'CHK-211-S4', 'DOCUMENTACIÓN', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('3a5fd1b5-b48f-52f8-8225-1576873c0a0f', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('1317e442-d21f-5ff7-8c11-fa859bb268e3', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('c0b51cf4-43e7-57c1-88a0-d22f25796b6c', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('9ca61777-3caa-5c2c-8e5b-c0fadc5130a6', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it2', 'Certificados Ex disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('66404cb3-ee1a-54e4-8fb2-7f1053972220', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('45032128-b422-526d-83fc-43fdf762a6e3', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it3', 'Certificado de calibración vigente', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('3c7503de-677d-5717-8e84-76e1163bab12', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('ca8c9a52-78e5-5be4-86c9-26aba6e280ca', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it4', 'Diagramas de lazo actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('9c96b620-6c16-5c63-8946-6c3677492459', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('240430af-85f9-5ad8-8189-37f87a8a08d0', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it5', 'Planos As-Built disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('4ce59a1a-7f6a-5c68-8134-3680278bfd6f', '307ae4ce-b150-5ace-8fb5-d40bf0c110f8', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('e97e36d5-087e-513a-8401-0bce4b267f05', 'CHK-211-RES', 'Resultado del Precomisionamiento', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('3a5fd1b5-b48f-52f8-8225-1576873c0a0f', 'e97e36d5-087e-513a-8401-0bce4b267f05', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('634f24e7-a233-5b60-8e26-0f90c4839e50', 'e97e36d5-087e-513a-8401-0bce4b267f05', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-212: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', NULL, 'CHK-212', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('486b3b01-ff30-550f-860a-1db7b8421fc3', 'CHK-212-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', '486b3b01-ff30-550f-860a-1db7b8421fc3', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('f9883742-658a-5c49-8e18-f3500e98e32e', '486b3b01-ff30-550f-860a-1db7b8421fc3', 'clasificacion_de_area', 'Clasificación de Área', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('921f52de-9748-57c9-8eb0-d524f6e3f55a', '486b3b01-ff30-550f-860a-1db7b8421fc3', 'zona_ex', 'Zona Ex', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('db2eb785-213f-5ca3-8d85-938f511a3ed0', 'CHK-212-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('2f1dd6d3-4985-51bb-8e78-6184ec13dd71', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it1', 'Instalación conforme a P&ID y planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('169b9846-d5a2-5fb9-8b1f-23f010a50306', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('a48034b0-14ac-5ab0-83da-05570596df6a', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it2', 'Sentido de flujo conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('b767922b-d1ed-5938-8c52-cf09e7736637', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('54f64b34-0125-5e1c-8ded-cc46fc40ae9e', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it3', 'Bridas, pernos y juntas correctamente instalados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('7505e6a5-3a17-53fa-859f-40a14f0541e3', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('c14b7939-788a-5719-8359-4c7858ae0b8a', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it4', 'Actuador firmemente fijado y alineado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('736d2d37-6ea1-57d6-8052-2bc0fdc724fa', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('37397175-997c-589d-81f5-ca5957dced38', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it5', 'Indicador visual de posición instalado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('2ba20a09-9c74-5d68-84c0-5d783b8f4c1a', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('153657a4-a632-5a08-87d6-e5c101f65f17', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it6', 'Ausencia de fugas visibles en conexiones', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('bf31b356-071e-58ea-816f-36aa7ce77d63', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('c4693a48-76ca-5e3a-8798-9cc4fd136953', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it7', 'Acceso adecuado para operación y mantenimiento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('01da509e-3d8c-5354-8c00-e1f65ca02d45', 'db2eb785-213f-5ca3-8d85-938f511a3ed0', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('30ed8e6b-898f-512f-8367-9e50a9a1242a', 'CHK-212-S2', 'VERIFICACIÓN EX E INTRÍNSECA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('665bbcf9-6ffd-5043-8ed3-d064fc1a47e0', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it1', 'Certificados Ex disponibles para componentes aplicables', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('7777e262-c0f0-5e66-8a42-d529d32c3963', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('78d0e379-a374-5674-887e-e087eea4b702', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it2', 'Certificados de barreras IS disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('4a0d08b3-98c5-5bb0-8d8e-41b638b2e14c', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('5cc65f5c-0375-5f1f-810a-816d0080a278', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it3', 'Compatibilidad entidad dispositivo–barrera verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('5f968324-2087-5dd2-8838-d5966b91c675', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('984a67aa-57bd-5c88-8042-1f94350880e9', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it4', 'Cableado IS identificado y segregado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('822e42da-a401-5cd7-8734-4fae9317784f', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('742321d0-38df-5046-863a-e1735c244916', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it5', 'Puesta a tierra de barreras conforme al diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('02e49103-92ef-5184-80cf-b1b840f9a2af', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('86e2221a-e4e8-53e0-8414-b1cc4814e485', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it6', 'Marcación Ex visible y legible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('43e365ca-ce89-53af-87e4-d25df09c3242', '30ed8e6b-898f-512f-8367-9e50a9a1242a', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('65745ec3-defb-53a8-8258-99f081949911', 'CHK-212-S3', 'VERIFICACIÓN ELÉCTRICA / INSTRUMENTACIÓN', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', '65745ec3-defb-53a8-8258-99f081949911', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('826fd7b0-fab2-5862-8f40-8324e62b794b', '65745ec3-defb-53a8-8258-99f081949911', 'it1', 'Cableado conforme a diagramas aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('5c974fba-3615-5e17-8433-2ca4d93eda9e', '65745ec3-defb-53a8-8258-99f081949911', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('f090a3ee-183f-56ac-8475-fd867ade2c19', '65745ec3-defb-53a8-8258-99f081949911', 'it2', 'Polaridad y terminaciones verificadas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('5f67a08f-af1e-5a8a-89fa-7c7cd28501ee', '65745ec3-defb-53a8-8258-99f081949911', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('bf370463-8ef0-54aa-8e54-1572601f6987', '65745ec3-defb-53a8-8258-99f081949911', 'it3', 'Final de carrera abierto operativo', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('49ffa5ba-e43a-55a1-8763-7912e8251f0b', '65745ec3-defb-53a8-8258-99f081949911', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('dea32c09-48a0-5706-8430-0c080fe919e1', '65745ec3-defb-53a8-8258-99f081949911', 'it4', 'Final de carrera cerrado operativo', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('13e97d4f-5483-5fed-86cd-494e22845e2c', '65745ec3-defb-53a8-8258-99f081949911', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('472ce1a5-c949-5e8c-8729-9c19ce324cd8', '65745ec3-defb-53a8-8258-99f081949911', 'it5', 'Señales correctamente recibidas en PLC', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('5017e48e-93d5-5814-8a78-f356548a012a', '65745ec3-defb-53a8-8258-99f081949911', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('af36a3bc-53ec-594b-8223-101057a0cd36', '65745ec3-defb-53a8-8258-99f081949911', 'it6', 'Etiquetado de cables y bornes conforme a ingeniería', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('3eef8e5b-428e-5cc7-8b52-8ccdea729ee4', '65745ec3-defb-53a8-8258-99f081949911', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'CHK-212-S4', 'VERIFICACIÓN DEL ACTUADOR', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('5324473f-9d7a-5519-8bd2-25fed376cceb', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it1', 'Alimentación neumática o eléctrica disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('3040609c-0567-5a76-8705-ea987baa4f6e', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('288879ca-5871-51ce-8a30-6584cd679063', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it2', 'Presión de aire dentro del rango especificado (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('0e849f9d-8431-5290-8e91-83d7f0bd2904', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('a20477e3-75b5-5631-8668-707687f317c3', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it3', 'Electroválvula operativa (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('2a89403e-e96e-5e3a-8407-428a91c481d7', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('2714b1fc-2cba-5e94-87af-1a18b8a50c38', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it4', 'Tiempo de apertura conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('98a2d12d-ce6f-536a-8524-336fdd230b25', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('87e3bd9e-e339-5795-8b9a-479e04ec3837', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it5', 'Tiempo de cierre conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('0b0ac27e-dbee-5301-8969-58a7770e5f95', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('b908ae00-44a8-5f8e-877b-94738ca20e75', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it6', 'Posición de falla (Fail Open / Fail Close) verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('19acdf78-f0c0-5084-82bf-01ff725c9278', '67866bbd-15a4-5e66-8d74-fc45f7cd3f39', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('8a23f024-84e2-5af7-843c-97f7e658a473', 'CHK-212-S5', 'DOCUMENTACIÓN', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', '8a23f024-84e2-5af7-843c-97f7e658a473', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('f24a3553-5b1f-5bbd-82c3-3bb6128baebb', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it1', 'Datasheets aprobados disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('5e13a652-339d-5528-8adf-5e2fa200e898', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('f1cd2c23-a86f-5cac-8647-071e6f85a0f5', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it2', 'Certificados Ex disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('8d7924aa-d266-5757-84e9-8dc449f7ec59', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('6c59ada2-424c-528e-8448-40ec2bad7d54', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it3', 'Diagramas de lazo actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('e83b3000-be4d-58b1-8d92-1c0bd57325a3', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('f274ef10-823b-549f-8935-1755657b5253', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it4', 'Planos As-Built disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('b9429991-caf9-5ca4-8f22-e77929c60b13', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('82a21c84-85ba-5680-896b-bde7b507df01', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it5', 'Manuales del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('61d4a695-18d2-583c-8f57-ba3583255454', '8a23f024-84e2-5af7-843c-97f7e658a473', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('f021dd93-e173-50ff-8875-30069972ba57', 'CHK-212-RES', 'Resultado del Precomisionamiento', FALSE, 70);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('2585773c-19e3-5c21-83f1-ef04e78eb848', 'f021dd93-e173-50ff-8875-30069972ba57', 70, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('7d413904-133b-5209-8d73-d9e709f61b84', 'f021dd93-e173-50ff-8875-30069972ba57', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-201: Transmisor de Caudal Electromagnético – Línea de Lodos ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', NULL, 'CHK-201', 'Transmisor de Caudal Electromagnético – Línea de Lodos', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('501fa0c6-0326-5b07-8e26-c9a0a692311c', 'CHK-201-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '501fa0c6-0326-5b07-8e26-c9a0a692311c', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('b255d8dd-390e-5ff9-8be6-a32c1a9af2db', '501fa0c6-0326-5b07-8e26-c9a0a692311c', 'linea', 'Línea', 'texto'::public.field_type, FALSE, NULL, NULL, 10);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('a63b2395-1029-5e75-8664-75d1ac2c0c14', 'CHK-201-S1', 'Verificación Documental', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('9e28ee9a-0fb6-5522-8e3c-a3ee020afe2f', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it1', 'P&ID actualizado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('3c089765-2a76-5a6a-8081-e54778dcb4d6', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('3d0dcb52-8029-56e1-8ff9-d90fe65028aa', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it2', 'Hoja de datos del instrumento disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('3a32af4d-afa4-50d8-8a11-cd5862a8f5c9', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('3feb97c0-3bdc-56bf-8097-5e3485a16eca', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it3', 'Plano de instalación mecánica aprobado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('48343118-e0f1-540d-84b7-7aa675c28499', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('9eccf7b6-6f1f-5cb6-889d-bb4e511a7c62', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it4', 'Plano de conexionado eléctrico aprobado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('ca3fd7f0-da48-5249-8cb1-1b802d28068e', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('e702986d-bc30-5cbd-80f1-8a9adeedcfd7', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it5', 'Plano de rutas de cables actualizado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('7d6afd07-c944-5f21-8b4f-0187287fa55c', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('fa97a590-f261-5fe9-8920-a20a3f484201', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it6', 'Certificados de calibración disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('bac67f2e-f966-59f1-81e3-9b76df698058', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('64cce970-d32c-521a-8eec-0a6f7ca98dac', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it7', 'Certificados de materiales y pruebas recibidos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('3584b178-f7da-5725-8bee-0f658d0e1bc3', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('1faa14f2-0c90-5396-831f-405297003710', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it8', 'Rango configurado conforme a ingeniería', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 150),
  ('77fa45a0-7ac6-5e42-8607-417e39fc6276', 'a63b2395-1029-5e75-8664-75d1ac2c0c14', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('5713267b-236a-593c-8a94-17260eca8485', 'CHK-201-S3', 'Instalación del Sensor', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '5713267b-236a-593c-8a94-17260eca8485', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('e47aa53e-d61d-552d-8168-4c3256e80d3b', '5713267b-236a-593c-8a94-17260eca8485', 'it1', 'Sensor instalado según dirección de flujo indicada por flecha', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('fc57c873-371b-51c3-83f6-1f23ba9f8cb7', '5713267b-236a-593c-8a94-17260eca8485', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('f28d7567-cb3e-5920-83fe-3d87941c5002', '5713267b-236a-593c-8a94-17260eca8485', 'it2', 'Diámetro del sensor coincide con el especificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('3e83d145-fa09-5abb-8662-23ea48ad7a5c', '5713267b-236a-593c-8a94-17260eca8485', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('3947becb-06d3-5e6c-8157-88cff6f8d959', '5713267b-236a-593c-8a94-17260eca8485', 'it3', 'Sensor instalado completamente lleno durante operación', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('aa9955c0-ea85-5f92-8368-b9f6ff6b6850', '5713267b-236a-593c-8a94-17260eca8485', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('3c38809f-df7b-5752-83f1-cd01dc8f56d5', '5713267b-236a-593c-8a94-17260eca8485', 'it4', 'Ubicación evita acumulación de aire o gases', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('e9085d92-8b2e-51b7-83c8-7f802e7d3ab4', '5713267b-236a-593c-8a94-17260eca8485', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('698902c7-394d-5927-899a-858f6e517435', '5713267b-236a-593c-8a94-17260eca8485', 'it5', 'Ubicación evita sedimentación excesiva de lodos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('0e594aa1-8e44-5dce-8796-843c6ea118a7', '5713267b-236a-593c-8a94-17260eca8485', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('9d039ffb-f458-5ebb-8cc1-d4e8c2fe576d', '5713267b-236a-593c-8a94-17260eca8485', 'it6', 'Tramos rectos de entrada y salida cumplen recomendación del fabricante', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('03246e03-f467-546f-8856-d62467044b6a', '5713267b-236a-593c-8a94-17260eca8485', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('44129722-6909-519d-823a-7b4bdb2d264d', '5713267b-236a-593c-8a94-17260eca8485', 'it7', 'Juntas no invaden el diámetro interno del tubo', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('b3390af9-b38b-5dad-8273-5d6b4cc6b7a6', '5713267b-236a-593c-8a94-17260eca8485', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('e1659a0e-6dd3-5b2b-817f-2f98801f6ab2', '5713267b-236a-593c-8a94-17260eca8485', 'it8', 'Bridas correctamente alineadas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 150),
  ('1cc020ee-e8b1-5ffd-89f5-af9b8c7b6be4', '5713267b-236a-593c-8a94-17260eca8485', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('67e7b89f-f181-5235-879b-8cf7d09004f6', '5713267b-236a-593c-8a94-17260eca8485', 'it9', 'Pernos y tuercas instalados y torqueados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 170),
  ('93c5e7b5-6fa6-5ce4-8e9b-80f4341f51aa', '5713267b-236a-593c-8a94-17260eca8485', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('aad5aca1-4e67-54f2-84ce-f8bac84bdf73', '5713267b-236a-593c-8a94-17260eca8485', 'it10', 'Revestimiento interno sin daños visibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 190),
  ('1fb3ba74-94eb-51a3-8f5e-f959216b7f41', '5713267b-236a-593c-8a94-17260eca8485', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('cdb67d38-bbb4-56a9-893d-3e88fb734042', '5713267b-236a-593c-8a94-17260eca8485', 'it11', 'Electrodos limpios y sin daños', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 210),
  ('bbb8722b-7b51-58b1-867b-75be1f35416f', '5713267b-236a-593c-8a94-17260eca8485', 'it11_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 220),
  ('d5ab5764-5fa7-5880-8dea-cef1aad43521', '5713267b-236a-593c-8a94-17260eca8485', 'it12', 'Sin fugas visibles en conexiones', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 230),
  ('d47acc20-db02-5cc4-8a02-5f5c5bc8a838', '5713267b-236a-593c-8a94-17260eca8485', 'it12_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 240);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'CHK-201-S4', 'Soportes y Estructura', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('148cdf06-184d-5e38-8797-2bf287c0c652', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it1', 'Tubería adecuadamente soportada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('e7634e7c-5b7f-5f29-892c-836eda9bb7ca', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('79a0782d-7fed-5f4a-88e8-ea3d98c092d2', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it2', 'No existen esfuerzos mecánicos sobre el sensor', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('9f66b1a3-123f-5272-8500-955063796902', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('572c436e-d3be-5b57-891e-25f128aee62c', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it3', 'Soportes firmes y sin corrosión', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('c501a029-6b64-5285-8021-8ce3c41f28d3', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('a6d9ffae-4d3f-5cdc-8756-4d57f4cdb3b7', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it4', 'Acceso seguro para mantenimiento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('c383426e-7f65-5ddb-827f-5358a71563d0', '7fd7ebc8-ad9b-5058-895a-88493fb15cca', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'CHK-201-S5', 'Sistema de Puesta a Tierra', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('3b69c3c2-4989-52f6-84ae-4186507e8cb7', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it1', 'Anillos de puesta a tierra instalados si son requeridos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('0caad3d2-b746-59b9-8323-ae247e67e5f4', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('11b82008-6f2e-5f70-8e54-dd910a1144f1', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it2', 'Conductor de tierra instalado según fabricante', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('1ce76624-9ce3-516a-8319-8c5cc6e38e22', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('3063c921-d605-570c-874e-a74564fbe766', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it3', 'Continuidad eléctrica verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('c1cfe4e1-054e-5612-8f59-12d21beabba4', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('4b2d3e8f-c411-5989-8b81-1ea36e846df3', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it4', 'Resistencia de puesta a tierra dentro de especificación', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('c3d7e2cc-68fb-56a5-8141-859f78aa8595', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('de26b722-993f-5ef6-81f4-ebf6919a0113', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it5', 'Blindajes aterrizados correctamente', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('b88d8286-afe2-5164-8cd8-4bdca67d87e5', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('cc5526da-5d4e-543b-89a0-d1d7434ec4de', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it6', 'Ausencia de lazos de tierra indeseados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('f35f67ea-2b02-5e1e-8135-1aca89a34ea9', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('4fd75551-86b0-5b7e-8462-8863af135870', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it7', 'Equipotencialidad entre sensor y tubería confirmada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('3e151336-6931-53fd-8cc7-e46f079a4fdd', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('29aff4b2-2da6-5628-8576-9d2636f31cb0', '9f9d922b-e77e-5deb-8e0c-8d4f448be14b', 'val14', 'Valor medido de resistencia de tierra', 'numero'::public.field_type, FALSE, NULL, $j${"unit":"Ω"}$j$::jsonb, 150);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('8b9c5137-1c5a-58d2-8950-123bbc64032c', 'CHK-201-S7', 'Alimentación', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('a68125be-9bd3-54ee-8064-b7a07286a3e8', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it1', 'Alimentación conforme a hoja de datos (24 VDC / 110 VAC / 220 VAC)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('e4f050b1-578d-5597-8a3e-f9eb4bd965c6', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('146a2698-dbcb-517e-8363-18f5a1dd67cf', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it2', 'Polaridad correcta', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('896ed29d-29ad-5678-8467-009f5b2c339a', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('ad3b215d-d3be-57cf-8c20-9809a8e6ef61', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it3', 'Protección mediante breaker/fusible instalada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('aba80320-c64e-537b-860e-7f73f2e0a3f8', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('493a5052-c97c-5bb4-846c-cdc66d4d7983', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it4', 'Etiquetado de circuito correcto', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('b377a722-d0d7-58db-82d2-2b5073d2634b', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('213e80ed-bc89-5991-8b65-dc505d933699', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it5', 'Cableado libre de daños', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('cc183e7b-6668-5ace-8337-bffd1bc255b7', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('60853652-96f0-528f-80d1-2843b29a6899', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it6', 'Terminales correctamente ajustados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('9bed291b-e541-584b-899e-22670ed4eceb', '8b9c5137-1c5a-58d2-8950-123bbc64032c', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'CHK-201-S8', 'Canalizaciones', FALSE, 70);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 70, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('331526f0-8055-56d6-8ed0-b7081f69dca0', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it1', 'Conduit instalado correctamente', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('6559914c-5762-5774-84e4-2b27461d8417', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('6c5dd1c5-62c9-55a4-8276-37c5a37345db', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it2', 'Sellos instalados según especificación', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('0154c5ab-7262-5e92-823b-32bf7c547d90', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('6e08c309-81e5-5384-875d-d321ae1b5c75', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it3', 'Prensaestopas adecuados al grado IP requerido', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('72a4d242-b816-50f7-8b0a-b8db9a7e83e3', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('d3aed0c5-cbad-516a-8ca9-9364ea3a685c', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it4', 'Ingreso de agua imposible por cableado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('35776672-0fb1-5ccb-8927-eb441c349560', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('efa3df02-9da3-5d22-8d28-8105f58eaaf3', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it5', 'Separación entre potencia e instrumentación verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('ed45fb2e-aa25-561e-8688-6d6be4725a37', 'f8acd7bd-30d4-570d-8372-2bd233bda0e5', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('442fe006-d2c1-5408-8679-a5df265f773b', 'CHK-201-S10', 'Sensor – Convertidor', FALSE, 80);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '442fe006-d2c1-5408-8679-a5df265f773b', 80, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('28f8a384-390a-537e-8fdf-9affc847e5da', '442fe006-d2c1-5408-8679-a5df265f773b', 'it1', 'Cable específico del fabricante utilizado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('ca235dfb-8dbc-540c-8430-b918e82386a6', '442fe006-d2c1-5408-8679-a5df265f773b', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('5ad1fade-473c-5ca5-8804-0dc377264b64', '442fe006-d2c1-5408-8679-a5df265f773b', 'it2', 'Longitud dentro del límite permitido', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('f72e9977-ebaa-5080-8be3-8a84db2918fa', '442fe006-d2c1-5408-8679-a5df265f773b', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('6c7cadb6-ba3f-58c0-8468-2446a7004dd2', '442fe006-d2c1-5408-8679-a5df265f773b', 'it3', 'Blindaje conectado correctamente', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('f06aa126-e981-5341-875a-18c2ef09eea4', '442fe006-d2c1-5408-8679-a5df265f773b', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('d308e5ae-addc-5be0-8d01-2ed117da411f', '442fe006-d2c1-5408-8679-a5df265f773b', 'it4', 'Terminales identificados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('fceb034a-a9fd-546e-8de9-3292d639733c', '442fe006-d2c1-5408-8679-a5df265f773b', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('e06b86e8-298b-5345-8fa2-e56ddc51bb36', '442fe006-d2c1-5408-8679-a5df265f773b', 'it5', 'Continuidad verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('e9dad9a0-0613-5ebb-8e29-2f9561952df8', '442fe006-d2c1-5408-8679-a5df265f773b', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('e0fc7f68-8c99-506b-8a20-d2b574aec76a', '442fe006-d2c1-5408-8679-a5df265f773b', 'it6', 'Aislamiento verificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('df0efc97-b412-5946-83b8-f763364048d2', '442fe006-d2c1-5408-8679-a5df265f773b', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'CHK-201-S11', 'Señales Analógicas y Digitales', FALSE, 90);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 90, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('d9722e67-f4e8-51d4-8b82-c08dba141f07', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it1', 'Salida 4-20 mA cableada correctamente', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('1b270fb6-ed5a-5cc1-8af6-9b45c1bd45be', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('57590505-b96b-5379-8717-3ad63276d115', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it2', 'Comunicación HART conectada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('e11009a2-153d-5a6d-8a20-bb5603712257', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('de5228a8-ed77-5d37-8a30-ba9c08b069c7', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it3', 'Salidas de pulso configuradas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('3cfb6e4a-1d46-5495-82fe-75b582c1bf79', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('557c589f-ea8e-5b20-8564-e0d6d6fe18a0', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it4', 'Alarmas cableadas según diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('0bdaf97c-4a9d-5309-8288-f4fd2845856e', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('1f87e060-87f2-5b5d-8bee-ea4f543696a4', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it5', 'Bornes correctamente identificados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('d351ab34-83c3-581e-8f37-f7eb0bcd4c5c', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('b46167e9-a7f3-5723-8de5-2149e56549f9', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it6', 'Cableado coincide con diagramas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('b0c2d517-fb06-57c0-827a-d12596db5e1e', 'a46c5a22-2ac5-5f99-8204-6f0bf36bf88f', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'CHK-201-S12', 'Verificación de Calidad del Cableado', FALSE, 100);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 100, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('ec95ad8b-4e0e-55ea-8483-973217482bc1', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it1', 'Megado de cables realizado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('24ff2b89-6836-5597-86ff-fa0bc39cf02f', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('b58facc5-e437-53f8-8973-8307e06b2e18', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it2', 'Resultado de aislamiento aceptable (>100 MΩ o según especificación)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('e385b70a-5707-58d2-896b-e961e9fdc918', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('1eaee755-5510-5e92-826d-eb8c1bb9c0b8', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it3', 'Continuidad verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('4e17e0e8-a38d-5e31-8d51-aaee5e10773e', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('70098649-7791-57f2-8a14-0d57fa9546f8', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it4', 'Sin empalmes no autorizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('7e848e0a-dccd-5602-8bf3-d1cd9f7e12e2', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('397fcfca-7762-58cd-8395-d4a754fd16fa', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it5', 'Etiquetas permanentes instaladas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('78c803c4-6a0b-542e-8936-44fdc58449ad', '37ffbfa1-563f-58ed-8a58-ac5996a2be98', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('89b9a768-1db4-5fde-80b7-f24dcfda281b', 'CHK-201-S13', 'Verificación Ambiental (Área de Lodos)', FALSE, 110);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 110, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('327fc810-dbc4-5a3a-8daa-c366e8974def', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it1', 'Equipo protegido contra salpicaduras de lodo', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('94df32f6-4e1d-5012-8e6e-b63a1ea4b674', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('35831d08-e9ba-5004-8c10-e04e57f1fa59', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it2', 'Grado de protección IP adecuado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('988e843f-69c4-579f-8e30-1d5ada552a7e', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('cae0c905-230a-529e-857d-9c6544574f79', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it3', 'Ausencia de vibración excesiva', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('fefbe0fe-4b85-55f3-8d1c-499340182577', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('d12b13b1-0ef1-56ba-87ac-4640160deb28', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it4', 'Temperatura ambiente dentro de especificación', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('4a550f8b-d02b-55de-8631-5cd269eb1f2b', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('c989911a-c0b3-553a-863d-2f761d5ef5be', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it5', 'Corrosión no observada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('79f18291-d7c5-5a27-875a-b57fb09e37ce', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('aa278065-a356-5430-8c97-23a964ee76f6', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it6', 'Materiales compatibles con ambiente cítrico y sulfhídrico', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('c12ae3a5-7f9c-5fad-80e6-50fff09df2f6', '89b9a768-1db4-5fde-80b7-f24dcfda281b', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'CHK-201-S14', 'Verificaciones Previas a Energización', FALSE, 120);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 120, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('c0698a61-92b6-54a4-8d62-b3ded42282e7', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it1', 'Todas las tapas instaladas y ajustadas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('7abab0ce-6d44-545b-8b3c-d71675e24891', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('5e2dcd57-f81f-5678-89aa-fbcd4709f5b3', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it2', 'Compartimientos cerrados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('93fcbc0d-4e68-5454-8a15-a616c21d3b18', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('201d90be-c93c-5a8b-879d-0eaf46db1df9', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it3', 'Entradas de cable selladas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('3ff0bd31-968a-5c28-831b-ef0996925ae8', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('0a9ba52f-8180-530b-854b-4e42cb5c4726', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it4', 'Tierra conectada y verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('cb21913b-5df5-5e74-8e18-2899a84da61e', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('4abe64e6-49d4-5c5a-8b48-e54e5f55cd3d', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it5', 'Alimentación medida antes de conexión al equipo', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('7446b634-8c04-572c-8397-e32cdf11056b', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('c6962b63-c5b7-52ba-81ec-570f32e2a5a3', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it6', 'Polaridad confirmada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('9742f32d-2784-5817-8943-22c1f83d8027', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('416e58c1-87f0-508f-8911-6acca06446db', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it7', 'Lista de punch items cerrada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('15ce43a1-6b5e-5fef-8e24-325ca830d4e7', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140),
  ('140b5ab5-4bd7-5951-8108-d56a2e8f2a9e', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it8', 'Permiso para energización aprobado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 150),
  ('d1723be9-bf63-5167-8f04-655ba78409d7', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it8_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 160),
  ('37f358f3-0caa-5cd8-8d8a-563cfdf551f3', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it9', 'Instrumento liberado por QA/QC', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 170),
  ('67e9c3f2-8fb1-54f0-8cc8-d60e542c788d', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it9_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 180),
  ('261f9f52-851d-5483-80e9-8fd7f92dbed8', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it10', 'Instrumento liberado por Construcción', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 190),
  ('2f894ce4-5d61-56f4-83f0-c470dee69951', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'it10_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 200),
  ('b4aa7bc7-00ce-58b5-856b-38ad143944ff', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'val20', 'Resistencia de tierra', 'numero'::public.field_type, FALSE, NULL, NULL, 210),
  ('0ada115f-ceae-5575-8bb7-8279d0023305', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'val21', 'Resistencia de aislamiento', 'numero'::public.field_type, FALSE, NULL, NULL, 220),
  ('ed140bd6-f683-54c0-8cdf-0d70c663d48a', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'val22', 'Continuidad de blindaje', 'numero'::public.field_type, FALSE, NULL, NULL, 230),
  ('7ceac203-f2ad-5574-813a-7be40b941f78', '9f3b0aee-fc02-5e3b-8e33-9a4c01e0b34e', 'val23', 'Continuidad de señal', 'numero'::public.field_type, FALSE, NULL, NULL, 240);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('8cf8e688-ae78-5caa-83a6-52e87d4e4c47', 'CHK-201-RES', 'Resultado del Precomisionamiento', FALSE, 130);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7ac434e-8cfa-5f70-8a68-667dcf089794', '8cf8e688-ae78-5caa-83a6-52e87d4e4c47', 130, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('38dddfb8-d98f-583c-842d-071259569ea6', '8cf8e688-ae78-5caa-83a6-52e87d4e4c47', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para Energización","Requiere Correcciones","Reinspección Necesaria"]$j$::jsonb, NULL, 10);

-- ───────── CHK-202: MEDIDOR DE CAUDAL ULTRASÓNICO CLAMP-ON ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('626661a9-f0a8-5b52-8e38-826b9cbfd54a', NULL, 'CHK-202', 'MEDIDOR DE CAUDAL ULTRASÓNICO CLAMP-ON', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'CHK-202-S1', 'INSPECCIÓN DE INSTALACIÓN', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('626661a9-f0a8-5b52-8e38-826b9cbfd54a', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('8ab123c7-1d3a-51b0-8267-c060ef37deb6', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it1', 'Ubicación conforme a planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('8fecd403-e526-510d-84c8-b04407f4c7ef', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('c6e0e000-d288-5633-86ad-4a50d7ba5e82', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it2', 'Distancias rectas requeridas por fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('e2deb564-abc0-559b-8d6d-a033f243eded', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('5171fce2-faf3-5a52-862e-67c7738aee6e', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it3', 'Tubería identificada y accesible para mantenimiento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('7af91875-aebf-508b-8447-0c43457452c7', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('3a0641ab-3885-50f1-8ac7-3ff106972046', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it4', 'Superficie de montaje preparada adecuadamente', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('f2697978-489c-5f38-8908-d4b2dcaef695', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('51fd2a3b-37c0-5526-8cc9-bf1a64cc6fef', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it5', 'Sensores instalados según configuración definida (V, Z o W)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('62f96c7b-c424-517c-8852-c78aea7da55b', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('d6395f3b-c543-5315-8dc3-d1c07f4273dc', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it6', 'Distancia entre transductores ajustada según cálculo del fabricante', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('1412a8a1-c74f-52cd-8f97-7622fb46de1f', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('85723fda-f9db-579e-8cc3-cc5f1015ebcc', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it7', 'Cableado de sensores protegido contra daño mecánico', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('80d3bcaf-ef20-52f7-8883-b3cc9810d27e', '84a326f8-a68c-583d-8d02-9874f2b3ddfb', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('45bcaa01-4199-5cd2-82bd-335632ac5833', 'CHK-202-S2', 'VERIFICACIÓN ELÉCTRICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('626661a9-f0a8-5b52-8e38-826b9cbfd54a', '45bcaa01-4199-5cd2-82bd-335632ac5833', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('ff8b8b5f-4b01-5ee0-8c35-df7cf45141a6', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it1', 'Alimentación disponible y conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('7c8b83f3-7a98-574a-867b-f8a328402724', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('ae4a45e4-581d-5154-894d-6c960c17d6b2', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it2', 'Puesta a tierra instalada y verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('6edccd25-76ab-5544-8f89-0699fb5a4bd7', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('85274aa7-e741-5ed9-8231-45f6117447ae', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it3', 'Protección eléctrica instalada e identificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('6e7031e2-9841-5045-8098-a646a2d1511a', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('0f159f48-aaac-5d07-898e-1ae2116ffd0c', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it4', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('3ff0ddb6-d7e0-59fe-813c-19cc305f814a', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('8b79d26b-612e-58df-8387-6de35e6c7e6a', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it5', 'Bornes correctamente ajustados y marcados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('40c0cac3-71af-5b49-893a-ffc325b8670d', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('191ab002-c745-5178-8d22-a6e41127aa6c', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it6', 'Etiquetado de cables y bornes conforme a planos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('b1ce3a2c-5f80-5b08-8740-33628580d99d', '45bcaa01-4199-5cd2-82bd-335632ac5833', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('4d598221-4513-5c74-8a91-4a04c487b287', 'CHK-202-S3', 'DOCUMENTACIÓN', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('626661a9-f0a8-5b52-8e38-826b9cbfd54a', '4d598221-4513-5c74-8a91-4a04c487b287', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('928b00b7-ac4a-5fd6-8e70-c960ca0e30cc', '4d598221-4513-5c74-8a91-4a04c487b287', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('ba882221-759a-505a-8b22-3f720dda94b4', '4d598221-4513-5c74-8a91-4a04c487b287', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('b83d925c-1297-5267-89b3-59b78a1b6375', '4d598221-4513-5c74-8a91-4a04c487b287', 'it2', 'Certificados del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('a911b9f4-49b6-540b-87c1-74babed7bf76', '4d598221-4513-5c74-8a91-4a04c487b287', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('a88491ea-a405-55e5-8487-0f1eb7177ed0', '4d598221-4513-5c74-8a91-4a04c487b287', 'it3', 'Manuales disponibles en sitio', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('a906a8db-a1e3-5d94-86c5-7be3c9fda212', '4d598221-4513-5c74-8a91-4a04c487b287', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('bdf6f038-fd02-50d3-83a7-d8859063de49', '4d598221-4513-5c74-8a91-4a04c487b287', 'it4', 'Planos As-Built actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('50f619e8-4355-5775-8eaa-b19b9d9c42ea', '4d598221-4513-5c74-8a91-4a04c487b287', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('d624937e-4e0b-51d5-804c-d38ade8aefd2', 'CHK-202-RES', 'Resultado del Precomisionamiento', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('626661a9-f0a8-5b52-8e38-826b9cbfd54a', 'd624937e-4e0b-51d5-804c-d38ade8aefd2', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('dd730f54-fc8e-5e74-8783-3dfca9d37ccd', 'd624937e-4e0b-51d5-804c-d38ade8aefd2', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-203: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('307f7837-c3e3-579a-87f3-d86a3c1e31df', NULL, 'CHK-203', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('43ca1747-d7cd-520e-8c10-2717a3dcd54f', 'CHK-203-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('307f7837-c3e3-579a-87f3-d86a3c1e31df', '43ca1747-d7cd-520e-8c10-2717a3dcd54f', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('2f6e7cad-4969-51c5-8c55-c7c868d30fb6', '43ca1747-d7cd-520e-8c10-2717a3dcd54f', 'tanque_equipo', 'Tanque/Equipo', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('b9a48fba-1684-5f00-867b-5d72376a4be7', '43ca1747-d7cd-520e-8c10-2717a3dcd54f', 'rango_de_medicion', 'Rango de Medición', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'CHK-203-S1', 'INSPECCIÓN DE INSTALACIÓN', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('307f7837-c3e3-579a-87f3-d86a3c1e31df', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('4076a911-35c5-55a8-80d5-527e7f598ff4', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it1', 'Ubicación conforme a planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('d25fc937-392f-5645-853a-03e3d39b4751', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('a494b2ac-64ca-57d7-8e8a-de7c512aff81', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it2', 'Montaje mecánico firme y libre de vibraciones excesivas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('1fa1b026-bced-5853-827b-3ff50ce5bfab', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('263378aa-db10-5e39-8619-8b9bc337a332', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it3', 'Orientación correctamente hacia la superficie del producto', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('ce4fbfec-d804-5f2c-83fe-66772d2ba565', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('57bf0b9c-0896-5216-8fa8-2695131246d9', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it4', 'Ausencia de obstáculos dentro del cono de medición', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('75f4d260-954c-5be3-8353-cb0c049ba3d0', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('e22b46a2-8737-52a0-89ac-f72314675edb', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it5', 'Distancia mínima a paredes, agitadores y estructuras respetada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('374bebe7-ea6a-51d9-815a-8440102359c1', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('69abc019-fa18-5eda-8c5c-c6d30d144ba2', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it6', 'Accesibilidad adecuada para mantenimiento e inspección', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('9de3913f-c001-59e8-8b8a-02965822f376', '434f1f4d-3181-5fe0-8a5b-b23b5b4130d8', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('b9ef4322-f358-5285-85ff-36502b167676', 'CHK-203-S2', 'VERIFICACIÓN ELÉCTRICA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('307f7837-c3e3-579a-87f3-d86a3c1e31df', 'b9ef4322-f358-5285-85ff-36502b167676', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('f3323568-585a-5cc5-87d8-76a0636e5759', 'b9ef4322-f358-5285-85ff-36502b167676', 'it1', 'Alimentación conforme al diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('25d0615e-178a-5df8-8e04-88f84e6c73ec', 'b9ef4322-f358-5285-85ff-36502b167676', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('7e99ddb3-882b-5e2c-8863-0d6a3be2072e', 'b9ef4322-f358-5285-85ff-36502b167676', 'it2', 'Tensión dentro del rango especificado por fabricante', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('b5942a39-7d21-5192-8742-f7c9160b1268', 'b9ef4322-f358-5285-85ff-36502b167676', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('7e9d6aa3-2e29-5a31-8cab-06d10122f745', 'b9ef4322-f358-5285-85ff-36502b167676', 'it3', 'Sistema de puesta a tierra verificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('59b56339-90cf-589a-8b9e-2c7e99588d5a', 'b9ef4322-f358-5285-85ff-36502b167676', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('f700fcdc-6f6d-5287-80d5-49a09637308f', 'b9ef4322-f358-5285-85ff-36502b167676', 'it4', 'Protección eléctrica instalada e identificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('e7845fe1-9e15-55c6-8b1d-8dcbed7507d2', 'b9ef4322-f358-5285-85ff-36502b167676', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('47ef1c2f-b21e-5d13-8a3c-1d23a69fc445', 'b9ef4322-f358-5285-85ff-36502b167676', 'it5', 'Bornes correctamente ajustados y marcados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('be2f12ef-ff64-5468-87ad-7326654c7f09', 'b9ef4322-f358-5285-85ff-36502b167676', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('8a2ff3af-d2c9-5867-8f71-902f61117d9a', 'b9ef4322-f358-5285-85ff-36502b167676', 'it6', 'Identificación de cables y terminales conforme a planos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('245aa473-e2a7-51e2-8759-554f218dd687', 'b9ef4322-f358-5285-85ff-36502b167676', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('c3b55593-5221-5e05-8db5-99098741ef0b', 'CHK-203-S3', 'DOCUMENTACIÓN', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('307f7837-c3e3-579a-87f3-d86a3c1e31df', 'c3b55593-5221-5e05-8db5-99098741ef0b', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('b71bf90d-1fe1-55e2-8310-f621d99ab5fc', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('132a2cce-6f38-5dfd-8f64-e78a84f71e7e', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('128e983f-88a7-5c47-84c2-082e23601264', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it2', 'Certificado de calibración disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('6dafbb53-aeba-50f3-890b-63813f703d82', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('aeb05d9b-92e1-5817-88dd-23ab2b15e7d7', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it3', 'Manuales del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('6890a7e6-5904-5ba0-8432-a499c2860775', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('e2a2d0c0-6b44-5ca7-8702-5a03a4a252cf', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it4', 'Planos As-Built actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('004ae83e-59f7-50c8-8655-4abde6528af7', 'c3b55593-5221-5e05-8db5-99098741ef0b', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('6dd12bb6-f48c-5371-83f3-90c68177f4db', 'CHK-203-RES', 'Resultado del Precomisionamiento', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('307f7837-c3e3-579a-87f3-d86a3c1e31df', '6dd12bb6-f48c-5371-83f3-90c68177f4db', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('91ca0753-0112-5579-84bc-bf65771f6d5e', '6dd12bb6-f48c-5371-83f3-90c68177f4db', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-204: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('a59ff153-88cd-5cd6-85c2-97419d052730', NULL, 'CHK-204', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('14b4c355-c27a-5e82-8447-2e5d7e0b56d7', 'CHK-204-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a59ff153-88cd-5cd6-85c2-97419d052730', '14b4c355-c27a-5e82-8447-2e5d7e0b56d7', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('e18a04f3-90d3-5375-879b-fedc94f6936c', '14b4c355-c27a-5e82-8447-2e5d7e0b56d7', 'tanque_proceso', 'Tanque/Proceso', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('7f8d19a5-793f-5ab5-83a9-f03784f60069', '14b4c355-c27a-5e82-8447-2e5d7e0b56d7', 'funcion', 'Función', 'select'::public.field_type, FALSE, $j$["Nivel Alto","Nivel Bajo","Alto-Alto","Bajo-Bajo"]$j$::jsonb, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('5355984f-6864-5596-8b88-27051fbd73ce', 'CHK-204-S1', 'INSPECCIÓN DE INSTALACIÓN', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a59ff153-88cd-5cd6-85c2-97419d052730', '5355984f-6864-5596-8b88-27051fbd73ce', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('9978cc8e-5ee6-5255-8a6e-f4b16fb6eb14', '5355984f-6864-5596-8b88-27051fbd73ce', 'it1', 'Ubicación conforme a planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('d1c2d6c6-d748-598f-81b8-f4592f73bbf7', '5355984f-6864-5596-8b88-27051fbd73ce', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('7a5daf80-8b66-5abf-83e2-d26dee98c518', '5355984f-6864-5596-8b88-27051fbd73ce', 'it2', 'Longitud de cable o brazo de accionamiento conforme al diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('9a712bec-0c6d-57fd-8022-9d58b9baa01e', '5355984f-6864-5596-8b88-27051fbd73ce', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('f0500dc7-74b8-5b44-835e-a9b56e2028e9', '5355984f-6864-5596-8b88-27051fbd73ce', 'it3', 'Flotador libre de interferencias mecánicas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('753b800d-6261-51bd-83d7-af8ab64788b6', '5355984f-6864-5596-8b88-27051fbd73ce', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('9b9321d0-2a9c-5603-8828-17a8924cf801', '5355984f-6864-5596-8b88-27051fbd73ce', 'it4', 'Materiales compatibles con el proceso', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('47cd91f5-fa63-5322-8ebd-0376b1f2a680', '5355984f-6864-5596-8b88-27051fbd73ce', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('5cc7f3f2-72ab-546e-8fec-6a0b5665128c', '5355984f-6864-5596-8b88-27051fbd73ce', 'it5', 'Accesibilidad para inspección y mantenimiento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('68e0f565-178b-5eb2-8b20-4791304a8c97', '5355984f-6864-5596-8b88-27051fbd73ce', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('be03d745-0ec5-5773-82ad-2c47e10beec9', 'CHK-204-S2', 'VERIFICACIÓN ELÉCTRICA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a59ff153-88cd-5cd6-85c2-97419d052730', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('8b63334d-194a-5dc2-8d6a-fefc08e29c04', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it1', 'Cableado conforme a diagramas aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('2c14c25a-e457-5e28-8f9f-fadebc36e6db', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('33a90ecc-d57e-5e47-8c88-8dae813667c0', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it2', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('9287986e-019d-55c0-824c-6cb4bc34b36c', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('9dac19d9-2b6a-52db-88b3-a649096bfb65', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it3', 'Aislamiento del circuito verificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('6c4c7b60-567b-515c-889f-ff8de86ec849', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('8c8042b4-6b0c-53dc-8488-0a9f87f835b8', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it4', 'Puesta a tierra conforme al diseño (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('ab176e96-0e18-5fcd-8c04-bcd187fd61d6', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('39d81665-e3d7-5651-882e-e2dee520f965', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it5', 'Identificación de conductores y terminales correcta', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('5d885da7-424e-520c-8a2c-35693be8eebe', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('fba3c32e-b15d-57ce-8bf4-ef449093df9b', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it6', 'Etiquetado del lazo conforme a ingeniería', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('343bc0a5-cc93-5fbf-8837-3671c0754ab1', 'be03d745-0ec5-5773-82ad-2c47e10beec9', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('da5d5701-8eec-5a3a-8133-70b3af0a2969', 'CHK-204-S3', 'DOCUMENTACIÓN', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a59ff153-88cd-5cd6-85c2-97419d052730', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('80f7a593-09bd-5351-8b5c-27b5e964d133', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('0eed8145-7250-54f6-81f4-a3dc9402407e', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('53f1fe3e-b367-5a5d-8ddc-488cb9c319d0', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it2', 'Certificados del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('b49ac241-e536-5773-8529-9012e57c1182', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('2e57e7e0-8754-5f61-8afd-b48064003448', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it3', 'Diagramas eléctricos actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('9504c2b2-9990-58c3-84e3-712045fb1cd5', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('36a06c9e-dbc7-5454-8b2a-8bd3ad0c4696', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it4', 'Planos As-Built disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('6abcf45e-3a7c-523b-8ce7-2bc95255feb3', 'da5d5701-8eec-5a3a-8133-70b3af0a2969', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('48a4bdf7-393a-5867-882d-c57f6630b21d', 'CHK-204-RES', 'Resultado del Precomisionamiento', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('a59ff153-88cd-5cd6-85c2-97419d052730', '48a4bdf7-393a-5867-882d-c57f6630b21d', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('1864f633-c6d0-5347-845e-d881526e4af1', '48a4bdf7-393a-5867-882d-c57f6630b21d', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-205: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('03a2e465-c90f-51b2-8724-7d3ae4fccb4b', NULL, 'CHK-205', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('b906238d-fa77-5b48-8565-9d5b2975d468', 'CHK-205-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('03a2e465-c90f-51b2-8724-7d3ae4fccb4b', 'b906238d-fa77-5b48-8565-9d5b2975d468', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('3d1c9133-a5ca-5ab4-88e9-a2fd7bdde43a', 'b906238d-fa77-5b48-8565-9d5b2975d468', 'rango_de_presion', 'Rango de Presión', 'texto'::public.field_type, FALSE, NULL, NULL, 10);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'CHK-205-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('03a2e465-c90f-51b2-8724-7d3ae4fccb4b', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('59ac4962-1fc3-56db-874a-9c951474a55f', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it1', 'Instalación conforme a P&ID y planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('cdc7cd59-3d6a-5620-8d41-d7f0e3907e6b', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('cc416455-d248-560d-8f80-db77bc7e3208', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it2', 'Coupling correctamente instalado y sin deformaciones', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('05e1fe01-5328-589a-8a37-28b285e38e35', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('0e0e8691-066e-5dd3-890c-bfb68db695b6', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it3', 'Membrana orientada adecuadamente hacia el proceso', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('8a7b38c5-1be0-564c-898a-3f62eb86e90a', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('25f4a930-166e-5a19-850b-4e88d04d6abb', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it4', 'Válvula(s) de aislamiento instalada(s) y accesible(s)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('a9e9d6ae-bd12-54b4-88e5-24c64e875db2', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('dfa2f25e-d99a-5c5a-84ce-ac81de45c5fb', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it5', 'Accesorios de montaje correctamente ensamblados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('38e7e681-fc97-51e8-8abe-3d1b7cedb2c3', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('4f472f65-c451-59c0-8743-e326180489f7', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it6', 'Ausencia de fugas visibles en conexiones y sellos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('8ca53fd5-4c84-58be-8b18-5ca7abaa9ee0', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('694b786f-24d1-5a06-8be1-e0d882c6afde', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it7', 'Acceso adecuado para mantenimiento y calibración', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('47c835b8-042b-5d0e-8f71-008f85d2cf59', '4eb1a2df-f278-5ee7-8a29-e4860e5306bb', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('eca0781b-8d86-5305-8244-5f518b8ae5e4', 'CHK-205-S2', 'VERIFICACIÓN ELÉCTRICA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('03a2e465-c90f-51b2-8724-7d3ae4fccb4b', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('55953947-07f7-545d-802e-db0621537dcc', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it1', 'Alimentación conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('4cf59071-48f4-55a2-8c6b-db36a1760c45', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('c98b14ce-eaae-52e4-8df2-d3ed4eff8e92', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it2', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('b5e5671a-e254-593d-8ddb-b5f469141d3a', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('ac743459-48f7-5d76-86de-44351d2a14c9', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it3', 'Puesta a tierra instalada y verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('2140c9d4-70c5-5fc2-8e27-96cc40ea223f', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('16338162-3af2-5898-801c-0f26639e87de', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it4', 'Bornes ajustados e identificados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('740981f5-8e16-56ab-8ace-4ef2a0196f27', 'eca0781b-8d86-5305-8244-5f518b8ae5e4', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('4cff7e97-5c06-53ca-8b86-5d327223eb27', 'CHK-205-S3', 'DOCUMENTACIÓN', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('03a2e465-c90f-51b2-8724-7d3ae4fccb4b', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('87892179-3a31-55c3-843e-3ee1ad1993e6', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('e06b43df-2e43-5d33-8d23-4a63335593b9', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('ff9f140a-6732-5add-8e54-ca9787720b75', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it2', 'Certificado de calibración disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('8a1cb9b9-cf52-52a9-8e20-44775be27d69', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('8af531a9-70e5-5c91-8052-3ad7383cdd85', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it3', 'Manuales del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('26de2a1e-b62c-5862-8d1b-210f5dce62c4', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('08f1607e-9c9a-5648-8937-64a4eaba71ab', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it4', 'Planos As-Built actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('6b75c121-4c46-57cc-8294-cf31b77f941f', '4cff7e97-5c06-53ca-8b86-5d327223eb27', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('7d72b4bc-2705-5960-8e15-ad332e74e6a3', 'CHK-205-RES', 'Resultado del Precomisionamiento', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('03a2e465-c90f-51b2-8724-7d3ae4fccb4b', '7d72b4bc-2705-5960-8e15-ad332e74e6a3', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('2c13db46-f9f5-5963-8fa0-d30fa3193bd1', '7d72b4bc-2705-5960-8e15-ad332e74e6a3', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-206: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('52cbf1c8-e51e-5172-864c-7846ee4e6227', NULL, 'CHK-206', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('14ff6a11-af1a-5745-8e0b-e7f28e98d52d', 'CHK-206-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52cbf1c8-e51e-5172-864c-7846ee4e6227', '14ff6a11-af1a-5745-8e0b-e7f28e98d52d', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('7125b390-2bbe-55ea-8c49-06dd4b8a26da', '14ff6a11-af1a-5745-8e0b-e7f28e98d52d', 'tipo_de_sensor', 'Tipo de Sensor', 'select'::public.field_type, FALSE, $j$["RTD Pt100","RTD Pt1000","Termocupla","Otro"]$j$::jsonb, NULL, 10),
  ('564fe51e-18dc-510c-801a-62e6d57de95a', '14ff6a11-af1a-5745-8e0b-e7f28e98d52d', 'tipo_de_vaina', 'Tipo de Vaina', 'texto'::public.field_type, FALSE, NULL, NULL, 20),
  ('537f6a94-45ef-588e-8687-3d45860039ed', '14ff6a11-af1a-5745-8e0b-e7f28e98d52d', 'rango_de_temperatura', 'Rango de Temperatura', 'texto'::public.field_type, FALSE, NULL, NULL, 30);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('956d67a7-e5fe-59aa-88df-0751177cdbf7', 'CHK-206-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52cbf1c8-e51e-5172-864c-7846ee4e6227', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('5ba1dc5d-87c7-5f64-86c3-7e2895c4b005', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it1', 'Instalación conforme a planos y P&ID aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('6b65e888-777e-54d2-8bfd-1b50d6c2990e', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('59bba6cb-e981-5a3a-8229-555478e01e0f', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it2', 'Vaina soldada correctamente y sin defectos visibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('3271bde7-9daa-5376-87bf-27087cbb5e2b', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('e903d2fb-bcbb-5806-8d3f-00cfe9c3d1e5', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it3', 'Longitud de inserción conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('abe55234-b588-5e51-88db-8c0a21375f01', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('65aaf354-fff9-5354-8ad2-7db89eada2a1', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it4', 'Sensor correctamente instalado dentro de la vaina', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('2cff393f-e39b-50aa-80e8-134ef0302e5b', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('cbc8ec08-b77c-5c5d-8999-1bb7a24cc10d', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it5', 'Cabezal y accesorios firmemente asegurados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('b002fd73-a4f5-56ae-81db-873371e304f5', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('24531581-ac29-5e6f-81fb-5cff6f64e76a', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it6', 'Ausencia de fugas en el punto de instalación', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('1f2e87fe-f7e8-515c-847f-9dd130e149f5', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('69b14aec-d7fd-5dfd-80bc-527b51939344', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it7', 'Accesibilidad adecuada para mantenimiento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('1ee81d9b-a3e6-538d-81e2-604fd06e16e3', '956d67a7-e5fe-59aa-88df-0751177cdbf7', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('006f3659-b745-54cf-8f05-0d6016f79b6f', 'CHK-206-S2', 'VERIFICACIÓN ELÉCTRICA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52cbf1c8-e51e-5172-864c-7846ee4e6227', '006f3659-b745-54cf-8f05-0d6016f79b6f', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('a46bea2b-cd9d-540b-8679-bf8b694a3f63', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it1', 'Cableado conforme a diagramas aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('ffd5dfde-b178-5397-8d6b-35d57767a4f3', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('5ca6b7f8-789c-5cfd-8d2c-10b8e266311a', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it2', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('4a111f89-e002-5629-859c-8c4ebce17f8d', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('9eb8cd18-a8fb-5d9b-8439-1129915c99de', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it3', 'Resistencia de aislamiento verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('70b11d5d-662e-58e4-834a-cf99bfda061a', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('38456cb9-68ed-5b28-8803-1b8df4826868', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it4', 'Puesta a tierra instalada conforme al diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('cbe22491-b6c1-5b87-840f-5ac1bb2a9acd', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('d1e8a2ad-909d-50c3-8dc4-367dd9b59cbf', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it5', 'Identificación de conductores y terminales correcta', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('41c7d181-ec1b-5081-85d7-c5e10b6e70f7', '006f3659-b745-54cf-8f05-0d6016f79b6f', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('bc5e8e2b-c496-58e5-8671-586df565b3cd', 'CHK-206-S3', 'DOCUMENTACIÓN', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52cbf1c8-e51e-5172-864c-7846ee4e6227', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('26bc1038-cc06-500c-8eb5-7a93a98899b8', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('9672049c-3fc6-5460-872c-6da1641ea076', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('d52ea6f2-2d07-52d0-8e32-4b6c4e35588e', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it2', 'Certificado de calibración disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('9c33eac1-a647-54f4-8e90-c8155be65164', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('f127871a-ffc3-5943-8e8a-8abd6c3d3bef', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it3', 'Certificados de materiales y soldadura disponibles (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('f00bff85-259c-5ea9-8a6b-ab73148d26ee', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('589abdc2-af2c-5114-8e8e-40406e517ded', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it4', 'Manuales del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('5cf958aa-414d-5d37-880c-7c3499ee056e', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('96b20ad2-2de9-50b1-8214-fb546a500b8e', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it5', 'Planos As-Built actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('faaf57d9-9ab9-540b-8a11-0e4f1a214bd9', 'bc5e8e2b-c496-58e5-8671-586df565b3cd', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('57e7c09e-7a07-5a48-820e-a7058d9f2476', 'CHK-206-RES', 'Resultado del Precomisionamiento', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52cbf1c8-e51e-5172-864c-7846ee4e6227', '57e7c09e-7a07-5a48-820e-a7058d9f2476', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('1380fb53-5d39-58dd-8a21-5346367eafd4', '57e7c09e-7a07-5a48-820e-a7058d9f2476', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-207: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', NULL, 'CHK-207', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('c002a96d-0d66-5ac9-8bd5-54abdd299a37', 'CHK-207-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', 'c002a96d-0d66-5ac9-8bd5-54abdd299a37', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('060c968d-5313-5923-8a2b-f29c00bac192', 'c002a96d-0d66-5ac9-8bd5-54abdd299a37', 'diametro_de_tuberia', 'Diámetro de Tubería', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('eaed609c-110a-5a78-872d-4458b9b1eae5', 'c002a96d-0d66-5ac9-8bd5-54abdd299a37', 'rango_de_medicion', 'Rango de Medición', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('b9f289d9-f0de-519c-8872-124fd2dbec24', 'CHK-207-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('12916903-0d59-516d-8070-ac77c09b2d55', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it1', 'Instalación conforme a P&ID y planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('b1e7149a-b9a0-53a0-85da-6a6d5b7ff093', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('0b9b910f-db00-5a3f-8732-25b36dc5b1a6', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it2', 'Sentido de flujo coincide con la indicación del instrumento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('1cddcdb1-9b72-588f-890f-4608767e58c6', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('4c760c77-05a1-55cc-8977-6bcf659c8c5d', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it3', 'Longitudes rectas disponibles conforme al fabricante', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('82db3ac9-7ab5-5b69-873f-7f079b373f1d', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('1b872089-ce2c-5a41-860d-eef77c98295b', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it4', 'Sensor correctamente insertado o alineado en la tubería', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('03479de0-995f-59bf-8000-abdc36d4fd48', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('61e6e4f7-9176-50cd-86d2-8e19de2ad645', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it5', 'Válvulas y accesorios instalados conforme al diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('48c4c484-8a5f-5a2c-84b3-4f2141dbf98e', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('cf5e2f68-6110-5e0c-8a0d-b4693bdd49d0', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it6', 'Ausencia de fugas visibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('c65c85e1-5c7e-51a2-8e0b-60e74c30d5b9', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('839b0f86-bbb6-5cde-8263-c85c801c6d7f', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it7', 'Acceso adecuado para mantenimiento y retiro del sensor', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('91e4d40d-8dd8-5a6f-8473-65940fe1715e', 'b9f289d9-f0de-519c-8872-124fd2dbec24', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('b88a6f00-47b1-5828-85df-9a9d2822e195', 'CHK-207-S2', 'VERIFICACIÓN ELÉCTRICA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('4bf6a0bd-eea4-5009-8db7-9135049a9cdd', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it1', 'Alimentación conforme al diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('f83c7bc8-b574-5e28-8369-58bdf1499533', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('186061e9-ebe7-5efc-8a7f-3aa3439b3f52', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it2', 'Tensión dentro del rango especificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('9cc6ecc3-9e07-5405-850e-bb89a1d9bfea', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('9bf4f351-bbb8-510e-81b6-4b6f15205bdc', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it3', 'Puesta a tierra instalada y verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('3b5df7ba-5854-52bb-8f2f-e6870055332f', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('b8396f96-6ec8-5bfe-8ca7-4c7fd961b5d3', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it4', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('7d780adc-b689-5cad-8acf-5e10a3d66b93', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('1fa40199-5a22-5297-8cca-ce8cae63057a', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it5', 'Bornes correctamente ajustados e identificados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('1fb3baa7-7133-5d57-83b8-cd61c63349b6', 'b88a6f00-47b1-5828-85df-9a9d2822e195', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('58d291d0-8329-5787-8b05-99a4535f5416', 'CHK-207-S3', 'VERIFICACIÓN DE SEÑALES', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', '58d291d0-8329-5787-8b05-99a4535f5416', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('d0ece5df-89af-51eb-854f-1b944c31e737', '58d291d0-8329-5787-8b05-99a4535f5416', 'it1', 'Cableado conforme a diagramas aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('1801f8a4-2aa8-5e4f-8a73-d648cb33332b', '58d291d0-8329-5787-8b05-99a4535f5416', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('46a4ea2f-4f32-56d0-8cd0-1656ca8c7066', '58d291d0-8329-5787-8b05-99a4535f5416', 'it2', 'Etiquetado del lazo conforme a ingeniería', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('323e011a-48e0-5acf-8128-31d994c9fb79', '58d291d0-8329-5787-8b05-99a4535f5416', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'CHK-207-S4', 'PRUEBAS FUNCIONALES', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('48d9b6f2-68d1-5d01-8840-516734fc2ae8', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it1', 'Equipo energiza sin alarmas activas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('a57db333-c159-5aad-8427-9cdc0e877678', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('caed7150-d975-52ec-89ee-12027c03e1a4', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it2', 'Diagnósticos internos sin fallas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('ae80176a-0365-541e-8cfb-5f6aac339c9e', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('c9d44fe4-d367-5b7a-878d-1db36599a0fd', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it3', 'Simulación o prueba de lazo satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('3643ebfc-c892-5032-8e29-0fbbbc370f04', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('e7146c20-e89a-56c7-8b15-c35b65f46e7f', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it4', 'Lectura coherente con condición operacional disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('8c9b4193-9128-5a7d-8d6f-d766f1d5faf4', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('addbf9f8-7db6-5862-88b6-f4d7f7f943db', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it5', 'Alarmas y eventos transmitidos al sistema de control', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('934c1b5e-da7a-5510-8836-d47c35d6f732', 'b6bd2f91-a367-5a5f-8793-a65958d27ee6', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('7426f74b-53c0-5afe-8321-a110c70042d5', 'CHK-207-S5', 'DOCUMENTACIÓN', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', '7426f74b-53c0-5afe-8321-a110c70042d5', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('af15a657-25d6-5f21-8f43-46e44296bba9', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('7f6815d9-d302-55b0-8735-7e48c5149651', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('6657c239-7250-51e6-8a94-2be87ce93208', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it2', 'Certificado de calibración disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('82d0a4e8-e086-5b49-8c74-ed973010ec3e', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('f45a43a9-e399-5506-80b7-21af50e44006', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it3', 'Manuales del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('1a8d5f4d-5028-5dfc-8dc3-d537b6f05d03', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('1664d7c5-3c2a-507f-8430-dbba71c11ad6', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it4', 'Planos As-Built actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('440e67e4-adae-55b4-88e1-7e2b7ace8af3', '7426f74b-53c0-5afe-8321-a110c70042d5', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('cd3b36bf-cee1-5d65-853e-3d3c9deee8c7', 'CHK-207-RES', 'Resultado del Precomisionamiento', FALSE, 70);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('52e4ebab-1387-5044-81e3-1fbc32f1f0b0', 'cd3b36bf-cee1-5d65-853e-3d3c9deee8c7', 70, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('e89a72e9-4767-52d0-8cac-02255a17e4e9', 'cd3b36bf-cee1-5d65-853e-3d3c9deee8c7', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-208: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('c7a3b478-a2aa-5e85-871a-fc8a9868dc69', NULL, 'CHK-208', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('8c23168c-da8f-5f9c-8f22-bdcef6ad8731', 'CHK-208-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7a3b478-a2aa-5e85-871a-fc8a9868dc69', '8c23168c-da8f-5f9c-8f22-bdcef6ad8731', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('56b73ee6-03f9-5a6f-867d-110fdb5e7031', '8c23168c-da8f-5f9c-8f22-bdcef6ad8731', 'diametro_de_tuberia', 'Diámetro de Tubería', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('366b0427-d8b2-51cf-8fa6-a465ff83c4a2', '8c23168c-da8f-5f9c-8f22-bdcef6ad8731', 'material_de_tuberia', 'Material de Tubería', 'texto'::public.field_type, FALSE, NULL, NULL, 20),
  ('200f74ea-f2dc-528a-8cba-a6d51b41f2b1', '8c23168c-da8f-5f9c-8f22-bdcef6ad8731', 'rango_de_medicion', 'Rango de Medición', 'texto'::public.field_type, FALSE, NULL, NULL, 30);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'CHK-208-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7a3b478-a2aa-5e85-871a-fc8a9868dc69', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('168b0fc0-88c5-5cac-87b4-3095e168776a', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it1', 'Instalación conforme a P&ID y planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('aaed51b8-2b2d-5f27-8622-438224eff824', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('29659c44-65e2-52ae-83f7-c0b034a07513', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it2', 'Sentido de flujo coincide con la configuración del instrumento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('499e6ed1-4577-5ccf-89e1-5ed842d9c1f8', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('0dd9ff28-6e36-51c8-868b-7f380343bbfd', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it3', 'Tramos rectos disponibles conforme al fabricante', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('a8ae96cb-11d9-52be-8f4a-c793d43d9c38', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('4cd4518a-d3b2-5ae3-8a2e-3a1bf9dd0d24', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it4', 'Sensor/transductores correctamente alineados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('417293fa-6fec-58fe-8ad8-f79c607df283', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('63c92d7e-3aec-5f61-8cde-b69ca0b3b6fd', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it5', 'Ausencia de fugas en conexiones y accesorios', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('bb6accae-2ba8-5082-8902-e267658a9c52', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('66eb8be2-2407-563f-8afb-0d45bdf99101', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it6', 'Soportes mecánicos adecuados y sin esfuerzos externos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('efe6c279-5935-51a9-847d-9f339f259eb5', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('a859bcdc-930a-5550-8186-07b3f563f975', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it7', 'Acceso adecuado para operación y mantenimiento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('dcf793e8-1f47-5714-84a5-a67dacedd108', '81d0c3e2-491e-5f5e-8ebf-a7dbe7ece4ca', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('ca717627-efe6-5fe4-8601-ee985f79c2d6', 'CHK-208-S2', 'VERIFICACIÓN ELÉCTRICA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7a3b478-a2aa-5e85-871a-fc8a9868dc69', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('e5198bc9-02aa-5b71-8ad7-db2c45b6d657', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it1', 'Alimentación conforme al diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('1c27c45d-1664-56d2-80a6-5b9186a68f90', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('a2ffed0f-b342-5395-8981-d4460f51b1c7', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it2', 'Tensión dentro del rango especificado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('c9de61fd-c714-5a79-84ab-4e1b40cc6412', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('286df3a2-0378-52b4-8ea3-179970a0efd1', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it3', 'Puesta a tierra instalada y verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('ea478503-ef0f-50dd-84dc-dfdb117e2191', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('d90138f5-e70f-5174-873e-3e3aadc20f01', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it4', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('398dfd50-0e22-5d9f-8083-deb1a0905511', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('ac6f8c57-2196-5320-88be-c8a5cde07067', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it5', 'Bornes correctamente identificados y ajustados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('2f7242d3-bdc4-58b2-8738-2b3b45180847', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('65633f87-a813-547e-8715-b65c7b1a439e', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it6', 'Etiquetado del lazo conforme a ingeniería', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('ca642b7c-66b5-5e32-8c47-687666d0fdaf', 'ca717627-efe6-5fe4-8601-ee985f79c2d6', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('09b54242-4a46-5f19-849b-947fb20264c8', 'CHK-208-S3', 'DOCUMENTACIÓN', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7a3b478-a2aa-5e85-871a-fc8a9868dc69', '09b54242-4a46-5f19-849b-947fb20264c8', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('263525d0-bc10-59b9-822d-0c52a26cefb8', '09b54242-4a46-5f19-849b-947fb20264c8', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('0bd7c9c7-05f1-589c-8874-bf789d323897', '09b54242-4a46-5f19-849b-947fb20264c8', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('e8309607-1be3-58c3-8579-31ce9616b8d3', '09b54242-4a46-5f19-849b-947fb20264c8', 'it2', 'Certificado de calibración disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('08507216-df4d-5dc5-8d26-934dd2e89b1d', '09b54242-4a46-5f19-849b-947fb20264c8', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('6b8c95e6-eb25-52b2-8e5c-5df697e27e2e', '09b54242-4a46-5f19-849b-947fb20264c8', 'it3', 'Manuales del fabricante disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('1e27be0f-9eb0-5f6a-8e97-3fddabef75c6', '09b54242-4a46-5f19-849b-947fb20264c8', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('5bb8d9ae-4a6e-56a5-84a2-92934a6b4430', '09b54242-4a46-5f19-849b-947fb20264c8', 'it4', 'Planos As-Built actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('57a96918-23b3-537f-8f1a-ce850a3aa8b2', '09b54242-4a46-5f19-849b-947fb20264c8', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('d4fb18e8-c94a-5b4a-8425-3537db93be2d', 'CHK-208-RES', 'Resultado del Precomisionamiento', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('c7a3b478-a2aa-5e85-871a-fc8a9868dc69', 'd4fb18e8-c94a-5b4a-8425-3537db93be2d', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('cbfe8309-92fd-55fc-8e2a-7844f01a7a8e', 'd4fb18e8-c94a-5b4a-8425-3537db93be2d', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-209: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('9ae59fa7-d7ec-5d27-8d25-1bddf435801c', NULL, 'CHK-209', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('805cf043-e193-5635-8208-46ba0bebe97c', 'CHK-209-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('9ae59fa7-d7ec-5d27-8d25-1bddf435801c', '805cf043-e193-5635-8208-46ba0bebe97c', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('e56d671d-7fb8-5897-866d-929356c1ba7a', '805cf043-e193-5635-8208-46ba0bebe97c', 'clasificacion_de_area', 'Clasificación de Área', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('36bc38ca-6131-58df-89b3-7d320b80645a', '805cf043-e193-5635-8208-46ba0bebe97c', 'zona_ex', 'Zona Ex', 'texto'::public.field_type, FALSE, NULL, NULL, 20);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('bf8a9c75-4716-566b-80c2-40792088eb3e', 'CHK-209-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('9ae59fa7-d7ec-5d27-8d25-1bddf435801c', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('3d68eeab-878f-519d-860f-ddca2696464e', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it1', 'Instalación conforme a planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('18b05ef2-e193-54d6-826e-9a19b8273fa0', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('04708b66-1073-5695-8735-e3ac0ff94b0b', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it2', 'Sensor firmemente instalado y protegido contra vibraciones', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('f92906c5-cc4f-5fb9-85cb-d9a78ffb7219', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('16709de8-310b-5816-8c0b-b0efe65cea88', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it3', 'Distancia de actuación conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('737acf7e-e8d7-53ee-8d32-2b2ddeae1c9e', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('42ebbadf-98df-5d67-8fe0-db4e70b15260', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it4', 'Elemento metálico objetivo correctamente alineado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('02d61948-0d47-53fa-8086-b515d799ab65', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('93a094ad-9b46-5f16-8ced-966ee7cfe7cb', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it5', 'Identificación de tag visible y legible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('33256f21-f82a-5f4e-8334-2a093a9a2887', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('5b03dfdd-1a9f-5ed7-806a-99f2d81a3a79', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it6', 'Grado de protección mecánica adecuado para el ambiente', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('649eab42-7be1-5458-849c-fa416dbbe239', 'bf8a9c75-4716-566b-80c2-40792088eb3e', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'CHK-209-S2', 'VERIFICACIÓN EX E INTRÍNSECA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('9ae59fa7-d7ec-5d27-8d25-1bddf435801c', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('0e751da0-e4f9-5e25-85fd-9eecaaf17d73', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it1', 'Certificación Ex del sensor disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('410ad216-1fbe-50ad-8bf9-806f10b863e1', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('5d45d558-a918-5b9f-88df-ba131329e9c2', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it2', 'Certificación de la barrera disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('e7e5e1e2-3e03-57d8-8306-8b7b27eefe48', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('2d69ca58-bb87-5fef-84d0-cbd080064aad', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it3', 'Compatibilidad entidad sensor-barrera verificada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('ff84fbe8-ffc4-52ca-8df4-a3040256e162', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('6e9ef009-d3dd-544d-82c7-f1eacac047c0', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it4', 'Circuito IS segregado de circuitos no IS (separacion fisica de equipos que no tienen IS)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('4ad9ba4a-ec0c-5838-81d5-5a902daab8e7', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('e563fe90-25ec-5be0-89c2-aaf4f855fb9a', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it5', 'Identificación de cableado intrínsecamente seguro instalada', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('834e6392-e92b-5c4f-83c5-24bf7be4f9bd', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('c69521da-3fd1-527d-859c-0ebf5f9b5ff5', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it6', 'Puesta a tierra de la barrera conforme a diseño', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('85cdd4b0-7134-5143-869f-6e564f23b414', '10ad1620-b4ff-56fd-8e60-dfbed8d9ac3a', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'CHK-209-S3', 'VERIFICACIÓN ELÉCTRICA', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('9ae59fa7-d7ec-5d27-8d25-1bddf435801c', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('4796748b-e3fb-51f3-8638-ca8da36c97b2', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it1', 'Cableado conforme a diagramas aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('9414c5c3-79e8-5bfc-8ef6-6ac0f9d8e68a', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('9337ec21-0364-54eb-8634-0f00020627a3', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it2', 'Polaridad correcta del circuito NAMUR', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('33e6b337-4d3e-51c4-847b-92d198ca4cda', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('35a256f4-29d1-5e18-859b-e75b04ac4dad', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it3', 'Continuidad eléctrica satisfactoria', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('8dddf4d2-a525-5719-8ad3-1513e4e813e5', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('eb801a4e-b71e-58b8-8fd0-c46003bd1a5d', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it4', 'Bornes correctamente identificados y ajustados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('e39ea3e3-33e3-5355-8f9e-284a7402813f', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('cd2033c6-f7cb-5276-8d70-1641d21c7b25', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it5', 'Canal de barrera correctamente asignado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('86f88cef-ea1c-542f-8a93-9132e19ec52f', '77e626f7-5dac-5de8-8d1e-f8add7f3c298', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('cb5fbf98-569c-5e09-820f-12adafd77db7', 'CHK-209-S4', 'DOCUMENTACIÓN', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('9ae59fa7-d7ec-5d27-8d25-1bddf435801c', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('0f758664-1380-5edc-8f53-6bc0aaaf361f', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('3b25a948-b193-521b-8a0f-2a38bca95cec', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('dbea9b97-dc5b-5754-8b72-b337b0778ebc', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it2', 'Certificados Ex disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('50f84127-1b72-52ae-8fa3-821652b723a4', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('339bdf00-954a-5eb8-887c-0d7eda2d5eb4', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it3', 'Diagramas de lazo actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('1084201b-9913-5e5a-8dbf-863d6d9eaa5f', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('ffd4c3af-83de-525f-8deb-aeb512c50c9b', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it4', 'Planos As-Built disponibles', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('3127240d-2912-50fc-80b4-499d8f792104', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('11e9ef95-5106-557b-828e-d3cde9816e46', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it5', 'Cálculo de entidad IS archivado', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('2122fd15-d51e-53ac-8857-ab0e032c1679', 'cb5fbf98-569c-5e09-820f-12adafd77db7', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('4f15a571-1083-5626-8b39-c0602e07d5cb', 'CHK-209-RES', 'Resultado del Precomisionamiento', FALSE, 60);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('9ae59fa7-d7ec-5d27-8d25-1bddf435801c', '4f15a571-1083-5626-8b39-c0602e07d5cb', 60, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('a9cfcd7b-65d2-5ef2-8e1e-f234043d798a', '4f15a571-1083-5626-8b39-c0602e07d5cb', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para energización","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

-- ───────── CHK-210: FORMATO DE PRECOMISIONAMIENTO ─────────
INSERT INTO public.form_templates (id, project_id, key, name, test_type) VALUES
  ('18b6c71e-4b73-5225-846c-1df66b964700', NULL, 'CHK-210', 'FORMATO DE PRECOMISIONAMIENTO', 'precomisionamiento');

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('209762f4-8c21-58af-8374-ddfeaede2ff5', 'CHK-210-S0', 'Datos Específicos del Instrumento', FALSE, 10);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('18b6c71e-4b73-5225-846c-1df66b964700', '209762f4-8c21-58af-8374-ddfeaede2ff5', 10, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('de7f07b1-47c8-5c00-803c-b5f25ddb0c10', '209762f4-8c21-58af-8374-ddfeaede2ff5', 'rango_de_presion', 'Rango de Presión', 'texto'::public.field_type, FALSE, NULL, NULL, 10),
  ('226bdec1-8b0f-56b7-8164-ac88b756c53a', '209762f4-8c21-58af-8374-ddfeaede2ff5', 'tipo', 'Tipo', 'select'::public.field_type, FALSE, $j$["Tubo Bourdon","Diafragma","Cápsula"]$j$::jsonb, NULL, 20),
  ('14f43151-7d7b-54d3-89b5-5e8b556c6d76', '209762f4-8c21-58af-8374-ddfeaede2ff5', 'clasificacion_de_area', 'Clasificación de Área', 'texto'::public.field_type, FALSE, NULL, NULL, 30),
  ('d445a512-8f51-538d-826e-de3e78660c0b', '209762f4-8c21-58af-8374-ddfeaede2ff5', 'zona_ex', 'Zona Ex', 'texto'::public.field_type, FALSE, NULL, NULL, 40);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'CHK-210-S1', 'INSPECCIÓN MECÁNICA', FALSE, 20);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('18b6c71e-4b73-5225-846c-1df66b964700', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 20, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('5ebfcbde-f52b-58ad-8ff0-1bf0e661cef7', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it1', 'Instalación conforme a P&ID y planos aprobados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('d504d773-b9de-59d4-87a3-f601f801a0c8', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('9a2bae4e-2734-55f1-8f4c-16ebe9430848', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it2', 'Rango del manómetro conforme a la hoja de datos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('730d0de6-488d-5b9e-836b-2a9c5c639a3b', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('f0ff95c6-2349-59f7-8c8d-5c4e6c3ef893', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it3', 'Materiales compatibles con el servicio de lodos', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('585b30a1-4299-50a2-8724-c31a70fa70a5', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('1ff83a1f-d4f4-5014-82a5-a476f2ede7b0', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it4', 'Válvula de aislamiento instalada y accesible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('a3332936-3a45-5fa1-81d0-5bbb51bce669', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('c4b96449-d1c3-5ca0-8f0b-93f06f31bda6', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it5', 'Sello químico, sifón o accesorio requerido instalado (si aplica)', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('e416eb4a-e1a3-56d7-8851-3daaf7631981', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100),
  ('31d81185-c4ad-5db6-862b-60950cdb191b', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it6', 'Carátula legible y libre de daños', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 110),
  ('18a37cf1-84c9-5275-829e-3baf8a1e5821', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it6_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 120),
  ('698c5e20-1966-5709-875a-8ca8591ea0ae', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it7', 'Ausencia de fugas en conexiones de proceso', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 130),
  ('b75dd721-4275-5e27-8fd5-678c18efec08', '8cf0bade-21b4-5ed2-8d96-4b100fb0d160', 'it7_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 140);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'CHK-210-S2', 'VERIFICACIÓN DE INSTALACIÓN EN ÁREA CLASIFICADA', FALSE, 30);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('18b6c71e-4b73-5225-846c-1df66b964700', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 30, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('9de81880-9fad-5a61-8b4b-a6f2a0f31e8b', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it1', 'Ubicación conforme a planos de clasificación de áreas', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('962d78bd-d381-5627-8348-6db2ada2298a', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('08fcb533-5880-5aa3-8d28-e54b07bda04b', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it2', 'Materiales y accesorios adecuados para la zona de instalación', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('01ca2fd5-befe-5471-8d48-e8ff0a9b5e46', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('c1addbc2-ccd3-5972-8a2c-41870d8fdb7f', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it3', 'Identificación del instrumento visible y legible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('78659847-cf5b-5730-8baf-9a9db7c5eded', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('c1c19924-70b5-5d3d-80b7-3740fb73788f', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it4', 'Acceso seguro para inspección y mantenimiento', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('21e716ce-3e4d-5ce0-88c8-193dc0b03243', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80),
  ('a3aa3096-f893-5313-8446-f5411f506b3c', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it5', 'Sin evidencia de obstrucción en la toma de presión', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 90),
  ('fb894e77-df35-51bb-8fec-8ff912fd64de', '1f7bec1a-0ac8-56c6-8f89-d1eff3a72c94', 'it5_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 100);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('aec334d5-a150-56e2-8d62-d6bb4416e44a', 'CHK-210-S3', 'DOCUMENTACIÓN', FALSE, 40);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('18b6c71e-4b73-5225-846c-1df66b964700', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 40, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('4d563365-73eb-52a9-88a8-3b567a8c5e4c', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it1', 'Datasheet aprobado disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 10),
  ('0024b3a3-e219-5e67-898a-dc075bc8028a', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it1_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 20),
  ('c568be38-9ca3-531c-8609-06b0f2df0bba', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it2', 'Certificado de calibración vigente disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 30),
  ('37b54bdc-5204-559f-8140-d496ff0f4fb8', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it2_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 40),
  ('e03a4341-b1db-579d-875d-21f379088cb2', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it3', 'Manual del fabricante disponible', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 50),
  ('9df81b93-d6e0-5d78-80a5-40bd6e3b8606', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it3_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 60),
  ('0c5cbc79-e86d-5c25-8568-337cafabaa5c', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it4', 'Planos As-Built actualizados', 'checkbox'::public.field_type, FALSE, $j$["OK","N/A"]$j$::jsonb, NULL, 70),
  ('e1607ed1-b225-5014-8453-dacaeb388b06', 'aec334d5-a150-56e2-8d62-d6bb4416e44a', 'it4_obs', 'Observación', 'textarea'::public.field_type, FALSE, NULL, NULL, 80);

INSERT INTO public.template_sections (id, code, name, is_universal, sort_order) VALUES
  ('16564af9-ca61-5af5-8060-4333da7ff66b', 'CHK-210-RES', 'Resultado del Precomisionamiento', FALSE, 50);
INSERT INTO public.form_template_sections (template_id, section_id, sort_order, is_required) VALUES
  ('18b6c71e-4b73-5225-846c-1df66b964700', '16564af9-ca61-5af5-8060-4333da7ff66b', 50, TRUE);
INSERT INTO public.section_fields (id, section_id, key, label, type, required, options, validations, sort_order) VALUES
  ('ec26dba7-87ad-5b64-8dc1-5348ba19b982', '16564af9-ca61-5af5-8060-4333da7ff66b', 'resultado_precom', 'Resultado', 'select'::public.field_type, TRUE, $j$["Aprobado para puesta en servicio","Aprobado con observaciones","Rechazado"]$j$::jsonb, NULL, 10);

COMMIT;
