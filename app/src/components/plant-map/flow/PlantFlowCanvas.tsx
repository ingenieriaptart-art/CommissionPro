"use client";
import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import type { Connection, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PlantSystemNode } from "./nodes/PlantSystemNode";
import { PlantSubsystemNode } from "./nodes/PlantSubsystemNode";

const nodeTypes = {
  plantSystem: PlantSystemNode,
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
  initialNodes,
  initialEdges,
  onNodeClick,
  onNodesChange,
  onEdgesChange,
}: PlantFlowCanvasProps) {
  const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges);

  // Sync when initialNodes/initialEdges change (e.g., drill level changes)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const updated = addEdge(
          {
            ...connection,
            type: "smoothstep",
            style: { stroke: "#475569", strokeWidth: 1.5 },
            markerEnd: { type: "arrowclosed" as const, color: "#475569" },
          },
          eds
        );
        onEdgesChange(updated);
        return updated;
      });
    },
    [setEdges, onEdgesChange]
  );

  // Notify parent of position changes after nodes settle
  const handleNodeDragStop = useCallback(() => {
    setNodes((curr) => {
      onNodesChange(curr);
      return curr;
    });
  }, [setNodes, onNodesChange]);

  return (
    <div className="flex-1 relative" style={{ minHeight: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        onNodeDragStop={handleNodeDragStop}
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
