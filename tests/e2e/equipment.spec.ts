import { expect, test, type Page } from "@playwright/test";

// Synthetic users from supabase/seed.sql (local only).
const PASSWORD = "Password123!";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("admin creates, edits, searches and deactivates equipment", async ({
  page,
}) => {
  const code = `E2E-${Date.now()}`;
  await signIn(page, "admin@example.test");

  await page.getByRole("link", { name: "Equipos" }).click();
  await page.getByRole("link", { name: "Nuevo equipo" }).click();

  await page.getByLabel("Código interno").fill(code);
  await page.getByLabel("Marca").fill("Toyota");
  await page.getByLabel("Modelo").fill("8FGU25");
  await page.getByLabel("Horómetro (horas)").fill("1520.5");
  await page.getByRole("button", { name: "Crear equipo" }).click();

  await expect(page.getByRole("heading", { name: code })).toBeVisible();
  await expect(page.getByText("Disponible")).toBeVisible();

  // Edit the operational status.
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Estado operativo").selectOption("out_of_service");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: code })).toBeVisible();
  await expect(page.getByText("Fuera de servicio")).toBeVisible();

  // Duplicate code is rejected with a field error and keeps the input.
  await page.goto("/equipment/new");
  await page.getByLabel("Código interno").fill(code.toLowerCase());
  await page.getByLabel("Marca").fill("Yale");
  await page.getByLabel("Modelo").fill("GP050");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await expect(
    page.getByText("Ya existe un equipo con este código."),
  ).toBeVisible();
  await expect(page.getByLabel("Marca")).toHaveValue("Yale");

  // Search finds it.
  await page.goto("/equipment");
  await page.getByLabel("Buscar").fill(code);
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByRole("link", { name: code })).toBeVisible();

  // Deactivate with confirmation; it disappears from the active list.
  await page.getByRole("link", { name: code }).click();
  await page.getByRole("button", { name: "Desactivar equipo" }).click();
  await page.getByRole("button", { name: "Sí, desactivar equipo" }).click();
  await expect(page.getByText("Inactivo")).toBeVisible();

  await page.goto(`/equipment?q=${encodeURIComponent(code)}`);
  await expect(
    page.getByText("Ningún equipo coincide con los filtros."),
  ).toBeVisible();
});

test("technician can view equipment but not manage it", async ({ page }) => {
  await signIn(page, "technician@example.test");

  await page.goto("/equipment");
  await expect(page.getByRole("heading", { name: "Equipos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nuevo equipo" })).toHaveCount(0);

  await page.goto("/equipment/new");
  await expect(
    page.getByText("No tienes permiso para realizar esta acción."),
  ).toBeVisible();
});
