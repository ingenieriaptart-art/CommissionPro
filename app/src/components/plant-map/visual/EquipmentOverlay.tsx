"use client";
import { useState } from "react";
import type { Equipment, PlantMapAreaOverlay } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pendiente:          "#3b82f6",
  en_ejecucion:       "#f59e0b",
  aprobado:           "#22c55e",
  revisado:           "#eab308",
  listo_energizacion: "#06b6d4",
  listo_arranque:     "#84cc16",
  operativo:          "#22c55e",
  rechazado:          "#ef4444",
  bloqueado:          "#475569",
};

export function equipmentStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#3b82f6";
}

interface EquipmentOverlayProps {
  overlay: PlantMapAreaOverlay;
  equipment: Equipment;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string, event: React.MouseEvent) => void;
}

export function EquipmentOverlay({
  overlay, equipment, selected, onHover, onClick,
}: EquipmentOverlayProps) {
  const [hovered, setHovered] = useState(false);
  const color = equipmentStatusColor(equipment.status);

  const fillOpacity   = selected ? 0.35 : hovered ? 0.2 : 0.08;
  const strokeOpacity = selected ? 1 : hovered ? 0.9 : 0.6;
  const strokeWidth   = selected ? 2.5 : hovered ? 2 : 1.5;

  const tooltipX = overlay.x + overlay.width + 6;
  const tooltipY = overlay.y;

  // Status badge dot — top-right corner
  const badgeX = overlay.x + overlay.width - 6;
  const badgeY = overlay.y + 6;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => { setHovered(true); onHover(equipment.id); }}
      onMouseLeave={() => { setHovered(false); onHover(null); }}
      onClick={(e) => onClick(equipment.id, e)}
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

      {/* Status badge dot */}
      <circle
        cx={badgeX} cy={badgeY} r={5}
        fill={color}
        stroke="#0f172a" strokeWidth={1.5}
        style={{ pointerEvents: "none" }}
      />

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
