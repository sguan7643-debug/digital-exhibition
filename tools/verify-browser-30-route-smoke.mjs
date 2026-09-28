import fs from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PAGE_MATRIX } from '../src/fixtures/pages.js';

const candidates = [
  process.env.BROWSER_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('未找到可用于浏览器回归的 Edge/Chromium，可通过 BROWSER_EXECUTABLE_PATH 指定');

const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4173';
const profile = process.env.FEISHU_VERIFY_BROWSER_PROFILE;
const browser = profile ? null : await chromium.launch({ headless: true, executablePath });
const context = profile
  ? await chromium.launchPersistentContext(resolve(profile), { headless: true, executablePath, viewport: { width: 1440, height: 1000 } })
  : await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
let currentRoute = '';
const errors = [];
page.on('pageerror', error => errors.push({ route: currentRoute, message: error.message }));
const results = [];

try {
  for (const item of PAGE_MATRIX) {
    currentRoute = item.route;
    const response = await page.goto(`${origin}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#main-content', { timeout: 10000 });
    await page.waitForTimeout(600);
    results.push({
      route: item.route,
      status: response?.status() || 0,
      mounted: await page.locator('#main-content').count() === 1,
      integrationMode: await page.locator('[data-integration-mode]').getAttribute('data-integration-mode'),
      loginPrompt: await page.locator('.integration-auth-banner').count() > 0,
      writePanelHidden: await page.locator('.controlled-write-panel').count() === 0,
      writePanelBlocked: await page.locator('.controlled-write-panel[data-write-state="blocked"]').count() === 1
    });
  }
} finally {
  await context.close();
  await browser?.close();
}

const failed = results.filter(item => item.status !== 200 || !item.mounted || (!item.writePanelHidden && !item.writePanelBlocked));
console.log(JSON.stringify({ passed: results.length === 30 && !failed.length && !errors.length, expected: 30, verified: results.length, failed, errors, results }, null, 2));
if (results.length !== 30 || failed.length || errors.length) process.exitCode = 2;
