'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { EquipmentPdfUpload } from '@/components/equipment/EquipmentPdfUpload';
import { useEquipmentInspectionTemplates } from '@/hooks/useInspectionData';
import type { SelectionCardData } from './SelectionCard';

interface Props {
  card: SelectionCardData & { groupId: string; processId: string };
  projectId: string;
  /** UUID real de Supabase; si se omite, se deriva del tag con prefijo ic02- */
  equipmentId?: string;
  onClose: () => void;
}

const SIGNAL_DESCRIPTIONS: Record<string, string> = {
  HART:     'Señal analógica HART 4-20 mA — comunicación digital superpuesta',
  AI:       'Entrada analógica 4-20 mA — señal estándar de campo',
  DI:       'Entrada digital 24 VDC — contacto seco ON/OFF',
  'DI·AO·AI': 'Válvula actuada — DI posición · AO setpoint · AI retroalimentación',
  '440VAC': 'Equipo 440 VAC — control por variador VFD o arrancador SS',
};

// Convierte tag "FIT-101" → "ic02-fit-101" para usar como equipmentId
function tagToEquipmentId(tag: string): string {
  return 'ic02-' + tag.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Selecciona template según tipo de señal o tag
function templateForBadge(badge: string, tag?: string): string {
  if (badge === '440VAC') return 'tpl-mec-001';
  if (!tag) return 'tpl-ic-001';
  const t = tag.toUpperCase();
  if (/^(MTR|MOT|M-|ME-)/.test(t))           return 'tpl-mec-001'; // Motor
  if (/^(BBA|BOM|PMP|B-)\d/.test(t))         return 'tpl-mec-002'; // Bomba
  if (/^(SPL|SB|COM|BGA|CPR)/.test(t))       return 'tpl-mec-003'; // Compresor/Soplador
  if (/^(VDF|VFD|VSD|ACS|PF|A-B)/.test(t))  return 'tpl-ic-003';  // Variador
  if (/^(PLC|RTU|PAC|DCS)/.test(t))          return 'tpl-ic-002';  // PLC
  if (/^(CCM|TBL|MCC|QE|QD|TD)/.test(t))    return 'tpl-ele-001'; // Tablero/CCM
  if (/^(CAB|CXX|KV|WR|CBL)/.test(t))       return 'tpl-ele-002'; // Cable
  if (/^(TR|TRF|TX|XFMR)/.test(t))          return 'tpl-ele-003'; // Transformador
  if (/^(GEN|GED|UPS|GAE)/.test(t))         return 'tpl-ele-004'; // Generador
  if (/^(CEL|MT|CUT|INT|BRK)/.test(t))      return 'tpl-ele-005'; // Celda MT
  if (/^(LIN|TUB|PIP|DUC)/.test(t))         return 'tpl-mec-004'; // Tubería
  if (/^(CAL|CALDERA|TEA|QUE)/.test(t))     return 'tpl-mec-005'; // Caldera/TEA
  if (/^(LAG|EST|CIV|POZ)/.test(t))         return 'tpl-efl-001'; // Laguna/Civil
  if (/^(PT|PIT|PDT|PDIT|PSH|PSL|PSE|PDSH|PDSL|PG|PI-)/.test(t)) return 'tpl-ic-005'; // Presión
  if (/^(FIT|FT|FM|FE|FQ|FS|FIC|FRC|FCV-)/.test(t))             return 'tpl-ic-006'; // Flujo
  if (/^(TT|TIT|TE|TW|TI-|TIC|TRC|TSH|TSL)/.test(t))           return 'tpl-ic-007'; // Temperatura
  if (/^(LT|LIT|LE|LSH|LSL|LG|LI-|LC|LRC|LCV-)/.test(t))      return 'tpl-ic-008'; // Nivel
  if (/^(AT|AIT|AE|QT|QIT|PHT|PH-|CT|WT|DO-|CL-)/.test(t))    return 'tpl-ic-009'; // Analítica
  if (/^(VT|VIT|VSH|VSL|VE|VAC|VXH|VXL)/.test(t))             return 'tpl-ic-010'; // Vibración
  if (/^(ZT|ZIT|ZE|YT|YIT|YC|YIC)/.test(t))                   return 'tpl-ic-011'; // Posición / Posicionador
  if (/^(ST|SIT|SE|SSH|SSL|SH|SL|SIC|SRC)/.test(t))           return 'tpl-ic-012'; // Velocidad (speed)
  if (/^(WIT|WFT|WF-|MFT|MF-|WIC|WRC)/.test(t))              return 'tpl-ic-013'; // Caudal másico
  if (/^(TQT|TQI|TQE|TQC|TQS|TQ-)/.test(t))                  return 'tpl-ic-014'; // Torque / par
  if (/^(WT|WE|WSH|WSL|WC|GWT|GWI|FIT-W)/.test(t))           return 'tpl-ic-015'; // Peso / fuerza
  if (/^(VLV|VB|VBF|VBM|VMP|VGT|VCK|VCS|VRE)/.test(t)) return 'tpl-mec-006'; // Válvula manual
  if (/^(XV|YV|VA|HV|FCV|LCV|PCV|TCV|MOV|AOV)/.test(t)) return 'tpl-mec-007'; // Válvula actuada
  if (/^(ZSC|ZSO|ZS|LS)/.test(t))          return 'tpl-ic-004';  // Detector / fin de carrera
  return 'tpl-ic-001'; // default: instrumento I&C
}

export function InstrumentDrawer({ card, projectId, equipmentId: equipmentIdProp, onClose }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const { tag, description, signalBadge, signalColor, accentColor, subTags, isFuture, precomStatus = 'pending' } = card;

  // Busca el equipo real en Supabase por tag (necesario para subir PDFs)
  const { data: realEquipment } = useQuery({
    queryKey: ['equipment-by-tag', projectId, tag],
    queryFn: async () => {
      if (!projectId) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from('equipment')
        .select('id, catalog_url, fat_protocol_url')
        .eq('project_id', projectId)
        .ilike('tag', tag)
        .maybeSingle();
      return data as { id: string; catalog_url?: string; fat_protocol_url?: string } | null;
    },
    enabled: !!projectId && !!tag,
    staleTime: 60_000,
  });

  const realEquipmentId = equipmentIdProp ?? realEquipment?.id;

  // Plantillas reales asignadas al equipo (incluye la CHK del seed); prioriza CHK
  const { data: assignedTemplates = [] } = useEquipmentInspectionTemplates(realEquipmentId ?? '');
  const realTemplate =
    assignedTemplates.find((t) => (t.code ?? '').toUpperCase().startsWith('CHK')) ??
    assignedTemplates[0];

  const precomCfg = {
    pending:      { label: 'PENDIENTE',   color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
    'in-progress':{ label: 'EN PROGRESO', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
    completed:    { label: 'COMPLETADO',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  } as const;
  const pCfg = precomCfg[precomStatus as keyof typeof precomCfg] ?? precomCfg.pending;

  const sigDesc = SIGNAL_DESCRIPTIONS[signalBadge] ?? '';

  // Derive controller from signalBadge / groupId for display
  const controller = signalBadge === 'DI' && card.groupId !== 'actuadas' &&
    !['fit-lodos','ls','vl-sensors','fit','pit','tit'].includes(card.groupId)
    ? 'RTU 5094 · Cuarto Eléctrico'
    : 'PLC 1756-L73 · Control Principal';

  function handleAction(type: 'inspeccion' | 'precom') {
    const returnTo = encodeURIComponent(pathname);
    // Si el instrumento existe como equipo real y tiene plantilla asignada (CHK),
    // usar esa. Si no, caer al comportamiento mock por tipo de señal.
    if (realEquipmentId && realTemplate) {
      router.push(`/equipment/${realEquipmentId}/inspection/${realTemplate.id}?returnTo=${returnTo}`);
    } else {
      const eqId       = equipmentIdProp ?? tagToEquipmentId(tag);
      const templateId = templateForBadge(signalBadge, tag);
      router.push(`/equipment/${eqId}/inspection/${templateId}?returnTo=${returnTo}`);
    }
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(2,8,18,0.65)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 10001,
        width: '360px', maxWidth: '90vw',
        background: 'linear-gradient(170deg, #2C4F82 0%, #1E3A61 100%)',
        borderLeft: `1px solid rgba(255,255,255,0.10)`,
        borderTop: `3px solid ${accentColor}`,
        display: 'flex', flexDirection: 'column',
        fontFamily: '"Inter","Segoe UI",system-ui,sans-serif',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        animation: 'slideIn 200ms ease',
      }}>
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header del drawer */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', flexDirection: 'column', gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {/* Badge señal */}
            <span style={{
              fontSize: '10px', fontWeight: '800', letterSpacing: '0.8px',
              color: isFuture ? '#38BDF8' : signalColor,
              background: isFuture ? 'rgba(56,189,248,0.1)' : `${signalColor}18`,
              border: `1px solid ${isFuture ? 'rgba(56,189,248,0.25)' : `${signalColor}40`}`,
              padding: '3px 10px', borderRadius: '4px',
            }}>
              {isFuture ? 'FUTURO' : signalBadge}
            </span>

            {/* Cerrar */}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px', width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#6B7280', fontSize: '16px', lineHeight: 1,
                flexShrink: 0,
              }}
            >×</button>
          </div>

          {/* Tag */}
          <div style={{
            fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', lineHeight: 1,
            color: isFuture ? '#38BDF870' : '#F1F5F9',
          }}>
            {tag}
          </div>

          {/* Descripción */}
          <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
            {subTags && (
              <span style={{ color: '#64748B', marginRight: '6px', fontWeight: '600' }}>
                {subTags} ·
              </span>
            )}
            {description}
          </div>

          {/* Status precom */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: pCfg.bg, borderRadius: '6px', padding: '5px 12px',
            alignSelf: 'flex-start',
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: pCfg.color }} />
            <span style={{ fontSize: '10px', fontWeight: '700', color: pCfg.color, letterSpacing: '0.5px' }}>
              {pCfg.label}
            </span>
          </div>
        </div>

        {/* Detalles técnicos */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', flexDirection: 'column', gap: '10px',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#93B5D6', letterSpacing: '1.5px' }}>
            DETALLES TÉCNICOS
          </div>

          {(equipmentIdProp
            ? [
                // Equipo Supabase: campos relevantes de planta
                subTags ? { label: 'Señal / Servicio', value: subTags } : null,
                { label: 'Estado',    value: signalBadge },
                { label: 'ID equipo', value: equipmentIdProp.slice(0, 8) + '…' },
              ]
            : [
                // Instrumento IC02: campos de control
                { label: 'Controlador',  value: controller },
                { label: 'Tipo señal',   value: sigDesc || signalBadge },
                { label: 'Área proceso', value: card.processId.toUpperCase() },
                { label: 'Grupo',        value: card.groupId },
              ]
          ).filter(Boolean).map(row => (
            <div key={row!.label} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: '10px', color: '#93B5D6', fontWeight: '600',
                minWidth: '90px', flexShrink: 0, paddingTop: '1px',
              }}>{row!.label}</span>
              <span style={{ fontSize: '10px', color: '#CBD5E1', lineHeight: 1.4 }}>{row!.value}</span>
            </div>
          ))}
        </div>

        {/* Descripción señal — solo IC02 */}
        {sigDesc && !equipmentIdProp && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            flexShrink: 0,
          }}>
            <div style={{
              background: `${accentColor}08`,
              border: `1px solid ${accentColor}20`,
              borderLeft: `3px solid ${accentColor}`,
              borderRadius: '6px', padding: '10px 12px',
            }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#93B5D6', letterSpacing: '1px', marginBottom: '4px' }}>
                TIPO DE SEÑAL
              </div>
              <div style={{ fontSize: '10px', color: '#A8BFDA', lineHeight: 1.5 }}>{sigDesc}</div>
            </div>
          </div>
        )}

        {/* Documentos técnicos */}
        {realEquipmentId && (
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', flexDirection: 'column', gap: '10px',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: '#93B5D6', letterSpacing: '1.5px' }}>
              DOCUMENTOS TÉCNICOS
            </div>
            <EquipmentPdfUpload
              equipmentId={realEquipmentId}
              field="catalog_url"
              label="Manual del catálogo"
              currentUrl={realEquipment?.catalog_url}
            />
            <EquipmentPdfUpload
              equipmentId={realEquipmentId}
              field="fat_protocol_url"
              label="Protocolo pruebas FAT"
              currentUrl={realEquipment?.fat_protocol_url}
            />
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Acciones */}
        <div style={{
          padding: '16px 20px 24px',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', flexDirection: 'column', gap: '10px',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#93B5D6', letterSpacing: '1.5px', marginBottom: '2px' }}>
            ACCIONES
          </div>

          {/* Botón principal — Iniciar Precomisionamiento */}
          <button
            onClick={() => handleAction('inspeccion')}
            disabled={!!isFuture}
            style={{
              width: '100%', padding: '14px 16px',
              borderRadius: '8px', border: 'none', cursor: isFuture ? 'not-allowed' : 'pointer',
              background: isFuture
                ? 'rgba(56,189,248,0.04)'
                : 'linear-gradient(135deg, rgba(56,189,248,0.20) 0%, rgba(56,189,248,0.10) 100%)',
              borderWidth: '1px', borderStyle: 'solid',
              borderColor: isFuture ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.40)',
              display: 'flex', alignItems: 'center', gap: '12px',
              opacity: isFuture ? 0.4 : 1,
              transition: 'all 150ms ease',
            }}
          >
            <span style={{ fontSize: '22px' }}>📋</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#38BDF8' }}>Iniciar Precomisionamiento</div>
              <div style={{ fontSize: '10px', color: '#A8BFDA', marginTop: '2px' }}>Formulario de verificación técnica</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '16px', color: '#38BDF8', opacity: 0.7 }}>›</span>
          </button>
        </div>
      </div>
    </>
  );
}
