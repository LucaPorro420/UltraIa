# Plan: loop-95 — Pruebas E2E reales en Google Chrome + fix-loop de errores

## Contexto
El usuario aprobó (modo build) implementar **pruebas reales en navegador apuntando a Google Chrome**
que recorran cada apartado de UltraIa, ejecuten las acciones representativas, capturen datos
(errores de consola, pageerrors, requests fallidos, estado DOM, screenshots), los anoten en un
reporte, y corrijan los errores hallados como lo haría un humano: plan → build con gates verdes.

Entorno verificado en discovery:
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe` (también Brave).
- Playwright presente: `node_modules/playwright`, `node_modules/.bin/playwright`, `@playwright/test`.
- Rutas app `(app)`: agents, builder, cloud, dashboard, gallery, lab, metrics, roadmap, studio.
- Rutas top: `/` (landing), `/login`, `/register`, `/blog`, `/explore`, `/recursos`, `/roadmap`.
- Auth: login acepta usuario sin `@`; semilla admin/admin (admin@ultraia.local, rol ADMIN).
- El bug ya arreglado en loop-94 (studio chat 400 + stall) debe verificarse en navegador real.

## Objetivo
1. Crear un harness E2E (`scripts/browser-e2e.mjs`) que lanza Google Chrome (headless, executablePath),
   recorre cada apartado, hace la acción clave de cada uno, y vuelca un reporte estructurado
   (`resultTask/browser-e2e/report.json` + `report.md` + screenshots en `resultTask/browser-e2e/shots/`).
2. Ejecutarlo contra el dev server (`npm run dev`, :3000), logueándose como admin para rutas protegidas.
3. Anotar por apartado: status HTTP, title, consoleErrors[], pageErrors[], failedRequests[],
   screenshot, assertion (p.ej. heading/main presente, sin error boundary de React), notas.
4. Para cada error real encontrado: escribir un mini-plan (en este mismo archivo, sección "Hallazgos"),
   corregirlo en código con commit pathspec y gates (typecheck→lint→test→build) en verde, y re-ejecutar
   el apartado afectado para confirmar la corrección (como un humano: reproduce → fix → verify).

## Pasos
1. (P) Escribir este plan + lock.
2. (I) Crear `scripts/browser-e2e.mjs` (Playwright + Chrome system). Parámetros: BASE_URL, opcional
   LOGIN. Login admin/admin para obtener cookie de sesión y reusarla en rutas protegidas.
3. (I) Lista de apartados a testear con su acción:
   - `/` landing: assert hero/title, sin pageerror.
   - `/login`: rellenar usuario=admin, password=admin, submit; assert redirección a /dashboard.
   - `/dashboard`: assert KPIs/lista presente.
   - `/studio`: escribir prompt en el input del ChatPanel, click Send; esperar hasta 130s a que aparezca
     respuesta O error visible (NO debe colgarse en "pensando" infinito). Capturar estado.
   - `/gallery`: scroll infinito; assert tarjetas presentes.
   - `/builder`: assert canvas/blocks presentes; click un bloque.
   - `/cloud`: assert panel + drag&drop zone presente.
   - `/blog`: assert posts presentes.
   - `/explore`, `/recursos`, `/roadmap`, `/agents`, `/metrics`, `/lab`: assert contenido principal.
   - `/api/chat` y `/api/studio/chat` ya cubiertos vía UI; además un probe fetch 401/503.
4. (I) Arrancar dev server en background, esperar UP (poll :3000), correr el harness.
5. (V) Leer report.json/report.md; clasificar errores (real vs ruido/ambiente).
6. (I) Por cada error real: mini-plan + fix commit + gates; re-ejecutar apartado.
7. (R) Cerrar lock, reportar. NO push (requiere aprobación humana).

## Archivos a tocar
- Nuevo: `scripts/browser-e2e.mjs`, `resultTask/browser-e2e/report.json`, `report.md`, `shots/*`.
- Fixes (según hallazgos): archivos de `apps/web/src/app/...` y `components/...` que correspondan.
- No tocar archivos de la sesión concurrente (#92/#25): blueprint, reach, automation, recorder,
  DOCS_TODO, STATE.md, enlaces.txt, geom.ts WIP.

## Recursos / Presupuesto
- Tiempo: sesión actual; sin límite estricto pero cada build ~5min (matar dev server antes de build).
- Chrome headless local; sin coste de red (las herramientas keyless pueden fallar si no hay red, se anota).

## NO-hacer
- NO hacer push ni merge sin aprobación.
- NO correr `npm run build` mientras el dev server corre (rompe .next). Matar node `next` antes de build.
- NO modificar STATE.md ni la sesión concurrente.
- NO inventar errores: solo anotar lo que el navegador real reporta.

## Criterios de éxito
- Reporte generado con 1 entrada por apartado (datos reales + screenshot).
- Bugs reales reproducidos y corregidos con gates verdes; apartado re-verificado.
- Studio chat: confirmado que NO se traba (aparece respuesta o error con botón Retry en <130s).

## Tolerancias
- Requests fallidos a APIs externas keyless (pollinations/meigen) sin red = ruido, se anota no bloquea.
- Timeouts de modelo 120s tolerados; el assertion es "no hang", no "respuesta correcta".

## Riesgos
- Dev server tarda en compilar (primera petición por ruta) → polling con reintentos.
- Ollama/LM Studio puede no estar instalado → studio mostrará error (no hang); se anota como degradación esperada.
- Chrome headless puede requerir `--no-sandbox` en Windows → se pasa.

## Esfuerzo / Prioridad
- P2 (calidad + verificación real). Aprobado por el usuario 24/08 ("Si e implementa...").
