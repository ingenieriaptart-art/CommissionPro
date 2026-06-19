'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEquipment } from '@/hooks/useEquipment';
import { createClient } from '@/lib/supabase/client';
import { InstrumentDrawer } from '@/components/ic02-scada/InstrumentDrawer';
import type { Equipment, EquipmentStatus } from '@/types';
import { EquipmentProgressBadge } from '@/components/equipment/EquipmentProgressBadge';

// ─── Paleta de colores ────────────────────────────────────────────────────────
const P = {
  page:       '#4A81D3',
  panel:      '#27374F',
  header:     '#162F50',
  subheader:  '#1B4579',
  footer:     '#39587F',
  card:       '#3D6094',
  cardBorder: '#4676AA',
  cardOk:     '#26516E',
  cardPend:   '#304664',
  cardFut:    '#152233',
} as const;

// ─── Config de estado ─────────────────────────────────────────────────────────
const STATUS_CFG: Record<EquipmentStatus, { label: string; color: string; bg: string }> = {
  pendiente:          { label: 'Pendiente',         color: '#94A3B8', bg: P.cardPend },
  en_ejecucion:       { label: 'En Ejecución',      color: '#FBBF24', bg: P.cardPend },
  aprobado:           { label: 'Aprobado',          color: '#4ADE80', bg: P.cardOk   },
  rechazado:          { label: 'Rechazado',         color: '#F87171', bg: P.card     },
  bloqueado:          { label: 'Bloqueado',         color: '#F87171', bg: P.card     },
  listo_energizacion: { label: 'Listo Energiz.',    color: '#38BDF8', bg: P.cardOk   },
  listo_arranque:     { label: 'Listo Arranque',    color: '#4ADE80', bg: P.cardOk   },
  operativo:          { label: 'Operativo',         color: '#4ADE80', bg: P.cardOk   },
  futuro:             { label: 'Futuro',            color: '#64748B', bg: P.cardFut  },
};

const STATUS_BORDER: Record<EquipmentStatus, string> = {
  pendiente:          '#64748B',
  en_ejecucion:       '#F59E0B',
  aprobado:           '#22C55E',
  rechazado:          '#EF4444',
  bloqueado:          '#EF4444',
  listo_energizacion: '#38BDF8',
  listo_arranque:     '#10B981',
  operativo:          '#22C55E',
  futuro:             '#334155',
};

// ─── Hook: subsystem_id → {areaId, areaName} ─────────────────────────────────
function useSubsystemAreaMap(subsystemIds: string[]) {
  return useQuery({
    queryKey: ['subsystem-area-map', subsystemIds.slice().sort().join(',')],
    queryFn: async () => {
      if (!subsystemIds.length) return {} as Record<string, { areaId: string; areaName: string; sortOrder: number }>;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subsystems')
        .select('id, systems(id, area_id, areas(id, name, sort_order))')
        .in('id', subsystemIds);
      if (error) throw error;
      const map: Record<string, { areaId: string; areaName: string; sortOrder: number }> = {};
      for (const sub of data ?? []) {
        const sys   = Array.isArray(sub.systems)        ? sub.systems[0]       : sub.systems;
        const area  = sys ? (Array.isArray(sys.areas)   ? sys.areas[0]         : sys.areas)  : null;
        if (area) map[sub.id] = { areaId: area.id, areaName: area.name, sortOrder: area.sort_order ?? 0 };
      }
      return map;
    },
    enabled: subsystemIds.length > 0,
  });
}

// ─── TAGs del SCADA Potencia (unifilar eléctrico LDC) ────────────────────────
const SCADA_POTENCIA_TAGS = new Set([
  // Media tensión
  'REMONTE','C-MEDIDA','C-PROTEC',
  // 440V Normal
  'TR-1','TGD440','BB-TRAFO','BB-PRINC','ATS','BB-GEN','GGD',
  // CCM Normal
  'CCM1N','CCM2N','CCM3N',
  // Emergencia 440V
  'BB-TGE','TGE440','BC-COND','CCM1E','CCM2E','CCM3E','TR2-E',
  // 220V / Auxiliares emergencia
  'TGD220-E','UPS','TR1-REG','TDA-1','TDA-2','TIAE-R',
]);

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface AreaGroup {
  areaId: string;
  areaName: string;
  sortOrder: number;
  equipment: Equipment[];
}

