# Mapa Interactivo de Planta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el Mapa Interactivo de Planta con dos capas: Visual Plant Layer (imagen física con overlays SVG por área) y React Flow Layer (diagrama de proceso por área → sistema → subsistema → equipos en panel).

**Architecture:** La página `/plant-map` arranca en el Visual Plant Layer mostrando la imagen real de la planta con rectángulos SVG transparentes sobre cada área. Al hacer clic en un área se abre un panel flotante con KPIs y el botón "Explorar Área" que transiciona al React Flow del área (sistemas como nodos). Desde React Flow se navega hasta los subsistemas y luego a la lista de equipos en el panel. El layout de cada nivel se persiste por proyecto en la tabla `plant_map_layouts`.

**Tech Stack:** Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS, `@xyflow/react` v12, Supabase (Postgres + Storage), React Query (@tanstack/react-query), Dexie (localDB), Lucide React icons, `cn()` de `@/lib/utils`.

**Nota sobre tests:** El proyecto no tiene framework de unit tests. La verificación usa `npx tsc --noEmit` para tipos y el browser para comportamiento visual. Cada tarea termina con un commit verde.

**Spec:** `docs/superpowers/specs/2026-06-07-mapa-planta-design.md`

---

## Mapa de archivos

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `database/migrations/0019_plant_map_layouts.sql` | Crear | Tabla + RLS |
| `app/src/types/index.ts` | Modificar | 7 tipos nuevos |
| `app/src/hooks/usePlantMapLayout.ts` | Crear | CRUD layout + merge |
| `app/src/components/plant-map/visual/PlantVisualMap.tsx` | Crear | Imagen + SVG overlay container |
| `app/src/components/plant-map/visual/PlantAreaOverlay.tsx` | Crear | Rect SVG por área |
| `app/src/components/plant-map/visual/PlantVisualToolbar.tsx` | Crear | Upload imagen, zoom, modo edición |
| `app/src/components/plant-map/visual/OverlayEditor.tsx` | Crear | Dibujar/mover overlays |
| `app/src/components/plant-map/flow/PlantFlowCanvas.tsx` | Crear | Wrapper @xyflow/react |
| `app/src/components/plant-map/flow/nodes/PlantSystemNode.tsx` | Crear | Nodo Sistema nivel area |
| `app/src/components/plant-map/flow/nodes/PlantSubsystemNode.tsx` | Crear | Nodo Subsistema nivel system |
| `app/src/components/plant-map/panel/PlantMapPanel.tsx` | Crear | Panel flotante, gestor de capas |
| `app/src/components/plant-map/panel/AreaPanelContent.tsx` | Crear | KPIs + botón Explorar Área |
| `app/src/components/plant-map/panel/EquipmentListContent.tsx` | Crear | Lista equipos del subsistema |
| `app/src/components/plant-map/panel/EquipmentDetailContent.tsx` | Crear | Ficha técnica del equipo |
| `app/src/components/plant-map/PlantMapBreadcrumb.tsx` | Crear | Breadcrumb + botón Volver |
| `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx` | Crear | Página principal, estado DrillLevel |
| `app/src/components/layout/ProjectSidebar.tsx` | Modificar | Agregar navItem Mapa de Planta |

---

## Task 1: Migración BD + bucket Storage

**Files:**
- Create: `database/migrations/0019_plant_map_layouts.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- database/migrations/0019_plant_map_layouts.sql

CREATE TABLE IF NOT EXISTS plant_map_layouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level          TEXT NOT NULL CHECK (level IN ('visual', 'area', 'system')),
  parent_id      UUID DEFAULT NULL,
  nodes_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  overlays_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un solo layout por proyecto / nivel / padre
CREATE UNIQUE INDEX IF NOT EXISTS uq_plant_map_layout
  ON plant_map_layouts (
    project_id,
    level,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Índice para queries por proyecto
CREATE INDEX IF NOT EXISTS idx_plant_map_layouts_project
  ON plant_map_layouts (project_id);

ALTER TABLE plant_map_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can manage plant map"
  ON plant_map_layouts
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Aplicar la migración en Supabase**

En el panel de Supabase → SQL Editor, ejecutar el contenido del archivo. Verificar que la tabla aparece en Table Editor.

- [ ] **Step 3: Crear bucket `plant-maps` en Supabase Storage**

En Supabase → Storage → New bucket:
- Name: `plant-maps`
- Public bucket: **sí** (las imágenes se sirven directamente como URL pública)
- File size limit: 10MB

Agregar política de Storage en SQL Editor:

```sql
-- Política Storage: miembros del proyecto pueden subir/leer imágenes
-- El path debe ser: plant-maps/{project_id}/{filename}
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'plant-maps project members',
  'plant-maps',
  '(auth.uid() IS NOT NULL)'
);
```

- [ ] **Step 4: Commit**

```bash
git add database/migrations/0019_plant_map_layouts.sql
git commit -m "feat: migración 0019 — tabla plant_map_layouts + bucket plant-maps"
```

---

## Task 2: Tipos TypeScript

**Files:**
- Modify: `app/src/types/index.ts` (agregar al final del archivo)

- [ ] **Step 1: Agregar tipos al final de `app/src/types/index.ts`**

```ts
// ============================================================
// Plant Map — Mapa Interactivo de Planta
// ============================================================

export type PlantMapLevel = 'visual' | 'area' | 'system';

