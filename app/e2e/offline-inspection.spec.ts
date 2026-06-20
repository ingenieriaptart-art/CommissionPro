import { test, expect } from "@playwright/test";

// Pre-requisito: usuario logueado y un proyecto con equipos preparados para offline.
// Ajustar BASE_URL/credenciales/IDs al entorno antes de correr.
test("captura offline → sync al reconectar", async ({ page, context }) => {
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
});
