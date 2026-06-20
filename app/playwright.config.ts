import { defineConfig, devices } from "@playwright/test";

/**
 * Config del e2e offline. IMPORTANTE: el service worker (sw.ts) solo se genera
 * y activa en el BUILD de producción (en dev está deshabilitado), por eso el
 * webServer corre `npm run build && npm start` y NO `next dev`.
 *
 * Autenticación: el spec asume una sesión ya iniciada vía storageState. Generar
 * uno con `npx playwright codegen` (o un setup project) y apuntarlo aquí, o
 * exportar PW_STORAGE_STATE. Sin sesión válida + IDs reales el spec no corre.
 */
const PORT = process.env.PW_PORT ?? "3000";
const baseURL = process.env.PW_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    storageState: process.env.PW_STORAGE_STATE || undefined,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
