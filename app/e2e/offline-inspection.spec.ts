import { test, expect } from "@playwright/test";

// Pre-requisito: usuario logueado (storageState) y un proyecto con equipos
// preparados para offline. Ajustar PROJECT_ID/EQUIPMENT_ID/TEMPLATE_ID y el
// storageState al entorno antes de correr. Debe correr contra el BUILD de
// producción (npm run build && npm start) para que el service worker esté activo.
test("captura offline → sync al reconectar", async ({ page, context }) => {
  // Capturar errores de consola para verificar que NO ocurre evidences 400.
  const consoleErrors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.goto("/");                       // login asumido vía storageState
  // 1. Preparar offline (online)
  await page.goto("/projects/PROJECT_ID/settings");
  await page.getByRole("button", { name: /Descargar para offline/i }).click();
  await expect(page.getByText(/plantillas cacheadas/i)).toBeVisible({ timeout: 30000 });

  // 2. Ir offline
  await context.setOffline(true);

  // 3. Abrir inspección de un equipo preparado (ruta servida por el SW offline)
  await page.goto("/equipment/EQUIPMENT_ID/inspection/TEMPLATE_ID");
  await expect(page.getByText(/Datos Generales|Check List|Verificación/i).first()).toBeVisible();
  // (rellenar mínimos según la plantilla hasta habilitar "Revisar y Cerrar")

  // 3b. El resumen es INLINE: "Revisar y Cerrar" NO navega a /summary.
  const urlBefore = page.url();
  await page.getByRole("button", { name: /Revisar y Cerrar/i }).click();
  await expect(page).toHaveURL(urlBefore); // misma ruta, sin /summary
  await expect(page.getByText(/Resumen de Inspección/i)).toBeVisible();

  // 3c. Guardar (local-first; queda en cola offline)
  await page.getByRole("button", { name: /Guardar.*Inspección/i }).first().click();

  // 4. Badge muestra pendiente
  await expect(page.getByText(/pendiente/i)).toBeVisible();

  // 5. Reconectar → auto-sync
  await context.setOffline(false);
  await expect(page.getByText(/Sincronizado/i)).toBeVisible({ timeout: 30000 });

  // 6. El ciclo de sync NO debe disparar evidences 400 (regresión migración 0048).
  expect(consoleErrors.join("\n")).not.toMatch(/evidences.*400|column evidences\.updated_at/i);
});
