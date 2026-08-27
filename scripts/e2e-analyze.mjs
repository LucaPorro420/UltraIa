#!/usr/bin/env node
// e2e-analyze.mjs — UltraIa advanced E2E analyzer (Antigravity-style, "listo para usar").
// Abre una app (URL local :3000 o desplegada) en navegador headless y reporta errores de
// consola, título, DOM y captura. Fallback claro si no hay navegador/Playwright instalado.
// Uso: node scripts/e2e-analyze.mjs --url http://localhost:3000 --out .ultraia/e2e
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const url = getArg('--url', 'http://localhost:3000');
const out = getArg('--out', '.ultraia/e2e');
const waitMs = Number(getArg('--wait', '1500'));

async function main() {
  let pw = null;
  try {
    pw = await import('playwright');
  } catch {
    try {
      pw = await import('@playwright/test');
    } catch {
      pw = null;
    }
  }
  if (!pw || !pw.chromium) {
    console.error('[e2e-analyze] Playwright no está instalado.');
    console.error('[e2e-analyze] Instala con: npm i -D playwright && npx playwright install chromium');
    console.error('[e2e-analyze] O usa el MCP de Playwright ya configurado en .mcp.json.');
    console.error('[e2e-analyze] Alternativa: Task/browser-e2e.mjs (iter-99) o el skill ultraia-e2e.');
    process.exit(2);
  }
  const fs = await import('node:fs');
  fs.mkdirSync(out, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(waitMs);
  const title = await page.title();
  const report = { url, title, consoleErrors: errors, capturedAt: new Date().toISOString() };
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `${out}/screenshot.png`, fullPage: false });
  await browser.close();
  console.log(`[e2e-analyze] OK: ${url} — title="${title}", consoleErrors=${errors.length}`);
  console.log(`[e2e-analyze] report -> ${out}/report.json, screenshot -> ${out}/screenshot.png`);
}

main().catch((e) => {
  console.error('[e2e-analyze] ERROR', e);
  process.exit(1);
});
