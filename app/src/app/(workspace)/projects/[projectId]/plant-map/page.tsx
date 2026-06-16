"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const LDC_PROJECT_ID = "eba099c0-32ca-4be7-823f-4ab7f3480004";
import { useProject } from "@/hooks/useProject";
import { useAreas, useSystems, useSubsystems } from "@/hooks/useHierarchy";
import { useEquipment } from "@/hooks/useEquipment";
import { usePlantMapLayout } from "@/hooks/usePlantMapLayout";
import { PlantVisualMap } from "@/components/plant-map/visual/PlantVisualMap";
import { PlantVisualToolbar } from "@/components/plant-map/visual/PlantVisualToolbar";
import { PlantFlowCanvas } from "@/components/plant-map/flow/PlantFlowCanvas";
import { PlantMapPanel } from "@/components/plant-map/panel/PlantMapPanel";
import { FloatingEquipmentPanel } from "@/components/plant-map/panel/FloatingEquipmentPanel";
import { AreaProgressDashboard } from "@/components/plant-map/AreaProgressDashboard";
import { PlantMapBreadcrumb } from "@/components/plant-map/PlantMapBreadcrumb";
import { PlantEquipmentView } from "@/components/plant-map/PlantEquipmentView";
import { ScadaHeader } from "@/components/ic02-scada/ScadaHeader";
import type { DrillLevel, PanelState, PlantMapAreaOverlay, Area, System, Subsystem } from "@/types";

const DONE_STATUSES = new Set(["listo_arranque", "operativo"]);

