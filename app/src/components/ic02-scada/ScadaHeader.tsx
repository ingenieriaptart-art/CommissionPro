'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NavItem {
  icon: string;
  label: string;
  sub: string;
  href: string;
}

interface Props {
  projectId?: string;
  hint?: string;
  title?: string;
  subtitle?: string;
  icon?: string;
}

const NAV_ITEMS = (projectId: string): NavItem[] => [
  { icon: '⬡',  label: 'Dashboard',         sub: 'Resumen del proyecto',     href: `/projects/${projectId}/dashboard`      },
  { icon: '⚡',  label: 'SCADA · Potencia',   sub: 'Diagrama planta y CCMs',   href: `/projects/${projectId}/plant-map`      },
  { icon: '🗺',  label: 'Mapa · Equipos',     sub: 'Lista de todos los equipos', href: `/projects/${projectId}/plant-map?tab=equipos` },
  { icon: '⚙',  label: 'Instrumentos IC02',  sub: 'PLC · RTU · FIT · SC/SO',  href: `/projects/${projectId}/ic02-rtu`       },
  { icon: '✓',  label: 'Pruebas',            sub: 'Precom · FAT · Loop Check', href: `/projects/${projectId}/tests`          },
];

export function ScadaHeader({ projectId, hint, title, subtitle, icon }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const items = projectId ? NAV_ITEMS(projectId) : [];

  return (
    <header style={{
      background: 'linear-gradient(90deg, #162F50 0%, #1B4579 50%, #162F50 100%)',
      borderBottom: '2px solid #4676AA',
      padding: '0 24px', height: '64px',
      display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      position: 'relative', zIndex: 100,
    }}>

      {/* ── Botón de navegación con dropdown ── */}
      {projectId && (
        <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              background: open ? 'rgba(70,118,170,0.2)' : 'rgba(70,118,170,0.08)',
              border: `1px solid ${open ? 'rgba(70,118,170,0.5)' : 'rgba(70,118,170,0.25)'}`,
              borderRadius: '6px', padding: '6px 12px',
              color: open ? '#CBD5E1' : '#93B5D6',
              cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 150ms',
            }}
          >
            <span style={{ fontSize: '11px' }}>☰</span>
            Navegar
            <span style={{
              fontSize: '8px',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms',
              display: 'inline-block',
            }}>▾</span>
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              background: '#1B4579',
              border: '1px solid rgba(70,118,170,0.35)',
              borderRadius: '10px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              minWidth: '240px',
              overflow: 'hidden',
              animation: 'fadeDown 150ms ease',
            }}>
              <style>{`
                @keyframes fadeDown {
                  from { opacity:0; transform:translateY(-6px); }
                  to   { opacity:1; transform:translateY(0); }
                }
              `}</style>
              <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {items.map(item => (
                  <button
                    key={item.href}
                    onClick={() => { setOpen(false); router.push(item.href); }}
                    style={{
                      background: 'transparent',
                      border: 'none', cursor: 'pointer',
                      borderRadius: '7px', padding: '9px 12px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      textAlign: 'left', width: '100%',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(70,118,170,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#E2E8F0' }}>{item.label}</div>
                      <div style={{ fontSize: '10px', color: '#4676AA', marginTop: '1px' }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Logo + título ── */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
        background: 'rgba(70,118,170,0.2)',
        border: '1px solid rgba(70,118,170,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', boxShadow: '0 0 16px rgba(70,118,170,0.15)',
      }}>{icon ?? '⚙'}</div>

      <div>
        <div style={{
          fontSize: '16px', fontWeight: '700', letterSpacing: '2px',
          background: 'linear-gradient(90deg,#FFFFFF 40%,#A7B0C2 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.2,
        }}>
          {title ?? 'IC02 — AIRE Y BIOGÁS · LDC'}
        </div>
        <div style={{ fontSize: '10px', color: '#4676AA', letterSpacing: '1px', marginTop: '2px' }}>
          {subtitle ?? 'BEBEDOURO · BRASIL · PRECOMISIONAMIENTO E INSPECCIÓN · BIOTEC'}
        </div>
      </div>

      <div style={{ marginLeft: 'auto' }}>
        <div style={{
          background: 'rgba(70,118,170,0.15)', border: '1px solid rgba(70,118,170,0.35)',
          borderRadius: '6px', padding: '5px 12px', fontSize: '11px', color: '#93B5D6',
          fontWeight: '600', letterSpacing: '0.5px',
        }}>
          {hint ?? 'Selecciona un instrumento para iniciar inspección'}
        </div>
      </div>
    </header>
  );
}
