import type { FieldType } from "@/types";
import type {
  MockInspectionTemplate, MockInspectionSection, MockInspectionField,
} from "@/types/inspection";

// Cliente mínimo que necesitamos (compatible con createClient() de Supabase).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

/** Ensambla la plantilla completa (meta + secciones + campos) desde Supabase. */
export async function assembleTemplate(
  client: SupabaseLike,
  templateId: string,
): Promise<MockInspectionTemplate | null> {
  const { data: ft, error: ftErr } = await client
    .from("form_templates")
    .select("id, key, name, test_type, revision")
    .eq("id", templateId)
    .is("deleted_at", null)
    .single();
  if (ftErr || !ft) return null;

  const { data: sectionRows, error: secErr } = await client
    .rpc("get_template_sections", { p_template_id: templateId });
  if (secErr || !sectionRows?.length) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionIds: string[] = sectionRows.map((s: any) => s.section_id as string);

  const { data: sectionMeta } = await client
    .from("template_sections").select("id, is_universal").in("id", sectionIds);
  const universalMap: Record<string, boolean> = {};
  for (const s of (sectionMeta ?? [])) universalMap[s.id] = s.is_universal;

  const activeMapSec: Record<string, boolean> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of sectionRows) activeMapSec[s.section_id as string] = (s as any).is_active ?? true;

  const { data: allFields } = await client
    .from("section_fields").select("*").in("section_id", sectionIds).order("sort_order");

  const fieldsBySectionId: Record<string, MockInspectionField[]> = {};
  for (const f of (allFields ?? [])) {
    (fieldsBySectionId[f.section_id] ??= []).push({
      key: f.key, _db_id: f.id, label: f.label, type: f.type as FieldType,
      required: f.required, options: (f.options as string[]) ?? undefined,
      validations: (f.validations as { unit?: string; min?: number; max?: number }) ?? undefined,
      hint: f.hint ?? undefined, is_active: f.is_active ?? true,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: MockInspectionSection[] = sectionRows.map((s: any) => ({
    id: s.section_id, code: s.section_code, name: s.section_name,
    is_universal: universalMap[s.section_id] ?? false,
    is_active: activeMapSec[s.section_id] ?? true,
    fields: fieldsBySectionId[s.section_id] ?? [],
  }));

  return {
    id: ft.id, code: ft.key, name: ft.name, discipline: ft.test_type ?? "",
    revision: ft.revision ?? undefined, sections,
  };
}
