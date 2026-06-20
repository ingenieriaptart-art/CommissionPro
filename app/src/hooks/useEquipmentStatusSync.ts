import { createClient } from "@/lib/supabase/client";
import { localDB, enqueueSync } from "@/lib/db/local";
import type { EquipmentStatus } from "@/types";
import type { SectionStatus } from "@/types/inspection";

/** Calcula % de secciones procesadas (complete o failed) sobre el total */
export function calcFormPct(sectionStatus: Record<string, SectionStatus>): number {
  const total = Object.keys(sectionStatus).length;
  if (total === 0) return 0;
  const done = Object.values(sectionStatus)
    .filter(s => s === "complete" || s === "failed").length;
  return Math.round((done / total) * 100);
}

/**
 * Actualiza equipment.status y (opcionalmente) equipment.metadata.form_pct en Supabase.
 * Fire-and-forget: no lanza excepción, falla silenciosa para no bloquear el UX.
 */
export async function syncEquipmentStatus(
  equipmentId: string,
  status: EquipmentStatus,
  formPct?: number,
): Promise<void> {
  try {
    const supabase = createClient();
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = { status, updated_at: now };

    if (formPct !== undefined) {
      // Leer metadata actual para hacer merge (evitar pisar otros campos del objeto)
      const { data: current } = await supabase
        .from("equipment")
        .select("metadata")
        .eq("id", equipmentId)
        .single();

      patch.metadata = {
        ...(current?.metadata ?? {}),
        form_pct: formPct,
      };
    }

    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    await localDB.equipment.update(equipmentId, patch as never);
    if (offline) {
      await enqueueSync("equipment", equipmentId, "UPDATE", { id: equipmentId, ...patch });
    } else {
      await supabase.from("equipment").update(patch).eq("id", equipmentId);
    }
  } catch {
    // falla silenciosa — el UX no se bloquea
  }
}
