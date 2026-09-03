import fs from 'node:fs';
import { chromium } from 'playwright';

const candidates = [
  process.env.BROWSER_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('未找到 Edge/Chromium');

const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4174';
const routes = ['/workbench', '/apps', '/admin', '/talent/people'];
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 720, height: 500 } });
const results = [];

try {
  for (const route of routes) {
    const errors = [];
    page.removeAllListeners('pageerror');
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#main-content');
    for (let index = 0; index < 12; index += 1) await page.keyboard.press('Tab');
    const geometry = await page.evaluate(() => {
      const focused = document.activeElement;
      const topbar = document.querySelector('.topbar');
      const nav = focused?.closest('.primary-nav');
      const rect = node => {
        const value = node.getBoundingClientRect();
        return { left: value.left, right: value.right, width: value.width };
      };
      return {
        viewportWidth: document.documentElement.clientWidth,
        topbar: rect(topbar),
        nav: rect(nav),
        focused: rect(focused),
        focusedVisible: focused.matches(':focus-visible'),
        focusedName: focused.getAttribute('aria-label') || focused.textContent.trim()
      };
    });
    const within = value => value.left >= 0 && value.right <= geometry.viewportWidth;
    results.push({
      route,
      status: response?.status() || 0,
      errors,
      ...geometry,
      passed: response?.status() === 200 && !errors.length && geometry.focusedVisible
        && within(geometry.topbar) && within(geometry.nav) && within(geometry.focused)
    });
  }
} finally {
  await browser.close();
}

const failed = results.filter(result => !result.passed);
console.log(JSON.stringify({ passed: results.length === routes.length && !failed.length, expected: routes.length, failed, results }, null, 2));
if (failed.length || results.length !== routes.length) process.exitCode = 2;
