'use client';

import type { VBInstrument } from './types';

const C = {
  open:   '#22C55E',
  closed: '#EF4444',
  future: '#38BDF8',
  none:   '#1F2937',
};

interface Props {
  instrument: VBInstrument;
  onClick?: (instr: VBInstrument) => void;
}

export function InstrumentCard({ instrument, onClick }: Props) {
  const { tag, scTag, soTag, description, scStatus, soStatus, isFuture } = instrument;

  const topBorder = isFuture ? C.future
    : soStatus === 'active' ? C.open
    : scStatus === 'active' ? C.closed
    : C.none;

  const borderColor = isFuture ? `${C.future}40`
    : soStatus === 'active' ? `${C.open}35`
    : scStatus === 'active' ? `${C.closed}30`
    : 'rgba(255,255,255,0.06)';

  const glowShadow = isFuture ? `0 4px 24px rgba(56,189,248,0.12)`
    : soStatus === 'active' ? `0 4px 24px rgba(34,197,94,0.12)`
    : scStatus === 'active' ? `0 4px 24px rgba(239,68,68,0.10)`
    : '0 2px 12px rgba(0,0,0,0.3)';

  return (
    <div
      onClick={() => onClick?.(instrument)}
      className="ic02-card"
      style={{
        background: 'linear-gradient(145deg, #122235 0%, #0E1A2B 100%)',
        border: `1px solid ${borderColor}`,
        borderTop: `2px solid ${topBorder}`,
        borderRadius: '12px',
        padding: '20px 14px',
        minHeight: '176px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: glowShadow,
        borderStyle: isFuture ? 'dashed' : 'solid',
        borderTopStyle: 'solid',
      }}
    >
      {/* FUTURO badge */}
      {isFuture && (
        <span style={{
          position: 'absolute', top: '8px', right: '9px',
          fontSize: '8px', fontWeight: '800', letterSpacing: '1px',
          color: C.future, background: 'rgba(56,189,248,0.1)',
          border: '1px solid rgba(56,189,248,0.25)',
          padding: '2px 6px', borderRadius: '4px',
        }}>
          FUTURO
        </span>
      )}

      {/* Tag — dominant element */}
      <div style={{
        fontSize: '34px',
        fontWeight: '800',
        letterSpacing: '-1px',
        lineHeight: 1,
        textAlign: 'center',
        color: isFuture ? C.future : '#FFFFFF',
        textShadow: isFuture
          ? `0 0 20px ${C.future}60`
          : soStatus === 'active' ? `0 0 16px rgba(34,197,94,0.25)`
          : scStatus === 'active' ? `0 0 16px rgba(239,68,68,0.2)`
          : 'none',
      }}>
        {tag}
      </div>

      {/* Divider */}
      <div style={{
        width: '52px', height: '1px',
        background: `linear-gradient(90deg, transparent, ${topBorder}80, transparent)`,
      }} />

      {/* SC — Cerrado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span
          className={scStatus === 'active' ? 'dot-red' : ''}
          style={{
            display: 'inline-block',
            width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
            background: scStatus === 'active' ? C.closed : '#1F2937',
            boxShadow: scStatus === 'active' ? `0 0 8px ${C.closed}` : 'none',
          }}
        />
        <span style={{
          fontSize: '11px', fontWeight: scStatus === 'active' ? '700' : '400',
          color: scStatus === 'active' ? C.closed : '#374151',
          letterSpacing: '0.3px', whiteSpace: 'nowrap',
        }}>
          {scTag} · CERRADO
        </span>
      </div>

      {/* SO — Abierto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span
          className={soStatus === 'active' ? 'dot-green' : ''}
          style={{
            display: 'inline-block',
            width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
            background: soStatus === 'active' ? C.open : '#1F2937',
            boxShadow: soStatus === 'active' ? `0 0 8px ${C.open}` : 'none',
          }}
        />
        <span style={{
          fontSize: '11px', fontWeight: soStatus === 'active' ? '700' : '400',
          color: soStatus === 'active' ? C.open : '#374151',
          letterSpacing: '0.3px', whiteSpace: 'nowrap',
        }}>
          {soTag} · ABIERTO
        </span>
      </div>

      {/* Description */}
      <div style={{
        fontSize: '10px', color: '#374151',
        textAlign: 'center', lineHeight: 1.4,
        maxWidth: '128px', marginTop: '2px',
      }}>
        {description}
      </div>
    </div>
  );
}
