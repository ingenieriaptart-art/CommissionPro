'use client';

import { useState } from 'react';
import { processSteps } from './data';

interface Props {
  activeStep?: string;
  onStepClick?: (id: string) => void;
}

export function ProcessFlowBar({ activeStep: controlledActive, onStepClick }: Props) {
  const [localActive, setLocalActive] = useState('manifold');
  const active = controlledActive ?? localActive;

  function handleClick(id: string) {
    setLocalActive(id);
    onStepClick?.(id);
  }

  return (
    <div style={{
      background: '#0A1628',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', height: '78px', flexShrink: 0,
      overflowX: 'auto', gap: '0',
    }}>
      <div style={{
        fontSize: '9px', color: '#374151', letterSpacing: '2px', fontWeight: '700',
        textTransform: 'uppercase', whiteSpace: 'nowrap', marginRight: '16px', flexShrink: 0,
      }}>
        PROCESO →
      </div>

      {processSteps.map((step, i) => {
        const isActive = active === step.id;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => handleClick(step.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', height: '54px',
                border: '1px solid',
                borderColor: isActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)',
                borderRadius: '8px',
                background: isActive ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 200ms ease',
                outline: 'none',
                boxShadow: isActive ? '0 0 16px rgba(34,197,94,0.12)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              <span style={{ fontSize: '18px', color: isActive ? '#22C55E' : '#374151', flexShrink: 0 }}>
                {step.icon}
              </span>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: '11px', fontWeight: '700', letterSpacing: '1px',
                  color: isActive ? '#FFFFFF' : '#6B7280', marginBottom: '2px',
                }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '9px', color: isActive ? '#4B5563' : '#2D3748', letterSpacing: '0.3px' }}>
                  {step.sub}
                </div>
              </div>
            </button>

            {i < processSteps.length - 1 && (
              <div style={{
                width: '24px', height: '1px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                flexShrink: 0, margin: '0 2px', position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', top: '-6px', right: '-2px',
                  color: '#1F2937', fontSize: '11px',
                }}>›</span>
              </div>
            )}
          </div>
        );
      })}

      {/* RAFAC branch — separate */}
      <div style={{
        marginLeft: '16px', paddingLeft: '16px',
        borderLeft: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', height: '54px',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '8px',
          background: 'rgba(245,158,11,0.05)',
          cursor: 'pointer', outline: 'none',
          transition: 'all 200ms ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.05)'}
        >
          <span style={{ fontSize: '16px', color: '#F59E0B' }}>↑</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B', letterSpacing: '1px', marginBottom: '2px' }}>
              RAFAC 1·2·3
            </div>
            <div style={{ fontSize: '9px', color: '#4B3800', letterSpacing: '0.3px' }}>
              FIT-206..208 · VA-1..3
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
