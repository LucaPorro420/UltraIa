# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> galeria: prompts cargados y drawer de generacion
- Location: e2e\smoke.spec.ts:30:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
============================================================
```

# Test source

```ts
  1  | ﻿import { test, expect } from '@playwright/test';
  2  | 
  3  | test('login real y dashboard con asistente', async ({ page }) => {
  4  |   await page.goto('/login');
  5  |   await page.getByPlaceholder(/admin o tu email/).fill('admin');
  6  |   await page.getByPlaceholder('••••••••').fill('admin');
  7  |   await page.getByRole('button', { name: /log in/i }).click();
  8  |   await page.waitForURL('**/dashboard', { timeout: 20_000 });
  9  | 
  10 |   await expect(page.getByRole('heading', { name: 'Your agents' })).toBeVisible();
  11 |   await expect(page.getByRole('heading', { name: 'Asistente' })).toBeVisible();
  12 |   await expect(page.getByText('Asistente UltraIa')).toBeVisible();
  13 |   await expect(page.getByPlaceholder(/Escribe un mensaje/)).toBeVisible();
  14 | });
  15 | 
  16 | test('chat del asistente: envio y respuesta streaming', async ({ page }) => {
  17 |   await page.goto('/login');
  18 |   await page.getByPlaceholder(/admin o tu email/).fill('admin');
  19 |   await page.getByPlaceholder('••••••••').fill('admin');
  20 |   await page.getByRole('button', { name: /log in/i }).click();
  21 |   await page.waitForURL('**/dashboard', { timeout: 20_000 });
  22 | 
  23 |   const input = page.getByPlaceholder(/Escribe un mensaje/);
  24 |   await input.fill('Cuanto es 2+2? Responde solo con el numero.');
  25 |   await input.press('Enter');
  26 | 
  27 |   await expect(page.getByText(/4/)).toBeVisible({ timeout: 90_000 });
  28 | });
  29 | 
  30 | test('galeria: prompts cargados y drawer de generacion', async ({ page }) => {
  31 |   await page.goto('/login');
  32 |   await page.getByPlaceholder(/admin o tu email/).fill('admin');
  33 |   await page.getByPlaceholder('••••••••').fill('admin');
  34 |   await page.getByRole('button', { name: /log in/i }).click();
> 35 |   await page.waitForURL('**/dashboard', { timeout: 20_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  36 | 
  37 |   await page.getByRole('link', { name: /galer|gallery/i }).first().click();
  38 |   await page.waitForURL('**/gallery', { timeout: 20_000 });
  39 |   await expect(page.getByText(/prompt/i).first()).toBeVisible({ timeout: 30_000 });
  40 |   await expect(page.locator('button', { hasText: /generar/i }).first()).toBeVisible();
  41 | });
  42 | 
  43 | test('sin sesion: redirige a login', async ({ page }) => {
  44 |   await page.goto('/dashboard');
  45 |   await page.waitForURL('**/login**', { timeout: 15_000 });
  46 | });
  47 | 
```