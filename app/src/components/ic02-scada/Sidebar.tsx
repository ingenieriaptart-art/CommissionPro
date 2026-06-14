'use client';

import { useEffect, useState } from 'react';
import { sidebarItems } from './data';
import type { SidebarItem } from './types';

interface Props {
  activeSection: string;
  activeGroup: string | null;
  onSectionChange: (id: string) => void;
  onGroupFilter: (groupId: string | null) => void;
}

export function Sidebar({ activeSection, activeGroup, onSectionChange, onGroupFilter }: Props) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('es-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function handleClick(item: SidebarItem) {
    onSectionChange(item.id);
    if (item.groupId) {
      onGroupFilter(activeGroup === item.groupId ? null : item.groupId);
    } else if (item.id === 'overview') {
      onGroupFilter(null);
    }
  }

  return (
    <aside style={{
      width: '250px', flexShrink: 0,
      background: '#09162A',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', padding: '16px 8px',
    }}>
      {/* Section label */}
      <div style={{
        fontSize: '9px', color: '#1F2937',
        letterSpacing: '2px', fontWeight: '700',
        padding: '0 12px 10px', textTransform: 'uppercase',
      }}>
        NAVEGACIÓN
      </div>

      {/* Nav items */}
      {sidebarItems.map(item => {
        if (item.separator) {
          return (
            <div key={item.id} style={{
              height: '1px', background: 'rgba(255,255,255,0.04)',
              margin: '8px 12px',
            }} />
          );
        }

        const isActive = activeSection === item.id
          || (item.groupId != null && activeGroup === item.groupId);

        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px',
              border: 'none', cursor: 'pointer', width: '100%',
              textAlign: 'left', marginBottom: '2px',
              background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
              boxShadow: isActive ? 'inset 3px 0 0 #22C55E' : 'inset 3px 0 0 transparent',
              transition: 'all 150ms ease',
              outline: 'none',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0,
              color: isActive ? '#22C55E' : '#374151',
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: '13px', flex: 1,
              fontWeight: isActive ? '600' : '400',
              color: isActive ? '#FFFFFF' : '#6B7280',
            }}>
              {item.label}
            </span>
            {typeof item.badge === 'number' && (
              <span style={{
                background: item.badge > 0 ? '#EF4444' : '#1A2840',
                color: item.badge > 0 ? '#fff' : '#374151',
                fontSize: '10px', fontWeight: '700',
                padding: '1px 7px', borderRadius: '10px', minWidth: '20px',
                textAlign: 'center',
              }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* System status panel */}
      <div style={{
        margin: '8px 0 0',
        padding: '14px',
        background: '#071220',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span
            className="dot-green"
            style={{
              display: 'inline-block',
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 10px #22C55E',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#22C55E', letterSpacing: '0.5px' }}>
            SISTEMA NORMAL
          </span>
        </div>

        <div style={{ fontSize: '10px', color: '#374151', lineHeight: 1.8 }}>
          <div>
            <span style={{ color: '#1F2937' }}>Hora: </span>
            <span style={{ color: '#4B5563', fontWeight: '600' }}>{time}</span>
          </div>
          <div>
            <span style={{ color: '#1F2937' }}>Fecha: </span>
            <span style={{ color: '#4B5563', fontWeight: '600' }}>{date}</span>
          </div>
        </div>

        <div style={{
          marginTop: '10px', paddingTop: '10px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: '9px', color: '#1F2937', letterSpacing: '0.5px',
        }}>
          RTU 5094 · 5094-AENTR · EtherNet/IP
        </div>
      </div>
    </aside>
  );
}