export default function PlantMapPage() {
  const params       = useParams() as { projectId: string };
  const router       = useRouter();
  const searchParams = useSearchParams();
  const projectId    = params.projectId;

  // ── Navigation state ────────────────────────────────────────
  const [drill, setDrill]           = useState<DrillLevel>({ level: 'visual' });
  const [panelState, setPanelState] = useState<PanelState>({ open: false });
  const [editMode, setEditMode]     = useState(false);
  const [pendingOverlays, setPendingOverlays] = useState<PlantMapAreaOverlay[] | null>(null);
  const [activeTab, setActiveTab]   = useState<'unifilar' | 'diagrama'>(
    searchParams.get('tab') === 'equipos' ? 'diagrama' : 'unifilar'
  );
  const [floatingPanel, setFloatingPanel] = useState<{ equipmentId: string; x: number; y: number; equipmentObj?: import("@/types").Equipment } | null>(null);

  // Reset tab, panel, and edit state on drill level change
  useEffect(() => {
    setActiveTab(drill.level === 'visual' && searchParams.get('tab') === 'equipos' ? 'diagrama' : 'unifilar');
    setPanelState({ open: false });
    setFloatingPanel(null);
    setEditMode(false);
    setPendingOverlays(null);
  }, [drill.level]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync tab when only query param changes (same-page navigation)
  useEffect(() => {
    if (drill.level === 'visual') {
      setActiveTab(searchParams.get('tab') === 'equipos' ? 'diagrama' : 'unifilar');
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const equipmentObj = equipment.find(e => e.id === equipmentId);
    setFloatingPanel({ equipmentId, x: event?.clientX ?? 400, y: event?.clientY ?? 300, equipmentObj });
  };

  // ── SCADA iframe: escucha clicks de equipos desde ldc-scada.html ───────────
  const handleEquipmentTagClick = useCallback((tag: string, x: number, y: number) => {
    const eq = equipment.find(e => e.tag === tag);
    if (eq) {
      setFloatingPanel({ equipmentId: eq.id, x, y, equipmentObj: eq });
    } else {
      // Equipo eléctrico aún no registrado — mostrar panel con el tag para feedback
      setFloatingPanel({ equipmentId: `__tag__${tag}`, x, y, equipmentObj: undefined });
    }
  }, [equipment]);

  useEffect(() => {
    if (projectId !== LDC_PROJECT_ID) return;
    function onMessage(e: MessageEvent) {
      if (e.data?.type !== 'ldc-equip-click') return;
      handleEquipmentTagClick(e.data.tag, e.data.x ?? 400, e.data.y ?? 300);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [projectId, handleEquipmentTagClick]);

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
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
          background: 'rgba(56,189,248,0.18)', border: '1px solid rgba(56,189,248,0.35)',
          color: '#38BDF8', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', transition: 'all 150ms',
        }}
      >
        ● Guardar layout
      </button>
    </div>
  );

  const firstTimeBanner = layout.isFirstTime && (
    <div style={{
      position: 'absolute', bottom: '64px', left: '50%', transform: 'translateX(-50%)', zIndex: 20,
      background: 'rgba(9,22,42,0.92)', backdropFilter: 'blur(6px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
      padding: '8px 16px', fontSize: '11px', color: '#4B5563', whiteSpace: 'nowrap',
    }}>
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
    <div className="flex flex-col h-full relative" style={{ background: '#040C18', color: '#E2E8F0' }}>
      {/* Breadcrumb — solo nivel sistema (flota sobre el canvas sin chocar con tabs) */}
      {drill.level === 'system' && (
        <PlantMapBreadcrumb
          drill={drill}
          projectName={project?.name ?? "Proyecto"}
          onNavigateTo={handleBreadcrumbNavigate}
        />
      )}

      {/* ── NIVEL VISUAL ── */}
      {drill.level === 'visual' && (
        <>
          {projectId === LDC_PROJECT_ID ? (
            /* LDC: full-screen igual que IC02 */
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'linear-gradient(155deg,#040C18 0%,#071524 60%,#040C18 100%)',
              display: 'flex', flexDirection: 'column',
              fontFamily: '"Inter","Segoe UI",system-ui,sans-serif',
              color: '#FFFFFF', overflow: 'hidden',
            }}>
              <ScadaHeader
                projectId={projectId}
                icon="🗺"
                title="MAPA DE PLANTA · LDC"
                hint={activeTab === 'unifilar' ? 'Diagrama eléctrico · Subestación · CCMs' : 'Selecciona un equipo para iniciar inspección'}
              />

              {/* Chips de vista — mismo estilo que IC02 process chips */}
              <div style={{
                background: '#071A2C',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '8px 24px',
                display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: '9px', color: '#374151', fontWeight: '700', letterSpacing: '1.5px', marginRight: '4px' }}>
                  VISTA:
                </span>
                {([
                  { key: 'unifilar' as const, label: '⚡ SCADA · Potencia' },
                  { key: 'diagrama' as const, label: '🗺 Equipos' },
                ]).map(tab => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        padding: '5px 16px', borderRadius: '20px', cursor: 'pointer',
                        border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`,
                        background: active ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)',
                        color: active ? '#38BDF8' : '#4B5563',
                        fontSize: '11px', fontWeight: '600', fontFamily: 'inherit',
                        transition: 'all 150ms',
                      }}
                    >{tab.label}</button>
                  );
                })}
              </div>

              {activeTab === 'unifilar' ? (
                <iframe
                  src="/ldc-scada.html"
                  style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
                  title="SCADA ANAEROBIO DE BIOGAS LDC"
                />
              ) : (
                <PlantEquipmentView projectId={projectId} embedded />
              )}
            </div>
          ) : (
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
              <AreaProgressDashboard
                areas={areas}
                equipment={equipment}
                subToSystem={subToSystem}
                sysToArea={sysToArea}
              />
            </>
          )}
        </>
      )}

      {/* ── NIVEL ÁREA — con tabs Unifilar / Diagrama ── */}
      {drill.level === 'area' && (
        <>
          {/* Barra superior: breadcrumb + tabs en una sola fila */}
          <div style={{
            height: '40px', flexShrink: 0,
            background: 'linear-gradient(90deg,#09162A 0%,#071220 50%,#09162A 100%)',
            borderBottom: '1px solid rgba(56,189,248,0.12)',
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px',
          }}>
            {/* Breadcrumb inline */}
            <button
              onClick={() => handleBreadcrumbNavigate({ level: 'visual' })}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: '#4B5563', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                padding: '2px 6px', borderRadius: '4px', transition: 'color 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}
            >
              ← {project?.name ?? 'Proyecto'}
            </button>
            <span style={{ color: '#1E3A5F', fontSize: '11px' }}>/</span>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {drill.areaName}
            </span>

            {/* Separador */}
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.06)', margin: '0 4px', flexShrink: 0 }} />

            {/* Tabs */}
            {([
              { key: 'unifilar', label: '⚡ Unifilar' },
              { key: 'diagrama', label: '🔷 Diagrama' },
            ] as const).map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '4px 14px', borderRadius: '20px',
                    border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    background: active ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)',
                    color: active ? '#38BDF8' : '#4B5563',
                    fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 150ms', flexShrink: 0,
                  }}
                >{tab.label}</button>
              );
            })}
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
          equipment={floatingPanel.equipmentObj}
          imageUrl={layout.imageUrl ?? undefined}
          onClose={() => setFloatingPanel(null)}
        />
      )}
    </div>
  );
}
