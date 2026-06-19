import { localDB } from "@/lib/db/local";
import { assembleTemplate } from "@/lib/sync/assembleTemplate";
import type { TemplateRef } from "@/hooks/useInspectionData";
import type { MockInspectionTemplate } from "@/types/inspection";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface PrefetchDeps {
  client: SupabaseLike;
  db?: typeof localDB;
  assemble?: (client: SupabaseLike, templateId: string) => Promise<MockInspectionTemplate | null>;
}

/** Descarga equipos + plantillas resueltas del proyecto a IndexedDB para uso offline. */
export async function prepareProjectOffline(
  projectId: string,
  deps: PrefetchDeps,
  onProgress?: (done: number, total: number) => void,
): Promise<{ equipment: number; templates: number; errors: string[] }> {
  const db = deps.db ?? localDB;
  const assemble = deps.assemble ?? assembleTemplate;
  const errors: string[] = [];
  const now = () => new Date().toISOString();

  // 1. Equipos del proyecto
  const { data: equipment, error: eqErr } = await deps.client
    .from("equipment").select("*").eq("project_id", projectId).is("deleted_at", null);
  if (eqErr || !equipment) {
    return { equipment: 0, templates: 0, errors: [`equipment: ${eqErr?.message ?? "sin datos"}`] };
  }
  await db.equipment.bulkPut(equipment.map((e: Record<string, unknown>) => ({ ...e, sync_status: "synced" })));

  // 2. Refs por equipo + 3. plantillas únicas
  const total = equipment.length;
  let done = 0;
  const templateIds = new Set<string>();

  for (const eq of equipment) {
    try {
      const { data: rows } = await deps.client.rpc("get_equipment_templates", { p_equipment_id: eq.id });
      const seen = new Set<string>();
      const refs: TemplateRef[] = [];
      for (const r of (rows ?? [])) {
        if (seen.has(r.template_id)) continue;
        seen.add(r.template_id);
        refs.push({ id: r.template_id, code: r.template_key, name: r.template_name, discipline: r.discipline ?? "", source: r.source });
        templateIds.add(r.template_id);
      }
      await db.equipmentTemplateRefs.put({ equipmentId: eq.id, refs, updatedAt: now() });
    } catch (err) {
      errors.push(`equipo ${eq.tag ?? eq.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
    done++;
    onProgress?.(done, total);
  }

  // 4. Ensamblar y cachear cada plantilla única
  let templates = 0;
  for (const tid of templateIds) {
    try {
      const tpl = await assemble(deps.client, tid);
      if (tpl) {
        tpl._source = "offline";
        await db.offlineTemplates.put({ id: tid, template: tpl, updatedAt: now() });
        templates++;
      } else {
        errors.push(`plantilla ${tid}: no ensamblada`);
      }
    } catch (err) {
      errors.push(`plantilla ${tid}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { equipment: equipment.length, templates, errors };
}
