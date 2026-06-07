# Equipment Overlays en Unifilar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir un diagrama unifilar al nivel de área y marcar equipos con rectángulos clicables que abren la ficha técnica del equipo.

**Architecture:** Se extiende el tipo `PlantMapAreaOverlay` con un campo `type?` opcional. Los overlays de equipo se guardan en el mismo `overlays_json` del layout `level='area'`. Al hacer drill-down a un área se muestran tabs Unifilar/Diagrama. No se requiere migración de base de datos.

**Tech Stack:** Next.js 16, React, TypeScript, Supabase Storage, @tanstack/react-query, Tailwind CSS, SVG nativo

---

## Archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `app/src/types/index.ts` |
| Crear | `app/src/components/plant-map/visual/EquipmentOverlay.tsx` |
| Modificar | `app/src/components/plant-map/visual/OverlayEditor.tsx` |
| Modificar | `app/src/components/plant-map/visual/PlantVisualMap.tsx` |
| Modificar | `app/src/components/plant-map/visual/PlantVisualToolbar.tsx` |
| Modificar | `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx` |

---

## Task 1: Extender el tipo PlantMapAreaOverlay

**Files:**
- Modify: `app/src/types/index.ts` (línea ~420)

- [ ] **Step 1: Agregar campo `type` al interface**

En `app/src/types/index.ts`, reemplazar el bloque del interface:

```ts
/** Overlay rectangular de un área sobre la imagen física */
export interface PlantMapAreaOverlay {
  id: string;      // area.id
  x: number;       // píxeles desde esquina superior izquierda de la imagen original
  y: number;
  width: number;
  height: number;
}
```

por:

```ts
/** Overlay rectangular sobre la imagen física — área o equipo */
export interface PlantMapAreaOverlay {
  id: string;                   // area.id cuando type='area'; equipment.id cuando type='equipment'
  type?: 'area' | 'equipment';  // ausente se trata como 'area' (backward-compatible)
  x: number;
  y: number;
  width: number;
  height: number;
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/types/index.ts
git commit -m "feat: agregar campo type a PlantMapAreaOverlay — soporta overlays de área y equipo"
```

---

## Task 2: Crear componente EquipmentOverlay

**Files:**
- Create: `app/src/components/plant-map/visual/EquipmentOverlay.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
"use client";
import { useState } from "react";
import type { Equipment, PlantMapAreaOverlay } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pendiente:          "#3b82f6",
  en_ejecucion:       "#f59e0b",
  aprobado:           "#eab308",
  revisado:           "#eab308",
  listo_energizacion: "#84cc16",
  listo_arranque:     "#84cc16",
  operativo:          "#22c55e",
  rechazado:          "#ef4444",
  bloqueado:          "#ef4444",
};

export function equipmentStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#3b82f6";
}

interface EquipmentOverlayProps {
  overlay: PlantMapAreaOverlay;
  equipment: Equipment;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function EquipmentOverlay({
  overlay, equipment, selected, onHover, onClick,
}: EquipmentOverlayProps) {
  const [hovered, setHovered] = useState(false);
  const color = equipmentStatusColor(equipment.status);

  const fillOpacity  = selected ? 0.35 : hovered ? 0.2 : 0.08;
  const strokeOpacity = selected ? 1 : hovered ? 0.9 : 0.6;
  const strokeWidth  = selected ? 2.5 : hovered ? 2 : 1.5;

  const tooltipX = overlay.x + overlay.width + 6;
  const tooltipY = overlay.y;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => { setHovered(true); onHover(equipment.id); }}
      onMouseLeave={() => { setHovered(false); onHover(null); }}
      onClick={() => onClick(equipment.id)}
    >
      <rect
        x={overlay.x} y={overlay.y}
        width={overlay.width} height={overlay.height}
        fill={color} fillOpacity={fillOpacity}
        stroke={color} strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth} rx={3}
        style={{ transition: "all 0.15s ease" }}
      />
      {/* Tag siempre visible dentro del rectángulo */}
      <text
        x={overlay.x + overlay.width / 2}
        y={overlay.y + overlay.height / 2 + 4}
        textAnchor="middle"
        fill={color}
        fontSize={Math.max(9, Math.min(12, overlay.height * 0.3))}
        fontWeight={700}
        fontFamily="monospace, system-ui"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {equipment.tag}
      </text>

      {/* Tooltip al hover */}
      {(hovered || selected) && (
        <>
          <rect
            x={tooltipX} y={tooltipY}
            width={152} height={46}
            fill="rgba(15,23,42,0.92)"
            rx={4}
            stroke={color} strokeWidth={1}
          />
          <text x={tooltipX + 8} y={tooltipY + 15}
            fill="white" fontSize={10} fontWeight={700} fontFamily="monospace">
            {equipment.tag}
          </text>
          <text x={tooltipX + 8} y={tooltipY + 28} fill="#94a3b8" fontSize={9}>
            {equipment.name.length > 22 ? equipment.name.slice(0, 22) + "…" : equipment.name}
          </text>
          <text x={tooltipX + 8} y={tooltipY + 40} fill={color} fontSize={9}>
            {equipment.status.replace(/_/g, " ")}
          </text>
        </>
      )}
    </g>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/EquipmentOverlay.tsx
git commit -m "feat: componente EquipmentOverlay — rectángulo SVG con color por estado y tooltip"
```

