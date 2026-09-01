import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outputRoot = path.join(root, 'evidence', 'visual-update-0831');
const screenshotRoot = path.join(outputRoot, 'screenshots');
fs.mkdirSync(screenshotRoot, { recursive: true });

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const routes = [
  { id: 'workbench', route: '/workbench', width: 1672, height: 941, fullPage: false },
  { id: 'apps', route: '/apps', width: 1672, height: 941, fullPage: false },
  { id: 'report', route: '/apps/report-001', width: 1054, height: 941, fullPage: true }
];

const browser = process.env.XLT_BROWSER_CDP
  ? await chromium.connectOverCDP(process.env.XLT_BROWSER_CDP)
  : await chromium.launch({
      executablePath: edgePath,
      headless: true,
      args: ['--use-angle=swiftshader', '--force-device-scale-factor=1', '--disable-features=Translate']
    });
const browserVersion = browser.version();
const results = [];

for (const item of routes) {
  const context = await browser.newContext({
    viewport: { width: item.width, height: item.height },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light'
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const externalRequests = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
  });
  await page.goto(`http://127.0.0.1:4173${item.route}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.complete ? image.decode().catch(() => {}) : new Promise(resolve => image.addEventListener('load', resolve, { once: true }))));
    document.documentElement.dataset.capture = 'stable';
  });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.mouse.move(-20, -20);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    label: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 80),
    outline: getComputedStyle(document.activeElement).outline,
    boxShadow: getComputedStyle(document.activeElement).boxShadow
  }));
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement?.blur());
  const screenshot = path.join(screenshotRoot, `${item.id}.png`);
  await page.screenshot({ path: screenshot, fullPage: item.fullPage });
  const dimensions = await page.evaluate(() => ({
    viewport: [window.innerWidth, window.innerHeight],
    document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    main: (() => { const node = document.querySelector('main'); return node ? [node.clientWidth, node.clientHeight, node.scrollHeight] : null; })()
  }));
  results.push({ ...item, screenshot, browserVersion, pageErrors, consoleErrors, externalRequests, focus, dimensions });
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(outputRoot, 'edge-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ browserVersion, results }, null, 2));
