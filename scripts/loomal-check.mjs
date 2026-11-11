import { chromium } from 'playwright';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Set GitHub token as authorization header
await page.setExtraHTTPHeaders({
  'Authorization': `Bearer ${GITHUB_TOKEN}`
});

console.log('Navigating to Loomal console...');
await page.goto('https://console.loomal.ai/login', { waitUntil: 'networkidle', timeout: 30000 });

// Click "Continue with GitHub"
const githubBtn = await page.$('button:has-text("GitHub")');
if (githubBtn) {
  console.log('Clicking Continue with GitHub...');
  await githubBtn.click();
  await page.waitForTimeout(8000);
  console.log('URL:', page.url());

  // Check if we're on GitHub's authorize page or logged in
  const url = page.url();
  if (url.includes('github.com/login')) {
    console.log('Still on GitHub login page — token not accepted for web session');
    // Try filling in GitHub login with token
    const loginField = await page.$('input[name="login"]');
    if (loginField) {
      console.log('Found login field — trying token login...');
      await loginField.fill('usdcmaxxing');
      const passwordField = await page.$('input[name="password"]');
      if (passwordField) {
        await passwordField.fill(GITHUB_TOKEN);
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(5000);
          console.log('URL after login:', page.url());
        }
      }
    }
  } else if (url.includes('github.com/login/oauth/authorize')) {
    console.log('On GitHub authorize page');
    const authorizeBtn = await page.$('button[name="authorize"], input[name="authorize"]');
    if (authorizeBtn) {
      console.log('Clicking Authorize...');
      await authorizeBtn.click();
      await page.waitForTimeout(5000);
      console.log('URL after authorize:', page.url());
    }
  } else if (url.includes('console.loomal.ai')) {
    console.log('Back on Loomal — login successful!');
    const bodyText = await page.textContent('body');
    console.log('Page snippet:', bodyText.slice(0, 300));
  }
}

await browser.close();