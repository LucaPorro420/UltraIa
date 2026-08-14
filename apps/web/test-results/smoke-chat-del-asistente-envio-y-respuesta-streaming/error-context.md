# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> chat del asistente: envio y respuesta streaming
- Location: e2e\smoke.spec.ts:16:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/4/)
Expected: visible
Timeout: 90000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 90000ms
  - waiting for getByText(/4/)

```

```yaml
- complementary:
  - text: UltraIa v0.1
  - paragraph: Workspace
  - navigation:
    - link "Dashboard":
      - /url: /dashboard
    - link "Studio":
      - /url: /studio
    - link "New agent":
      - /url: /agents/new
    - link "Gallery":
      - /url: /gallery
    - link "Builder":
      - /url: /builder
    - link "Roadmap":
      - /url: /roadmap
  - paragraph: Public
  - navigation:
    - link "Explore":
      - /url: /explore
    - link "Recursos":
      - /url: /recursos
  - text: A admin
  - button "Log out"
- main:
  - heading "Your agents" [level=1]
  - paragraph: Agents UltraIa generated for you. Each one improves from feedback and evaluations.
  - link "+ New agent":
    - /url: /agents/new
  - heading "Asistente" [level=2]
  - text: chat general
  - heading "Asistente UltraIa" [level=2]
  - paragraph: General · web, imágenes, código, agentes
  - button "Nuevo chat"
  - paragraph: Cuanto es 2+2? Responde solo con el numero.
  - text: Thinking…
  - textbox "Escribe un mensaje… (Enter para enviar)"
  - button [disabled]
  - paragraph: Enter para enviar · Shift+Enter para nueva línea · Streaming con el modelo configurado
  - heading "Agent pipeline" [level=2]
  - text: plan → ship → simplify
  - paragraph: Every agent can run the full build loop. Describe a task in chat and UltraIa plans, builds, tests, reviews, ships and simplifies — each step callable as a skill.
  - paragraph: Plan
  - paragraph: Design & scope
  - paragraph: Build
  - paragraph: Implement
  - paragraph: Test
  - paragraph: QA & evals
  - paragraph: Review
  - paragraph: Critique
  - paragraph: Ship
  - paragraph: Release
  - paragraph: Simplify
  - paragraph: Refactor
  - list:
    - listitem:
      - link "Orquestador v1 Coordina los 7 agentes especialistas para resolver tareas complejas de principio a fin.":
        - /url: /agents/bp-admin-orquestador
        - heading "Orquestador" [level=2]
        - text: v1
        - paragraph: Coordina los 7 agentes especialistas para resolver tareas complejas de principio a fin.
    - listitem:
      - 'link "Publicador v1 Prepara y publica contenido en redes/blogs: formato, hashtags, imágenes y calendario."':
        - /url: /agents/bp-admin-publicador
        - heading "Publicador" [level=2]
        - text: v1
        - paragraph: "Prepara y publica contenido en redes/blogs: formato, hashtags, imágenes y calendario."
    - listitem:
      - link "Gestor v1 Planifica, coordina y descompone proyectos en tareas y asigna responsables sugeridos.":
        - /url: /agents/bp-admin-gestor
        - heading "Gestor" [level=2]
        - text: v1
        - paragraph: Planifica, coordina y descompone proyectos en tareas y asigna responsables sugeridos.
    - listitem:
      - link "Analista v1 Analiza datos, métricas o textos y entrega conclusiones y recomendaciones.":
        - /url: /agents/bp-admin-analista
        - heading "Analista" [level=2]
        - text: v1
        - paragraph: Analiza datos, métricas o textos y entrega conclusiones y recomendaciones.
    - listitem:
      - link "Diseñador v1 Genera UI (pantallas) y activos de marca coherentes usando Stitch, Pomelli e imagen.":
        - /url: /agents/bp-admin-disenador
        - heading "Diseñador" [level=2]
        - text: v1
        - paragraph: Genera UI (pantallas) y activos de marca coherentes usando Stitch, Pomelli e imagen.
    - listitem:
      - link "Guionista v1 Crea guiones para video, podcast o presentación, y puede convertirlos en storyboard visual.":
        - /url: /agents/bp-admin-guionista
        - heading "Guionista" [level=2]
        - text: v1
        - paragraph: Crea guiones para video, podcast o presentación, y puede convertirlos en storyboard visual.
    - listitem:
      - link "Redactor v1 Escribe textos claros y bien estructurados (artículos, posts, emails) a partir de un tema o borrador.":
        - /url: /agents/bp-admin-redactor
        - heading "Redactor" [level=2]
        - text: v1
        - paragraph: Escribe textos claros y bien estructurados (artículos, posts, emails) a partir de un tema o borrador.
    - listitem:
      - link "Investigador v1 Investiga cualquier tema en la web, incluyendo GitHub global y buscadores, y entrega un informe con fuentes.":
        - /url: /agents/bp-admin-investigador
        - heading "Investigador" [level=2]
        - text: v1
        - paragraph: Investiga cualquier tema en la web, incluyendo GitHub global y buscadores, y entrega un informe con fuentes.
- region "Notifications alt+T"
- alert
- button "Open Next.js Dev Tools":
  - img
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
> 27 |   await expect(page.getByText(/4/)).toBeVisible({ timeout: 90_000 });
     |                                     ^ Error: expect(locator).toBeVisible() failed
  28 | });
  29 | 
  30 | test('galeria: prompts cargados y drawer de generacion', async ({ page }) => {
  31 |   await page.goto('/login');
  32 |   await page.getByPlaceholder(/admin o tu email/).fill('admin');
  33 |   await page.getByPlaceholder('••••••••').fill('admin');
  34 |   await page.getByRole('button', { name: /log in/i }).click();
  35 |   await page.waitForURL('**/dashboard', { timeout: 20_000 });
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