import fs from 'node:fs';
import { chromium } from 'playwright';
import { PAGE_MATRIX } from '../src/fixtures/pages.js';

const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4173';
const cdpUrl = process.env.EDGE_CDP_URL;
const candidates = [process.env.BROWSER_EXECUTABLE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!cdpUrl && !executablePath) throw new Error('未找到 Edge；可通过 EDGE_CDP_URL 复用受控浏览器');

const browser = cdpUrl ? await chromium.connectOverCDP(cdpUrl) : await chromium.launch({ headless: true, executablePath });
const context = cdpUrl ? (browser.contexts()[0] || await browser.newContext()) : await browser.newContext({ viewport: { width: 360, height: 800 } });
const page = await context.newPage();
await page.setViewportSize({ width: 360, height: 800 });
const results = [];
try {
  for (const item of PAGE_MATRIX) {
    const errors = [];
    const remoteRequests = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('request');
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(request.url()); });
    const response = await page.goto(`${origin}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#main-content', { timeout: 10000 });
    await page.waitForTimeout(350);
    const geometry = await page.evaluate(() => {
      const localSelector = '.horizontal-scroll-region,[data-horizontal-scroll-region],.primary-nav,.simple-nav';
      const visible = element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const overflowers = [...document.querySelectorAll('body *')].filter(element => {
        if (!visible(element) || element.closest(localSelector)) return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -0.5 || rect.right > document.documentElement.clientWidth + 0.5;
      }).slice(0, 20).map(element => ({ tag: element.tagName, className: String(element.className || ''), rect: element.getBoundingClientRect().toJSON() }));
      const regions = [...document.querySelectorAll('.horizontal-scroll-region,[data-horizontal-scroll-region]')].filter(visible).map(element => ({
        label: element.getAttribute('aria-label'), role: element.getAttribute('role'), tabIndex: element.tabIndex,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth
      }));
      return {
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        mainWidth: document.querySelector('#main-content').scrollWidth,
        mainClientWidth: document.querySelector('#main-content').clientWidth,
        overflowers, regions
      };
    });
    const failedRegions = geometry.regions.filter(region => region.scrollWidth > region.clientWidth && (region.tabIndex < 0 || region.role !== 'region' || !region.label));
    results.push({ route: item.route, status: response?.status() || 0, errors, remoteRequests, geometry, passed: response?.status() === 200 && !errors.length && !remoteRequests.length && geometry.documentWidth <= geometry.viewport && geometry.bodyWidth <= geometry.viewport && geometry.mainWidth <= geometry.mainClientWidth && !geometry.overflowers.length && !failedRegions.length });
  }
} finally {
  await page.close();
  if (!cdpUrl) await browser.close();
}
const failed = results.filter(result => !result.passed);
console.log(JSON.stringify({ passed: results.length === 30 && !failed.length, expected: 30, verified: results.length, failed, results }, null, 2));
if (results.length !== 30 || failed.length) process.exitCode = 2;
