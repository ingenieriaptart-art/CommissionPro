'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScadaHeader } from './ScadaHeader';
import { SelectionCard, type SelectionCardData } from './SelectionCard';
import { InstrumentDrawer } from './InstrumentDrawer';
import {
  rtuVBGroups, equipmentGroup,
  plcAnalogGroups, plcActuatedGroup, plcEquipmentGroups,
  processSteps,
} from './data';

// ─── CSS ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .ic02-card { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .ic02-card:hover:not([style*="cursor: default"]) {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(34,197,94,0.2);
    border-color: rgba(34,197,94,0.45) !important;
  }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #1B4579; }
  ::-webkit-scrollbar-thumb { background: #4676AA; border-radius: 3px; }
  .ic02-search {
    width: 100%; background: rgba(22,47,80,0.7);
    border: 1px solid rgba(70,118,170,0.25); border-radius: 6px;
    padding: 7px 12px 7px 36px; font-size: 12px; color: #CBD5E1;
    outline: none; font-family: inherit;
    transition: border-color 180ms, background 180ms;
  }
  .ic02-search:focus {
    border-color: rgba(70,118,170,0.6);
    background: rgba(22,47,80,0.95);
  }
  .ic02-search::placeholder { color: #4676AA; }
`;

type Controller = 'rtu' | 'plc';

// ─── Build flat card list from RTU VB groups ─────────────────────────────────
// Cada SC y SO es su propio instrumento (DI individual), la válvula es contexto
function buildRTUCards(): (SelectionCardData & { groupId: string; processId: string })[] {
  const rows: (SelectionCardData & { groupId: string; processId: string })[] = [];

  const groupProcess: Record<string, string> = {
    biodigestores: 'biodigestores',
    sopladores:    'sopladores',
    'h2s-l1':     'h2s',
    'h2s-l2':     'h2s',
  };

  for (const group of rtuVBGroups) {
    for (const instr of group.instruments) {
      const proc = groupProcess[group.id] ?? group.id;
      // SC — sensor posición cerrada
      rows.push({
        id: `${instr.id}-sc`,
        tag: instr.scTag,
        description: `Pos. cerrada · ${instr.description}`,
        signalBadge: 'DI', signalColor: '#EF4444',
        accentColor: group.accentColor,
        subTags: `Válvula: ${instr.tag}`,
        isFuture: instr.isFuture,
        groupId: group.id,
        processId: proc,
      });
      // SO — sensor posición abierta
      rows.push({
        id: `${instr.id}-so`,
        tag: instr.soTag,
        description: `Pos. abierta · ${instr.description}`,
        signalBadge: 'DI', signalColor: '#22C55E',
        accentColor: group.accentColor,
        subTags: `Válvula: ${instr.tag}`,
        isFuture: instr.isFuture,
        groupId: group.id,
        processId: proc,
      });
    }
  }

  // SC1 / SC2
  for (const eq of equipmentGroup.instruments) {
    rows.push({
      id: eq.id, tag: eq.tag,
      description: eq.description,
      signalBadge: '440VAC', signalColor: '#EC4899',
      accentColor: '#EC4899',
      groupId: 'sc12', processId: 'sc12',
    });
  }

  return rows;
}

// ─── Build flat card list from PLC groups ────────────────────────────────────
function buildPLCCards(): (SelectionCardData & { groupId: string; processId: string })[] {
  const rows: (SelectionCardData & { groupId: string; processId: string })[] = [];

  const signalCfg: Record<string, { badge: string; color: string }> = {
    HART: { badge: 'HART', color: '#22C55E' },
    AI:   { badge: 'AI',   color: '#38BDF8' },
    DI:   { badge: 'DI',   color: '#F59E0B' },
  };

  const groupProcess: Record<string, string> = {
    'fit-lodos':  'lodos',
    ls:           'lodos',
    'vl-sensors': 'lodos',
    fit:          'biodigestores',
    pit:          'h2s',
    tit:          'h2s',
  };

  for (const group of plcAnalogGroups) {
    for (const instr of group.instruments) {
      const cfg = signalCfg[instr.signalType];
      rows.push({
        id: instr.id, tag: instr.tag,
        description: instr.description,
        signalBadge: cfg.badge, signalColor: cfg.color,
        accentColor: group.accentColor,
        isFuture: instr.isFuture,
        groupId: group.id,
        processId: groupProcess[group.id] ?? 'manifold',
      });
    }
  }

  for (const instr of plcActuatedGroup.instruments) {
    let actProc = 'manifold';
    if (instr.tag.startsWith('VE') || instr.tag.startsWith('VL')) actProc = 'lodos';
    else if (/^VB\d+$/.test(instr.tag)) actProc = 'lodos';      // VB1/VB2/VB3 alivio
    else if (instr.tag.startsWith('VA')) actProc = 'biodigestores';
    rows.push({
      id: instr.id, tag: instr.tag,
      description: instr.description,
      signalBadge: 'DI·AO·AI', signalColor: '#A855F7',
      accentColor: '#A855F7',
      isFuture: instr.isFuture,
      groupId: 'actuadas',
      processId: actProc,
    });
  }

  for (const group of plcEquipmentGroups) {
    for (const eq of group.instruments) {
      const eqProc = group.id === 'sopladores-biogas-equipo' ? 'sopladores'
                   : group.id === 'bombas-lavado'            ? 'sc12'
                   : 'lodos';
      rows.push({
        id: eq.id, tag: eq.tag,
        description: eq.description,
        signalBadge: '440VAC', signalColor: '#EC4899',
        accentColor: group.accentColor,
        groupId: group.id,
        processId: eqProc,
      });
    }
  }

  return rows;
}

const ALL_RTU = buildRTUCards();
const ALL_PLC = buildPLCCards();

// ─── Component ───────────────────────────────────────────────────────────────
export function IC02RTUView() {
  const params   = useParams<{ projectId: string }>();
  const router   = useRouter();
  const [ctrl,         setCtrl]         = useState<Controller>('plc');
  const [proc,         setProc]         = useState<string | null>(null);
  const [group,        setGroup]        = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [selectedCard, setSelectedCard] = useState<(SelectionCardData & { groupId: string; processId: string }) | null>(null);

  const cards = ctrl === 'rtu' ? ALL_RTU : ALL_PLC;

  // Process steps relevant to current controller
  const relevantSteps = useMemo(() => {
    const ids = new Set(cards.map(c => c.processId));
    return processSteps.filter(s => ids.has(s.id));
  }, [cards]);

  // Group chips for current process filter
  const groupChips = useMemo(() => {
    const src = proc ? cards.filter(c => c.processId === proc) : cards;
    const seen = new Set<string>();
    return src
      .filter(c => { if (seen.has(c.groupId)) return false; seen.add(c.groupId); return true; })
      .map(c => ({ id: c.groupId, accentColor: c.accentColor }));
  }, [cards, proc]);

  // Filtered cards
  const displayed = useMemo(() => {
    let res = cards;
    if (proc)  res = res.filter(c => c.processId === proc);
    if (group) res = res.filter(c => c.groupId   === group);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      res = res.filter(c =>
        c.tag.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.subTags ?? '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [cards, proc, group, search]);

  function handleSelect(card: SelectionCardData) {
    setSelectedCard(card as SelectionCardData & { groupId: string; processId: string });
  }

  function handleProcessClick(id: string) {
    if (proc === id) { setProc(null); setGroup(null); }
    else             { setProc(id);  setGroup(null); }
  }

  function handleGroupClick(id: string) {
    setGroup(g => g === id ? null : id);
  }

  const groupLabels: Record<string, string> = {
    'fit-lodos':              'FIT · Flujo Lodos',
    ls:                       'LS · Nivel',
    'vl-sensors':             'Sensores VL',
    fit:                      'FIT · Flujo Biogás',
    pit:                      'PIT · Presión',
    tit:                      'TIT · Temperatura',
    actuadas:                 'Válvulas Actuadas',
    'bombas-crudo':           'Bombas B1..B4',
    'sopladores-biogas-equipo':'Sopladores SB1..SB6',
    'sopladores-aire':        'Sopladores SA1..SA3',
    'bombas-lavado':          'Bombas B11..B14',
    biodigestores:            'Sensores BD1·BD2·BD3',
    sopladores:               'Sensores SB1..SB6',
    'h2s-l1':                 'Sensores H2S L1',
    'h2s-l2':                 'Sensores H2S L2',
    sc12:                     'SC1·SC2',
  };

  const totalInCtrl = cards.length;
  const totalFuture = cards.filter(c => c.isFuture).length;
  const totalActive = totalInCtrl - totalFuture;

  // ── shared strip background ─────────────────────────────────────────────
  const STRIP_BG = '#162F50';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      // Deeper background so cards at #162840 clearly pop
      background: 'linear-gradient(155deg, #1E3A61 0%, #27374F 60%, #1E3A61 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Inter","Segoe UI",system-ui,sans-serif',
      color: '#FFFFFF', overflow: 'hidden',
    }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <ScadaHeader
        projectId={params?.projectId}
        pidLinks={[
          { label: 'P&ID Lodos',  url: 'https://nkjunkolsmjledzwuxgn.supabase.co/storage/v1/object/public/documents/pid/lodos-efluente-ic01.pdf' },
          { label: 'P&ID Biogás', url: 'https://nkjunkolsmjledzwuxgn.supabase.co/storage/v1/object/public/documents/pid/biogas-aire-ic02.pdf' },
        ]}
      />

      {/* ── Controller tabs + search ── */}
      <div style={{
        background: STRIP_BG, borderBottom: '1px solid rgba(70,118,170,0.25)',
        padding: '10px 24px', display: 'flex', gap: '8px',
        alignItems: 'center', flexShrink: 0,
      }}>
        {([
          { id: 'plc', label: 'PLC 1756-L73 · Control Principal', sub: 'FIT · PIT · TIT · LS · VE/VL/VA/VB · Bombas · Sopladores', color: '#22C55E', count: ALL_PLC.length },
          { id: 'rtu', label: 'RTU 5094 · Cuarto Eléctrico',     sub: 'SC/SO posición válvulas VB · 84 DI · SC1/SC2', color: '#38BDF8', count: ALL_RTU.length },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setCtrl(tab.id); setProc(null); setGroup(null); setSearch(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '9px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: ctrl === tab.id ? `${tab.color}12` : 'transparent',
              boxShadow: ctrl === tab.id ? `inset 0 -2px 0 ${tab.color}` : 'none',
              outline: 'none', transition: 'all 180ms ease', flexShrink: 0,
            }}
          >
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: ctrl === tab.id ? tab.color : '#374151',
            }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: ctrl === tab.id ? '#E2EEF9' : '#93B5D6', letterSpacing: '0.5px' }}>
                {tab.label}
              </div>
              <div style={{ fontSize: '10px', color: '#4676AA' }}>{tab.sub}</div>
            </div>
            <span style={{
              marginLeft: '8px', background: ctrl === tab.id ? `${tab.color}18` : 'rgba(70,118,170,0.12)',
              border: `1px solid ${ctrl === tab.id ? tab.color + '35' : 'rgba(70,118,170,0.25)'}`,
              borderRadius: '10px', padding: '1px 8px',
              fontSize: '11px', fontWeight: '700',
              color: ctrl === tab.id ? tab.color : '#4B5563',
            }}>{tab.count}</span>
          </button>
        ))}

        {/* Search bar */}
        <div style={{ flex: 1, maxWidth: '300px', position: 'relative', marginLeft: '12px' }}>
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '14px', color: '#374151', pointerEvents: 'none', lineHeight: 1,
          }}>⌕</span>
          <input
            className="ic02-search"
            type="text"
            placeholder="Buscar por tag o descripción…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#374151', fontSize: '14px', lineHeight: 1, padding: '2px 4px',
              }}
            >×</button>
          )}
        </div>

        {/* Count */}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#4B5563' }}>
            {displayed.length}
            <span style={{ color: '#374151' }}> / {totalInCtrl}</span>
          </span>
          {totalFuture > 0 && (
            <span style={{ fontSize: '10px', color: '#38BDF860', marginLeft: '8px' }}>
              · {totalFuture} futuros
            </span>
          )}
        </div>
      </div>

      {/* ── Process flow filter chips ── */}
      <div style={{
        background: STRIP_BG, borderBottom: '1px solid rgba(70,118,170,0.2)',
        padding: '7px 24px', display: 'flex', alignItems: 'center',
        gap: '6px', flexShrink: 0, overflowX: 'auto',
      }}>
        <span style={{ fontSize: '9px', color: '#93B5D6', fontWeight: '700', letterSpacing: '1.5px', flexShrink: 0, marginRight: '4px' }}>
          PROCESO:
        </span>
        <button
          onClick={() => { setProc(null); setGroup(null); }}
          style={{
            padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: !proc ? 'rgba(34,197,94,0.14)' : 'rgba(70,118,170,0.1)',
            color: !proc ? '#22C55E' : '#93B5D6',
            fontSize: '11px', fontWeight: '600', flexShrink: 0,
            outline: 'none', transition: 'all 150ms',
          }}
        >Todos</button>

        {relevantSteps.map((step, i) => {
          const isActive = proc === step.id;
          const count = cards.filter(c => c.processId === step.id).length;
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {i > 0 && <span style={{ color: '#4676AA', fontSize: '12px', margin: '0 2px' }}>›</span>}
              <button
                onClick={() => handleProcessClick(step.id)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', border: '1px solid',
                  borderColor: isActive ? 'rgba(56,189,248,0.5)' : 'rgba(70,118,170,0.25)',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(56,189,248,0.12)' : 'rgba(70,118,170,0.08)',
                  color: isActive ? '#38BDF8' : '#93B5D6',
                  fontSize: '11px', fontWeight: '600',
                  outline: 'none', transition: 'all 150ms',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                <span style={{ fontSize: '12px' }}>{step.icon}</span>
                {step.label}
                <span style={{
                  background: isActive ? 'rgba(56,189,248,0.15)' : 'rgba(70,118,170,0.12)',
                  borderRadius: '8px', padding: '0 5px', fontSize: '10px', fontWeight: '700',
                  color: isActive ? '#38BDF8' : '#4676AA',
                }}>{count}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Group sub-chips ── */}
      {groupChips.length > 1 && (
        <div style={{
          background: STRIP_BG, borderBottom: '1px solid rgba(70,118,170,0.15)',
          padding: '6px 24px', display: 'flex', gap: '5px',
          flexShrink: 0, overflowX: 'auto', alignItems: 'center',
        }}>
          <span style={{ fontSize: '9px', color: '#93B5D6', fontWeight: '700', letterSpacing: '1.5px', flexShrink: 0, marginRight: '4px' }}>
            ÁREA:
          </span>
          {groupChips.map(chip => {
            const isActive = group === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => handleGroupClick(chip.id)}
                style={{
                  padding: '3px 10px', borderRadius: '4px', border: '1px solid',
                  borderColor: isActive ? `${chip.accentColor}50` : 'rgba(70,118,170,0.25)',
                  cursor: 'pointer',
                  background: isActive ? `${chip.accentColor}12` : 'rgba(70,118,170,0.08)',
                  color: isActive ? chip.accentColor : '#93B5D6',
                  fontSize: '10px', fontWeight: '600',
                  outline: 'none', transition: 'all 150ms', flexShrink: 0,
                }}
              >
                {groupLabels[chip.id] ?? chip.id}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Cards grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#374151', paddingTop: '60px', fontSize: '13px' }}>
            <span style={{ color: '#4676AA' }}>{search ? `Sin resultados para "${search}"` : 'No hay instrumentos para este filtro'}</span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))',
            gap: '8px',
          }}>
            {displayed.map(card => (
              <SelectionCard
                key={card.id}
                data={card}
                onClick={handleSelect}
                highlight={!!search && card.tag.toLowerCase().includes(search.toLowerCase())}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{
        background: STRIP_BG, borderTop: '1px solid rgba(70,118,170,0.25)',
        padding: '6px 24px', display: 'flex', alignItems: 'center',
        gap: '20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '10px' }}>
          <span style={{ color: '#93B5D6' }}>
            Total: <span style={{ color: '#CBD5E1', fontWeight: '700' }}>{totalInCtrl}</span>
          </span>
          <span style={{ color: '#93B5D6' }}>
            Activos: <span style={{ color: '#22C55E', fontWeight: '700' }}>{totalActive}</span>
          </span>
          <span style={{ color: '#93B5D6' }}>
            Futuros: <span style={{ color: '#38BDF8', fontWeight: '700' }}>{totalFuture}</span>
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          {[
            { label: 'PENDIENTE',   color: '#64748B' },
            { label: 'EN PROGRESO', color: '#F59E0B' },
            { label: 'COMPLETADO',  color: '#22C55E' },
            { label: 'FUTURO',      color: '#38BDF8' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: '9px', color: l.color, fontWeight: '600', letterSpacing: '0.5px' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Instrument drawer ── */}
      {selectedCard && (
        <InstrumentDrawer
          card={selectedCard}
          projectId={params?.projectId ?? ''}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
