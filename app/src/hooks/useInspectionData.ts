"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getEquipmentById,
  getTemplateById,
  getTemplatesForEquipment,
} from "@/lib/inspection-mock-data";
import type { Equipment, FieldType } from "@/types";
import type { MockInspectionTemplate, MockInspectionSection, MockInspectionField } from "@/types/inspection";

// IDs mock empiezan con "eq-" / "tpl-"; los reales son UUIDs de 36 chars
const isMockId = (id: string) => id.startsWith("eq-") || id.startsWith("tpl-");

// ── Shapes intermedias ────────────────────────────────────────────────────────

export interface TemplateRef {
  id: string;
  code: string;
  name: string;
  discipline: string;
}

// ── 1. Equipment (mock o Supabase) ────────────────────────────────────────────

export function useEquipmentForInspection(equipmentId: string) {
  return useQuery({
    queryKey: ["equipment-inspection", equipmentId],
    queryFn: async (): Promise<Equipment | null> => {
      if (isMockId(equipmentId)) return getEquipmentById(equipmentId) ?? null;
      const supabase = createClient();
      const { data } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", equipmentId)
        .is("deleted_at", null)
        .single();
      return (data as Equipment) ?? null;
    },
    enabled: !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── 2. Templates para FloatingEquipmentPanel ──────────────────────────────────

export function useEquipmentInspectionTemplates(equipmentId: string) {
  return useQuery({
    queryKey: ["equipment-inspection-templates", equipmentId],
    queryFn: async (): Promise<TemplateRef[]> => {
      if (isMockId(equipmentId)) {
        return getTemplatesForEquipment(equipmentId).map(t => ({
          id: t.id, code: t.code, name: t.name, discipline: t.discipline,
        }));
      }
      const supabase = createClient();

      // Asignaciones directas equipment → template
      const { data: directRows } = await supabase
        .from("equipment_templates")
        .select("form_templates(id, key, name, test_type)")
        .eq("equipment_id", equipmentId);

      // Asignaciones por tipo de equipo
      const { data: eqRow } = await supabase
        .from("equipment")
        .select("equipment_type_id")
        .eq("id", equipmentId)
        .single();

      let typeRefs: TemplateRef[] = [];
      if (eqRow?.equipment_type_id) {
        const { data: typeRows } = await supabase
          .from("equipment_type_templates")
          .select("form_templates(id, key, name, test_type)")
          .eq("equipment_type_id", eqRow.equipment_type_id);

        typeRefs = (typeRows ?? []).flatMap(row => {
          const ft = (row as any).form_templates;
          if (!ft) return [];
          return [{ id: ft.id, code: ft.key, name: ft.name, discipline: ft.test_type ?? "" }];
        });
      }

      const directRefs: TemplateRef[] = (directRows ?? []).flatMap(row => {
        const ft = (row as any).form_templates;
        if (!ft) return [];
        return [{ id: ft.id, code: ft.key, name: ft.name, discipline: ft.test_type ?? "" }];
      });

      // Merge y deduplicar por id
      const seen = new Set<string>();
      const result: TemplateRef[] = [];
      for (const t of [...directRefs, ...typeRefs]) {
        if (!seen.has(t.id)) { seen.add(t.id); result.push(t); }
      }
      return result;
    },
    enabled: !!equipmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── 3. Template completo con secciones + campos ───────────────────────────────

export function useInspectionTemplate(templateId: string) {
  return useQuery({
    queryKey: ["inspection-template", templateId],
    queryFn: async (): Promise<MockInspectionTemplate | null> => {
      if (isMockId(templateId)) return getTemplateById(templateId) ?? null;

      const supabase = createClient();

      // 1. Metadatos del template
      const { data: ft, error: ftErr } = await supabase
        .from("form_templates")
        .select("id, key, name, test_type")
        .eq("id", templateId)
        .is("deleted_at", null)
        .single();
      if (ftErr || !ft) return null;

      // 2. Secciones (universales + asignadas) via RPC
      const { data: sectionRows, error: secErr } = await supabase
        .rpc("get_template_sections", { p_template_id: templateId });
      if (secErr || !sectionRows?.length) return null;

      const sectionIds: string[] = sectionRows.map((s: any) => s.section_id as string);

      // 3. is_universal por sección
      const { data: sectionMeta } = await supabase
        .from("template_sections")
        .select("id, is_universal")
        .in("id", sectionIds);

      const universalMap: Record<string, boolean> = {};
      for (const s of (sectionMeta ?? [])) universalMap[s.id] = s.is_universal;

      // 4. Campos de todas las secciones
      const { data: allFields } = await supabase
        .from("section_fields")
        .select("*")
        .in("section_id", sectionIds)
        .order("sort_order");

      const fieldsBySectionId: Record<string, MockInspectionField[]> = {};
      for (const f of (allFields ?? [])) {
        if (!fieldsBySectionId[f.section_id]) fieldsBySectionId[f.section_id] = [];
        fieldsBySectionId[f.section_id].push({
          key:         f.key,
          label:       f.label,
          type:        f.type as FieldType,
          required:    f.required,
          options:     (f.options as string[]) ?? undefined,
          validations: (f.validations as { unit?: string; min?: number; max?: number }) ?? undefined,
          hint:        f.hint ?? undefined,
        });
      }

      // 5. Ensamblar MockInspectionTemplate
      const sections: MockInspectionSection[] = sectionRows.map((s: any) => ({
        id:           s.section_id as string,
        code:         s.section_code as string,
        name:         s.section_name as string,
        is_universal: universalMap[s.section_id] ?? false,
        fields:       fieldsBySectionId[s.section_id] ?? [],
      }));

      return {
        id:         ft.id,
        code:       ft.key,
        name:       ft.name,
        discipline: ft.test_type ?? "",
        sections,
      };
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000,
  });
}
