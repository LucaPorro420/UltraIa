import { chromium } from 'playwright-core';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:3000/login', { waitUntil: 'load', timeout: 60000 });
  await page.getByPlaceholder(/admin o tu email/).fill('admin');
  await page.getByPlaceholder('••••••••').fill('admin');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 90000 });
  console.log('LOGIN OK ->', page.url());

  const input = page.getByPlaceholder(/Escribe un mensaje/);
  await input.waitFor({ state: 'visible', timeout: 30000 });
  console.log('CHAT VISIBLE OK');
  await input.fill('Cuanto es 2+2? Responde solo con el numero.');
  await input.press('Enter');
  console.log('ENVIADO, esperando respuesta del modelo local (puede tardar)...');
  await page.waitForFunction(
    () => document.body.innerText.includes('Thinking') === false,
    { timeout: 300000 },
  );
  await page.waitForTimeout(3000);
  const body = await page.locator('body').innerText();
  const match = body.match(/4/);
  console.log('RESPUESTA CONTIENE 4:', !!match);
  console.log('CONSOLE ERRORS:', logs.length ? logs.slice(0, 3) : 'ninguno');
  await browser.close();
  process.exit(match ? 0 : 1);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });

