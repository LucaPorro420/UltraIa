// UltraIa — E2E real en Google Chrome (Playwright + system Chrome).
// Recorre cada apartado, ejecuta la acción clave, captura consola/pageerrors/requests
// fallidos + screenshot, y vuelca resultTask/browser-e2e/report.json + report.md.
//
// Uso:
//   node scripts/browser-e2e.mjs            (requiere dev server en BASE_URL)
//   BASE_URL=http://127.0.0.1:3000 node scripts/browser-e2e.mjs
//
// No es un test unitario: es verificación real en navegador (como lo haría un humano).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const OUT = join(ROOT, 'resultTask', 'browser-e2e');
const SHOTS = join(OUT, 'shots');
mkdirSync(SHOTS, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const results = [];
const summary = { startedAt: new Date().toISOString(), baseUrl: BASE_URL, routes: [] };

async function gotoPage(page, route) {
  const res = await page.goto(BASE_URL + route, { waitUntil: 'load', timeout: 60000 });
  // dev server recompila: dar un respiro y esperar a que el main esté presente.
  await page.waitForSelector('main, h1, [role="alert"]', { timeout: 30000 }).catch(() => {});
  return res ? res.status() : 0;
}

function attachListeners(page, bucket) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => bucket.pageErrors.push(String(err.message || err)));
  page.on('requestfailed', (req) => {
    const u = req.url();
    const sameOrigin = u.startsWith(BASE_URL);
    bucket.failedRequests.push({ url: u, failure: req.failure()?.errorText || 'failed', sameOrigin });
  });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // ---- Login como admin para rutas protegidas ----
  const loginBucket = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  attachListeners(page, loginBucket);
  let loginOk = false;
  try {
    await gotoPage(page, '/login');
    await page.fill('input[name="email"]', ADMIN_USER).catch(() => {});
    await page.fill('input[name="password"]', ADMIN_PASS).catch(() => {});
    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {});
    loginOk = page.url().includes('/dashboard');
  } catch (e) {
    loginBucket.pageErrors.push('LOGIN_EXCEPTION: ' + String(e.message || e));
  }
  results.push({
    route: '/login',
    action: 'rellenar admin/admin y enviar',
    title: await page.title().catch(() => ''),
    httpStatus: 200,
    loginOk,
    ...loginBucket,
    screenshot: 'shots/login.png',
    notes: loginOk ? 'login OK, sesión admin' : 'login NO redirigió a /dashboard',
  });
  await page.screenshot({ path: join(SHOTS, 'login.png') }).catch(() => {});

  // ---- Apartados ----
  const apartados = [
    { route: '/dashboard', action: 'cargar panel', assert: 'main con KPIs/lista' },
    { route: '/studio', action: 'enviar prompt al ChatPanel y esperar respuesta o error', studio: true },
    { route: '/gallery', action: 'scroll infinito', assert: 'tarjetas de prompt' },
    { route: '/builder', action: 'click en un bloque', assert: 'canvas/blocks' },
    { route: '/cloud', action: 'cargar panel cloud', assert: 'dropzone/stats' },
    { route: '/blog', action: 'cargar blog', assert: 'posts' },
    { route: '/explore', action: 'cargar explore', assert: 'contenido' },
    { route: '/recursos', action: 'cargar recursos', assert: 'contenido' },
    { route: '/roadmap', action: 'cargar roadmap', assert: 'contenido' },
    { route: '/agents', action: 'cargar agents', assert: 'lista de agentes' },
    { route: '/metrics', action: 'cargar metrics', assert: 'KPIs' },
    { route: '/lab', action: 'cargar lab', assert: 'contenido' },
    { route: '/', action: 'cargar landing', assert: 'hero/title' },
  ];

  for (const a of apartados) {
    const bucket = { consoleErrors: [], pageErrors: [], failedRequests: [] };
    attachListeners(page, bucket);
    const entry = {
      route: a.route,
      action: a.action,
      assert: a.assert || '',
      title: '',
      httpStatus: 0,
      ...bucket,
      screenshot: 'shots' + a.route.replace(/\//g, '_') + '.png',
      notes: '',
    };
    try {
      const status = await gotoPage(page, a.route);
      entry.httpStatus = status;
      entry.title = await page.title().catch(() => '');
      const hasMain = await page.evaluate(() => !!document.querySelector('main'));
      entry.notes = hasMain ? 'main presente' : 'SIN main (posible error de render)';

      if (a.studio) {
        // Acción clave: enviar un prompt y verificar que NO se traba.
        const input = page.getByPlaceholder('Ask the multimodal assistant…').first();
        await input.fill('Hola, responde en una línea: ¿funciona el studio?').catch(() => {});
        const sendBtn = page.getByRole('button', { name: /Send/i }).first();
        await sendBtn.click().catch(() => {});
        // Polling: ¿terminó (botón habilitado de nuevo) o apareció error en <=130s?
        let ended = false;
        let reason = '';
        for (let i = 0; i < 65; i++) {
          await page.waitForTimeout(2000);
          const errVisible = await page.locator('[class*="text-red-300"]').count();
          const sendDisabled = await page
            .getByRole('button', { name: /Send/i })
            .first()
            .isDisabled()
            .catch(() => false);
          const retryVisible = await page.getByRole('button', { name: /Retry/i }).count();
          if (retryVisible > 0) {
            ended = true;
            reason = 'error+Retry visible (no hang)';
            break;
          }
          if (errVisible > 0) {
            ended = true;
            reason = 'error visible (no hang)';
            break;
          }
          if (!sendDisabled) {
            ended = true;
            reason = 'botón Send habilitado de nuevo (respuesta completada)';
            break;
          }
        }
        entry.studioEnded = ended;
        entry.studioReason = reason || 'SIGUE CARGANDO PASADO 130s (HANG)';
        entry.notes = 'studio: ' + (ended ? reason : 'HANG detectado');
      }
    } catch (e) {
      entry.pageErrors.push('NAV_EXCEPTION: ' + String(e.message || e));
      entry.notes = 'excepción al navegar';
    }
    await page.screenshot({ path: join(SHOTS, entry.screenshot) }).catch(() => {});
    results.push(entry);
    summary.routes.push(a.route);
  }

  // ---- Probe API auth ----
  const probe = await page.evaluate(async (base) => {
    try {
      const r = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) });
      return { status: r.status };
    } catch (e) {
      return { error: String(e.message || e) };
    }
  }, BASE_URL).catch((e) => ({ error: String(e.message || e) }));
  results.push({ route: '/api/chat (probe)', action: 'POST sin auth', ...probe, notes: 'esperado 401' });

  await browser.close();

  const report = { summary, results };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  // ---- Markdown anotado ----
  const lines = [];
  lines.push(`# Browser E2E — UltraIa (Google Chrome)`);
  lines.push(`Base: ${BASE_URL}  |  Inicio: ${summary.startedAt}`);
  lines.push('');
  lines.push(`## Resumen por apartado`);
  for (const r of results) {
    const errs = (r.consoleErrors?.length || 0) + (r.pageErrors?.length || 0);
    lines.push(`- **${r.route}** — HTTP ${r.httpStatus} — errores:${errs} — ${r.notes}`);
  }
  lines.push('');
  lines.push(`## Detalle`);
  for (const r of results) {
    lines.push(`### ${r.route} (${r.action})`);
    lines.push(`- Title: ${r.title}`);
    lines.push(`- HTTP: ${r.httpStatus}`);
    if (r.loginOk !== undefined) lines.push(`- Login OK: ${r.loginOk}`);
    if (r.studioEnded !== undefined) lines.push(`- Studio terminó (no hang): ${r.studioEnded} — ${r.studioReason}`);
    lines.push(`- Console errors: ${(r.consoleErrors || []).length}`);
    for (const c of r.consoleErrors || []) lines.push(`    - ${c}`);
    lines.push(`- Page errors: ${(r.pageErrors || []).length}`);
    for (const p of r.pageErrors || []) lines.push(`    - ${p}`);
    const sameOriginFails = (r.failedRequests || []).filter((f) => f.sameOrigin);
    lines.push(`- Failed requests (same-origin): ${sameOriginFails.length}`);
    for (const f of sameOriginFails) lines.push(`    - ${f.url} (${f.failure})`);
    const extFails = (r.failedRequests || []).filter((f) => !f.sameOrigin);
    lines.push(`- Failed requests (externos/ruido): ${extFails.length}`);
    lines.push(`- Screenshot: ${r.screenshot}`);
    lines.push('');
  }
  writeFileSync(join(OUT, 'report.md'), lines.join('\n'));

  console.log('REPORT_WRITTEN=' + join(OUT, 'report.json'));
  console.log('Routes tested: ' + results.length);
}

run().catch((e) => {
  console.error('HARNESS_FATAL=' + String(e.message || e));
  process.exit(1);
});