export interface PlantMapLayout {
  id: string;
  project_id: string;
  level: PlantMapLevel;
  parent_id: string | null;
  nodes_json: PlantMapNodePosition[];
  edges_json: PlantMapEdgeConfig[];
  overlays_json: PlantMapAreaOverlay[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

/** Posición de un nodo en el canvas React Flow */
export interface PlantMapNodePosition {
  id: string;
  x: number;
  y: number;
}

/** Edge en el diagrama React Flow */
export interface PlantMapEdgeConfig {
  id: string;
  source: string;
  target: string;
}

/** Overlay rectangular de un área sobre la imagen física */
export interface PlantMapAreaOverlay {
  id: string;      // area.id
  x: number;       // píxeles desde esquina superior izquierda de la imagen original
  y: number;
  width: number;
  height: number;
}

/** Estado de navegación — qué nivel está activo en el canvas */
export type DrillLevel =
  | { level: 'visual' }
  | { level: 'area';   areaId: string; areaName: string }
  | { level: 'system'; areaId: string; systemId: string; systemName: string };

/** Estado del panel flotante */
export type PanelState =
  | { open: false }
  | { open: true; view: 'area';      areaId: string }
  | { open: true; view: 'equipment'; subsystemId: string }
  | { open: true; view: 'detail';    equipmentId: string };
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/types/index.ts
git commit -m "feat: tipos PlantMap — PlantMapLayout, DrillLevel, PanelState, overlays"
```

---

## Task 3: Hook `usePlantMapLayout`

**Files:**
- Create: `app/src/hooks/usePlantMapLayout.ts`

El hook centraliza toda la lógica de datos del mapa: leer/escribir layouts, merge de entidades con posiciones, auto-arrange, upload de imagen.

- [ ] **Step 1: Crear `app/src/hooks/usePlantMapLayout.ts`**

```ts
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

  // Upsert layout
  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<PlantMapLayout>) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("plant_map_layouts")
        .upsert({
          project_id: projectId,
          level,
          parent_id: parentId,
          ...payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: "project_id,level,parent_id" });
      if (error) throw error;
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
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/usePlantMapLayout.ts
git commit -m "feat: hook usePlantMapLayout — CRUD layout, merge entities, Visual Layer + React Flow"
```

---

## Task 4: `PlantAreaOverlay` — rectángulo SVG por área

**Files:**
- Create: `app/src/components/plant-map/visual/PlantAreaOverlay.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";
import { useState } from "react";
import type { Area, PlantMapAreaOverlay } from "@/types";

// Colores de tema por posición (mismo esquema que ProjectSidebar)
const AREA_COLORS = [
  "#3b82f6", "#14b8a6", "#22c55e", "#f59e0b",
  "#f97316", "#8b5cf6", "#0ea5e9", "#f43f5e",
];

function areaColor(index: number): string {
  return AREA_COLORS[index % AREA_COLORS.length];
}

interface PlantAreaOverlayProps {
  overlay: PlantMapAreaOverlay;
  area: Area;
  areaIndex: number;        // para el color de tema
  completionPct: number;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  /** Escala aplicada al contenedor (zoom) — necesaria para calcular posición del tooltip */
  scale?: number;
}

export function PlantAreaOverlay({
  overlay, area, areaIndex, completionPct, selected,
  onHover, onClick,
}: PlantAreaOverlayProps) {
  const [hovered, setHovered] = useState(false);
  const color = areaColor(areaIndex);

  const handleMouseEnter = () => { setHovered(true); onHover(area.id); };
  const handleMouseLeave = () => { setHovered(false); onHover(null); };

  const fillOpacity = selected ? 0.35 : hovered ? 0.2 : 0;
  const strokeOpacity = selected ? 1 : hovered ? 0.8 : 0.4;
  const strokeWidth = selected ? 2.5 : hovered ? 2 : 1.5;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(area.id)}
    >
      {/* Rectángulo del área */}
      <rect
        x={overlay.x}
        y={overlay.y}
        width={overlay.width}
        height={overlay.height}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        rx={4}
        style={{ transition: "all 0.15s ease" }}
      />

      {/* Etiqueta del área (visible en hover o selected) */}
      {(hovered || selected) && (
        <>
          {/* Fondo de la etiqueta */}
          <rect
            x={overlay.x + 6}
            y={overlay.y + 6}
            width={Math.min(overlay.width - 12, 160)}
            height={36}
            fill="rgba(15,23,42,0.85)"
            rx={4}
          />
          {/* Nombre */}
          <text
            x={overlay.x + 12}
            y={overlay.y + 21}
            fill="white"
            fontSize={11}
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            {area.name.toUpperCase()}
          </text>
          {/* % avance */}
          <text
            x={overlay.x + 12}
            y={overlay.y + 35}
            fill={color}
            fontSize={9}
            fontFamily="system-ui, sans-serif"
          >
            {completionPct}% completado
          </text>
        </>
      )}
    </g>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/PlantAreaOverlay.tsx
git commit -m "feat: PlantAreaOverlay — rectángulo SVG interactivo por área con hover/select"
```

---

## Task 5: `PlantVisualMap` — imagen + overlays

**Files:**
- Create: `app/src/components/plant-map/visual/PlantVisualMap.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area, PlantMapAreaOverlay } from "@/types";
import { PlantAreaOverlay } from "./PlantAreaOverlay";

interface PlantVisualMapProps {
  imageUrl: string | null;
  overlays: PlantMapAreaOverlay[];
  areas: Area[];
  pctByArea: Record<string, number>;
  selectedAreaId: string | null;
  editMode: boolean;
  onAreaClick: (areaId: string) => void;
  onUploadClick: () => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
const SCALE_STEP = 0.15;

export function PlantVisualMap({
  imageUrl, overlays, areas, pctByArea,
  selectedAreaId, editMode, onAreaClick, onUploadClick,
}: PlantVisualMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);

  // Zoom con rueda del mouse
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Pan con drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (editMode) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => setDragging(false);

