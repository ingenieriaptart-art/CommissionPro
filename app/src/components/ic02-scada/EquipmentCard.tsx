'use client';

import type { EquipmentInstr } from './types';

interface Props {
  instrument: EquipmentInstr;
  onClick?: (i: EquipmentInstr) => void;
}

const statusCfg = {
  running: { label: 'EN MARCHA', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  stopped: { label: 'PARADO',    color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  fault:   { label: 'FALLA',     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
};

export function EquipmentCard({ instrument, onClick }: Props) {
  const { tag, description, voltage, runStatus, diCount, doCount } = instrument;
  const cfg = statusCfg[runStatus];

  return (
    <div
      onClick={() => onClick?.(instrument)}
      className="ic02-card"
      style={{
        background: 'linear-gradient(145deg, #3D6094 0%, #2C4F82 100%)',
        border: `1px solid ${cfg.color}30`,
        borderTop: `2px solid ${cfg.color}`,
        borderRadius: '12px',
        padding: '20px 16px',
        minHeight: '200px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '10px', cursor: 'pointer',
        boxShadow: `0 4px 24px ${cfg.color}12`,
      }}
    >
      {/* 440VAC badge */}
      <span style={{
        fontSize: '9px', fontWeight: '800', letterSpacing: '1px',
        color: '#EC4899', background: 'rgba(236,72,153,0.12)',
        border: '1px solid rgba(236,72,153,0.25)',
        padding: '2px 8px', borderRadius: '4px',
      }}>{voltage}</span>

      {/* Tag */}
      <div style={{
        fontSize: '36px', fontWeight: '800', letterSpacing: '-1px',
        color: '#FFFFFF', lineHeight: 1, textAlign: 'center',
      }}>{tag}</div>

      {/* Status badge */}
      <div style={{
        background: cfg.bg, border: `1px solid ${cfg.color}40`,
        borderRadius: '6px', padding: '6px 14px',
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <span
          className={runStatus === 'running' ? 'dot-green' : runStatus === 'fault' ? 'dot-red' : ''}
          style={{
            display: 'inline-block',
            width: '8px', height: '8px', borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 8px ${cfg.color}`,
          }}
        />
        <span style={{ fontSize: '12px', fontWeight: '800', color: cfg.color, letterSpacing: '1px' }}>
          {cfg.label}
        </span>
      </div>

      {/* I/O info */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#F59E0B' }}>{diCount}</div>
          <div style={{ fontSize: '9px', color: '#93B5D6', letterSpacing: '0.5px' }}>DI</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(70,118,170,0.3)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#A855F7' }}>{doCount}</div>
          <div style={{ fontSize: '9px', color: '#93B5D6', letterSpacing: '0.5px' }}>DO</div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: '10px', color: '#93B5D6', textAlign: 'center',
        lineHeight: 1.4, maxWidth: '140px',
      }}>{description}</div>
    </div>
  );
}
