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

function kpi(page: Page, label: string) {
  return page.locator("dl").filter({ has: page.getByText(label, { exact: true }) });
}

test("dashboard KPIs reflect stored work orders and filters", async ({ page }) => {
  const code = `E2E-KPI-${Date.now()}`;
  const title = `Fuga de aceite ${code}`;

  await signIn(page, "admin@example.test");
  await expect(page.getByRole("heading", { name: "Flota" })).toBeVisible();
  await expect(kpi(page, "Equipos activos")).toBeVisible();

  // Equipment with one overdue order and recorded costs.
  await page.goto("/equipment/new");
  await page.getByLabel("Código interno").fill(code);
  await page.getByLabel("Marca").fill("Toyota");
  await page.getByLabel("Modelo").fill("8FGU25");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await expect(page.getByRole("heading", { name: code })).toBeVisible();

  await page.getByRole("link", { name: "Reportar falla" }).click();
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Fecha objetivo").fill("2020-01-01");
  await page.getByRole("button", { name: "Crear orden" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Mano de obra").fill("100");
  await page.getByLabel("Refacciones").fill("50.50");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("$150.50").first()).toBeVisible();

  // Filter the dashboard by this equipment.
  await page.goto("/dashboard");
  await page.getByLabel("Equipo").selectOption({ label: `${code} · Toyota 8FGU25` });
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/equipment=/);

  await expect(kpi(page, "Órdenes")).toContainText("1");
  await expect(kpi(page, "Abiertas")).toContainText("1");
  await expect(kpi(page, "Vencidas")).toContainText("1");
  await expect(kpi(page, "Cerradas")).toContainText("0");
  await expect(page.getByText("$150.50", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^OT-\d{4}-\d{5}$/ })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();

  // A filter with no matches shows the empty state.
  await page.getByLabel("Estado").selectOption({ label: "Resuelta" });
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByText("Ninguna orden de trabajo coincide con los filtros.")).toBeVisible();
});
