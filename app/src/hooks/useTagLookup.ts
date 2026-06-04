import { useQuery }     from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

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
        supabase
          .from("equipment")
          .select(`
            id, tag, name, io_type, rtu_destination, service, status, metadata,
            subsystems ( name, systems ( name ) )
          `)
          .eq("project_id", projectId)
          .ilike("tag", `%${q}%`)
          .is("deleted_at", null)
          .order("tag")
          .limit(20),

        supabase
          .from("engineering_extracted_tags")
          .select(`
            id, tag, description, detected_type, tag_confidence, status,
            documents ( name )
          `)
          .eq("project_id", projectId)
          .ilike("tag", `%${q}%`)
          .order("tag")
          .limit(20),
      ]);

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
          subsystem_name:  meta.unclassified ? "Sin clasificar" : (e.subsystems?.name ?? null),
          system_name:     meta.unclassified ? null             : (e.subsystems?.systems?.name ?? null),
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
        document_name:  t.documents?.name ?? null,
      }));

      return { equipment, extractedTags };
    },
  });
}
