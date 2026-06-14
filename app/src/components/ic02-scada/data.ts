import type {
  InstrumentGroupData, EquipmentGroupData,
  AnalogGroupData, ActuatedGroupData,
  SidebarItem,
} from './types';

// ════════════════════════════════════════════════════════════════════════════
//  RTU 5094 — Cuarto Eléctrico
// ════════════════════════════════════════════════════════════════════════════

export const rtuVBGroups: InstrumentGroupData[] = [
  {
    id: 'biodigestores',
    title: 'BIODIGESTORES',
    subtitle: 'VB-4..9 · Válvulas entrada / salida BD1 · BD2 · BD3',
    icon: '⬡',
    accentColor: '#22C55E',
    instruments: [
      { id: 'vb4', tag: 'VB-4', scTag: 'SC-VB-4', soTag: 'SO-VB-4', description: 'BD1 entrada biogás', scStatus: 'active',   soStatus: 'inactive', area: 'Biodigestor 1' },
      { id: 'vb5', tag: 'VB-5', scTag: 'SC-VB-5', soTag: 'SO-VB-5', description: 'BD2 entrada biogás', scStatus: 'active',   soStatus: 'inactive', area: 'Biodigestor 2' },
      { id: 'vb6', tag: 'VB-6', scTag: 'SC-VB-6', soTag: 'SO-VB-6', description: 'BD3 entrada biogás', scStatus: 'inactive', soStatus: 'inactive', isFuture: true, area: 'Biodigestor 3' },
      { id: 'vb7', tag: 'VB-7', scTag: 'SC-VB-7', soTag: 'SO-VB-7', description: 'BD1 salida biogás',  scStatus: 'inactive', soStatus: 'active',   area: 'Biodigestor 1' },
      { id: 'vb8', tag: 'VB-8', scTag: 'SC-VB-8', soTag: 'SO-VB-8', description: 'BD2 salida biogás',  scStatus: 'inactive', soStatus: 'active',   area: 'Biodigestor 2' },
      { id: 'vb9', tag: 'VB-9', scTag: 'SC-VB-9', soTag: 'SO-VB-9', description: 'BD3 salida biogás',  scStatus: 'inactive', soStatus: 'inactive', isFuture: true, area: 'Biodigestor 3' },
    ],
  },
  {
    id: 'sopladores',
    title: 'SOPLADORES SB1..SB6',
    subtitle: 'VB-28..44/47 · Bypass · Manifold · Venteo',
    icon: '◈',
    accentColor: '#38BDF8',
    instruments: [
      { id: 'vb47', tag: 'VB-47', scTag: 'SC-VB-47', soTag: 'SO-VB-47', description: 'Manifold principal',    scStatus: 'inactive', soStatus: 'active',   area: 'Manifold' },
      { id: 'vb42', tag: 'VB-42', scTag: 'SC-VB-42', soTag: 'SO-VB-42', description: 'Bypass entrada manifold', scStatus: 'active', soStatus: 'inactive', area: 'Bypass' },
      { id: 'vb43', tag: 'VB-43', scTag: 'SC-VB-43', soTag: 'SO-VB-43', description: 'Bypass salida manifold',  scStatus: 'active', soStatus: 'inactive', area: 'Bypass' },
      { id: 'vb28', tag: 'VB-28', scTag: 'SC-VB-28', soTag: 'SO-VB-28', description: 'Bypass biogás entrada',  scStatus: 'active',   soStatus: 'inactive', area: 'Bypass Gral' },
      { id: 'vb29', tag: 'VB-29', scTag: 'SC-VB-29', soTag: 'SO-VB-29', description: 'Bypass biogás retorno',  scStatus: 'active',   soStatus: 'inactive', area: 'Bypass Gral' },
      { id: 'vb30', tag: 'VB-30', scTag: 'SC-VB-30', soTag: 'SO-VB-30', description: 'Antes de SB1',   scStatus: 'inactive', soStatus: 'active', area: 'SB1' },
      { id: 'vb31', tag: 'VB-31', scTag: 'SC-VB-31', soTag: 'SO-VB-31', description: 'Después de SB1', scStatus: 'inactive', soStatus: 'active', area: 'SB1' },
      { id: 'vb32', tag: 'VB-32', scTag: 'SC-VB-32', soTag: 'SO-VB-32', description: 'Antes de SB2',   scStatus: 'inactive', soStatus: 'active', area: 'SB2' },
      { id: 'vb33', tag: 'VB-33', scTag: 'SC-VB-33', soTag: 'SO-VB-33', description: 'Después de SB2', scStatus: 'inactive', soStatus: 'active', area: 'SB2' },
      { id: 'vb34', tag: 'VB-34', scTag: 'SC-VB-34', soTag: 'SO-VB-34', description: 'Antes de SB3',   scStatus: 'inactive', soStatus: 'active', area: 'SB3' },
      { id: 'vb35', tag: 'VB-35', scTag: 'SC-VB-35', soTag: 'SO-VB-35', description: 'Después de SB3', scStatus: 'inactive', soStatus: 'active', area: 'SB3' },
      { id: 'vb36', tag: 'VB-36', scTag: 'SC-VB-36', soTag: 'SO-VB-36', description: 'Antes de SB4',   scStatus: 'inactive', soStatus: 'active', area: 'SB4' },
      { id: 'vb37', tag: 'VB-37', scTag: 'SC-VB-37', soTag: 'SO-VB-37', description: 'Después de SB4', scStatus: 'inactive', soStatus: 'active', area: 'SB4' },
      { id: 'vb38', tag: 'VB-38', scTag: 'SC-VB-38', soTag: 'SO-VB-38', description: 'Antes de SB5',   scStatus: 'inactive', soStatus: 'active', area: 'SB5' },
      { id: 'vb39', tag: 'VB-39', scTag: 'SC-VB-39', soTag: 'SO-VB-39', description: 'Después de SB5', scStatus: 'inactive', soStatus: 'active', area: 'SB5' },
      { id: 'vb40', tag: 'VB-40', scTag: 'SC-VB-40', soTag: 'SO-VB-40', description: 'Antes de SB6',   scStatus: 'inactive', soStatus: 'active', area: 'SB6' },
      { id: 'vb41', tag: 'VB-41', scTag: 'SC-VB-41', soTag: 'SO-VB-41', description: 'Después de SB6', scStatus: 'inactive', soStatus: 'active', area: 'SB6' },
      { id: 'vb44', tag: 'VB-44', scTag: 'SC-VB-44', soTag: 'SO-VB-44', description: 'Venteo (V56)',    scStatus: 'active',   soStatus: 'inactive', area: 'Venteo' },
    ],
  },
  {
    id: 'h2s-l1',
    title: 'H2S REMOCIÓN — LÍNEA 1',
    subtitle: 'VB-10..18 · Tratamiento biológico de H2S L1',
    icon: '◇',
    accentColor: '#F59E0B',
    instruments: [
      { id: 'vb10', tag: 'VB-10', scTag: 'SC-VB-10', soTag: 'SO-VB-10', description: 'Trat. L1 — pto. 1', scStatus: 'active',   soStatus: 'inactive', area: 'H2S L1' },
      { id: 'vb11', tag: 'VB-11', scTag: 'SC-VB-11', soTag: 'SO-VB-11', description: 'Trat. L1 — pto. 2', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L1' },
      { id: 'vb12', tag: 'VB-12', scTag: 'SC-VB-12', soTag: 'SO-VB-12', description: 'Trat. L1 — pto. 3', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L1' },
      { id: 'vb13', tag: 'VB-13', scTag: 'SC-VB-13', soTag: 'SO-VB-13', description: 'Trat. L1 — pto. 4', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L1' },
      { id: 'vb14', tag: 'VB-14', scTag: 'SC-VB-14', soTag: 'SO-VB-14', description: 'Trat. L1 — pto. 5', scStatus: 'active',   soStatus: 'inactive', area: 'H2S L1' },
      { id: 'vb15', tag: 'VB-15', scTag: 'SC-VB-15', soTag: 'SO-VB-15', description: 'Trat. L1 — pto. 6', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L1' },
      { id: 'vb16', tag: 'VB-16', scTag: 'SC-VB-16', soTag: 'SO-VB-16', description: 'Trat. L1 — pto. 7', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L1' },
      { id: 'vb17', tag: 'VB-17', scTag: 'SC-VB-17', soTag: 'SO-VB-17', description: 'Trat. L1 — pto. 8', scStatus: 'active',   soStatus: 'inactive', area: 'H2S L1' },
      { id: 'vb18', tag: 'VB-18', scTag: 'SC-VB-18', soTag: 'SO-VB-18', description: 'Trat. L1 — pto. 9', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L1' },
    ],
  },
  {
    id: 'h2s-l2',
    title: 'H2S REMOCIÓN — LÍNEA 2',
    subtitle: 'VB-19..27 · Tratamiento biológico de H2S L2',
    icon: '◇',
    accentColor: '#F59E0B',
    instruments: [
      { id: 'vb19', tag: 'VB-19', scTag: 'SC-VB-19', soTag: 'SO-VB-19', description: 'Trat. L2 — pto. 1', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L2' },
      { id: 'vb20', tag: 'VB-20', scTag: 'SC-VB-20', soTag: 'SO-VB-20', description: 'Trat. L2 — pto. 2', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L2' },
      { id: 'vb21', tag: 'VB-21', scTag: 'SC-VB-21', soTag: 'SO-VB-21', description: 'Trat. L2 — pto. 3', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L2' },
      { id: 'vb22', tag: 'VB-22', scTag: 'SC-VB-22', soTag: 'SO-VB-22', description: 'Trat. L2 — pto. 4', scStatus: 'active',   soStatus: 'inactive', area: 'H2S L2' },
      { id: 'vb23', tag: 'VB-23', scTag: 'SC-VB-23', soTag: 'SO-VB-23', description: 'Trat. L2 — pto. 5', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L2' },
      { id: 'vb24', tag: 'VB-24', scTag: 'SC-VB-24', soTag: 'SO-VB-24', description: 'Trat. L2 — pto. 6', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L2' },
      { id: 'vb25', tag: 'VB-25', scTag: 'SC-VB-25', soTag: 'SO-VB-25', description: 'Trat. L2 — pto. 7', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L2' },
      { id: 'vb26', tag: 'VB-26', scTag: 'SC-VB-26', soTag: 'SO-VB-26', description: 'Trat. L2 — pto. 8', scStatus: 'active',   soStatus: 'inactive', area: 'H2S L2' },
      { id: 'vb27', tag: 'VB-27', scTag: 'SC-VB-27', soTag: 'SO-VB-27', description: 'Trat. L2 — pto. 9', scStatus: 'inactive', soStatus: 'active',   area: 'H2S L2' },
    ],
  },
];

export const equipmentGroup: EquipmentGroupData = {
  id: 'sc12',
  title: 'SECADORES + CHILLERS',
  subtitle: 'SC1 · SC2 · Secado y Enfriamiento biogás · 440 VAC',
  icon: '⟐',
  accentColor: '#EC4899',
  instruments: [
    { id: 'sc1', tag: 'SC1', description: 'Secador + Chiller — Línea filtración 1', voltage: '440VAC', runStatus: 'running', diCount: 4, doCount: 2 },
    { id: 'sc2', tag: 'SC2', description: 'Secador + Chiller — Línea filtración 2', voltage: '440VAC', runStatus: 'running', diCount: 4, doCount: 2 },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
//  PLC 1756-L73 — Analógicos
// ════════════════════════════════════════════════════════════════════════════

export const plcAnalogGroups: AnalogGroupData[] = [
  // ── 100-series — Sistema Lodos / Crudo ──────────────────────────────────
  {
    id: 'fit-lodos',
    title: 'FLUJO LODOS / CRUDO',
    subtitle: 'FIT-101..112 · AI HART 4-20mA · Caudalímetros',
    icon: '⟡',
    accentColor: '#A78BFA',
    instruments: [
      { id: 'fit101', tag: 'FIT-101', description: 'Flujo crudo existente → Splitting Box #1',  signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 300, area: 'Splitting Box' },
      { id: 'fit102', tag: 'FIT-102', description: 'Flujo crudo existente → Splitting Box #2',  signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 300, area: 'Splitting Box' },
      { id: 'fit103', tag: 'FIT-103', description: 'Flujo Splitting Box → Biodigestor #1',      signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 200, area: 'Biodigestor 1' },
      { id: 'fit104', tag: 'FIT-104', description: 'Flujo Splitting Box → Biodigestor #2',      signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 200, area: 'Biodigestor 2' },
      { id: 'fit105', tag: 'FIT-105', description: 'Flujo Splitting Box → Biodigestor #3',      signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 200, isFuture: true, area: 'Biodigestor 3' },
      { id: 'fit106', tag: 'FIT-106', description: 'Flujo efluente tratado → Sist. Aeróbico #1', signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 200, area: 'Aeróbico 1' },
      { id: 'fit107', tag: 'FIT-107', description: 'Flujo efluente tratado → Sist. Aeróbico #2', signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 200, area: 'Aeróbico 2' },
      { id: 'fit108', tag: 'FIT-108', description: 'Flujo lodos de exceso → Secado',             signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 100, area: 'Secado' },
      { id: 'fit109', tag: 'FIT-109', description: 'Flujo recirculación lodos #1',               signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 200, area: 'Recirculación' },
      { id: 'fit110', tag: 'FIT-110', description: 'Flujo recirculación lodos #2',               signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 200, area: 'Recirculación' },
      { id: 'fit111', tag: 'FIT-111', description: 'Flujo lodo aeróbico → Splitting Box #1',     signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 150, area: 'Splitting Box' },
      { id: 'fit112', tag: 'FIT-112', description: 'Flujo lodo aeróbico → Splitting Box #2',     signalType: 'HART', unit: 'm³/h', value: 0, min: 0, max: 150, area: 'Splitting Box' },
    ],
  },
  {
    id: 'ls',
    title: 'NIVEL TANQUES LODOS',
    subtitle: 'LS-101..107 · DI 24VDC · Doble contacto',
    icon: '◐',
    accentColor: '#06B6D4',
    instruments: [
      { id: 'ls101', tag: 'LS-101', description: 'Nivel 2 contactos Splitting Box #1',            signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Splitting Box' },
      { id: 'ls102', tag: 'LS-102', description: 'Nivel 2 contactos Splitting Box #2',            signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Splitting Box' },
      { id: 'ls103', tag: 'LS-103', description: 'Nivel 2 contactos Tanque Recirculación #1',     signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Recirculación' },
      { id: 'ls104', tag: 'LS-104', description: 'Nivel 2 contactos Tanque Recirculación #2',     signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Recirculación' },
      { id: 'ls105', tag: 'LS-105', description: 'Nivel 2 contactos Tanque Nutrientes',           signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Nutrientes' },
      { id: 'ls106', tag: 'LS-106', description: 'Nivel 2 contactos Tanque Purga Lodos (bombas)', signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Purga Lodos' },
      { id: 'ls107', tag: 'LS-107', description: 'Nivel 2 contactos Tanque Purga Lodos (válvulas)', signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Purga Lodos' },
    ],
  },
  {
    id: 'vl-sensors',
    title: 'SENSORES POSICIÓN VL',
    subtitle: 'SC/SO-VL-04..07 · DI 24VDC · Válvulas manuales lodos',
    icon: '◑',
    accentColor: '#64748B',
    instruments: [
      { id: 'sc-vl04', tag: 'SC-VL-04', description: 'Pos. cerrada VL-04 — tubería recirculación pozo 1', signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Recirculación' },
      { id: 'so-vl04', tag: 'SO-VL-04', description: 'Pos. abierta VL-04 — tubería recirculación pozo 1', signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Recirculación' },
      { id: 'sc-vl05', tag: 'SC-VL-05', description: 'Pos. cerrada VL-05 — tubería lodos de exceso',      signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Lodos Exceso' },
      { id: 'so-vl05', tag: 'SO-VL-05', description: 'Pos. abierta VL-05 — tubería lodos de exceso',      signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Lodos Exceso' },
      { id: 'sc-vl06', tag: 'SC-VL-06', description: 'Pos. cerrada VL-06 — tubería recirculación pozo 2', signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Recirculación' },
      { id: 'so-vl06', tag: 'SO-VL-06', description: 'Pos. abierta VL-06 — tubería recirculación pozo 2', signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Recirculación' },
      { id: 'sc-vl07', tag: 'SC-VL-07', description: 'Pos. cerrada VL-07 — tubería lodos de exceso',      signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Lodos Exceso' },
      { id: 'so-vl07', tag: 'SO-VL-07', description: 'Pos. abierta VL-07 — tubería lodos de exceso',      signalType: 'DI', unit: 'ON/OFF', value: 0, min: 0, max: 1, area: 'Lodos Exceso' },
    ],
  },
  // ── 200-series — Sistema Biogás / Aire (existente) ──────────────────────
  {
    id: 'fit',
    title: 'FLUJO BIOGÁS / AIRE',
    subtitle: 'FIT-201..208 · AI HART 4-20mA · Coriolis / Ultrasónico',
    icon: '⟡',
    accentColor: '#22C55E',
    instruments: [
      { id: 'fit201', tag: 'FIT-201', description: 'Flujo biogás BD1 → manifold',   signalType: 'HART', unit: 'm³/h', value: 45.3, min: 0, max: 200, area: 'Biodigestores' },
      { id: 'fit202', tag: 'FIT-202', description: 'Flujo biogás BD2 → manifold',   signalType: 'HART', unit: 'm³/h', value: 38.7, min: 0, max: 200, area: 'Biodigestores' },
      { id: 'fit203', tag: 'FIT-203', description: 'Flujo biogás BD3 → manifold',   signalType: 'HART', unit: 'm³/h', value: 0,    min: 0, max: 200, isFuture: true, area: 'Biodigestores' },
      { id: 'fit204', tag: 'FIT-204', description: 'Flujo biogás → TEA',            signalType: 'HART', unit: 'm³/h', value: 22.1, min: 0, max: 150, area: 'TEA' },
      { id: 'fit205', tag: 'FIT-205', description: 'Flujo biogás → fábrica',        signalType: 'HART', unit: 'm³/h', value: 18.6, min: 0, max: 150, area: 'Fábrica' },
      { id: 'fit206', tag: 'FIT-206', description: 'Flujo inyección aire RAFAC 1',  signalType: 'HART', unit: 'm³/h', value: 5.2,  min: 0, max: 30,  area: 'RAFAC 1' },
      { id: 'fit207', tag: 'FIT-207', description: 'Flujo inyección aire RAFAC 2',  signalType: 'HART', unit: 'm³/h', value: 4.9,  min: 0, max: 30,  area: 'RAFAC 2' },
      { id: 'fit208', tag: 'FIT-208', description: 'Flujo inyección aire RAFAC 3',  signalType: 'HART', unit: 'm³/h', value: 0,    min: 0, max: 30,  isFuture: true, area: 'RAFAC 3' },
    ],
  },
  {
    id: 'pit',
    title: 'PRESIÓN H2S / BIOGÁS / RAFAC',
    subtitle: 'PIT-201..213 · AI 4-20mA · Manométrico',
    icon: '◐',
    accentColor: '#38BDF8',
    instruments: [
      { id: 'pit201', tag: 'PIT-201', description: 'Presión carpa RAFAC 1',     signalType: 'AI', unit: 'kPa', value: 1.8,  min: 0, max: 10, area: 'RAFAC 1' },
      { id: 'pit202', tag: 'PIT-202', description: 'Presión carpa RAFAC 2',     signalType: 'AI', unit: 'kPa', value: 1.6,  min: 0, max: 10, area: 'RAFAC 2' },
      { id: 'pit203', tag: 'PIT-203', description: 'Presión carpa RAFAC 3',     signalType: 'AI', unit: 'kPa', value: 0,    min: 0, max: 10, isFuture: true, area: 'RAFAC 3' },
      { id: 'pit204', tag: 'PIT-204', description: 'Presión H2S L1 — pto. 1',  signalType: 'AI', unit: 'kPa', value: 0.24, min: 0, max: 5,  area: 'H2S L1' },
      { id: 'pit205', tag: 'PIT-205', description: 'Presión H2S L1 — pto. 2',  signalType: 'AI', unit: 'kPa', value: 0.31, min: 0, max: 5,  area: 'H2S L1' },
      { id: 'pit206', tag: 'PIT-206', description: 'Presión H2S L1 — pto. 3',  signalType: 'AI', unit: 'kPa', value: 0.18, min: 0, max: 5,  area: 'H2S L1' },
      { id: 'pit207', tag: 'PIT-207', description: 'Presión H2S L1 — pto. 4',  signalType: 'AI', unit: 'kPa', value: 0.42, min: 0, max: 5,  area: 'H2S L1' },
      { id: 'pit208', tag: 'PIT-208', description: 'Presión H2S L2 — pto. 1',  signalType: 'AI', unit: 'kPa', value: 0.28, min: 0, max: 5,  area: 'H2S L2' },
      { id: 'pit209', tag: 'PIT-209', description: 'Presión H2S L2 — pto. 2',  signalType: 'AI', unit: 'kPa', value: 0.35, min: 0, max: 5,  area: 'H2S L2' },
      { id: 'pit210', tag: 'PIT-210', description: 'Presión H2S L2 — pto. 3',  signalType: 'AI', unit: 'kPa', value: 0.22, min: 0, max: 5,  area: 'H2S L2' },
      { id: 'pit211', tag: 'PIT-211', description: 'Presión H2S L2 — pto. 4',  signalType: 'AI', unit: 'kPa', value: 0.47, min: 0, max: 5,  area: 'H2S L2' },
      { id: 'pit212', tag: 'PIT-212', description: 'Presión biogás → fábrica',  signalType: 'AI', unit: 'kPa', value: 2.4,  min: 0, max: 15, area: 'Fábrica' },
      { id: 'pit213', tag: 'PIT-213', description: 'Presión biogás → TEA',      signalType: 'AI', unit: 'kPa', value: 1.1,  min: 0, max: 15, area: 'TEA' },
    ],
  },
  {
    id: 'tit',
    title: 'TEMPERATURA H2S / BIOGÁS',
    subtitle: 'TIT-201..205 · AI 4-20mA · RTD Pt100',
    icon: '◑',
    accentColor: '#F59E0B',
    instruments: [
      { id: 'tit201', tag: 'TIT-201', description: 'Temperatura H2S L1 — pto. 1',  signalType: 'AI', unit: '°C', value: 35.2, min: 0, max: 80, area: 'H2S L1' },
      { id: 'tit202', tag: 'TIT-202', description: 'Temperatura H2S L1 — pto. 2',  signalType: 'AI', unit: '°C', value: 36.8, min: 0, max: 80, area: 'H2S L1' },
      { id: 'tit203', tag: 'TIT-203', description: 'Temperatura H2S L2 — pto. 1',  signalType: 'AI', unit: '°C', value: 34.5, min: 0, max: 80, area: 'H2S L2' },
      { id: 'tit204', tag: 'TIT-204', description: 'Temperatura H2S L2 — pto. 2',  signalType: 'AI', unit: '°C', value: 37.1, min: 0, max: 80, area: 'H2S L2' },
      { id: 'tit205', tag: 'TIT-205', description: 'Temperatura biogás → fábrica', signalType: 'AI', unit: '°C', value: 28.3, min: 0, max: 80, area: 'Fábrica' },
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════════
//  PLC 1756-L73 — Válvulas actuadas
// ════════════════════════════════════════════════════════════════════════════

export const plcActuatedGroup: ActuatedGroupData = {
  id: 'actuadas',
  title: 'VÁLVULAS ACTUADAS',
  subtitle: 'VE/VL/VB1..3 · VA-1..3 · VB-45/46 · DI · AO · AI · 24 VDC',
  icon: '⊛',
  accentColor: '#A855F7',
  instruments: [
    // ── Lodos: válvulas proporcionales Splitting Box → Biodigestores ─────
    { id: 've101', tag: 'VE-101', description: 'Válvula proporcional Splitting Box → Biodigestor 1', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, area: 'Biodigestor 1' },
    { id: 've102', tag: 'VE-102', description: 'Válvula proporcional Splitting Box → Biodigestor 2', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, area: 'Biodigestor 2' },
    { id: 've103', tag: 'VE-103', description: 'Válvula proporcional Splitting Box → Biodigestor 3', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, isFuture: true, area: 'Biodigestor 3' },
    // ── Lodos: válvulas ON/OFF Biodigestores → Lodos de exceso ──────────
    { id: 'vl101', tag: 'VL-101', description: 'Válvula ON/OFF Biodigestor 1 → Lodos de exceso', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, area: 'Lodos Exceso' },
    { id: 'vl102', tag: 'VL-102', description: 'Válvula ON/OFF Biodigestor 2 → Lodos de exceso', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, area: 'Lodos Exceso' },
    { id: 'vl103', tag: 'VL-103', description: 'Válvula ON/OFF Biodigestor 3 → Lodos de exceso', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, isFuture: true, area: 'Lodos Exceso' },
    // ── Lodos: válvulas ON/OFF alivio Biodigestores ──────────────────────
    { id: 'vb1', tag: 'VB1', description: 'Válvula ON/OFF alivio Biodigestor 1', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, area: 'Biodigestor 1' },
    { id: 'vb2', tag: 'VB2', description: 'Válvula ON/OFF alivio Biodigestor 2', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, area: 'Biodigestor 2' },
    { id: 'vb3', tag: 'VB3', description: 'Válvula ON/OFF alivio Biodigestor 3', openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0, isFuture: true, area: 'Biodigestor 3' },
    // ── Biogás: válvulas actuadas aire RAFAC ─────────────────────────────
    { id: 'va1',  tag: 'VA-1',  description: 'Inyección aire RAFAC 1',  openSW: 'active',   closeSW: 'inactive', failSW: 'inactive', position: 65,  area: 'RAFAC 1' },
    { id: 'va2',  tag: 'VA-2',  description: 'Inyección aire RAFAC 2',  openSW: 'active',   closeSW: 'inactive', failSW: 'inactive', position: 70,  area: 'RAFAC 2' },
    { id: 'va3',  tag: 'VA-3',  description: 'Inyección aire RAFAC 3',  openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0,   isFuture: true, area: 'RAFAC 3' },
    { id: 'vb45', tag: 'VB-45', description: 'Válvula biogás → TEA',    openSW: 'active',   closeSW: 'inactive', failSW: 'inactive', position: 100, area: 'TEA' },
    { id: 'vb46', tag: 'VB-46', description: 'Válvula biogás → otros',  openSW: 'inactive', closeSW: 'inactive', failSW: 'inactive', position: 0,   isFuture: true, area: 'Otros' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
//  PLC 1756-L73 — Equipos 440VAC (VFD / SS via COM)
// ════════════════════════════════════════════════════════════════════════════

export const plcEquipmentGroups: EquipmentGroupData[] = [
  {
    id: 'bombas-crudo',
    title: 'BOMBAS ALIMENTACIÓN CRUDO',
    subtitle: 'B1..B4 · 440 VAC · VFD · Comm EtherNet/IP',
    icon: '◉',
    accentColor: '#6366F1',
    instruments: [
      { id: 'b1', tag: 'B1', description: 'Bomba alimentación crudo #1', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'b2', tag: 'B2', description: 'Bomba alimentación crudo #2', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'b3', tag: 'B3', description: 'Bomba alimentación crudo #3', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'b4', tag: 'B4', description: 'Bomba alimentación crudo #4', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
    ],
  },
  {
    id: 'sopladores-biogas-equipo',
    title: 'SOPLADORES BIOGÁS',
    subtitle: 'SB1..SB6 · 440 VAC · VFD · Comm EtherNet/IP',
    icon: '◈',
    accentColor: '#22D3EE',
    instruments: [
      { id: 'sb1', tag: 'SB1', description: 'Soplador de biogás #1', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'sb2', tag: 'SB2', description: 'Soplador de biogás #2', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'sb3', tag: 'SB3', description: 'Soplador de biogás #3', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'sb4', tag: 'SB4', description: 'Soplador de biogás #4', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'sb5', tag: 'SB5', description: 'Soplador de biogás #5', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'sb6', tag: 'SB6', description: 'Soplador de biogás #6', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
    ],
  },
  {
    id: 'sopladores-aire',
    title: 'SOPLADORES AIRE',
    subtitle: 'SA1..SA3 · 440 VAC · VFD · Comm EtherNet/IP',
    icon: '◎',
    accentColor: '#F97316',
    instruments: [
      { id: 'sa1', tag: 'SA1', description: 'Soplador de aire #1', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'sa2', tag: 'SA2', description: 'Soplador de aire #2', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'sa3', tag: 'SA3', description: 'Soplador de aire #3', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
    ],
  },
  {
    id: 'bombas-lavado',
    title: 'BOMBAS TORRE LAVADO',
    subtitle: 'B11..B14 · 440 VAC · SS · Filtración biogás',
    icon: '◉',
    accentColor: '#14B8A6',
    instruments: [
      { id: 'b11', tag: 'B11', description: 'Bomba 1 torre lavado #1 — filtración biogás', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'b12', tag: 'B12', description: 'Bomba 2 torre lavado #1 — filtración biogás', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'b13', tag: 'B13', description: 'Bomba 3 torre lavado #2 — filtración biogás', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
      { id: 'b14', tag: 'B14', description: 'Bomba 4 torre lavado #2 — filtración biogás', voltage: '440VAC', runStatus: 'stopped', diCount: 0, doCount: 0 },
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════════
//  Sidebar + Process Flow
// ════════════════════════════════════════════════════════════════════════════

export const sidebarItems: SidebarItem[] = [
  { id: 'overview',      label: 'Vista General',   icon: '⊞' },
  { id: 'biodigestores', label: 'Biodigestores',   icon: '⬡', groupId: 'biodigestores' },
  { id: 'sopladores',   label: 'Sopladores',      icon: '◈', groupId: 'sopladores' },
  { id: 'h2s-l1',       label: 'H2S Remoción L1', icon: '◇', groupId: 'h2s-l1' },
  { id: 'h2s-l2',       label: 'H2S Remoción L2', icon: '◇', groupId: 'h2s-l2' },
  { id: 'sc12',         label: 'SC1 · SC2',        icon: '⟐' },
  { id: 'biometano',    label: 'Biometano',        icon: '◉' },
  { id: '__sep1__',     label: '', icon: '', separator: true },
  { id: 'alarmas',      label: 'Alarmas',          icon: '⚠', badge: 0 },
  { id: 'tendencias',   label: 'Tendencias',       icon: '↗' },
  { id: 'documentos',   label: 'Documentos',       icon: '◧' },
  { id: 'reportes',     label: 'Reportes',         icon: '▤' },
  { id: '__sep2__',     label: '', icon: '', separator: true },
  { id: 'configuracion', label: 'Configuración',   icon: '⚙' },
];

export const processSteps = [
  { id: 'lodos',         label: 'LODOS / CRUDO', sub: 'FIT-101..112 · LS · VE/VL', icon: '⬢' },
  { id: 'biodigestores', label: 'BIODIGESTORES', sub: 'BD1 · BD2 · BD3',     icon: '⬡' },
  { id: 'manifold',      label: 'MANIFOLD',      sub: 'Distribución biogás',  icon: '◈' },
  { id: 'sopladores',   label: 'SOPLADORES',    sub: 'SB1..SB6',              icon: '◉' },
  { id: 'h2s',          label: 'H2S REMOCIÓN',  sub: 'L1 + L2',              icon: '◇' },
  { id: 'sc12',         label: 'SC1 · SC2',     sub: 'Secado + Frío',         icon: '⟐' },
  { id: 'biometano',    label: 'BIOMETANO',     sub: 'Gas purificado → Red',  icon: '◉' },
];
