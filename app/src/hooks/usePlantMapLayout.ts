"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { createClient } from "@/lib/supabase/client";
import type {
  Area, System, Subsystem,
  PlantMapLayout, PlantMapNodePosition, PlantMapEdgeConfig,
  PlantMapAreaOverlay, DrillLevel,
} from "@/types";

// ─── helpers ────────────────────────────────────────────────────

function buildQueryKey(projectId: string, drill: DrillLevel) {
  if (drill.level === 'visual') return ["plant-map-layout", projectId, "visual"];
  if (drill.level === 'area')   return ["plant-map-layout", projectId, "area", drill.areaId];
  return ["plant-map-layout", projectId, "system", drill.systemId];
}

function getLevel(drill: DrillLevel): PlantMapLayout['level'] {
  return drill.level;
}

function getParentId(drill: DrillLevel): string | null {
  if (drill.level === 'area')   return drill.areaId;
  if (drill.level === 'system') return drill.systemId;
  return null;
}

/** Combina entidades reales + posiciones guardadas en nodos React Flow */
export function mergeIntoNodes(
  entities: (Area | System | Subsystem)[],
  positions: PlantMapNodePosition[],
  nodeType: string
): Node[] {
  const posMap = new Map(positions.map(p => [p.id, p]));
  return entities.map((entity, i) => {
    const saved = posMap.get(entity.id);
    return {
      id: entity.id,
      type: nodeType,
      position: saved
        ? { x: saved.x, y: saved.y }
        : { x: (i % 4) * 220, y: Math.floor(i / 4) * 160 },
      data: { entity },
    };
  });
}

/** Convierte PlantMapEdgeConfig[] → Edge[] para React Flow */
function toFlowEdges(configs: PlantMapEdgeConfig[]): Edge[] {
  return configs.map(c => ({
    id: c.id,
    source: c.source,
    target: c.target,
    type: 'smoothstep',
    style: { stroke: '#475569', strokeWidth: 1.5 },
    markerEnd: { type: 'arrowclosed' as const, color: '#475569' },
  }));
}

// ─── fetcher ────────────────────────────────────────────────────

async function fetchLayout(
  projectId: string,
  level: PlantMapLayout['level'],
  parentId: string | null
): Promise<PlantMapLayout | null> {
  const supabase = createClient();
  const q = supabase
    .from("plant_map_layouts")
    .select("*")
    .eq("project_id", projectId)
    .eq("level", level);

  const { data, error } = parentId
    ? await q.eq("parent_id", parentId).maybeSingle()
    : await q.is("parent_id", null).maybeSingle();

  if (error) throw error;
  return data as PlantMapLayout | null;
}

// ─── hook ───────────────────────────────────────────────────────

interface UsePlantMapLayoutReturn {
  // Visual Layer
  imageUrl: string | null;
  overlays: PlantMapAreaOverlay[];
  saveOverlays: (overlays: PlantMapAreaOverlay[], imageUrl?: string) => Promise<void>;

  // React Flow
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  isFirstTime: boolean;
  hasPendingChanges: boolean;
  updatePositions: (nodes: Node[]) => void;
  updateEdges: (edges: Edge[]) => void;
  saveLayout: () => Promise<void>;
}

export function usePlantMapLayout(
  projectId: string,
  drill: DrillLevel,
  entities: (Area | System | Subsystem)[]
): UsePlantMapLayoutReturn {
  const qc = useQueryClient();
  const level = getLevel(drill);
  const parentId = getParentId(drill);
  const qKey = buildQueryKey(projectId, drill);

  const nodeType = drill.level === 'area' ? 'plantSystem' : 'plantSubsystem';

  // Leer layout guardado
  const { data: layout, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => fetchLayout(projectId, level, parentId),
    enabled: !!projectId,
  });

  // Posiciones y edges pendientes (no guardados aún)
  const [pendingPositions, setPendingPositions] = useState<PlantMapNodePosition[] | null>(null);
  const [pendingEdges, setPendingEdges] = useState<PlantMapEdgeConfig[] | null>(null);

  const hasPendingChanges = pendingPositions !== null || pendingEdges !== null;

  // Nodos React Flow (combina entidades + posiciones)
  const savedPositions = layout?.nodes_json ?? [];
  const positions = pendingPositions ?? savedPositions;
  const nodes = mergeIntoNodes(entities, positions, nodeType);

  // Edges React Flow
  const savedEdgeConfigs = layout?.edges_json ?? [];
  const edgeConfigs = pendingEdges ?? savedEdgeConfigs;
  const edges = toFlowEdges(edgeConfigs);

  // Upsert layout — manual select+insert/update because PostgREST can't resolve
  // conflicts on expression-based unique indexes (COALESCE on nullable parent_id).
  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<PlantMapLayout>) => {
      const supabase = createClient();
      const q = supabase
        .from("plant_map_layouts")
        .select("id")
        .eq("project_id", projectId)
        .eq("level", level);
      const { data: existing } = parentId
        ? await q.eq("parent_id", parentId).maybeSingle()
        : await q.is("parent_id", null).maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("plant_map_layouts")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plant_map_layouts")
          .insert({
            project_id: projectId,
            level,
            parent_id: parentId,
            ...payload,
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  const updatePositions = useCallback((flowNodes: Node[]) => {
    setPendingPositions(
      flowNodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y }))
    );
  }, []);

  const updateEdges = useCallback((flowEdges: Edge[]) => {
    setPendingEdges(
      flowEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
    );
  }, []);

  const saveLayout = useCallback(async () => {
    const newPositions = pendingPositions ?? savedPositions;
    const newEdges = pendingEdges ?? savedEdgeConfigs;
    await upsertMutation.mutateAsync({
      nodes_json: newPositions,
      edges_json: newEdges,
      overlays_json: layout?.overlays_json ?? [],
      image_url: layout?.image_url,
    });
    setPendingPositions(null);
    setPendingEdges(null);
  }, [pendingPositions, pendingEdges, savedPositions, savedEdgeConfigs, layout, upsertMutation]);

  const saveOverlays = useCallback(async (
    newOverlays: PlantMapAreaOverlay[],
    newImageUrl?: string
  ) => {
    await upsertMutation.mutateAsync({
      overlays_json: newOverlays,
      image_url: newImageUrl ?? layout?.image_url,
      nodes_json: layout?.nodes_json ?? [],
      edges_json: layout?.edges_json ?? [],
    });
  }, [layout, upsertMutation]);

  return {
    imageUrl: layout?.image_url ?? null,
    overlays: layout?.overlays_json ?? [],
    saveOverlays,
    nodes,
    edges,
    isLoading,
    isFirstTime: !layout,
    hasPendingChanges,
    updatePositions,
    updateEdges,
    saveLayout,
  };
}