---

## Task 3: Extender OverlayEditor para modo equipo

**Files:**
- Modify: `app/src/components/plant-map/visual/OverlayEditor.tsx`

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
"use client";
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Area, Equipment, PlantMapAreaOverlay } from "@/types";

interface DrawingRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface OverlayEditorProps {
  overlayMode: 'area' | 'equipment';
  areas: Area[];
  equipment: Equipment[];
  existingOverlays: PlantMapAreaOverlay[];
  imgWidth: number;
  imgHeight: number;
  scale: number;
  onOverlaysChange: (overlays: PlantMapAreaOverlay[]) => void;
}

export function OverlayEditor({
  overlayMode, areas, equipment, existingOverlays, imgWidth, imgHeight,
  scale, onOverlaysChange,
}: OverlayEditorProps) {
  const [overlays, setOverlays] = useState<PlantMapAreaOverlay[]>(existingOverlays);
  const [drawing, setDrawing] = useState<DrawingRect | null>(null);
  const [pendingOverlay, setPendingOverlay] = useState<PlantMapAreaOverlay | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  const toImageCoords = useCallback((clientX: number, clientY: number, svgEl: SVGSVGElement) => {
    const rect = svgEl.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    return { x: Math.max(0, Math.min(x, imgWidth)), y: Math.max(0, Math.min(y, imgHeight)) };
  }, [scale, imgWidth, imgHeight]);

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const { x, y } = toImageCoords(e.clientX, e.clientY, e.currentTarget);
    setDrawing({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing) return;
    e.stopPropagation();
    const { x, y } = toImageCoords(e.clientX, e.clientY, e.currentTarget);
    setDrawing(d => d ? { ...d, currentX: x, currentY: y } : null);
  };

  const handleSvgMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing) return;
    e.stopPropagation();
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

  const handleAssign = () => {
    if (!pendingOverlay || !selectedId) return;
    const updated = [
      ...overlays.filter(o => o.id !== selectedId),
      { ...pendingOverlay, id: selectedId, type: overlayMode },
    ];
    setOverlays(updated);
    onOverlaysChange(updated);
    setPendingOverlay(null);
    setSelectedId("");
  };

  const handleDeleteOverlay = (id: string) => {
    const updated = overlays.filter(o => o.id !== id);
    setOverlays(updated);
    onOverlaysChange(updated);
  };

  const drawingRect = drawing ? {
    x: Math.min(drawing.startX, drawing.currentX),
    y: Math.min(drawing.startY, drawing.currentY),
    width: Math.abs(drawing.currentX - drawing.startX),
    height: Math.abs(drawing.currentY - drawing.startY),
  } : null;

  // Items ya asignados (por type)
  const assignedAreaIds = new Set(
    overlays.filter(o => !o.type || o.type === 'area').map(o => o.id)
  );
  const assignedEquipmentIds = new Set(
    overlays.filter(o => o.type === 'equipment').map(o => o.id)
  );
  const unassignedAreas = areas.filter(a => !assignedAreaIds.has(a.id));
  const unassignedEquipment = equipment.filter(eq => !assignedEquipmentIds.has(eq.id));

  const popupLabel = overlayMode === 'equipment' ? "Asignar zona a equipo" : "Asignar zona a área";

  return (
    <>
      <svg
        style={{
          position: "absolute", inset: 0,
          width: imgWidth, height: imgHeight,
          cursor: "crosshair",
        }}
        viewBox={`0 0 ${imgWidth} ${imgHeight}`}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
      >
        {overlays.map(o => {
          const label = overlayMode === 'equipment'
            ? (equipment.find(eq => eq.id === o.id)?.tag ?? o.id)
            : (areas.find(a => a.id === o.id)?.name ?? o.id);
          return (
            <g key={o.id}>
              <rect
                x={o.x} y={o.y} width={o.width} height={o.height}
                fill="#3b82f6" fillOpacity={0.2}
                stroke="#3b82f6" strokeWidth={2} rx={3}
              />
              <text x={o.x + 6} y={o.y + 16} fill="white" fontSize={11} fontWeight={700}>
                {label}
              </text>
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

        {drawingRect && drawingRect.width > 5 && (
          <rect
            x={drawingRect.x} y={drawingRect.y}
            width={drawingRect.width} height={drawingRect.height}
            fill="#f59e0b" fillOpacity={0.2}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" rx={3}
          />
        )}
      </svg>

      {pendingOverlay && (
        <div
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 50,
            background: "#1e293b", border: "1px solid #3b82f6",
            borderRadius: 10, padding: 16, width: 232,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <p style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {popupLabel}
          </p>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              width: "100%", background: "#0f172a", color: "#e2e8f0",
              border: "1px solid #334155", borderRadius: 6, padding: "6px 8px",
              fontSize: 12, marginBottom: 10,
            }}
          >
            <option value="">
              {overlayMode === 'equipment' ? "Seleccionar equipo…" : "Seleccionar área…"}
            </option>
            {overlayMode === 'equipment'
              ? unassignedEquipment.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.tag} — {eq.name}</option>
                ))
              : unassignedAreas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))
            }
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleAssign}
              disabled={!selectedId}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12,
                background: selectedId ? "#1d4ed8" : "#1e293b",
                color: selectedId ? "white" : "#475569",
                border: "none", cursor: selectedId ? "pointer" : "not-allowed",
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

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/OverlayEditor.tsx
git commit -m "feat: OverlayEditor — soporte modo equipo con dropdown de equipos y stamp type en overlay"
```

---

## Task 4: Extender PlantVisualMap para modo equipo

**Files:**
- Modify: `app/src/components/plant-map/visual/PlantVisualMap.tsx`

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area, Equipment, PlantMapAreaOverlay } from "@/types";
import { PlantAreaOverlay } from "./PlantAreaOverlay";
import { EquipmentOverlay } from "./EquipmentOverlay";
import { OverlayEditor } from "./OverlayEditor";

interface PlantVisualMapProps {
  overlayMode: 'area' | 'equipment';
  imageUrl: string | null;
  overlays: PlantMapAreaOverlay[];
  areas: Area[];
  equipment: Equipment[];
  pctByArea: Record<string, number>;
  selectedAreaId: string | null;
  editMode: boolean;
  onAreaClick: (id: string) => void;
  onUploadClick: () => void;
  onOverlaysChange: (overlays: PlantMapAreaOverlay[]) => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
const SCALE_STEP = 0.15;

export function PlantVisualMap({
  overlayMode, imageUrl, overlays, areas, equipment, pctByArea,
  selectedAreaId, editMode, onAreaClick, onUploadClick, onOverlaysChange,
}: PlantVisualMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

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
  const equipmentMap = new Map(equipment.map(eq => [eq.id, eq]));

  const handleHover = useCallback((_id: string | null) => {}, []);

  const emptyText = overlayMode === 'equipment'
    ? "Subí el unifilar de esta área para comenzar"
    : "Subí el plano de tu planta para comenzar";
  const emptyBtnText = overlayMode === 'equipment'
    ? "Subir unifilar del área"
    : "Subir imagen de planta";
  const editHintText = overlayMode === 'equipment'
    ? 'Activá "Editar equipos" para marcar los equipos sobre el unifilar'
    : 'Activá "Editar áreas" para marcar las zonas sobre el plano';

  if (!imageUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <ImagePlus size={28} className="text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm">{emptyText}</p>
          <button
            onClick={onUploadClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {emptyBtnText}
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
        dragging ? "cursor-grabbing" : editMode ? "cursor-default" : "cursor-grab"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
          <img
            src={imageUrl}
            alt="Plano"
            onLoad={e => {
              const img = e.currentTarget;
              setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            style={{ display: "block", maxWidth: "none", userSelect: "none" }}
            draggable={false}
          />

          {imgSize.w > 0 && !editMode && (
            <svg
              style={{
                position: "absolute", inset: 0,
                width: imgSize.w, height: imgSize.h,
                pointerEvents: "none",
              }}
              viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
            >
              {overlays.map(overlay => {
                if (overlayMode === 'equipment') {
                  const eq = equipmentMap.get(overlay.id);
                  if (!eq) return null;
                  return (
                    <g key={overlay.id} style={{ pointerEvents: "all" }}>
                      <EquipmentOverlay
                        overlay={overlay}
                        equipment={eq}
                        selected={selectedAreaId === overlay.id}
                        onHover={handleHover}
                        onClick={onAreaClick}
                      />
                    </g>
                  );
                } else {
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
                        onHover={handleHover}
                        onClick={onAreaClick}
                      />
                    </g>
                  );
                }
              })}
            </svg>
          )}

          {imgSize.w > 0 && editMode && (
            <OverlayEditor
              overlayMode={overlayMode}
              areas={areas}
              equipment={equipment}
              existingOverlays={overlays}
              imgWidth={imgSize.w}
              imgHeight={imgSize.h}
              scale={scale}
              onOverlaysChange={onOverlaysChange}
            />
          )}

          {imageUrl && overlays.length === 0 && !editMode && (
            <div
              style={{
                position: "absolute", top: 12, left: 12,
                background: "rgba(15,23,42,0.9)", border: "1px solid #334155",
                borderRadius: 8, padding: "8px 14px",
                color: "#94a3b8", fontSize: 12, pointerEvents: "none",
              }}
            >
              {editHintText}
            </div>
          )}
        </div>
      </div>

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

      <div className="absolute bottom-4 left-4 bg-slate-800/80 text-slate-400 text-xs px-2 py-1 rounded border border-slate-700 z-10">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/PlantVisualMap.tsx
git commit -m "feat: PlantVisualMap — soporte overlayMode equipo/área y renderizado condicional EquipmentOverlay"
```

