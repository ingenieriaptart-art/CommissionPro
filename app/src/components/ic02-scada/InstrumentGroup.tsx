'use client';

import { useState } from 'react';
import type { InstrumentGroupData, VBInstrument } from './types';
import { InstrumentCard } from './InstrumentCard';

interface Props {
  group: InstrumentGroupData;
  onInstrClick?: (instr: VBInstrument) => void;
}

export function InstrumentGroup({ group, onInstrClick }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const openCount   = group.instruments.filter(i => i.soStatus === 'active').length;
  const closedCount = group.instruments.filter(i => i.scStatus === 'active' && !i.isFuture).length;
  const futureCount = group.instruments.filter(i => i.isFuture).length;

  return (
    <div
      style={{
        background: '#0D1F35',
        border: '1px solid rgba(255,255,255,0.05)',
        borderLeft: `3px solid ${group.accentColor}`,
        borderRadius: '14px',
        marginBottom: '20px',
        overflow: 'hidden',
      }}
    >
      {/* Group header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 20px', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.04)',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: '20px', color: group.accentColor, flexShrink: 0 }}>
          {group.icon}
        </span>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px', fontWeight: '700', letterSpacing: '2px',
            color: '#FFFFFF', marginBottom: '2px',
          }}>
            {group.title}
          </div>
          <div style={{ fontSize: '11px', color: '#4B5563' }}>{group.subtitle}</div>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Chip value={openCount}   label="Abierto" color="#22C55E" />
          <Chip value={closedCount} label="Cerrado" color="#EF4444" />
          {futureCount > 0 && <Chip value={futureCount} label="Futuro" color="#38BDF8" />}
          <div style={{
            background: `${group.accentColor}18`,
            border: `1px solid ${group.accentColor}35`,
            borderRadius: '20px', padding: '4px 12px',
            fontSize: '12px', fontWeight: '700', color: group.accentColor,
            marginLeft: '4px',
          }}>
            {group.instruments.length} VB
          </div>
          <span style={{ color: '#374151', fontSize: '14px', marginLeft: '4px' }}>
            {collapsed ? '▶' : '▼'}
          </span>
        </div>
      </div>

      {/* Cards grid */}
      {!collapsed && (
        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(152px, 1fr))',
            gap: '10px',
          }}>
            {group.instruments.map(instr => (
              <InstrumentCard
                key={instr.id}
                instrument={instr}
                onClick={onInstrClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ value, label, color }: { value: number; label: string; color: string }) {
  if (value === 0) return null;
  return (
    <div style={{
      background: `${color}12`,
      border: `1px solid ${color}30`,
      borderRadius: '4px', padding: '2px 8px',
      fontSize: '10px', fontWeight: '700', color,
      display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      {value} {label}
    </div>
  );
}
