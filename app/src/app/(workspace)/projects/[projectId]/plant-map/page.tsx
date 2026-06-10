"use client";
import React, { useState, useMemo, useEffect } from "react";
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
import { FloatingEquipmentPanel } from "@/components/plant-map/panel/FloatingEquipmentPanel";
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
  const [floatingPanel, setFloatingPanel] = useState<{ equipmentId: string; x: number; y: number } | null>(null);

  // Reset tab, panel, and edit state on drill level change
  useEffect(() => {
    setActiveTab('unifilar');
    setPanelState({ open: false });
    setFloatingPanel(null);
    setEditMode(false);
    setPendingOverlays(null);
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

  const handleEquipmentOverlayClick = (equipmentId: string, event?: React.MouseEvent) => {
    setFloatingPanel({ equipmentId, x: event?.clientX ?? 400, y: event?.clientY ?? 300 });
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
                selectedAreaId={floatingPanel?.equipmentId ?? null}
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

      {/* Floating equipment panel — portal rendered in document.body */}
      {floatingPanel && (
        <FloatingEquipmentPanel
          equipmentId={floatingPanel.equipmentId}
          anchorX={floatingPanel.x}
          anchorY={floatingPanel.y}
          projectId={projectId}
          returnTo={`/projects/${projectId}/plant-map`}
          imageUrl={layout.imageUrl ?? undefined}
          onClose={() => setFloatingPanel(null)}
        />
      )}
    </div>
  );
}
