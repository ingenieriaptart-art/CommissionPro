/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Normaliza la clave de caché al pathname (ignora ?returnTo=… y el origen) para
// que el warming por ruta canónica (lib/sync/prefetch.ts) coincida con la
// navegación real, que lleva query variable.
const pathnameKey = {
  cacheKeyWillBeUsed: async ({ request }: { request: Request }) =>
    new URL(request.url).pathname,
};

// Caching dedicado para las rutas de inspección: control total del cacheName y
// de la clave, de modo que una inspección NUNCA visitada cargue offline si fue
// warmeada al "Preparar para offline". Va ANTES de defaultCache.
const inspectionPages: RuntimeCaching[] = [
  // Documento HTML (carga dura / address bar / page.goto)
  {
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin && request.mode === "navigate" && url.pathname.includes("/inspection/"),
    handler: new NetworkFirst({
      cacheName: "inspection-pages",
      networkTimeoutSeconds: 3,
      plugins: [pathnameKey, new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  // Payload RSC (navegación client-side vía next/link)
  {
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin && request.headers.get("RSC") === "1" && url.pathname.includes("/inspection/"),
    handler: new NetworkFirst({
      cacheName: "inspection-rsc",
      networkTimeoutSeconds: 3,
      plugins: [pathnameKey, new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...inspectionPages, ...defaultCache],
});

serwist.addEventListeners();
