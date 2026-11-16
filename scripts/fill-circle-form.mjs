// Try to load the Circle form using the Chrome profile with bundled Chromium
import { chromium } from 'playwright';

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeVGlFm-rglBEd8nPqWTdbg2XIe8jY7dd43iFC-FhP2WANQvQ/viewform';
const CHROME_PROFILE = '/Users/asa/Library/Application Support/Google/Chrome';

const browser = await chromium.launchPersistentContext(CHROME_PROFILE, {
  headless: true,
  args: ['--no-first-run', '--no-default-browser-check', '--disable-features=ChromeLabs'],
});

const page = browser.pages()[0] || await browser.newPage();

try {
  await page.goto(FORM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const title = await page.title();
  const url = page.url();
  console.log('Title:', title);
  console.log('URL:', url);

  const bodyText = await page.textContent('body');
  console.log('\nBody text (first 1200 chars):');
  console.log(bodyText?.slice(0, 1200));

  const isSignIn = url.includes('accounts.google.com') || bodyText?.includes('Sign into continue');
  console.log('\nSign-in required:', isSignIn);

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}