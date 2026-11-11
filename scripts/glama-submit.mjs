import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let signUpCount = 0;
page.on('response', async (response) => {
  if (response.url().includes('sign-up')) {
    signUpCount++;
    try {
      const body = await response.text();
      console.log(`\n=== SIGN-UP #${signUpCount} (${response.status()}) ===`);
      // Pretty-print the RSC response
      const matches = body.matchAll(/"([^"]+)":"([^"]*)"/g);
      for (const m of matches) {
        if (['status', 'error', 'type', 'message', 'intent', 'email', 'name'].includes(m[1])) {
          console.log(`  ${m[1]}: ${m[2]}`);
        }
      }
    } catch {}
  }
});

await page.goto('https://glama.ai/mcp/servers', { waitUntil: 'networkidle', timeout: 30000 });

const addButton = await page.$('button:has-text("Add Server")');
if (addButton) { await addButton.click(); await page.waitForTimeout(3000); }

await page.fill('input[name="name"]', 'USDC Gate');
await page.fill('input[name="email"]', 'toolweather.app@proton.me');

await page.evaluate(() => {
  const cb = document.querySelector('input[type="checkbox"]');
  if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
});

for (let i = 0; i < 30; i++) {
  const val = await page.evaluate(() => {
    const el = document.querySelector('input[name="altcha"]');
    return el ? el.value : '';
  });
  if (val && val.length > 100) break;
  await page.waitForTimeout(1000);
}

// Submit via Enter
await page.press('input[name="email"]', 'Enter');
await page.waitForTimeout(8000);

console.log(`\nTotal sign-up responses: ${signUpCount}`);

// Check if account exists now by trying sign-in
console.log('\nTrying sign-in...');
await page.goto('https://glama.ai/sign-in', { waitUntil: 'networkidle', timeout: 30000 });
await page.fill('input[name="email"]', 'toolweather.app@proton.me');
await page.press('input[name="email"]', 'Enter');
await page.waitForTimeout(5000);

const signInBody = await page.textContent('body');
const hasAccountExists = signInBody.includes('does not exist');
const hasCheckEmail = signInBody.toLowerCase().includes('check your email') || signInBody.toLowerCase().includes('sent');
console.log('Account does not exist:', hasAccountExists);
console.log('Check your email message:', hasCheckEmail);

const lines = signInBody.split('\n').map(l => l.trim()).filter(l => l.length > 5);
for (const line of lines.slice(0, 10)) {
  console.log('  >', line.slice(0, 120));
}

await browser.close();