import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'file:///C:/Users/20266/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { PAGE_MATRIX } from '../src/fixtures/pages.js';

const captures = PAGE_MATRIX.map(({ id, route, width, height, capture }) => ({ id, route, width, height, capture }));
const output = resolve('evidence/phase-1-visual');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--disable-background-networking', '--force-device-scale-factor=1']
});
const results = [];
try {
  for (const capture of captures) {
    const context = await browser.newContext({ viewport: { width: capture.width, height: capture.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    const externalRequests = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
    });
    const response = await page.goto(`http://127.0.0.1:4173${capture.route}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const screenshot = resolve(output, `${capture.id}.png`);
    const bytes = await page.screenshot({ path: screenshot, animations: 'disabled', fullPage: capture.capture === 'fullPage' });
    const actualWidth = bytes.readUInt32BE(16);
    const actualHeight = bytes.readUInt32BE(20);
    results.push({ ...capture, status: response?.status(), screenshot, actualWidth, actualHeight, errors, externalRequests });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(resolve(output, 'edge-capture-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(results, null, 2));
