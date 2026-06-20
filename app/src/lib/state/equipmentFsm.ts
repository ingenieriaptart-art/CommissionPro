export type EquipmentState =
  | "pendiente" | "en_ejecucion" | "aprobado" | "mechanical_completion"
  | "listo_energizacion" | "listo_arranque" | "operativo" | "rechazado" | "bloqueado";

export type EquipmentEvent =
  | "INSPECTION_EXECUTED" | "INSPECTION_APPROVED" | "INSPECTION_REJECTED"
  | "PUNCH_RAISED" | "PUNCH_CLEARED" | "MC_COMPLETED" | "MC_REVOKED"
  | "RFC_GRANTED" | "RFC_REVOKED" | "RFSU_GRANTED" | "RFSU_REVOKED"
  | "COMMISSIONED" | "EQUIPMENT_REJECTED" | "EQUIPMENT_REOPENED" | "BLOCK" | "UNBLOCK";

export interface DerivedFlags {
  hasOpenPunch: boolean;
  approvalsComplete: boolean;
  everInspected: boolean;
}

export type TwinColor = "gris" | "amarillo" | "naranja" | "azul" | "verde" | "rojo";

export const TERMINAL: ReadonlySet<EquipmentState> = new Set<EquipmentState>(["operativo"]);

const ALL_EVENTS: EquipmentEvent[] = [
  "INSPECTION_EXECUTED", "INSPECTION_APPROVED", "INSPECTION_REJECTED", "PUNCH_RAISED", "PUNCH_CLEARED",
  "MC_COMPLETED", "MC_REVOKED", "RFC_GRANTED", "RFC_REVOKED", "RFSU_GRANTED", "RFSU_REVOKED",
  "COMMISSIONED", "EQUIPMENT_REJECTED", "EQUIPMENT_REOPENED", "BLOCK", "UNBLOCK",
];

type Rule = { from: EquipmentState; event: EquipmentEvent; to: EquipmentState; guard?: (f: DerivedFlags) => boolean };
const RULES: Rule[] = [
  { from: "pendiente",    event: "INSPECTION_EXECUTED", to: "en_ejecucion" },
  { from: "pendiente",    event: "EQUIPMENT_REJECTED",  to: "rechazado" },
  { from: "en_ejecucion", event: "INSPECTION_APPROVED", to: "aprobado", guard: (f) => f.approvalsComplete },
  { from: "en_ejecucion", event: "EQUIPMENT_REJECTED",  to: "rechazado" },
  { from: "aprobado",     event: "MC_COMPLETED",        to: "mechanical_completion", guard: (f) => !f.hasOpenPunch },
  { from: "aprobado",     event: "INSPECTION_REJECTED", to: "en_ejecucion" },
  { from: "aprobado",     event: "INSPECTION_EXECUTED", to: "en_ejecucion" },
  { from: "aprobado",     event: "EQUIPMENT_REJECTED",  to: "rechazado" },
  { from: "mechanical_completion", event: "RFC_GRANTED", to: "listo_energizacion" },
  { from: "mechanical_completion", event: "MC_REVOKED",  to: "aprobado" },
  { from: "mechanical_completion", event: "EQUIPMENT_REJECTED", to: "rechazado" },
  { from: "listo_energizacion", event: "RFSU_GRANTED", to: "listo_arranque" },
  { from: "listo_energizacion", event: "RFC_REVOKED",  to: "mechanical_completion" },
  { from: "listo_arranque", event: "COMMISSIONED", to: "operativo" },
  { from: "listo_arranque", event: "RFSU_REVOKED", to: "listo_energizacion" },
  { from: "rechazado",    event: "EQUIPMENT_REOPENED", to: "en_ejecucion" },
];

/** Estado destino si la transición es válida (con guards), o null si es no-op/prohibida. */
export function nextState(state: EquipmentState, event: EquipmentEvent, flags: DerivedFlags): EquipmentState | null {
  if (TERMINAL.has(state)) return null;
  if (event === "BLOCK") return state === "bloqueado" ? null : "bloqueado";
  if (state === "bloqueado") return event === "UNBLOCK" ? (flags.everInspected ? "en_ejecucion" : "pendiente") : null;
  if (event === "PUNCH_RAISED") return state === "mechanical_completion" ? "aprobado" : null;
  if (event === "PUNCH_CLEARED") return null;
  const rule = RULES.find((r) => r.from === state && r.event === event && (r.guard ? r.guard(flags) : true));
  return rule ? rule.to : null;
}

/** Eventos que producen una transición desde el estado dado (para gating de UI). */
export function allowedEvents(state: EquipmentState, flags: DerivedFlags): EquipmentEvent[] {
  return ALL_EVENTS.filter((e) => nextState(state, e, flags) !== null);
}

/** Color del Digital Twin (estado canónico + punch abierto). */
export function equipmentColor(state: EquipmentState, hasOpenPunch: boolean): TwinColor {
  if (state === "rechazado" || state === "bloqueado") return "rojo";
  if (hasOpenPunch && (state === "en_ejecucion" || state === "aprobado")) return "naranja";
  switch (state) {
    case "pendiente": return "gris";
    case "en_ejecucion": return "amarillo";
    case "aprobado": return "azul";
    default: return "verde"; // mechanical_completion / RFC / RFSU / operativo
  }
}
