"use client";
import { useState } from "react";
import type { Area, PlantMapAreaOverlay } from "@/types";

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
  areaIndex: number;
  completionPct: number;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
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
      {(hovered || selected) && (
        <>
          <rect
            x={overlay.x + 6}
            y={overlay.y + 6}
            width={Math.min(overlay.width - 12, 160)}
            height={36}
            fill="rgba(15,23,42,0.85)"
            rx={4}
          />
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
