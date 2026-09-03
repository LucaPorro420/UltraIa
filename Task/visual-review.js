const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().substring(0, 200)); });
  
  const pages = [
    { url: 'http://localhost:3000', name: '01-landing' },
    { url: 'http://localhost:3000/login', name: '02-login' },
    { url: 'http://localhost:3000/register', name: '03-register' },
  ];
  
  for (const p of pages) {
    try {
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: `C:/Users/UTEC-5695/AppData/Local/Temp/shot-${p.name}.png`, 
        fullPage: false 
      });
      console.log(`OK ${p.name}: "${await page.title()}"`);
    } catch (e) {
      console.log(`FAIL ${p.name}: ${e.message.substring(0, 100)}`);
    }
  }
  
  // Login as admin
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    const nameInput = page.locator('input[name="email"], input[type="text"]').first();
    const passInput = page.locator('input[type="password"]').first();
    
    const nameVisible = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);
    const passVisible = await passInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (nameVisible && passVisible) {
      await nameInput.fill('admin');
      await passInput.fill('admin');
      
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: 'C:/Users/UTEC-5695/AppData/Local/Temp/shot-04-dashboard.png', 
        fullPage: false 
      });
      console.log(`OK dashboard: "${await page.title()}" url=${page.url()}`);
      
      const dashPages = [
        '/studio', '/gallery', '/cloud', '/content', '/editor', 
        '/lab', '/metrics', '/herramientas', '/ebooks', '/ebooks/library'
      ];
      for (const dp of dashPages) {
        try {
          await page.goto(`http://localhost:3000${dp}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForTimeout(1500);
          const slug = dp.replace(/\//g, '-') || 'home';
          await page.screenshot({ 
            path: `C:/Users/UTEC-5695/AppData/Local/Temp/shot-05${slug}.png`, 
            fullPage: false 
          });
          console.log(`OK ${dp}`);
        } catch (e) {
          console.log(`FAIL ${dp}: ${e.message.substring(0, 60)}`);
        }
      }
    } else {
      console.log('FAIL login: form inputs not found');
      await page.screenshot({ path: 'C:/Users/UTEC-5695/AppData/Local/Temp/shot-login-debug.png' });
    }
  } catch (e) {
    console.log(`FAIL login flow: ${e.message.substring(0, 120)}`);
  }
  
  if (consoleErrors.length > 0) {
    console.log('\nConsole errors found:');
    consoleErrors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
  } else {
    console.log('\nNo console errors.');
  }
  
  await browser.close();
  console.log('ALL DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
