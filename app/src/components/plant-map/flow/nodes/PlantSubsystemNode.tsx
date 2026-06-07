"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { Subsystem } from "@/types";

const COLORS = ["#3b82f6", "#14b8a6", "#22c55e", "#f59e0b", "#f97316", "#8b5cf6"];

interface PlantSubsystemNodeData extends Record<string, unknown> {
  entity: Subsystem;
  equipmentCount?: number;
  colorIndex?: number;
}

export type PlantSubsystemNodeType = Node<PlantSubsystemNodeData, "plantSubsystem">;

export function PlantSubsystemNode({ data, selected }: NodeProps<PlantSubsystemNodeType>) {
  const { entity, equipmentCount = 0, colorIndex = 0 } = data;
  const color = COLORS[colorIndex % COLORS.length];

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