// ─── CSS global ──────────────────────────────────────────────────────────────
const STYLES = `
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: ${P.panel}; }
  ::-webkit-scrollbar-thumb { background: #4676AA; border-radius: 3px; }
  .pe-card { transition: transform 160ms ease, box-shadow 160ms ease; }
  .pe-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
  .pe-search {
    width: 100%; background: rgba(22,47,80,0.7);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
    padding: 7px 12px 7px 34px; font-size: 12px; color: #E2E8F0;
    outline: none; font-family: inherit; transition: border-color 180ms;
  }
  .pe-search:focus { border-color: rgba(125,211,252,0.5); }
  .pe-search::placeholder { color: rgba(255,255,255,0.3); }
  .pe-chip {
    padding: 4px 13px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15);
    cursor: pointer; font-size: 11px; font-weight: 600; outline: none;
    background: rgba(255,255,255,0.07); color: #BAE6FD;
    transition: all 150ms; font-family: inherit; white-space: nowrap;
  }
  .pe-chip.active { background: rgba(56,189,248,0.22); border-color: #38BDF8; color: #fff; }
  .pe-chip:hover:not(.active) { background: rgba(255,255,255,0.12); }
`;

interface Props {
  projectId: string;
  embedded?: boolean;
  potenciaFilter?: boolean;
}

