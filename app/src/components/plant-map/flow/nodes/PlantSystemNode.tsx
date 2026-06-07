"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
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

interface PlantSystemNodeData extends Record<string, unknown> {
  entity: System;
  equipmentCount?: number;
  completionPct?: number;
  colorIndex?: number;
}

export type PlantSystemNodeType = Node<PlantSystemNodeData, "plantSystem">;

export function PlantSystemNode({ data, selected }: NodeProps<PlantSystemNodeType>) {
  const { entity, equipmentCount = 0, completionPct = 0, colorIndex = 0 } = data;
  const color = COLORS[colorIndex % COLORS.length];

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: "#475569" }} />
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
        <div style={{ height: 3, background: color.bar }} />
        <div className="px-3 py-2.5">
          <p className="text-[9px] font-mono text-slate-500 mb-0.5">{entity.code}</p>
          <p className="text-[11px] font-bold text-slate-100 leading-tight uppercase">
            {entity.name}
          </p>
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
