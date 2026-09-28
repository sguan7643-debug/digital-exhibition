import fs from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const candidates = [
  process.env.BROWSER_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('未找到 Edge/Chromium');

const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4173';
const widths = [761, 869, 932, 1000, 1054];
const profile = process.env.FEISHU_VERIFY_BROWSER_PROFILE;
const browser = profile ? null : await chromium.launch({ headless: true, executablePath });
const context = profile
  ? await chromium.launchPersistentContext(resolve(profile), { headless: true, executablePath })
  : await browser.newContext();
const results = [];

try {
  for (const width of widths) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 720 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${origin}/workbench`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#main-content', { timeout: 30000 });
    const geometry = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const rect = selector => {
        const node = document.querySelector(selector);
        const value = node?.getBoundingClientRect();
        return value ? { left: value.left, right: value.right, width: value.width } : null;
      };
      const visibleDestinations = [...document.querySelectorAll('.primary-nav a')]
        .filter(node => node.getBoundingClientRect().width > 0)
        .map(node => node.textContent.trim());
      return {
        viewportWidth,
        documentWidth: document.documentElement.scrollWidth,
        topbar: rect('.topbar'),
        actions: rect('.top-actions'),
        user: rect('.top-user'),
        userName: rect('.top-user strong'),
        visibleDestinations
      };
    });
    const bounded = value => value && value.left >= 0 && value.right <= geometry.viewportWidth;
    const passed = response?.status() === 200 && !errors.length
      && geometry.documentWidth <= geometry.viewportWidth
      && bounded(geometry.topbar) && bounded(geometry.actions)
      && bounded(geometry.user) && bounded(geometry.userName)
      // The approved primary header exposes seven top-level destinations;
      // secondary destinations remain in their product-area sidebars.
      && geometry.visibleDestinations.length >= 7;
    results.push({ width, status: response?.status() || 0, errors, geometry, passed });
    await page.close();
  }
} finally {
  await context.close();
  if (browser) await browser.close();
}

const failed = results.filter(result => !result.passed);
console.log(JSON.stringify({ passed: !failed.length, expected: widths.length, failed, results }, null, 2));
if (failed.length) process.exitCode = 1;
