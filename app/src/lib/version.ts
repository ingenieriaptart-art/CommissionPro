// Versión de app y de esquema offline, embebidas en el snapshot de inspección.
import pkg from "../../package.json";

export const APP_VERSION: string = (pkg as { version?: string }).version ?? "0.0.0";
export const SCHEMA_VERSION = 5; // versión del esquema Dexie (ver lib/db/local.ts)
