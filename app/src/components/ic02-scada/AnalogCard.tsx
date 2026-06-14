'use client';

import type { AnalogInstr } from './types';

interface Props {
  instrument: AnalogInstr;
  onClick?: (i: AnalogInstr) => void;
}

const signalColor: Record<string, string> = {
  HART: '#22C55E',
  AI:   '#38BDF8',
};

export function AnalogCard({ instrument, onClick }: Props) {
  const { tag, description, signalType, unit, value, min, max, isFuture } = instrument;
  const color = isFuture ? '#38BDF8' : signalColor[signalType] ?? '#A7B0C2';
  const pct   = max > 0 ? Math.min(100, ((value - min) / (max - min)) * 100) : 0;
  const displayVal = value.toFixed(value < 10 ? 1 : 0);

  return (
    <div
      onClick={() => onClick?.(instrument)}
      className="ic02-card"
      style={{
        background: 'linear-gradient(145deg, #3D6094 0%, #2C4F82 100%)',
        border: `1px solid ${isFuture ? 'rgba(56,189,248,0.25)' : `${color}25`}`,
        borderTop: `2px solid ${color}`,
        borderStyle: isFuture ? 'dashed' : 'solid',
        borderTopStyle: 'solid',
        borderRadius: '12px',
        padding: '18px 14px',
        minHeight: '176px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '8px', cursor: 'pointer', position: 'relative',
        boxShadow: isFuture ? 'none' : `0 4px 20px ${color}12`,
      }}
    >
      {isFuture && (
        <span style={{
          position: 'absolute', top: '8px', right: '9px',
          fontSize: '8px', fontWeight: '800', letterSpacing: '1px',
          color: '#38BDF8', background: 'rgba(56,189,248,0.1)',
          border: '1px solid rgba(56,189,248,0.2)',
          padding: '2px 6px', borderRadius: '4px',
        }}>FUTURO</span>
      )}

      {/* Signal type badge */}
      <span style={{
        fontSize: '9px', fontWeight: '800', letterSpacing: '1px',
        color: color, background: `${color}15`,
        border: `1px solid ${color}30`,
        padding: '2px 8px', borderRadius: '4px',
      }}>{signalType}</span>

      {/* Tag */}
      <div style={{
        fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px',
        color: isFuture ? '#38BDF8' : '#FFFFFF', lineHeight: 1, textAlign: 'center',
      }}>{tag}</div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{
          fontSize: '28px', fontWeight: '800', lineHeight: 1,
          color: isFuture ? '#374151' : color,
        }}>
          {isFuture ? '—' : displayVal}
        </span>
        <span style={{ fontSize: '12px', color: '#93B5D6', fontWeight: '600' }}>{unit}</span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: '4px', background: '#243650',
        borderRadius: '2px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: '2px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* min / max labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        width: '100%', fontSize: '9px', color: '#4676AA',
      }}>
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>

      {/* Description */}
      <div style={{
        fontSize: '9px', color: '#93B5D6', textAlign: 'center',
        lineHeight: 1.4, maxWidth: '130px', marginTop: '2px',
      }}>{description}</div>
    </div>
  );
}
