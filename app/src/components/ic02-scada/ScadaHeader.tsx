interface Props {
  onBack?: () => void;
}

export function ScadaHeader({ onBack }: Props) {
  return (
    <header style={{
      background: 'linear-gradient(90deg, #09162A 0%, #071220 50%, #09162A 100%)',
      borderBottom: '1px solid rgba(34,197,94,0.12)',
      padding: '0 24px', height: '64px',
      display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px', padding: '6px 12px', color: '#6B7280',
            cursor: 'pointer', fontSize: '12px', fontWeight: '600', flexShrink: 0,
          }}
        >
          ← Volver
        </button>
      )}

      <div style={{
        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
        background: 'linear-gradient(135deg,rgba(34,197,94,.18),rgba(56,189,248,.08))',
        border: '1px solid rgba(34,197,94,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', boxShadow: '0 0 16px rgba(34,197,94,.1)',
      }}>⚙</div>

      <div>
        <div style={{
          fontSize: '16px', fontWeight: '700', letterSpacing: '2px',
          background: 'linear-gradient(90deg,#FFFFFF 40%,#A7B0C2 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.2,
        }}>
          IC02 — AIRE Y BIOGÁS · LDC
        </div>
        <div style={{ fontSize: '10px', color: '#4B5563', letterSpacing: '1px', marginTop: '2px' }}>
          BEBEDOURO · BRASIL · PRECOMISIONAMIENTO E INSPECCIÓN · BIOTEC
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{
          background: '#0E1A2B', border: '1px solid rgba(56,189,248,0.15)',
          borderRadius: '6px', padding: '5px 12px', fontSize: '11px', color: '#38BDF8',
          fontWeight: '600', letterSpacing: '0.5px',
        }}>
          Selecciona un instrumento para iniciar inspección
        </div>
      </div>
    </header>
  );
}
