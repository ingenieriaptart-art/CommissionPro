"use client";
import { useState, useCallback, useMemo } from "react";
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

  // Memoized lookup maps to avoid O(n*m) in render loop
  const equipmentById = useMemo(() => new Map(equipment.map(e => [e.id, e])), [equipment]);
  const areasById = useMemo(() => new Map(areas.map(a => [a.id, a])), [areas]);

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
        onMouseLeave={() => setDrawing(null)}
      >
        {overlays.map(o => {
          const isEquipment = (o.type ?? 'area') === 'equipment';
          const label = isEquipment
            ? (equipmentById.get(o.id)?.tag ?? o.id)
            : (areasById.get(o.id)?.name ?? o.id);
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
