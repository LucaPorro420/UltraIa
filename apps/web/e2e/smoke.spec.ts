import { test, expect } from '@playwright/test';

test('login real y dashboard con asistente', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder(/admin o tu email/).fill('admin');
  await page.getByPlaceholder('••••••••').fill('admin');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });

  await expect(page.getByRole('heading', { name: 'Your agents' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Asistente' })).toBeVisible();
  await expect(page.getByText('Asistente UltraIa')).toBeVisible();
  await expect(page.getByPlaceholder(/Escribe un mensaje/)).toBeVisible();
});

test('chat del asistente: envio y respuesta streaming', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder(/admin o tu email/).fill('admin');
  await page.getByPlaceholder('••••••••').fill('admin');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });

  const input = page.getByPlaceholder(/Escribe un mensaje/);
  await input.fill('Cuanto es 2+2? Responde solo con el numero.');
  await input.press('Enter');

  await expect(page.getByText(/4/)).toBeVisible({ timeout: 90_000 });
});

test('galeria: prompts cargados y drawer de generacion', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder(/admin o tu email/).fill('admin');
  await page.getByPlaceholder('••••••••').fill('admin');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });

  await page.getByRole('link', { name: /galer|gallery/i }).first().click();
  await page.waitForURL('**/gallery', { timeout: 20_000 });
  await expect(page.getByText(/prompt/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('button', { hasText: /generar/i }).first()).toBeVisible();
});

test('sin sesion: redirige a login', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForURL('**/login**', { timeout: 15_000 });
});
