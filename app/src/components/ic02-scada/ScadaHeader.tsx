'use client';

import Image from 'next/image';

interface PidLink {
  label: string;
  url: string;
}

interface Props {
  projectId?: string;
  hint?: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  pidLinks?: PidLink[];
}

export function ScadaHeader({ hint, title, subtitle, icon, pidLinks }: Props) {

  return (
    <header
      className="px-3 sm:px-6 gap-3 sm:gap-4"
      style={{
        background: 'linear-gradient(90deg, #162F50 0%, #1B4579 50%, #162F50 100%)',
        borderBottom: '2px solid #4676AA',
        height: '64px',
        display: 'flex', alignItems: 'center', flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        position: 'relative', zIndex: 100,
      }}
    >

      {/* ── Logo + título ── */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
        background: 'rgba(70,118,170,0.2)',
        border: '1px solid rgba(70,118,170,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', boxShadow: '0 0 16px rgba(70,118,170,0.15)',
      }}>{icon ?? '⚙'}</div>

      <div className="min-w-0 flex-1">
        <div
          className="text-[13px] sm:text-base font-bold tracking-tight sm:tracking-[2px] truncate"
          style={{
            background: 'linear-gradient(90deg,#FFFFFF 40%,#A7B0C2 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}
        >
          {title ?? 'IC02 — AIRE Y BIOGÁS · LDC'}
        </div>
        <div className="truncate" style={{ fontSize: '10px', color: '#4676AA', letterSpacing: '1px', marginTop: '2px' }}>
          {subtitle ?? 'BEBEDOURO · BRASIL · PRECOMISIONAMIENTO E INSPECCIÓN · BIOTEC'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        {/* ── Botones P&ID ── */}
        {pidLinks && pidLinks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {pidLinks.map((pid) => (
              <button
                key={pid.label}
                onClick={() => window.open(pid.url, '_blank', 'noopener,noreferrer')}
                title={`Abrir ${pid.label}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(56,189,248,0.12)',
                  border: '1px solid rgba(56,189,248,0.4)',
                  borderRadius: '6px', padding: '5px 10px',
                  fontSize: '11px', fontWeight: '700', color: '#7DD3FC',
                  cursor: 'pointer', letterSpacing: '0.3px',
                  outline: 'none', transition: 'all 150ms', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(56,189,248,0.22)';
                  e.currentTarget.style.borderColor = 'rgba(56,189,248,0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(56,189,248,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)';
                }}
              >
                <span style={{ fontSize: '12px', lineHeight: 1 }}>📄</span>
                {pid.label}
              </button>
            ))}
          </div>
        )}

        <div
          className="hidden md:block"
          style={{
            background: 'rgba(70,118,170,0.15)', border: '1px solid rgba(70,118,170,0.35)',
            borderRadius: '6px', padding: '5px 12px', fontSize: '11px', color: '#93B5D6',
            fontWeight: '600', letterSpacing: '0.5px',
          }}
        >
          {hint ?? 'Selecciona un instrumento para iniciar inspección'}
        </div>
        <div style={{
          background: '#FFFFFF', borderRadius: '8px',
          padding: '4px 10px', display: 'flex', alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}>
          <Image
            src="/logo-biotec.png"
            alt="Biotec"
            width={72}
            height={32}
            style={{ objectFit: 'contain', display: 'block' }}
          />
        </div>
      </div>
    </header>
  );
}