export function PlantEquipmentView({ projectId, embedded = false, potenciaFilter = false }: Props) {
  const { data: equipment = [], isLoading } = useEquipment(projectId);

  const subsystemIds = useMemo(
    () => [...new Set(equipment.map(e => e.subsystem_id).filter(Boolean))] as string[],
    [equipment],
  );

  const { data: subAreaMap = {} } = useSubsystemAreaMap(subsystemIds);

  const [areaFilter, setAreaFilter]   = useState<string | null>(null);
  const [potenciaMode, setPotenciaMode] = useState(false);
  const [pidView, setPidView]         = useState<null | 'lodos' | 'biogas'>(null); // visor P&ID
  const [search, setSearch]           = useState('');
  const [selectedEq, setSelectedEq]   = useState<Equipment | null>(null);

  // Agrupar por área
  const areaGroups: AreaGroup[] = useMemo(() => {
    const map = new Map<string, AreaGroup>();
    for (const eq of equipment) {
      const info = eq.subsystem_id ? subAreaMap[eq.subsystem_id] : undefined;
      const areaId   = info?.areaId   ?? '__sin-area__';
      const areaName = info?.areaName ?? 'Sin Área';
      const sortOrder = info?.sortOrder ?? 999;
      if (!map.has(areaId)) map.set(areaId, { areaId, areaName, sortOrder, equipment: [] });
      map.get(areaId)!.equipment.push(eq);
    }
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [equipment, subAreaMap]);

  // Filtrado
  const filteredGroups: AreaGroup[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return areaGroups
      .filter(g => !areaFilter || g.areaId === areaFilter)
      .map(g => ({
        ...g,
        equipment: g.equipment.filter(e => {
          if (potenciaMode && !SCADA_POTENCIA_TAGS.has(e.tag)) return false;
          if (!q) return true;
          return e.tag.toLowerCase().includes(q) ||
                 e.name.toLowerCase().includes(q) ||
                 (e.service ?? '').toLowerCase().includes(q);
        }),
      }))
      .filter(g => g.equipment.length > 0);
  }, [areaGroups, areaFilter, search, potenciaMode]);

  // Stats por área (para resumen footer)
  const areaStats = useMemo(() =>
    areaGroups.map(g => ({
      ...g,
      done: g.equipment.filter(e => ['aprobado', 'operativo', 'listo_arranque'].includes(e.status)).length,
    })),
    [areaGroups],
  );

  const totalEquipment = equipment.length;
  const totalDone      = equipment.filter(e => ['aprobado', 'operativo', 'listo_arranque'].includes(e.status)).length;

  if (isLoading) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: P.panel, color: '#BAE6FD', fontSize: '13px',
        fontFamily: '"Inter",system-ui,sans-serif',
      }}>
        Cargando equipos…
      </div>
    );
  }

  const wrapperStyle: React.CSSProperties = embedded
    ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: P.panel, fontFamily: '"Inter","Segoe UI",system-ui,sans-serif', color: '#F1F5F9' }
    : { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: P.panel, fontFamily: '"Inter","Segoe UI",system-ui,sans-serif', color: '#F1F5F9', overflow: 'hidden' };

  return (
    <div style={wrapperStyle}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Barra de búsqueda ── */}
      <div style={{
        background: P.header, borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '10px 20px', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{ position: 'relative', maxWidth: '340px', flex: 1 }}>
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '14px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
          }}>⌕</span>
          <input
            className="pe-search"
            type="text"
            placeholder="Buscar por tag, nombre o servicio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: 1,
            }}>×</button>
          )}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#93C5FD', flexShrink: 0 }}>
          <span style={{ fontWeight: '700', color: '#fff' }}>{totalDone}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}> / {totalEquipment} completados</span>
        </div>
      </div>

      {/* ── Chips de filtro por área ── */}
      <div style={{
        background: P.subheader, borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '8px 20px', display: 'flex', gap: '6px', alignItems: 'center',
        flexShrink: 0, overflowX: 'auto',
      }}>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '1.5px', flexShrink: 0, marginRight: '4px' }}>
          ÁREA:
        </span>
        <button
          className={`pe-chip${!areaFilter && !potenciaMode && !pidView ? ' active' : ''}`}
          onClick={() => { setAreaFilter(null); setPotenciaMode(false); setPidView(null); }}
        >
          Todas
        </button>
        {potenciaFilter && (
          <button
            className={`pe-chip${potenciaMode ? ' active' : ''}`}
            onClick={() => { setPotenciaMode(m => !m); setAreaFilter(null); setPidView(null); }}
            style={potenciaMode ? { borderColor: '#FCD34D', color: '#FCD34D', background: 'rgba(252,211,77,0.14)' } : {}}
          >
            ⚡ Potencia
            <span style={{
              marginLeft: '5px', fontSize: '9px', fontWeight: '700',
              background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 5px',
            }}>{SCADA_POTENCIA_TAGS.size}</span>
          </button>
        )}
        {areaGroups.map(g => (
          <button
            key={g.areaId}
            className={`pe-chip${areaFilter === g.areaId ? ' active' : ''}`}
            onClick={() => { setAreaFilter(f => f === g.areaId ? null : g.areaId); setPotenciaMode(false); setPidView(null); }}
          >
            {g.areaName}
            <span style={{
              marginLeft: '5px', fontSize: '9px', fontWeight: '700',
              background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0 5px',
            }}>{g.equipment.length}</span>
          </button>
        ))}
        {potenciaFilter && (
          <button
            className={`pe-chip${pidView === 'lodos' ? ' active' : ''}`}
            onClick={() => { setPidView('lodos'); setAreaFilter(null); setPotenciaMode(false); }}
            style={pidView === 'lodos' ? { borderColor: '#34D399', color: '#34D399', background: 'rgba(52,211,153,0.14)' } : {}}
          >
            📄 P&ID Lodos
          </button>
        )}
        {potenciaFilter && (
          <button
            className={`pe-chip${pidView === 'biogas' ? ' active' : ''}`}
            onClick={() => { setPidView('biogas'); setAreaFilter(null); setPotenciaMode(false); }}
            style={pidView === 'biogas' ? { borderColor: '#34D399', color: '#34D399', background: 'rgba(52,211,153,0.14)' } : {}}
          >
            📄 P&ID Biogas
          </button>
        )}
      </div>

      {/* ── Contenido principal ── */}
      {pidView ? (
        /* Visor de P&ID — iframe con visor PDF nativo del navegador (zoom/scroll) */
        <div style={{ flex: 1, overflow: 'hidden', background: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
          <iframe
            key={pidView}
            src={pidView === 'lodos'
              ? '/pid/pid-lodos-ic01.pdf#zoom=page-width&toolbar=1'
              : '/pid/pid-biogas-ic02.pdf#zoom=page-width&toolbar=1'}
            title={pidView === 'lodos'
              ? 'P&ID Efluente y Lodo — I&C01 (LDC)'
              : 'P&ID Biogas y Aire — I&C02 (LDC)'}
            style={{ flex: 1, width: '100%', border: 'none' }}
          />
        </div>
      ) : (
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>
        {filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', paddingTop: '60px', fontSize: '13px' }}>
            {search ? `Sin resultados para "${search}"` : 'No hay equipos'}
          </div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.areaId} style={{ marginBottom: '20px' }}>
              {/* Título de sección */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
              }}>
                <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#7DD3FC', textTransform: 'uppercase' }}>
                  {group.areaName}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(125,211,252,0.2)' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {group.equipment.length} equipos
                </span>
              </div>

              {/* Grid de cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '8px',
              }}>
                {group.equipment.map(eq => {
                  const cfg    = STATUS_CFG[eq.status] ?? STATUS_CFG.pendiente;
                  const border = STATUS_BORDER[eq.status] ?? '#64748B';
                  return (
                    <div
                      key={eq.id}
                      className="pe-card"
                      onClick={() => setSelectedEq(eq)}
                      style={{
                        background: cfg.bg,
                        border: `1px solid ${P.cardBorder}`,
                        borderLeft: `3px solid ${border}`,
                        borderRadius: '8px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#F1F5F9', letterSpacing: '0.5px' }}>
                        {eq.tag}
                      </div>
                      <div style={{ fontSize: '9px', color: '#93C5FD', marginTop: '3px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {eq.name}
                      </div>
                      <div style={{ marginTop: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: '8px', fontWeight: '600', color: cfg.color, letterSpacing: '0.3px' }}>
                          {cfg.label}
                        </span>
                      </div>
                      <EquipmentProgressBadge
                        status={eq.status}
                        formPct={typeof eq.metadata?.form_pct === 'number' ? eq.metadata.form_pct : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {/* ── Resumen por área ── */}
      <div style={{
        background: P.footer, borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '10px 20px', display: 'flex', gap: '12px', alignItems: 'center',
        flexShrink: 0, overflowX: 'auto',
      }}>
        {areaStats.map(g => (
          <div key={g.areaId} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '7px', padding: '6px 12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div>
              <div style={{ fontSize: '8px', color: '#BAE6FD', fontWeight: '700', letterSpacing: '0.5px' }}>{g.areaName}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '1px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{g.equipment.length}</span>
                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)' }}>equipos</span>
              </div>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '8px', color: '#4ADE80', fontWeight: '700' }}>{g.done}</div>
              <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)' }}>OK</div>
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px', alignItems: 'center', flexShrink: 0 }}>
          {[
            { label: 'Operativo',  color: '#22C55E' },
            { label: 'Pendiente',  color: '#94A3B8' },
            { label: 'Progreso',   color: '#F59E0B' },
            { label: 'Rechazado',  color: '#EF4444' },
            { label: 'Futuro',     color: '#475569' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3px' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Drawer de inspección ── */}
      {selectedEq && (
        <InstrumentDrawer
          card={{
            id:          selectedEq.id,
            tag:         selectedEq.tag,
            description: selectedEq.name,
            signalBadge: STATUS_CFG[selectedEq.status]?.label ?? selectedEq.status,
            signalColor: STATUS_BORDER[selectedEq.status] ?? '#64748B',
            accentColor: STATUS_BORDER[selectedEq.status] ?? '#64748B',
            groupId:     selectedEq.status,
            processId:   selectedEq.subsystem_id ?? 'general',
          }}
          projectId={projectId}
          equipmentId={selectedEq.id}
          onClose={() => setSelectedEq(null)}
        />
      )}
    </div>
  );
}