  const zoomIn  = () => setScale(s => Math.min(MAX_SCALE, s + SCALE_STEP));
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, s - SCALE_STEP));
  const fitView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const areaMap = new Map(areas.map((a, i) => [a.id, { area: a, index: i }]));

  // ── Sin imagen ──────────────────────────────────────────────
  if (!imageUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <ImagePlus size={28} className="text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm">
            Subí el plano de tu planta para comenzar
          </p>
          <button
            onClick={onUploadClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Subir imagen de planta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 relative overflow-hidden bg-slate-900 select-none",
        "bg-[radial-gradient(circle,_#1e293b_1px,_transparent_1px)] bg-[size:24px_24px]",
        dragging ? "cursor-grabbing" : "cursor-grab"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas transformable */}
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center center",
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          {/* Imagen de la planta */}
          <img
            src={imageUrl}
            alt="Plano de planta"
            onLoad={e => {
              const img = e.currentTarget;
              setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            style={{ display: "block", maxWidth: "none", userSelect: "none" }}
            draggable={false}
          />

          {/* SVG de overlays — mismo tamaño que la imagen */}
          {imgSize.w > 0 && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: imgSize.w,
                height: imgSize.h,
                pointerEvents: "none",
              }}
              viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
            >
              {overlays.map(overlay => {
                const entry = areaMap.get(overlay.id);
                if (!entry) return null;
                return (
                  <g key={overlay.id} style={{ pointerEvents: "all" }}>
                    <PlantAreaOverlay
                      overlay={overlay}
                      area={entry.area}
                      areaIndex={entry.index}
                      completionPct={pctByArea[overlay.id] ?? 0}
                      selected={selectedAreaId === overlay.id}
                      onHover={setHoveredAreaId}
                      onClick={onAreaClick}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Banner: sin overlays configurados */}
          {imageUrl && overlays.length === 0 && (
            <div
              style={{
                position: "absolute",
                top: 12, left: 12,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "8px 14px",
                color: "#94a3b8",
                fontSize: 12,
                pointerEvents: "none",
              }}
            >
              Activá "Editar áreas" para marcar las zonas sobre el plano
            </div>
          )}
        </div>
      </div>

      {/* Controles de zoom (esquina inferior derecha) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
        <button onClick={zoomIn}  className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center justify-center transition-colors border border-slate-600">
          <ZoomIn size={14} />
        </button>
        <button onClick={zoomOut} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center justify-center transition-colors border border-slate-600">
          <ZoomOut size={14} />
        </button>
        <button onClick={fitView} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center justify-center transition-colors border border-slate-600">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Indicador de escala */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 text-slate-400 text-xs px-2 py-1 rounded border border-slate-700 z-10">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/
git commit -m "feat: PlantVisualMap — imagen con overlays SVG, zoom/pan, estado vacío"
```

---

## Task 6: `PlantVisualToolbar` + upload de imagen

**Files:**
- Create: `app/src/components/plant-map/visual/PlantVisualToolbar.tsx`

- [ ] **Step 1: Crear el toolbar**

```tsx
"use client";
import { useRef, useState } from "react";
import { Upload, Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface PlantVisualToolbarProps {
  projectId: string;
  hasImage: boolean;
  editMode: boolean;
  hasPendingOverlays: boolean;
  onEditModeChange: (active: boolean) => void;
  onImageUploaded: (url: string) => void;
  onSaveOverlays: () => void;
  onCancelEdit: () => void;
}

export function PlantVisualToolbar({
  projectId, hasImage, editMode, hasPendingOverlays,
  onEditModeChange, onImageUploaded, onSaveOverlays, onCancelEdit,
}: PlantVisualToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo y tamaño
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Formato no soportado. Usá PNG, JPG o SVG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("El archivo no puede superar 10MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const path = `${projectId}/plano.${file.name.split('.').pop()}`;

      const { error: uploadErr } = await supabase.storage
        .from("plant-maps")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("plant-maps")
        .getPublicUrl(path);

      onImageUploaded(publicUrl);
    } catch (err) {
      setUploadError("Error al subir la imagen. Intentá de nuevo.");
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2 flex-shrink-0">
      {/* Input de archivo (oculto) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Botón subir imagen */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          "bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600",
          uploading && "opacity-60 cursor-not-allowed"
        )}
      >
        {uploading ? (
          <><Loader2 size={12} className="animate-spin" /> Subiendo...</>
        ) : (
          <><Upload size={12} /> {hasImage ? "Cambiar imagen" : "Subir imagen"}</>
        )}
      </button>

      {/* Botón editar áreas (solo si hay imagen) */}
      {hasImage && !editMode && (
        <button
          onClick={() => onEditModeChange(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors"
        >
          <Pencil size={12} /> Editar áreas
        </button>
      )}

      {/* Botones confirmar/cancelar edición */}
      {editMode && (
        <>
          <button
            onClick={onSaveOverlays}
            disabled={!hasPendingOverlays}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              hasPendingOverlays
                ? "bg-green-700 hover:bg-green-600 text-white border border-green-600"
                : "bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed"
            )}
          >
            <Check size={12} /> Guardar áreas
          </button>
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors"
          >
            <X size={12} /> Cancelar
          </button>
        </>
      )}

      {uploadError && (
        <span className="text-red-400 text-xs ml-2">{uploadError}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/PlantVisualToolbar.tsx
git commit -m "feat: PlantVisualToolbar — upload imagen a Supabase Storage, modo edición overlays"
```

---

## Task 7: `OverlayEditor` — dibujar y posicionar overlays

**Files:**
- Create: `app/src/components/plant-map/visual/OverlayEditor.tsx`

- [ ] **Step 1: Crear el editor**

```tsx
"use client";
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Area, PlantMapAreaOverlay } from "@/types";

interface DrawingRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface OverlayEditorProps {
  areas: Area[];
  existingOverlays: PlantMapAreaOverlay[];
  imgWidth: number;
  imgHeight: number;
  scale: number;
  offset: { x: number; y: number };
  onOverlaysChange: (overlays: PlantMapAreaOverlay[]) => void;
}

export function OverlayEditor({
  areas, existingOverlays, imgWidth, imgHeight,
  scale, offset, onOverlaysChange,
}: OverlayEditorProps) {
  const [overlays, setOverlays] = useState<PlantMapAreaOverlay[]>(existingOverlays);
  const [drawing, setDrawing] = useState<DrawingRect | null>(null);
  const [pendingOverlay, setPendingOverlay] = useState<PlantMapAreaOverlay | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  // Convierte coordenadas de pantalla → coordenadas de imagen
  const toImageCoords = useCallback((clientX: number, clientY: number, svgEl: SVGSVGElement) => {
    const rect = svgEl.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    return { x: Math.max(0, x), y: Math.max(0, y) };
  }, [scale]);

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY, e.currentTarget);
    setDrawing({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY, e.currentTarget);
    setDrawing(d => d ? { ...d, currentX: x, currentY: y } : null);
  };

  const handleSvgMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY, e.currentTarget);
    const rx = Math.min(drawing.startX, x);
    const ry = Math.min(drawing.startY, y);
    const rw = Math.abs(x - drawing.startX);
    const rh = Math.abs(y - drawing.startY);

    if (rw > 20 && rh > 20) {
      setPendingOverlay({ id: uuidv4(), x: rx, y: ry, width: rw, height: rh });
    }
    setDrawing(null);
  };

  const handleAssignArea = () => {
    if (!pendingOverlay || !selectedAreaId) return;
    // Reemplazar si ya existe un overlay para esta área
    const updated = [
      ...overlays.filter(o => o.id !== selectedAreaId),
      { ...pendingOverlay, id: selectedAreaId },
    ];
    setOverlays(updated);
    onOverlaysChange(updated);
    setPendingOverlay(null);
    setSelectedAreaId("");
  };

  const handleDeleteOverlay = (areaId: string) => {
    const updated = overlays.filter(o => o.id !== areaId);
    setOverlays(updated);
    onOverlaysChange(updated);
  };

  const drawingRect = drawing ? {
    x: Math.min(drawing.startX, drawing.currentX),
    y: Math.min(drawing.startY, drawing.currentY),
    width: Math.abs(drawing.currentX - drawing.startX),
    height: Math.abs(drawing.currentY - drawing.startY),
  } : null;

  const assignedAreaIds = new Set(overlays.map(o => o.id));
  const unassignedAreas = areas.filter(a => !assignedAreaIds.has(a.id));

  return (
    <>
      {/* SVG editor (superpuesto sobre la imagen) */}
      <svg
        style={{ position: "absolute", inset: 0, width: imgWidth, height: imgHeight, cursor: "crosshair" }}
        viewBox={`0 0 ${imgWidth} ${imgHeight}`}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
      >
        {/* Overlays existentes */}
        {overlays.map(o => {
          const area = areas.find(a => a.id === o.id);
          return (
            <g key={o.id}>
              <rect
                x={o.x} y={o.y} width={o.width} height={o.height}
                fill="#3b82f6" fillOpacity={0.2}
                stroke="#3b82f6" strokeWidth={2} rx={3}
              />
              <text x={o.x + 6} y={o.y + 16} fill="white" fontSize={11} fontWeight={700}>
                {area?.name ?? o.id}
              </text>
              {/* Botón eliminar */}
              <g
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); handleDeleteOverlay(o.id); }}
              >
                <circle cx={o.x + o.width - 8} cy={o.y + 8} r={7} fill="rgba(239,68,68,0.9)" />
                <text x={o.x + o.width - 8} y={o.y + 12} fill="white" fontSize={10} textAnchor="middle">✕</text>
              </g>
            </g>
          );
        })}

        {/* Rectángulo que se está dibujando */}
        {drawingRect && drawingRect.width > 5 && (
          <rect
            x={drawingRect.x} y={drawingRect.y}
            width={drawingRect.width} height={drawingRect.height}
            fill="#f59e0b" fillOpacity={0.2}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" rx={3}
          />
        )}
      </svg>

      {/* Modal de asignación de área (aparece al soltar el drag) */}
      {pendingOverlay && (
        <div
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 50,
            background: "#1e293b", border: "1px solid #3b82f6",
            borderRadius: 10, padding: 16, width: 220,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <p style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Asignar zona a área
          </p>
          <select
            value={selectedAreaId}
            onChange={e => setSelectedAreaId(e.target.value)}
            style={{
              width: "100%", background: "#0f172a", color: "#e2e8f0",
              border: "1px solid #334155", borderRadius: 6, padding: "6px 8px",
              fontSize: 12, marginBottom: 10,
            }}
          >
            <option value="">Seleccionar área…</option>
            {unassignedAreas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleAssignArea}
              disabled={!selectedAreaId}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12,
                background: selectedAreaId ? "#1d4ed8" : "#1e293b",
                color: selectedAreaId ? "white" : "#475569",
                border: "none", cursor: selectedAreaId ? "pointer" : "not-allowed",
              }}
            >
              Asignar
            </button>
            <button
              onClick={() => setPendingOverlay(null)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12,
                background: "#0f172a", color: "#94a3b8", border: "1px solid #334155",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/OverlayEditor.tsx
git commit -m "feat: OverlayEditor — dibujar/asignar/eliminar overlays de área sobre imagen"
```

---

## Task 8: Nodos React Flow (`PlantSystemNode`, `PlantSubsystemNode`)

**Files:**
- Create: `app/src/components/plant-map/flow/nodes/PlantSystemNode.tsx`
- Create: `app/src/components/plant-map/flow/nodes/PlantSubsystemNode.tsx`

- [ ] **Step 1: Instalar `@xyflow/react`**

```bash
cd app && npm install @xyflow/react
```

- [ ] **Step 2: Crear `PlantSystemNode.tsx`**

```tsx
"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { System } from "@/types";

const COLORS = [
  { border: "#1d4ed8", bar: "#3b82f6", text: "#60a5fa" },
  { border: "#0f766e", bar: "#14b8a6", text: "#2dd4bf" },
  { border: "#166534", bar: "#22c55e", text: "#4ade80" },
  { border: "#854d0e", bar: "#f59e0b", text: "#fbbf24" },
  { border: "#9a3412", bar: "#f97316", text: "#fb923c" },
  { border: "#5b21b6", bar: "#8b5cf6", text: "#a78bfa" },
];

function colorForIndex(i: number) {
  return COLORS[i % COLORS.length];
}

interface PlantSystemNodeData {
  entity: System;
  equipmentCount?: number;
  completionPct?: number;
  colorIndex?: number;
}

export function PlantSystemNode({ data, selected }: NodeProps) {
  const { entity, equipmentCount = 0, completionPct = 0, colorIndex = 0 } =
    data as PlantSystemNodeData;
  const color = colorForIndex(colorIndex);

  return (
    <>
      <Handle type="target" position={Position.Left}  style={{ background: "#475569" }} />
      <div
        className={cn(
          "w-36 rounded-xl overflow-hidden transition-all",
          "bg-slate-800 border",
          selected ? "shadow-lg shadow-blue-500/20" : "shadow-md"
        )}
        style={{
          borderColor: selected ? "#3b82f6" : color.border,
          boxShadow: selected ? `0 0 0 2px rgba(59,130,246,0.3)` : undefined,
        }}
      >
        {/* Barra de color superior */}
        <div style={{ height: 3, background: color.bar }} />

        <div className="px-3 py-2.5">
          <p className="text-[9px] font-mono text-slate-500 mb-0.5">{entity.code}</p>
          <p className="text-[11px] font-bold text-slate-100 leading-tight uppercase">
            {entity.name}
          </p>
          {/* Barra de avance */}
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${completionPct}%`, background: color.bar }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-500">{equipmentCount} eq.</span>
            <span className="text-[9px] font-semibold" style={{ color: color.text }}>
              {completionPct}%
            </span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "#475569" }} />
    </>
  );
}
```

- [ ] **Step 3: Crear `PlantSubsystemNode.tsx`**

```tsx
"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { Subsystem } from "@/types";

interface PlantSubsystemNodeData {
  entity: Subsystem;
  equipmentCount?: number;
  colorIndex?: number;
}

export function PlantSubsystemNode({ data, selected }: NodeProps) {
  const { entity, equipmentCount = 0, colorIndex = 0 } =
    data as PlantSubsystemNodeData;

  const colors = ["#3b82f6","#14b8a6","#22c55e","#f59e0b","#f97316","#8b5cf6"];
  const color = colors[colorIndex % colors.length];

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: "#475569" }} />
      <div
        className={cn(
          "w-32 rounded-lg overflow-hidden bg-slate-800 border transition-all",
          selected ? "shadow-lg" : ""
        )}
        style={{
          borderColor: selected ? "#3b82f6" : "#334155",
          boxShadow: selected ? `0 0 0 2px rgba(59,130,246,0.25)` : undefined,
        }}
      >
        <div style={{ height: 2, background: color }} />
        <div className="px-2.5 py-2">
          <p className="text-[9px] font-mono text-slate-500">{entity.code}</p>
          <p className="text-[10px] font-semibold text-slate-200 leading-tight mt-0.5">
            {entity.name}
          </p>
          <p className="text-[9px] text-slate-500 mt-1">{equipmentCount} equipos</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "#475569" }} />
    </>
  );
}
```

- [ ] **Step 4: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/src/components/plant-map/flow/nodes/
git commit -m "feat: nodos React Flow PlantSystemNode y PlantSubsystemNode con progreso y color"
```

---

## Task 9: `PlantFlowCanvas` — wrapper React Flow

**Files:**
- Create: `app/src/components/plant-map/flow/PlantFlowCanvas.tsx`

- [ ] **Step 1: Crear el canvas**

```tsx
"use client";
import { useCallback } from "react";
import {
  ReactFlow, Background, Controls, BackgroundVariant,
  addEdge, useNodesState, useEdgesState,
} from "@xyflow/react";
import type { Connection, NodeChange, EdgeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PlantSystemNode } from "./nodes/PlantSystemNode";
import { PlantSubsystemNode } from "./nodes/PlantSubsystemNode";
import type { Node, Edge } from "@xyflow/react";

const nodeTypes = {
  plantSystem:    PlantSystemNode,
  plantSubsystem: PlantSubsystemNode,
};

interface PlantFlowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodeClick: (nodeId: string) => void;
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
}

export function PlantFlowCanvas({
  initialNodes, initialEdges,
  onNodeClick, onNodesChange, onEdgesChange,
}: PlantFlowCanvasProps) {
  const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges);

  // Propagar cambios de posición al padre
  const onNodeChangeCallback = useCallback((changes: NodeChange[]) => {
    handleNodesChange(changes);
    // Notificar después del cambio para capturar las nuevas posiciones
    setNodes(curr => { onNodesChange(curr); return curr; });
  }, [handleNodesChange, setNodes, onNodesChange]);

  const onEdgeChangeCallback = useCallback((changes: EdgeChange[]) => {
    handleEdgesChange(changes);
    setEdges(curr => { onEdgesChange(curr); return curr; });
  }, [handleEdgesChange, setEdges, onEdgesChange]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => {
      const updated = addEdge({
        ...connection,
        type: "smoothstep",
        style: { stroke: "#475569", strokeWidth: 1.5 },
        markerEnd: { type: "arrowclosed" as const, color: "#475569" },
      }, eds);
      onEdgesChange(updated);
      return updated;
    });
  }, [setEdges, onEdgesChange]);

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodeChangeCallback}
        onEdgesChange={onEdgeChangeCallback}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        style={{ background: "#0f172a" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e293b"
          gap={24}
          size={1.5}
        />
        <Controls
          style={{ background: "#1e293b", border: "1px solid #334155" }}
        />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/flow/PlantFlowCanvas.tsx
git commit -m "feat: PlantFlowCanvas — wrapper @xyflow/react con nodos arrastrables y edges"
```

---

## Task 10: Panel flotante — `PlantMapPanel` + `AreaPanelContent`

**Files:**
- Create: `app/src/components/plant-map/panel/AreaPanelContent.tsx`
- Create: `app/src/components/plant-map/panel/PlantMapPanel.tsx`

- [ ] **Step 1: Crear `AreaPanelContent.tsx`**

```tsx
"use client";
import { ArrowRight, CheckSquare, FileText, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/types";

interface AreaPanelContentProps {
  area: Area;
  completionPct: number;
  equipmentCount: number;
  activityCount: number;
  docCount: number;
  onExploreArea: (areaId: string) => void;
  onNavigateTests: (areaId: string) => void;
  onNavigateDocs: (areaId: string) => void;
}

export function AreaPanelContent({
  area, completionPct, equipmentCount, activityCount, docCount,
  onExploreArea, onNavigateTests, onNavigateDocs,
}: AreaPanelContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* KPIs */}
      <div className="p-4 border-b border-slate-700">
        <p className="text-xs text-slate-400 mb-1">Avance de precomisionamiento</p>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-500">Progreso</span>
          <span className="text-sm font-bold text-green-400">{completionPct}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 border-b border-slate-700">
        {[
          { label: "Equipos", value: equipmentCount },
          { label: "Actividades", value: activityCount },
          { label: "Documentos", value: docCount },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center border-r border-slate-700 last:border-r-0">
            <p className="text-lg font-bold text-slate-100">{value}</p>
            <p className="text-[10px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Botón primario: Explorar Área */}
        <button
          onClick={() => onExploreArea(area.id)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <span>Explorar Área</span>
          <ArrowRight size={16} />
        </button>

        {/* Botones secundarios */}
        <button
          onClick={() => onNavigateTests(area.id)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-600"
        >
          <CheckSquare size={14} /> Checklists
        </button>

        <button
          onClick={() => onNavigateDocs(area.id)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-600"
        >
          <FileText size={14} /> Documentos
        </button>

        <button
          disabled
          title="Disponible en próxima versión"
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-600 text-xs font-medium rounded-lg border border-slate-700 cursor-not-allowed"
        >
          <Camera size={14} /> Fotografías y observaciones
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `PlantMapPanel.tsx`**

```tsx
"use client";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area, PanelState } from "@/types";
import { AreaPanelContent } from "./AreaPanelContent";
import { EquipmentListContent } from "./EquipmentListContent";
import { EquipmentDetailContent } from "./EquipmentDetailContent";

interface PlantMapPanelProps {
  panelState: PanelState;
  areas: Area[];
  pctByArea: Record<string, number>;
  equipmentCountByArea: Record<string, number>;
  projectId: string;
  onExploreArea: (areaId: string) => void;
  onPanelNavigate: (state: PanelState) => void;
  onClose: () => void;
  onNavigateTests: (areaId: string) => void;
  onNavigateDocs: (areaId: string) => void;
}

export function PlantMapPanel({
  panelState, areas, pctByArea, equipmentCountByArea, projectId,
  onExploreArea, onPanelNavigate, onClose,
  onNavigateTests, onNavigateDocs,
}: PlantMapPanelProps) {
  if (!panelState.open) return null;

  const area = panelState.view === 'area' || panelState.view === 'equipment' || panelState.view === 'detail'
    ? areas.find(a => panelState.view === 'area' ? a.id === panelState.areaId : true)
    : null;

  // Título por capa
  const titles: Record<string, string> = {
    area: area?.name ?? "Área",
    equipment: "Equipos",
    detail: "Ficha técnica",
  };

  // Navegación "atrás" dentro del panel
  const handleBack = () => {
    if (panelState.view === 'detail' && panelState.open) {
      // Volver a lista de equipos — necesitaría el subsystemId, lo mantenemos en el padre
      onClose();
    } else if (panelState.view === 'equipment') {
      // Volver al detalle del área
      const areaId = (panelState as { subsystemId: string }).subsystemId;
      onPanelNavigate({ open: true, view: 'area', areaId: areas[0]?.id ?? "" });
    } else {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        "fixed right-6 z-30",
        "top-1/2 -translate-y-1/2",
        "w-72 max-h-[80vh]",
        "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-right-4 duration-200"
      )}
    >
      {/* Header del panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          {panelState.view !== 'area' && (
            <button onClick={handleBack} className="text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-sm font-semibold text-slate-100">
            {titles[panelState.view]}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Contenido por capa */}
      <div className="flex-1 overflow-y-auto">
        {panelState.view === 'area' && (() => {
          const a = areas.find(x => x.id === panelState.areaId);
          if (!a) return null;
          return (
            <AreaPanelContent
              area={a}
              completionPct={pctByArea[a.id] ?? 0}
              equipmentCount={equipmentCountByArea[a.id] ?? 0}
              activityCount={0}
              docCount={0}
              onExploreArea={onExploreArea}
              onNavigateTests={onNavigateTests}
              onNavigateDocs={onNavigateDocs}
            />
          );
        })()}

        {panelState.view === 'equipment' && (
          <EquipmentListContent
            projectId={projectId}
            subsystemId={panelState.subsystemId}
            onEquipmentClick={(eqId) =>
              onPanelNavigate({ open: true, view: 'detail', equipmentId: eqId })
            }
          />
        )}

        {panelState.view === 'detail' && (
          <EquipmentDetailContent
            projectId={projectId}
            equipmentId={panelState.equipmentId}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/plant-map/panel/
git commit -m "feat: panel flotante PlantMapPanel + AreaPanelContent con botón Explorar Área"
```

---

## Task 11: Panel — `EquipmentListContent` + `EquipmentDetailContent`

**Files:**
- Create: `app/src/components/plant-map/panel/EquipmentListContent.tsx`
- Create: `app/src/components/plant-map/panel/EquipmentDetailContent.tsx`

- [ ] **Step 1: Crear `EquipmentListContent.tsx`**

```tsx
"use client";
import { Loader2 } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Equipment } from "@/types";

interface EquipmentListContentProps {
  projectId: string;
  subsystemId: string;
  onEquipmentClick: (equipmentId: string) => void;
}

export function EquipmentListContent({
  projectId, subsystemId, onEquipmentClick,
}: EquipmentListContentProps) {
  const { data: equipment = [], isLoading } = useEquipment(projectId, subsystemId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-slate-500 text-sm">No hay equipos en este subsistema</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-700">
      {equipment.map((eq: Equipment) => (
        <button
          key={eq.id}
          onClick={() => onEquipmentClick(eq.id)}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-400 font-mono">{eq.tag}</p>
            <p className="text-xs text-slate-300 truncate mt-0.5">{eq.name}</p>
            {eq.service && (
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{eq.service}</p>
            )}
          </div>
          <StatusBadge status={eq.status} className="flex-shrink-0 text-[9px]" />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear `EquipmentDetailContent.tsx`**

```tsx
"use client";
import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEquipment } from "@/hooks/useEquipment";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import type { Equipment } from "@/types";

interface EquipmentDetailContentProps {
  projectId: string;
  equipmentId: string;
}

export function EquipmentDetailContent({ projectId, equipmentId }: EquipmentDetailContentProps) {
  const router = useRouter();
  const { data: allEquipment = [], isLoading } = useEquipment(projectId);
  const eq = allEquipment.find((e: Equipment) => e.id === equipmentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (!eq) {
    return (
      <div className="py-6 text-center">
        <p className="text-slate-500 text-sm">Equipo no encontrado</p>
      </div>
    );
  }

  const fields = [
    { label: "Servicio",     value: eq.service },
    { label: "Tipo I/O",     value: eq.io_type },
    { label: "RTU destino",  value: eq.rtu_destination },
    { label: "Ubicación",    value: eq.location_system },
    { label: "P&ID Ref.",    value: eq.pid_reference },
    { label: "Potencia",     value: eq.power_kw ? `${eq.power_kw} kW` : undefined },
  ].filter(f => f.value);

  return (
    <div className="flex flex-col h-full">
      {/* Header del equipo */}
      <div className="px-4 pt-3 pb-3 border-b border-slate-700">
        <p className="text-base font-bold text-blue-400 font-mono">{eq.tag}</p>
        <p className="text-sm text-slate-200 mt-0.5">{eq.name}</p>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={eq.status} className="text-[10px]" />
          <Badge variant="outline" className="text-[10px] capitalize">{eq.criticality}</Badge>
        </div>
      </div>

      {/* Campos de ingeniería */}
      {fields.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Datos de ingeniería
          </p>
          <dl className="space-y-1.5">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-[10px] text-slate-500 flex-shrink-0">{label}</dt>
                <dd className="text-[10px] text-slate-300 text-right truncate">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Botón ver ficha completa */}
      <div className="p-3">
        <button
          onClick={() => router.push(`/projects/${projectId}/equipment`)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg border border-slate-600 transition-colors"
        >
          <ExternalLink size={12} /> Ver ficha completa en Equipos
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/plant-map/panel/EquipmentListContent.tsx app/src/components/plant-map/panel/EquipmentDetailContent.tsx
git commit -m "feat: panel equipos — EquipmentListContent y EquipmentDetailContent con ficha técnica"
```

---

## Task 12: `PlantMapBreadcrumb`

**Files:**
- Create: `app/src/components/plant-map/PlantMapBreadcrumb.tsx`

- [ ] **Step 1: Crear el breadcrumb**

```tsx
"use client";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrillLevel } from "@/types";

interface PlantMapBreadcrumbProps {
  drill: DrillLevel;
  projectName: string;
  onNavigateTo: (level: DrillLevel) => void;
}

export function PlantMapBreadcrumb({
  drill, projectName, onNavigateTo,
}: PlantMapBreadcrumbProps) {
  const isVisual = drill.level === 'visual';

  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-1">
      {/* Botón Volver (solo en niveles React Flow) */}
      {!isVisual && (
        <button
          onClick={() => {
            if (drill.level === 'system') {
              onNavigateTo({ level: 'area', areaId: drill.areaId, areaName: drill.areaName ?? '' });
            } else {
              onNavigateTo({ level: 'visual' });
            }
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 backdrop-blur-sm transition-colors mr-1"
        >
          <ArrowLeft size={12} /> Volver
        </button>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700">
        {/* Nivel: Proyecto / Visual */}
        <button
          onClick={() => onNavigateTo({ level: 'visual' })}
          className={cn(
            "text-xs transition-colors",
            isVisual
              ? "text-slate-200 font-semibold cursor-default"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          {projectName}
        </button>

        {/* Nivel: Área */}
        {(drill.level === 'area' || drill.level === 'system') && (
          <>
            <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
            <button
              onClick={() => {
                if (drill.level === 'system') {
                  onNavigateTo({ level: 'area', areaId: drill.areaId, areaName: drill.areaName ?? '' });
                }
              }}
              className={cn(
                "text-xs transition-colors",
                drill.level === 'area'
                  ? "text-slate-200 font-semibold cursor-default"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {drill.areaName}
            </button>
          </>
        )}

        {/* Nivel: Sistema */}
        {drill.level === 'system' && (
          <>
            <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
            <span className="text-xs text-slate-200 font-semibold">
              {drill.systemName}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/PlantMapBreadcrumb.tsx
git commit -m "feat: PlantMapBreadcrumb — navegación jerárquica con botón Volver"
```

---

## Task 13: `page.tsx` — integración completa

**Files:**
- Create: `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx`

- [ ] **Step 1: Crear la página**

```tsx
"use client";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { useAreas, useSystems, useSubsystems } from "@/hooks/useHierarchy";
import { useEquipment } from "@/hooks/useEquipment";
import { usePlantMapLayout } from "@/hooks/usePlantMapLayout";
import { PlantVisualMap } from "@/components/plant-map/visual/PlantVisualMap";
import { PlantVisualToolbar } from "@/components/plant-map/visual/PlantVisualToolbar";
import { OverlayEditor } from "@/components/plant-map/visual/OverlayEditor";
import { PlantFlowCanvas } from "@/components/plant-map/flow/PlantFlowCanvas";
import { PlantMapPanel } from "@/components/plant-map/panel/PlantMapPanel";
import { PlantMapBreadcrumb } from "@/components/plant-map/PlantMapBreadcrumb";
import type { DrillLevel, PanelState, PlantMapAreaOverlay, Area, System, Subsystem } from "@/types";

// Statuses de equipment que cuentan como "completado"
const DONE_STATUSES = new Set(["listo_arranque", "operativo"]);

export default function PlantMapPage() {
  const params  = useParams<{ projectId: string }>();
  const router  = useRouter();
  const projectId = params.projectId;

  // ── Navegación ──────────────────────────────────────────────
  const [drill, setDrill] = useState<DrillLevel>({ level: 'visual' });
  const [panelState, setPanelState] = useState<PanelState>({ open: false });
  const [editMode, setEditMode] = useState(false);
  const [pendingOverlays, setPendingOverlays] = useState<PlantMapAreaOverlay[] | null>(null);

  // ── Datos ───────────────────────────────────────────────────
  const { data: project } = useProject(projectId);
  const { data: areas = [] }   = useAreas(projectId);
  const { data: systems = [] } = useSystems(
    drill.level === 'area' ? drill.areaId : undefined
  );
  const { data: subsystems = [] } = useSubsystems(
    drill.level === 'system' ? drill.systemId : undefined
  );
  const { data: equipment = [] } = useEquipment(projectId);

  // Entidades activas según el nivel
  const activeEntities: (Area | System | Subsystem)[] =
    drill.level === 'area'   ? systems :
    drill.level === 'system' ? subsystems : [];

  // Layout para el nivel activo
  const layout = usePlantMapLayout(projectId, drill, activeEntities);

  // ── Estadísticas calculadas en cliente ──────────────────────
  const subToSystem = useMemo(() =>
    new Map(subsystems.map(s => [s.id, s.system_id])), [subsystems]);
  const sysToArea = useMemo(() =>
    new Map(systems.map(s   => [s.id, s.area_id])), [systems]);

  const pctByArea = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const eq of equipment) {
      const systemId = subToSystem.get(eq.subsystem_id);
      const areaId   = systemId ? sysToArea.get(systemId) : undefined;
      if (!areaId) continue;
      if (!map[areaId]) map[areaId] = { total: 0, done: 0 };
      map[areaId].total++;
      if (DONE_STATUSES.has(eq.status)) map[areaId].done++;
    }
    return Object.fromEntries(
      Object.entries(map).map(([k, v]) => [k, v.total ? Math.round(v.done / v.total * 100) : 0])
    );
  }, [equipment, subToSystem, sysToArea]);

  const equipmentCountByArea = useMemo(() => {
    const map: Record<string, number> = {};
    for (const eq of equipment) {
      const systemId = subToSystem.get(eq.subsystem_id);
      const areaId   = systemId ? sysToArea.get(systemId) : undefined;
      if (areaId) map[areaId] = (map[areaId] ?? 0) + 1;
    }
    return map;
  }, [equipment, subToSystem, sysToArea]);

  // ── Handlers ────────────────────────────────────────────────

  // Visual Layer: clic en área → abrir panel
  const handleAreaClick = (areaId: string) => {
    setPanelState({ open: true, view: 'area', areaId });
  };

  // Panel: botón "Explorar Área" → React Flow nivel area
  const handleExploreArea = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    setDrill({ level: 'area', areaId, areaName: area?.name ?? '' });
    setPanelState({ open: false });
  };

  // React Flow: clic en nodo sistema → drill a subsistemas
  const handleFlowNodeClick = (nodeId: string) => {
    if (drill.level === 'area') {
      const system = systems.find(s => s.id === nodeId);
      if (system) {
        setDrill({
          level: 'system',
          areaId: drill.areaId,
          areaName: drill.areaName,
          systemId: nodeId,
          systemName: system.name,
        });
      }
    } else if (drill.level === 'system') {
      // Clic en subsistema → abrir panel de equipos
      setPanelState({ open: true, view: 'equipment', subsystemId: nodeId });
    }
  };

  // Breadcrumb: navegar a un nivel específico
  const handleBreadcrumbNavigate = (level: DrillLevel) => {
    setDrill(level);
    setPanelState({ open: false });
  };

  // Upload de imagen
  const handleImageUploaded = async (url: string) => {
    await layout.saveOverlays(layout.overlays, url);
  };

  // Overlays: guardar
  const handleSaveOverlays = async () => {
    if (pendingOverlays) {
      await layout.saveOverlays(pendingOverlays);
      setPendingOverlays(null);
    }
    setEditMode(false);
  };

  // Overlays: cancelar edición
  const handleCancelEdit = () => {
    setPendingOverlays(null);
    setEditMode(false);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Breadcrumb (siempre visible en React Flow) */}
      {drill.level !== 'visual' && (
        <PlantMapBreadcrumb
          drill={drill}
          projectName={project?.name ?? "Proyecto"}
          onNavigateTo={handleBreadcrumbNavigate}
        />
      )}

      {/* ── VISUAL PLANT LAYER ── */}
      {drill.level === 'visual' && (
        <>
          <PlantVisualToolbar
            projectId={projectId}
            hasImage={!!layout.imageUrl}
            editMode={editMode}
            hasPendingOverlays={!!pendingOverlays && pendingOverlays !== layout.overlays}
            onEditModeChange={setEditMode}
            onImageUploaded={handleImageUploaded}
            onSaveOverlays={handleSaveOverlays}
            onCancelEdit={handleCancelEdit}
          />

          <div className="flex-1 relative overflow-hidden">
            <PlantVisualMap
              imageUrl={layout.imageUrl}
              overlays={pendingOverlays ?? layout.overlays}
              areas={areas}
              pctByArea={pctByArea}
              selectedAreaId={panelState.open && panelState.view === 'area' ? panelState.areaId : null}
              editMode={editMode}
              onAreaClick={handleAreaClick}
              onUploadClick={() => {/* fileInputRef se maneja en PlantVisualToolbar */}}
            />

            {/* Editor de overlays (encima del mapa, cuando editMode=true) */}
            {editMode && layout.imageUrl && (
              <OverlayEditor
                areas={areas}
                existingOverlays={pendingOverlays ?? layout.overlays}
                imgWidth={0}   // se resuelve internamente en el editor con getBoundingClientRect
                imgHeight={0}
                scale={1}
                offset={{ x: 0, y: 0 }}
                onOverlaysChange={setPendingOverlays}
              />
            )}
          </div>
        </>
      )}

      {/* ── REACT FLOW LAYER ── */}
      {drill.level !== 'visual' && (
        <>
          {/* Toolbar React Flow */}
          {layout.hasPendingChanges && (
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={layout.saveLayout}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg transition-colors"
              >
                ● Guardar layout
              </button>
            </div>
          )}

          {layout.isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-slate-900">
              <div className="text-slate-500 text-sm">Cargando diagrama…</div>
            </div>
          ) : (
            <PlantFlowCanvas
              initialNodes={layout.nodes}
              initialEdges={layout.edges}
              onNodeClick={handleFlowNodeClick}
              onNodesChange={layout.updatePositions}
              onEdgesChange={layout.updateEdges}
            />
          )}

          {/* Banner primer uso */}
          {layout.isFirstTime && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg px-4 py-2 text-xs text-slate-400">
              Arrastrá los nodos para organizar el diagrama y guardá el layout
            </div>
          )}
        </>
      )}

      {/* Panel flotante */}
      <PlantMapPanel
        panelState={panelState}
        areas={areas}
        pctByArea={pctByArea}
        equipmentCountByArea={equipmentCountByArea}
        projectId={projectId}
        onExploreArea={handleExploreArea}
        onPanelNavigate={setPanelState}
        onClose={() => setPanelState({ open: false })}
        onNavigateTests={(areaId) => router.push(`/projects/${projectId}/tests`)}
        onNavigateDocs={(areaId) => router.push(`/projects/${projectId}/documents`)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Verificar build**

```bash
cd app && npx next build --webpack 2>&1 | tail -20
```

Esperado: `✓ Compiled` sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(workspace\)/projects/\[projectId\]/plant-map/
git commit -m "feat: página PlantMapPage — integra Visual Layer + React Flow + panel + breadcrumb"
```

---

## Task 14: Agregar "Mapa de Planta" al `ProjectSidebar`

**Files:**
- Modify: `app/src/components/layout/ProjectSidebar.tsx`

- [ ] **Step 1: Agregar el import y el navItem**

En `app/src/components/layout/ProjectSidebar.tsx`, agregar `Map` al import de lucide-react:

```ts
import {
  LayoutDashboard, Wrench, CheckSquare, AlertTriangle,
  FileText, Settings, ChevronLeft, ArrowLeft, Zap, Cpu, Map,
} from "lucide-react";
```

Agregar el ítem al array `navItems`:

```ts
const navItems = [
  { segment: "dashboard",   icon: LayoutDashboard, label: "Dashboard"       },
  { segment: "equipment",   icon: Wrench,          label: "Equipos"         },
  { segment: "plant-map",   icon: Map,             label: "Mapa de Planta"  },
  { segment: "tests",       icon: CheckSquare,     label: "Pruebas"         },
  { segment: "punch",       icon: AlertTriangle,   label: "Punch List"      },
  { segment: "documents",   icon: FileText,        label: "Documentos"      },
  { segment: "engineering", icon: Cpu,             label: "Ing. Digital"    },
];
```

- [ ] **Step 2: Verificar tipos**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Verificar build completo**

```bash
cd app && npx next build --webpack 2>&1 | tail -20
```

Esperado: `✓ Compiled` sin errores.

- [ ] **Step 4: Verificar en browser**

```bash
cd app && npm run dev
```

1. Abrir `http://localhost:3000`
2. Navegar a un proyecto → verificar que "Mapa de Planta" aparece en el sidebar
3. Hacer clic → la página carga con el estado vacío (sin imagen) mostrando "Subir imagen de planta"
4. Subir una imagen PNG → verificar que aparece en el canvas
5. Activar "Editar áreas" → dibujar un rectángulo → asignar a un área → guardar
6. Hacer clic en el overlay del área → panel flotante aparece con KPIs y botón "Explorar Área"
7. Clic "Explorar Área" → React Flow carga los sistemas del área
8. Breadcrumb muestra `[Proyecto] > [Área]` con botón Volver
9. Clic en un sistema → React Flow de subsistemas
10. Clic en un subsistema → panel flotante con lista de equipos

- [ ] **Step 5: Commit final**

```bash
git add app/src/components/layout/ProjectSidebar.tsx
git commit -m "feat: agregar Mapa de Planta al sidebar de proyecto — NavigationItem con ícono Map"
```

---

## Checklist self-review

**Spec coverage:**
- [x] Visual Plant Layer (PNG/JPG/SVG/CAD) → `PlantVisualMap` + Task 5
- [x] Overlays con x/y/width/height → `PlantAreaOverlay` + `OverlayEditor` + Task 4/7
- [x] Hover: color + tooltip → `PlantAreaOverlay` (states hovered/selected)
- [x] Clic: resaltar + panel → `PlantMapPanel` + `AreaPanelContent`
- [x] Botón "Explorar Área" → `AreaPanelContent` + `handleExploreArea`
- [x] React Flow como motor de ingeniería → `PlantFlowCanvas` + Task 9
- [x] Drill-down Área → Sistema → Subsistema → Equipos → Ficha
- [x] Breadcrumb + botón Volver → `PlantMapBreadcrumb` + Task 12
- [x] Drag & drop con persistencia → `usePlantMapLayout.saveLayout`
- [x] Upload imagen por proyecto → `PlantVisualToolbar` + Supabase Storage
- [x] Sidebar navItem → Task 14
- [x] Migración 0019 → Task 1
- [x] Tipos TypeScript → Task 2
- [x] Responsive tablet → `PlantMapPanel` con `bottom` en tablet (pendiente en `PlantMapPanel` — ajustar breakpoint `md:top-1/2 md:-translate-y-1/2 max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:w-full max-md:rounded-b-none`)
