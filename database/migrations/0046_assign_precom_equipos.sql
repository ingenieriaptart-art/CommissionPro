-- ============================================================
-- 0046 — Asignación de formatos de equipos a su tipo de equipo (nivel global)
-- Inserta en equipment_type_templates; el director gestiona en pestaña 'Tipo de Equipo'.
-- ============================================================

BEGIN;

-- P_EFL-019 → BOMBA_CENTRIFUGA
INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)
SELECT et.id, '44dc3a8e-f832-57c8-8d29-6db594b7bfea' FROM public.equipment_types et WHERE et.code = 'BOMBA_CENTRIFUGA'
ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

-- P_BIO-006 → CHILLER
INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)
SELECT et.id, 'f643ff25-5e18-51b1-8881-769a062db69b' FROM public.equipment_types et WHERE et.code = 'CHILLER'
ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

-- P_BIO-005 → CHILLER
INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)
SELECT et.id, 'f0e05458-4276-566f-858f-d9326ed4f11b' FROM public.equipment_types et WHERE et.code = 'CHILLER'
ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

-- P_ELE-025 → GENERADOR_EMERGENCIA
INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)
SELECT et.id, '176d425f-9600-5891-8287-57013de0cea5' FROM public.equipment_types et WHERE et.code = 'GENERADOR_EMERGENCIA'
ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

-- P_BIO-020 → TEA
INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)
SELECT et.id, '182f1016-2c93-54ac-8e0e-e77daaf32c2a' FROM public.equipment_types et WHERE et.code = 'TEA'
ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

-- P_BIO-010 → SOPLADOR
INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)
SELECT et.id, '0a6c8444-82e7-5a5a-8b6d-1dcb094a0a11' FROM public.equipment_types et WHERE et.code = 'SOPLADOR'
ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

-- P_BIO-002 → SOPLADOR
INSERT INTO public.equipment_type_templates (equipment_type_id, template_id)
SELECT et.id, 'a2884493-4dba-54fc-81b1-06d2883c8b74' FROM public.equipment_types et WHERE et.code = 'SOPLADOR'
ON CONFLICT (equipment_type_id, template_id) DO NOTHING;

COMMIT;
