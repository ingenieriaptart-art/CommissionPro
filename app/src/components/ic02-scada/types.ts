// ── RTU 5094 — Sensores digitales posición válvulas ──────────────────────────

export type StatusDot = 'active' | 'inactive';

export interface VBInstrument {
  id: string;
  tag: string;
  scTag: string;
  soTag: string;
  description: string;
  scStatus: StatusDot;
  soStatus: StatusDot;
  isFuture?: boolean;
  area: string;
}

export interface InstrumentGroupData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  instruments: VBInstrument[];
}

// ── RTU 5094 — Equipos 440VAC ─────────────────────────────────────────────────

export interface EquipmentInstr {
  id: string;
  tag: string;
  description: string;
  voltage: string;
  runStatus: 'running' | 'stopped' | 'fault';
  diCount: number;
  doCount: number;
}

export interface EquipmentGroupData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  instruments: EquipmentInstr[];
}

// ── PLC 1756-L73 — Analógicos (FIT / PIT / TIT) ──────────────────────────────

export interface AnalogInstr {
  id: string;
  tag: string;
  description: string;
  signalType: 'HART' | 'AI';
  unit: string;
  value: number;
  min: number;
  max: number;
  isFuture?: boolean;
  area: string;
}

export interface AnalogGroupData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  instruments: AnalogInstr[];
}

// ── PLC 1756-L73 — Válvulas actuadas (VA / VB-45/46) ─────────────────────────

export interface ActuatedInstr {
  id: string;
  tag: string;
  description: string;
  openSW: StatusDot;
  closeSW: StatusDot;
  failSW: StatusDot;
  position: number; // 0–100 %
  isFuture?: boolean;
  area: string;
}

export interface ActuatedGroupData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  instruments: ActuatedInstr[];
}

// ── Sidebar / nav ─────────────────────────────────────────────────────────────

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  groupId?: string;
  badge?: number;
  separator?: boolean;
}
