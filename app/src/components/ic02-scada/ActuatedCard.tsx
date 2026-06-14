'use client';

import type { ActuatedInstr } from './types';

interface Props {
  instrument: ActuatedInstr;
  onClick?: (i: ActuatedInstr) => void;
}

export function ActuatedCard({ instrument, onClick }: Props) {
  const { tag, description, openSW, closeSW, failSW, position, isFuture } = instrument;

  const borderColor = isFuture ? '#38BDF8'
    : failSW  === 'active' ? '#F59E0B'
    : openSW  === 'active' ? '#22C55E'
    : closeSW === 'active' ? '#EF4444'
    : '#374151';

  const posColor = position >= 80 ? '#22C55E'
    : position >= 30 ? '#F59E0B'
    : '#EF4444';

  return (
    <div
      onClick={() => onClick?.(instrument)}
      className="ic02-card"
      style={{
        background: 'linear-gradient(145deg, #16213A 0%, #0E1A2B 100%)',
        border: `1px solid ${borderColor}35`,
        borderTop: `2px solid ${borderColor}`,
        borderStyle: isFuture ? 'dashed' : 'solid',
        borderTopStyle: 'solid',
        borderRadius: '12px',
        padding: '18px 14px',
        minHeight: '176px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '9px', cursor: 'pointer', position: 'relative',
        boxShadow: isFuture ? 'none' : `0 4px 20px ${borderColor}10`,
      }}
    >
      {isFuture && (
        <span style={{
          position: 'absolute', top: '8px', right: '9px',
          fontSize: '8px', fontWeight: '800', color: '#38BDF8',
          background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
          padding: '2px 6px', borderRadius: '4px', letterSpacing: '1px',
        }}>FUTURO</span>
      )}

      {/* Badge */}
      <span style={{
        fontSize: '9px', fontWeight: '800', letterSpacing: '1px',
        color: '#A855F7', background: 'rgba(168,85,247,0.12)',
        border: '1px solid rgba(168,85,247,0.25)',
        padding: '2px 8px', borderRadius: '4px',
      }}>DI · AO · AI</span>

      {/* Tag */}
      <div style={{
        fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px',
        color: isFuture ? '#38BDF8' : '#FFFFFF', lineHeight: 1, textAlign: 'center',
      }}>{tag}</div>

      {/* Position arc indicator */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '9px', color: '#374151', flexShrink: 0 }}>0%</span>
        <div style={{
          flex: 1, height: '6px', background: '#1F2937', borderRadius: '3px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${isFuture ? 0 : position}%`, height: '100%', borderRadius: '3px',
            background: isFuture ? '#1F2937'
              : `linear-gradient(90deg, ${posColor}60, ${posColor})`,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <span style={{
          fontSize: '13px', fontWeight: '800', color: isFuture ? '#374151' : posColor,
          flexShrink: 0, minWidth: '36px', textAlign: 'right',
        }}>
          {isFuture ? '—' : `${position}%`}
        </span>
      </div>

      {/* SW status row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { label: 'SO', status: openSW,  color: '#22C55E', tip: 'Abierto' },
          { label: 'SC', status: closeSW, color: '#EF4444', tip: 'Cerrado' },
          { label: 'SF', status: failSW,  color: '#F59E0B', tip: 'Falla' },
        ].map(sw => (
          <div key={sw.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          }}>
            <span
              className={sw.status === 'active' && !isFuture
                ? (sw.label === 'SC' ? 'dot-red' : sw.label === 'SO' ? 'dot-green' : '')
                : ''}
              style={{
                display: 'inline-block',
                width: '8px', height: '8px', borderRadius: '50%',
                background: sw.status === 'active' && !isFuture ? sw.color : '#1F2937',
                boxShadow: sw.status === 'active' && !isFuture ? `0 0 8px ${sw.color}` : 'none',
              }}
            />
            <span style={{ fontSize: '8px', color: sw.status === 'active' && !isFuture ? sw.color : '#374151', fontWeight: '700' }}>
              {sw.label}
            </span>
          </div>
        ))}
      </div>

      {/* Description */}
      <div style={{
        fontSize: '9px', color: '#374151', textAlign: 'center',
        lineHeight: 1.4, maxWidth: '130px',
      }}>{description}</div>
    </div>
  );
}
