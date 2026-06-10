"use client";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
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
  onAreaClick: (id: string, event?: React.MouseEvent) => void;
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

  const areaMap = useMemo(
    () => new Map(areas.map((a, i) => [a.id, { area: a, index: i }])),
    [areas]
  );
  const equipmentMap = useMemo(
    () => new Map(equipment.map(eq => [eq.id, eq])),
    [equipment]
  );

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
                        onClick={(id, event) => onAreaClick(id, event)}
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

          {overlays.length === 0 && !editMode && (
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
