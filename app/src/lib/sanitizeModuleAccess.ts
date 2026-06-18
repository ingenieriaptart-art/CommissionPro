import { MODULE_KEYS, ADMIN_ONLY_KEYS, isValidAccess, type ModuleAccessMap } from "@/lib/modules";

/**
 * Limpia un mapa de acceso por módulo recibido del cliente:
 *  - descarta claves fuera del catálogo,
 *  - descarta valores que no sean none|read|edit|full,
 *  - para usuarios NO admin, fuerza los módulos solo-admin a 'none'
 *    (no se pueden conceder edit/full vía API).
 *
 * `isAdminTarget` = true cuando el usuario destino tiene rol global admin
 * (en ese caso el acceso es irrelevante porque el admin es superusuario,
 * pero igual no recortamos su matriz).
 */
export function sanitizeModuleAccess(
  raw: unknown,
  isAdminTarget: boolean
): ModuleAccessMap {
  if (!raw || typeof raw !== "object") return {};
  const out: ModuleAccessMap = {};
  for (const key of MODULE_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (!isValidAccess(v)) continue;
    if (!isAdminTarget && ADMIN_ONLY_KEYS.has(key) && v !== "none" && v !== "read") {
      out[key] = "read"; // a no-admins, máximo lectura en módulos solo-admin
    } else {
      out[key] = v;
    }
  }
  return out;
}
