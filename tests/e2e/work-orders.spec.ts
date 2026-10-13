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

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function changeStatus(page: Page, label: string, note?: string) {
  await page.getByLabel("Nuevo estado").selectOption({ label });
  if (note) await page.getByLabel("Nota (opcional)").fill(note);
  await page
    .getByRole("button", { name: label === "Cancelada" ? "Cancelar orden" : "Cambiar estado" })
    .click();
}

test("admin reports, assigns; technician works and resolves the order", async ({ page }) => {
  const code = `E2E-WO-${Date.now()}`;
  const title = `No levanta carga ${code}`;

  // Admin creates equipment and reports a failure from its detail page.
  await signIn(page, "admin@example.test");
  await page.goto("/equipment/new");
  await page.getByLabel("Código interno").fill(code);
  await page.getByLabel("Marca").fill("Toyota");
  await page.getByLabel("Modelo").fill("8FGU25");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await expect(page.getByRole("heading", { name: code })).toBeVisible();

  await page.getByRole("link", { name: "Reportar falla" }).click();
  await expect(page.getByLabel("Equipo")).toHaveValue(/.+/);

  // Server-side validation keeps the input on error.
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Prioridad").selectOption({ label: "Alta" });
  await page.getByLabel("Fecha y hora de reporte").fill("2099-01-01T10:00");
  await page.getByRole("button", { name: "Crear orden" }).click();
  await expect(page.getByText("La fecha de reporte no puede estar en el futuro.")).toBeVisible();
  await expect(page.getByLabel("Título")).toHaveValue(title);

  await page.getByLabel("Fecha y hora de reporte").fill("");
  await page.getByLabel("Técnico asignado").selectOption({ label: "Técnico de Prueba" });
  await page.getByRole("button", { name: "Crear orden" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(/^OT-\d{4}-\d{5}$/)).toBeVisible();
  await expect(page.getByText("Asignada", { exact: true }).first()).toBeVisible();
  const orderUrl = page.url();
  await signOut(page);

  // Technician works the assigned order.
  await signIn(page, "technician@example.test");
  await page.goto(orderUrl);
  await changeStatus(page, "En progreso", "Diagnóstico inicial");
  await expect(page.getByText("Asignada → En progreso")).toBeVisible();
  await expect(page.getByText("Diagnóstico inicial")).toBeVisible();

  await changeStatus(page, "Esperando refacciones", "Bomba hidráulica pedida");
  await expect(page.getByText("En progreso → Esperando refacciones")).toBeVisible();

  // Record costs; negative values are rejected.
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByLabel("Título")).toHaveCount(0); // admin-only field hidden
  await page.getByLabel("Mano de obra").fill("-5");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("El costo no puede ser negativo.")).toBeVisible();
  await page.getByLabel("Mano de obra").fill("1500");
  await page.getByLabel("Refacciones").fill("2349.99");
  await page.getByLabel("Notas de resolución").fill("Se reemplazó la bomba hidráulica.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("$3,849.99")).toBeVisible();

  await changeStatus(page, "En progreso");
  await changeStatus(page, "Resuelta");
  await expect(page.getByText("En progreso → Resuelta")).toBeVisible();
  await expect(page.getByText("Cambiar estado")).toHaveCount(0); // terminal

  // It no longer appears among open orders.
  await page.goto(`/work-orders?q=${encodeURIComponent(code)}`);
  await expect(page.getByText("Ninguna orden coincide con los filtros.")).toBeVisible();
  await page.goto(`/work-orders?status=all&q=${encodeURIComponent(code)}`);
  await expect(page.getByText(title)).toBeVisible();
});

test("technician cannot update an order assigned to nobody", async ({ page }) => {
  const title = `Ruido en mástil ${Date.now()}`;
  await signIn(page, "technician@example.test");

  await page.goto("/work-orders/new");
  await expect(page.getByLabel("Técnico asignado")).toHaveCount(0);
  await page.getByLabel("Equipo").selectOption({ index: 1 });
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Crear orden" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await expect(
    page.getByText("Solo el técnico asignado o un administrador pueden actualizar esta orden."),
  ).toBeVisible();

  await page.goto(`${page.url()}/edit`);
  await expect(page.getByText("No tienes permiso para realizar esta acción.")).toBeVisible();
});
