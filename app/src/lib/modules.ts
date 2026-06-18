import {
  LayoutDashboard, Wrench, Map, Activity, CheckSquare, AlertTriangle,
  Printer, FileText, Cpu, ClipboardList, Settings, Users,
  type LucideIcon,
} from "lucide-react";

/** Niveles de acceso por módulo (ordenados de menor a mayor). */
export type Access = "none" | "read" | "edit" | "full";

export const ACCESS_LEVELS: { value: Access; label: string; short: string }[] = [
  { value: "none", label: "Sin acceso",   short: "—" },
  { value: "read", label: "Solo lectura", short: "Lectura" },
  { value: "edit", label: "Edición",      short: "Edición" },
  { value: "full", label: "Control total", short: "Total" },
];

/** Mapa módulo→acceso, tal como se guarda en project_members.module_access. */
export type ModuleAccessMap = Record<string, Access>;

export interface ModuleDef {
  /** Coincide con el `segment` del ProjectSidebar y con la key de module_access. */
  key: string;
  label: string;
  icon: LucideIcon;
  /** Solo el admin puede operarlo; a no-admins se les limita a 'read' como máximo. */
  adminOnly: boolean;
}

/** Catálogo único de módulos del proyecto. El orden define el de la UI. */
export const MODULES: ModuleDef[] = [
  { key: "dashboard",   label: "Dashboard",          icon: LayoutDashboard, adminOnly: false },
  { key: "equipment",   label: "Equipos",            icon: Wrench,          adminOnly: false },
  { key: "plant-map",   label: "Mapa de Planta",     icon: Map,             adminOnly: false },
  { key: "ic02-rtu",    label: "Instrumentos IC02",  icon: Activity,        adminOnly: false },
  { key: "tests",       label: "Pruebas",            icon: CheckSquare,     adminOnly: false },
  { key: "punch",       label: "Punch List",         icon: AlertTriangle,   adminOnly: false },
  { key: "reports",     label: "Informes",           icon: Printer,         adminOnly: false },
  { key: "documents",   label: "Documentos",         icon: FileText,        adminOnly: false },
  { key: "engineering", label: "Ing. Digital",       icon: Cpu,             adminOnly: false },
  { key: "templates",   label: "Templates",          icon: ClipboardList,   adminOnly: true  },
  { key: "settings",    label: "Configuración",      icon: Settings,        adminOnly: true  },
  { key: "users",       label: "Usuarios",           icon: Users,           adminOnly: true  },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);
export const ADMIN_ONLY_KEYS = new Set(MODULES.filter((m) => m.adminOnly).map((m) => m.key));

export function isValidAccess(v: unknown): v is Access {
  return v === "none" || v === "read" || v === "edit" || v === "full";
}

/** Devuelve el acceso de un mapa para una key; 'none' si no está definida. */
export function accessOf(map: ModuleAccessMap | undefined | null, key: string): Access {
  const v = map?.[key];
  return isValidAccess(v) ? v : "none";
}