---

## Task 5: Extender PlantVisualToolbar para modo equipo

**Files:**
- Modify: `app/src/components/plant-map/visual/PlantVisualToolbar.tsx`

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
"use client";
import { useRef, useState } from "react";
import { Upload, Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface PlantVisualToolbarProps {
  overlayMode: 'area' | 'equipment';
  projectId: string;
  areaId?: string;        // requerido cuando overlayMode='equipment'
  hasImage: boolean;
  editMode: boolean;
  hasPendingOverlays: boolean;
  onEditModeChange: (active: boolean) => void;
  onImageUploaded: (url: string) => void;
  onSaveOverlays: () => void;
  onCancelEdit: () => void;
}

export function PlantVisualToolbar({
  overlayMode, projectId, areaId, hasImage, editMode, hasPendingOverlays,
  onEditModeChange, onImageUploaded, onSaveOverlays, onCancelEdit,
}: PlantVisualToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const ext = file.name.split('.').pop() ?? 'png';
      const folder = areaId ? `${projectId}/${areaId}` : projectId;
      const path = `${folder}/plano.${ext}`;

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

  const editLabel = overlayMode === 'equipment' ? "Editar equipos" : "Editar áreas";
  const saveLabel = overlayMode === 'equipment' ? "Guardar equipos" : "Guardar áreas";

  return (
    <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2 flex-shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={handleFileChange}
      />

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

      {hasImage && !editMode && (
        <button
          onClick={() => onEditModeChange(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors"
        >
          <Pencil size={12} /> {editLabel}
        </button>
      )}

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
            <Check size={12} /> {saveLabel}
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

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/plant-map/visual/PlantVisualToolbar.tsx
git commit -m "feat: PlantVisualToolbar — overlayMode prop, storage path por área, labels dinámicos"
```

---

## Task 6: Wiring en page.tsx — tabs Unifilar/Diagrama al nivel área

**Files:**
- Modify: `app/src/app/(workspace)/projects/[projectId]/plant-map/page.tsx`

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
"use client";
import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";
import { useAreas, useSystems, useSubsystems } from "@/hooks/useHierarchy";
import { useEquipment } from "@/hooks/useEquipment";
import { usePlantMapLayout } from "@/hooks/usePlantMapLayout";
import { PlantVisualMap } from "@/components/plant-map/visual/PlantVisualMap";
import { PlantVisualToolbar } from "@/components/plant-map/visual/PlantVisualToolbar";
import { PlantFlowCanvas } from "@/components/plant-map/flow/PlantFlowCanvas";
import { PlantMapPanel } from "@/components/plant-map/panel/PlantMapPanel";
import { PlantMapBreadcrumb } from "@/components/plant-map/PlantMapBreadcrumb";
import type { DrillLevel, PanelState, PlantMapAreaOverlay, Area, System, Subsystem } from "@/types";

const DONE_STATUSES = new Set(["listo_arranque", "operativo"]);

export default function PlantMapPage() {
  const params    = useParams() as { projectId: string };
  const router    = useRouter();
  const projectId = params.projectId;

  // ── Navigation state ────────────────────────────────────────
  const [drill, setDrill]           = useState<DrillLevel>({ level: 'visual' });
  const [panelState, setPanelState] = useState<PanelState>({ open: false });
  const [editMode, setEditMode]     = useState(false);
  const [pendingOverlays, setPendingOverlays] = useState<PlantMapAreaOverlay[] | null>(null);
  const [activeTab, setActiveTab]   = useState<'unifilar' | 'diagrama'>('unifilar');

  // Reset tab and panel when entering area level
  useEffect(() => {
    if (drill.level === 'area') {
      setActiveTab('unifilar');
      setPanelState({ open: false });
    }
  }, [drill.level]);

  // ── Data queries ─────────────────────────────────────────────
  const { data: project }     = useProject(projectId);
  const { data: areas = [] }  = useAreas(projectId);

  const areaIdForQuery   = (drill.level === 'area' || drill.level === 'system') ? drill.areaId : '';
  const systemIdForQuery = drill.level === 'system' ? drill.systemId : '';

  const { data: systems    = [] } = useSystems(areaIdForQuery);
  const { data: subsystems = [] } = useSubsystems(systemIdForQuery);
  const { data: equipment  = [] } = useEquipment(projectId);

  const activeEntities: (Area | System | Subsystem)[] =
    drill.level === 'area'   ? systems :
    drill.level === 'system' ? subsystems : [];

  const layout = usePlantMapLayout(projectId, drill, activeEntities);

  // ── Stats ────────────────────────────────────────────────────
  const subToSystem = useMemo(() =>
    new Map(subsystems.map(s => [s.id, s.system_id])), [subsystems]);
  const sysToArea = useMemo(() =>
    new Map(systems.map(s => [s.id, s.area_id])), [systems]);

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

  const handleAreaClick = (areaId: string) => {
    setPanelState({ open: true, view: 'area', areaId });
  };

  const handleEquipmentOverlayClick = (equipmentId: string) => {
    setPanelState({ open: true, view: 'detail', equipmentId });
  };

  const handleExploreArea = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    setDrill({ level: 'area', areaId, areaName: area?.name ?? '' });
    setPanelState({ open: false });
  };

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
      setPanelState({ open: true, view: 'equipment', subsystemId: nodeId });
    }
  };

  const handleBreadcrumbNavigate = (level: DrillLevel) => {
    setDrill(level);
    setPanelState({ open: false });
  };

  const handleImageUploaded = async (url: string) => {
    await layout.saveOverlays(pendingOverlays ?? layout.overlays, url);
  };

  const handleSaveOverlays = async () => {
    if (pendingOverlays) {
      await layout.saveOverlays(pendingOverlays);
      setPendingOverlays(null);
    }
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setPendingOverlays(null);
    setEditMode(false);
  };

  // ── Shared sub-renders ───────────────────────────────────────

  const saveLayoutButton = layout.hasPendingChanges && (
    <div className="absolute top-4 right-4 z-20">
      <button
        onClick={layout.saveLayout}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg transition-colors"
      >
        ● Guardar layout
      </button>
    </div>
  );

  const firstTimeBanner = layout.isFirstTime && (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg px-4 py-2 text-xs text-slate-400">
      Arrastrá los nodos para organizar el diagrama y guardá el layout
    </div>
  );

  const flowCanvas = (
    <>
      {saveLayoutButton}
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
      {firstTimeBanner}
    </>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative">
      {/* Breadcrumb — visible cuando no estamos en el nivel visual */}
      {drill.level !== 'visual' && (
        <PlantMapBreadcrumb
          drill={drill}
          projectName={project?.name ?? "Proyecto"}
          onNavigateTo={handleBreadcrumbNavigate}
        />
      )}

      {/* ── NIVEL VISUAL ── */}
      {drill.level === 'visual' && (
        <>
          <PlantVisualToolbar
            overlayMode="area"
            projectId={projectId}
            hasImage={!!layout.imageUrl}
            editMode={editMode}
            hasPendingOverlays={pendingOverlays !== null}
            onEditModeChange={setEditMode}
            onImageUploaded={handleImageUploaded}
            onSaveOverlays={handleSaveOverlays}
            onCancelEdit={handleCancelEdit}
          />
          <PlantVisualMap
            overlayMode="area"
            imageUrl={layout.imageUrl}
            overlays={pendingOverlays ?? layout.overlays}
            areas={areas}
            equipment={equipment}
            pctByArea={pctByArea}
            selectedAreaId={panelState.open && panelState.view === 'area' ? panelState.areaId : null}
            editMode={editMode}
            onAreaClick={handleAreaClick}
            onUploadClick={() => { /* manejado por PlantVisualToolbar */ }}
            onOverlaysChange={setPendingOverlays}
          />
        </>
      )}

      {/* ── NIVEL ÁREA — con tabs Unifilar / Diagrama ── */}
      {drill.level === 'area' && (
        <>
          {/* Tab bar */}
          <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('unifilar')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === 'unifilar'
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              )}
            >
              ⚡ Unifilar
            </button>
            <button
              onClick={() => setActiveTab('diagrama')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === 'diagrama'
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              )}
            >
              🔷 Diagrama
            </button>
          </div>

          {/* Tab Unifilar */}
          {activeTab === 'unifilar' && (
            <>
              <PlantVisualToolbar
                overlayMode="equipment"
                projectId={projectId}
                areaId={drill.areaId}
                hasImage={!!layout.imageUrl}
                editMode={editMode}
                hasPendingOverlays={pendingOverlays !== null}
                onEditModeChange={setEditMode}
                onImageUploaded={handleImageUploaded}
                onSaveOverlays={handleSaveOverlays}
                onCancelEdit={handleCancelEdit}
              />
              <PlantVisualMap
                overlayMode="equipment"
                imageUrl={layout.imageUrl}
                overlays={pendingOverlays ?? layout.overlays}
                areas={areas}
                equipment={equipment}
                pctByArea={pctByArea}
                selectedAreaId={
                  panelState.open && panelState.view === 'detail'
                    ? panelState.equipmentId
                    : null
                }
                editMode={editMode}
                onAreaClick={handleEquipmentOverlayClick}
                onUploadClick={() => { /* manejado por PlantVisualToolbar */ }}
                onOverlaysChange={setPendingOverlays}
              />
            </>
          )}

          {/* Tab Diagrama */}
          {activeTab === 'diagrama' && flowCanvas}
        </>
      )}

      {/* ── NIVEL SISTEMA ── */}
      {drill.level === 'system' && flowCanvas}

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
        onNavigateTests={() => router.push(`/projects/${projectId}/tests`)}
        onNavigateDocs={() => router.push(`/projects/${projectId}/documents`)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd app && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Verificar build**

```bash
cd app && npx next build --webpack 2>&1 | tail -20
```

Esperado: `Route (app)` table sin errores.

- [ ] **Step 4: Verificar en navegador**

Con el dev server corriendo en `http://localhost:3000`:

1. Ir a un proyecto → Mapa de Planta
2. Confirmar que el nivel visual sigue igual (plano + editar áreas)
3. Si hay un área con overlay, hacer clic → "Explorar Área"
4. Confirmar que aparecen los tabs **⚡ Unifilar** y **🔷 Diagrama**
5. Tab Diagrama → confirmar que muestra React Flow igual que antes
6. Tab Unifilar → confirmar toolbar con "Subir imagen" / "Editar equipos"
7. Subir el CCM de Cloración → confirmar que se muestra
8. Clic "Editar equipos" → dibujar rectángulo → dropdown muestra equipos del proyecto → asignar → guardar
9. Clic en rectángulo guardado → panel muestra ficha técnica del equipo

- [ ] **Step 5: Commit**

```bash
git add app/src/app/\(workspace\)/projects/\[projectId\]/plant-map/page.tsx
git commit -m "feat: PlantMapPage — tabs Unifilar/Diagrama al nivel área, overlays de equipo sobre unifilar"
```

- [ ] **Step 6: Commit también los cambios pendientes del hook**

```bash
git add app/src/hooks/usePlantMapLayout.ts database/migrations/0019_plant_map_layouts.sql
git commit -m "fix: usePlantMapLayout — upsert manual por limitación PostgREST; RLS simplificado con app_in_project"
```
