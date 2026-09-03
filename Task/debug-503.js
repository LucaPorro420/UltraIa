const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const failedRequests = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });
  
  // Login first
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  const nameInput = page.locator('input[name="email"], input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  
  if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nameInput.fill('admin');
    await passInput.fill('admin');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5000);
  }
  
  // Visit key pages and capture failures
  const pages = ['/', '/dashboard', '/studio', '/gallery', '/cloud', '/content', '/editor', '/lab', '/metrics', '/herramientas'];
  
  for (const p of pages) {
    failedRequests.length = 0;
    try {
      await page.goto(`http://localhost:3000${p}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      
      if (failedRequests.length > 0) {
        console.log(`\n=== ${p} ===`);
        for (const r of failedRequests) {
          // Shorten URL for readability
          const short = r.url.replace('http://localhost:3000', '');
          console.log(`  ${r.status} ${r.statusText} ${short}`);
        }
      }
    } catch (e) {
      console.log(`\n=== ${p} === NAV ERROR: ${e.message.substring(0, 80)}`);
    }
  }
  
  await browser.close();
  console.log('\nDONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
