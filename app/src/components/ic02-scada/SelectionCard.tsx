'use client';

export type PrecomStatus = 'pending' | 'in-progress' | 'completed';

export interface SelectionCardData {
  id: string;
  tag: string;
  description: string;
  signalBadge: string;
  signalColor: string;
  accentColor: string;
  subTags?: string;
  isFuture?: boolean;
  precomStatus?: PrecomStatus;
}

const precomCfg: Record<PrecomStatus, { label: string; color: string; bg: string }> = {
  'pending':     { label: 'PENDIENTE',   color: '#64748B', bg: 'rgba(100,116,139,0.1)'  },
  'in-progress': { label: 'EN PROGRESO', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'   },
  'completed':   { label: 'COMPLETADO',  color: '#22C55E', bg: 'rgba(34,197,94,0.1)'    },
};

interface Props {
  data: SelectionCardData;
  onClick: (data: SelectionCardData) => void;
  highlight?: boolean;
}

export function SelectionCard({ data, onClick, highlight }: Props) {
  const {
    tag, description, signalBadge, signalColor,
    accentColor, subTags, isFuture, precomStatus = 'pending',
  } = data;
  const pCfg = precomCfg[precomStatus];

  return (
    <div
      onClick={() => !isFuture && onClick(data)}
      className="ic02-card"
      style={{
        background: isFuture
          ? 'rgba(14,26,43,0.5)'
          : 'linear-gradient(135deg, #162840 0%, #0E1E32 100%)',
        border: highlight
          ? '1.5px solid #22C55E'
          : `1px solid ${isFuture ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.09)'}`,
        borderLeft: `3px solid ${isFuture ? '#38BDF840' : accentColor}`,
        borderStyle: isFuture ? 'dashed' : 'solid',
        borderLeftStyle: 'solid',
        borderRadius: '8px',
        padding: '10px 12px 9px',
        minHeight: '82px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        cursor: isFuture ? 'default' : 'pointer',
        position: 'relative',
        opacity: isFuture ? 0.5 : 1,
        boxShadow: highlight
          ? '0 0 0 1px #22C55E40, 0 4px 16px rgba(34,197,94,0.2)'
          : '0 1px 4px rgba(0,0,0,0.4)',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
        <span style={{
          fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px',
          color: isFuture ? '#38BDF8' : signalColor,
          background: isFuture ? 'rgba(56,189,248,0.1)' : `${signalColor}18`,
          border: `1px solid ${isFuture ? 'rgba(56,189,248,0.2)' : `${signalColor}35`}`,
          padding: '2px 7px', borderRadius: '3px',
        }}>
          {isFuture ? 'FUTURO' : signalBadge}
        </span>

        {!isFuture && (
          <span style={{
            fontSize: '8px', fontWeight: '700', letterSpacing: '0.5px',
            color: pCfg.color, background: pCfg.bg,
            padding: '2px 6px', borderRadius: '3px',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            <span style={{
              width: '4px', height: '4px', borderRadius: '50%',
              background: pCfg.color, display: 'inline-block', flexShrink: 0,
            }} />
            {pCfg.label}
          </span>
        )}
      </div>

      {/* Tag */}
      <div style={{
        fontSize: '19px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: 1,
        color: isFuture ? '#38BDF860' : '#F1F5F9',
      }}>
        {tag}
      </div>

      {/* Description */}
      <div style={{
        fontSize: '9px', color: '#64748B', lineHeight: 1.35,
        marginTop: '5px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
      }}>
        {subTags && (
          <span style={{ color: '#475569', marginRight: '3px', fontWeight: '600' }}>
            {subTags} ·
          </span>
        )}
        {description}
      </div>
    </div>
  );
}
