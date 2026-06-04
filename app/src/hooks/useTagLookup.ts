import { useQuery }     from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

// Cliente separado para lookups — misma URL/anonKey que el resto de la app.
// Supabase JS v2 persiste la sesión en localStorage bajo la misma clave,
// así que este cliente comparte automáticamente el token del usuario logueado.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface EquipmentLookup {
  id: string;
  tag: string;
  name: string;
  io_type: string | null;
  rtu_destination: string | null;
  service: string | null;
  status: string;
  unclassified: boolean;
  subsystem_name: string | null;
  system_name: string | null;
  from_excel: boolean;
  from_tag: boolean;
}

export interface ExtractedTagLookup {
  id: string;
  tag: string;
  description: string | null;
  detected_type: string;
  tag_confidence: number;
  status: string;
  document_name: string | null;
}

export interface TagLookupResult {
  equipment: EquipmentLookup[];
  extractedTags: ExtractedTagLookup[];
}

export function useTagLookup(projectId: string, query: string) {
  return useQuery<TagLookupResult>({
    queryKey: ["tag-lookup", projectId, query],
    enabled:  query.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const q = query.trim().toUpperCase();

      const [eqRes, tagRes] = await Promise.all([
        // Sin joins complejos — solo campos directos de equipment
        supabase
          .from("equipment")
          .select("id, tag, name, io_type, rtu_destination, service, status, metadata, subsystem_id")
          .eq("project_id", projectId)
          .ilike("tag", `%${q}%`)
          .is("deleted_at", null)
          .order("tag")
          .limit(20),

        // Sin join a documents — solo campos directos
        supabase
          .from("engineering_extracted_tags")
          .select("id, tag, description, detected_type, tag_confidence, status, document_id")
          .eq("project_id", projectId)
          .ilike("tag", `%${q}%`)
          .order("tag")
          .limit(20),
      ]);

      if (eqRes.error)  console.error("[useTagLookup] equipment error:",       eqRes.error);
      if (tagRes.error) console.error("[useTagLookup] extracted_tags error:", tagRes.error);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const equipment: EquipmentLookup[] = (eqRes.data ?? []).map((e: any) => {
        const meta = (e.metadata ?? {}) as Record<string, unknown>;
        return {
          id:              e.id,
          tag:             e.tag,
          name:            e.name,
          io_type:         e.io_type,
          rtu_destination: e.rtu_destination,
          service:         e.service,
          status:          e.status,
          unclassified:    meta.unclassified === true,
          subsystem_name:  meta.unclassified ? "Sin clasificar" : null,
          system_name:     null,
          from_excel:      meta.from_excel === true,
          from_tag:        meta.from_tag   === true,
        };
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractedTags: ExtractedTagLookup[] = (tagRes.data ?? []).map((t: any) => ({
        id:             t.id,
        tag:            t.tag,
        description:    t.description,
        detected_type:  t.detected_type,
        tag_confidence: t.tag_confidence,
        status:         t.status,
        document_name:  null,
      }));

      return { equipment, extractedTags };
    },
  });
}
