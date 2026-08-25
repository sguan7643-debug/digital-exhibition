import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'file:///C:/Users/20266/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const output = resolve('evidence/scrollbar-remediation');
await mkdir(output, { recursive: true });
const errors = [];
const externalRequests = [];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--disable-background-networking', '--force-device-scale-factor=1'],
});
const context = await browser.newContext({ viewport: { width: 1000, height: 650 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', error => errors.push(String(error)));
page.on('request', request => {
  const url = new URL(request.url());
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
});

async function visit(route) {
  const response = await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, `${route} must return HTTP 200`);
  await page.evaluate(() => document.fonts.ready);
}

async function scrollMetrics(selector) {
  return page.locator(selector).evaluate(element => {
    const scrollbar = getComputedStyle(element, '::-webkit-scrollbar');
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollbarWidth: scrollbar.width,
      scrollbarHeight: scrollbar.height,
    };
  });
}

const results = {};
try {
  await visit('/training');
  const mainBefore = await scrollMetrics('#main-content');
  assert.ok(mainBefore.scrollHeight > mainBefore.clientHeight, '培训页主内容必须具备纵向溢出');
  assert.equal(mainBefore.scrollbarWidth, '0px', '主内容纵向滚动条必须不可见');
  await page.locator('#main-content').focus();
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(80);
  const mainScrollTop = await page.locator('#main-content').evaluate(element => element.scrollTop);
  assert.ok(mainScrollTop > 0, '隐藏滚动条后 PageDown 必须仍能纵向滚动');

  const sidebarBefore = await scrollMetrics('.sidebar');
  assert.ok(sidebarBefore.scrollHeight > sidebarBefore.clientHeight, '目录侧栏必须具备纵向溢出');
  assert.equal(sidebarBefore.scrollbarWidth, '0px', '侧栏纵向滚动条必须不可见');
  await page.locator('.sidebar').hover();
  await page.mouse.wheel(0, 360);
  await page.waitForTimeout(80);
  const sidebarScrollTop = await page.locator('.sidebar').evaluate(element => element.scrollTop);
  assert.ok(sidebarScrollTop > 0, '隐藏滚动条后鼠标滚轮必须仍能滚动侧栏');
  await page.screenshot({ path: resolve(output, 'training-vertical-scroll-hidden.png'), animations: 'disabled' });
  results.training = { mainBefore, mainScrollTop, sidebarBefore, sidebarScrollTop };

  await visit('/talent/projects?drawer=create');
  const drawer = page.locator('.projects-body>aside');
  assert.equal(await drawer.count(), 1, '受控 query 必须打开人才项目抽屉');
  const drawerBefore = await scrollMetrics('.projects-body>aside');
  assert.ok(drawerBefore.scrollHeight > drawerBefore.clientHeight, '人才项目抽屉必须具备纵向溢出');
  assert.equal(drawerBefore.scrollbarWidth, '0px', '抽屉纵向滚动条必须不可见');
  await drawer.evaluate(element => { element.scrollTop = 160; });
  const drawerScrollTop = await drawer.evaluate(element => element.scrollTop);
  assert.ok(drawerScrollTop > 0, '隐藏滚动条后抽屉必须仍能纵向滚动');
  results.drawer = { drawerBefore, drawerScrollTop };

  await visit('/talent/progress');
  const horizontalBefore = await scrollMetrics('.progress-table');
  assert.ok(horizontalBefore.scrollWidth > horizontalBefore.clientWidth, '项目进度表必须保留横向溢出');
  assert.notEqual(horizontalBefore.scrollbarHeight, '0px', '横向滚动条高度不得被本次规则清零');
  await page.locator('.progress-table').evaluate(element => { element.scrollLeft = 180; });
  const horizontalScrollLeft = await page.locator('.progress-table').evaluate(element => element.scrollLeft);
  assert.ok(horizontalScrollLeft > 0, '横向滚动行为必须保持可用');
  await page.screenshot({ path: resolve(output, 'talent-progress-horizontal-unchanged.png'), animations: 'disabled' });
  results.horizontal = { horizontalBefore, horizontalScrollLeft };
} finally {
  await browser.close();
}

assert.deepEqual(errors, [], '真实 Edge 不得出现 pageerror');
assert.deepEqual(externalRequests, [], '真实 Edge 不得发起非本地请求');
const evidence = { results, errors, externalRequests };
await writeFile(resolve(output, 'browser-results.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence, null, 2));
