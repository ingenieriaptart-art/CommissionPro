"use client";
import { useEffect } from "react";

/**
 * Recarga la página una sola vez cuando un Service Worker NUEVO toma el control
 * (deploy nuevo). Resuelve que dispositivos de campo queden corriendo código viejo
 * cacheado: el SW usa skipWaiting+clientsClaim, así que al detectar la versión nueva
 * activa y dispara `controllerchange`; aquí lo escuchamos y refrescamos a código nuevo.
 *
 * Guardas:
 * - Solo si YA había un SW controlando (evita recargar en la primera instalación,
 *   que también dispara controllerchange por clientsClaim).
 * - Una sola recarga por carga de página + ventana mínima por sessionStorage (anti-bucle).
 * - Sin pérdida de datos: el formulario persiste cada cambio en IndexedDB y restaura
 *   al recargar (sección activa, respuestas, fotos).
 */
export function SwUpdateReloader() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Sin controlador = primera instalación → no recargar.
    if (!navigator.serviceWorker.controller) return;

    let reloaded = false;
    const onChange = () => {
      if (reloaded) return;
      try {
        const last = Number(sessionStorage.getItem("sw-reload-ts") || 0);
        if (Date.now() - last < 10_000) return; // anti-bucle
        sessionStorage.setItem("sw-reload-ts", String(Date.now()));
      } catch {
        // sessionStorage no disponible — seguir igual
      }
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  return null;
}
