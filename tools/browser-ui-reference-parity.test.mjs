import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PAGE_MATRIX } from '../src/fixtures/pages.js';
import { installBrowserParityData } from './browser-parity-data.mjs';

const executablePath = [
  process.env.BROWSER_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean).find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('未找到 Edge/Chromium');

const currentOrigin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4173/test2';
const referenceOrigin = process.env.EXHIBITION_REFERENCE_ORIGIN || 'http://127.0.0.1:4174';
const evidenceDir = new URL('../.ai-team/tasks/DEH-UI-PARITY-REPAIR-20261008/evidence/browser/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const routeSelectors = Object.freeze({
  '/workbench': ['.workbench-page', '.hero-panel', '.dashboard-grid'],
  '/messages': ['.messages-page', '.message-filters', '.message-panel'],
  '/favorites': ['.favorites-page', '.favorite-filters', '.favorite-grid'],
  '/profile': ['.profile-page', '.profile-top', '.quick-panel'],
  '/announcements': ['.announcements-page', '.notice-filters', '.notice-table'],
  '/announcements/notice-001': ['.notice-page', '.notice-sheet', '.notice-adjacent'],
  '/apps': ['.apps-page', '.app-type-overview', '.application-grid'],
  '/apps/tool-001': ['.tool-detail', '.detail-hero', '.detail-metrics', '[data-detail-section="information"]', '.detail-comment'],
  '/apps/haineng-work-001': ['.work-detail', '.detail-hero', '.detail-metrics', '.work-info', '.video-cell', '.detail-comment'],
  '/apps/report-001': ['.report-detail', '.detail-hero', '.detail-metrics', '.feature-grid', '[data-detail-section="preview"]', '.detail-comment'],
  '/apps/dashboard-001': ['.dashboard-detail', '.detail-hero', '.detail-metrics', '.feature-grid', '[data-detail-section="preview"]', '.detail-comment'],
  '/apps/dataset-001': ['.dataset-detail', '.detail-hero', '.detail-metrics', '[data-detail-section="fields"]', '.dataset-training', '.detail-comment'],
  '/apps/metric-001': ['.metric-detail', '.detail-hero', '.detail-metrics', '.metric-table', '.detail-comment'],
  '/apps/ai-001': ['.ai-detail', '.detail-hero', '.detail-metrics', '.ai-table', '.detail-comment'],
  '/apps/ead-001': ['.ead-detail', '.detail-hero', '.detail-metrics', '.ead-info', '.ead-flow', '.detail-comment'],
  '/apps/rpa-001': ['.rpa-detail', '.detail-hero', '.rpa-metrics', '.rpa-recording', '.rpa-flow', '.detail-comment'],
  '/apps/onboarding/status': ['.onboarding-page'],
  '/points': ['.points-page', '.point-layout', '.rule-panel'],
  '/points/details': ['.points-details', '.point-filter', '.point-table'],
  '/training': ['.training-page', '.training-hero', '.course-grid'],
  '/operations': ['.operations-page', '.ops-stats', '.ops-grid'],
  '/operations/announcements': ['.admin-list', '.admin-stats', '.admin-table'],
  '/operations/announcements/notice-001/edit': ['.editor-page', '.basic-grid', '.editor-split'],
  '/operations/apps': ['.app-admin', '.app-admin-stats', '.app-admin-table'],
  '/operations/apps/app-001/edit': ['.app-editor', '.edit-main', '.assets-form'],
  '/admin': ['.backend-page', '.config-grid', '.log-panel'],
  '/certification': ['.cert-page', '.cert-layout', '.platform-service'],
  '/talent/people': ['.talent-people', '.talent-body', '.talent-table-scroll'],
  '/talent/projects': ['.talent-projects', '.projects-body', '.table-scroll'],
  '/talent/progress': ['.progress-page', '.talent-local-nav', '.progress-table'],
});
assert.equal(Object.keys(routeSelectors).length, 30, '浏览器视觉合同必须登记 30 个共同路由');

const primaryViewports = [
  { name: 'desktop', width: 1672, height: 941 },
  { name: 'compact', width: 1000, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const additionalOverflowViewports = [
  { name: 'wide', width: 1920, height: 1080 },
  { name: 'narrow-mobile', width: 360, height: 800 },
  { name: 'landscape-mobile', width: 844, height: 390 },
];

const browser = await chromium.launch({ headless: true, executablePath });
const referenceContext = await browser.newContext({ reducedMotion: 'reduce' });
const currentContext = await browser.newContext({ reducedMotion: 'reduce' });
let activeRoute = '/workbench';
await installBrowserParityData(currentContext, () => activeRoute);

const routeKey = route => route.slice(1).replaceAll('/', '-') || 'root';
const screenshotPath = (label, viewport, route) => fileURLToPath(new URL(`${label}-${viewport.width}x${viewport.height}-${routeKey(route)}.png`, evidenceDir));

async function capture(context, origin, route, viewport, label, takeScreenshot = true) {
  activeRoute = route;
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('#main-content', { timeout: 15_000 });
  if (label === 'current') {
    await page.waitForFunction(() => !document.querySelector('.request-loading-toast'), null, { timeout: 10_000 });
  }
  await page.waitForTimeout(100);
  const selectors = routeSelectors[route];
  const metrics = await page.evaluate(selectorsToCheck => {
    const visible = element => {
      if (!element) return false;
      const computed = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return computed.display !== 'none' && computed.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const style = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        display: computed.display,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        gridTemplateColumns: computed.gridTemplateColumns,
      };
    };
    const main = document.querySelector('#main-content');
    const firstContent = [...main.children].find(visible) || main.firstElementChild;
    const localScrollSelector = '.horizontal-scroll-region,[data-horizontal-scroll-region],.table-scroll,.talent-table-scroll,.primary-nav,.simple-nav';
    const overflowers = [...document.querySelectorAll('body *')].filter(element => {
      if (!visible(element) || element.closest('.sr-only') || element.closest(localScrollSelector)) return false;
      const rect = element.getBoundingClientRect();
      return rect.left < -0.5 || rect.right > document.documentElement.clientWidth + 0.5;
    }).slice(0, 20).map(element => ({
      tag: element.tagName,
      className: String(element.className || ''),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
    }));
    const scrollRegions = [...document.querySelectorAll('.horizontal-scroll-region,[data-horizontal-scroll-region],.table-scroll,.talent-table-scroll')]
      .filter(visible).map(element => ({
        label: element.getAttribute('aria-label'), role: element.getAttribute('role'), tabIndex: element.tabIndex,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      }));
    const personLeaks = [...document.querySelectorAll('[data-person-name]')].map(element => element.textContent.trim()).filter(value => {
      if (!value || value === '—') return false;
      return /^(?:ou_|on_|cli_|u_|[0-9a-f]{7,}|[a-z0-9]{6,}(?:[-_][a-z0-9]+)*)$/i.test(value);
    });
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      mainWidth: main.scrollWidth,
      mainClientWidth: main.clientWidth,
      contentTop: firstContent ? Math.round(firstContent.getBoundingClientRect().top) : null,
      topbar: style('.topbar'), brand: style('.brand'), frame: style('.page-frame'), sidebar: style('.sidebar'), main: style('#main-content'),
      selectorCounts: Object.fromEntries(selectorsToCheck.map(selector => [selector, [...document.querySelectorAll(selector)].filter(visible).length])),
      structure: {
        h1: [...main.querySelectorAll('h1')].filter(visible).length,
        h2: [...main.querySelectorAll('h2')].filter(visible).length,
        sections: [...main.querySelectorAll('section')].filter(visible).length,
        forms: [...main.querySelectorAll('form')].filter(visible).length,
        tables: [...main.querySelectorAll('table')].filter(visible).length,
        buttons: [...main.querySelectorAll('button')].filter(visible).length,
      },
      headings: [...main.querySelectorAll('h1,h2')].filter(visible).map(element => element.textContent.trim()).filter(Boolean),
      updateTimeVisible: document.body.innerText.includes('数据更新时间：') || document.querySelectorAll('.data-update-time').length > 0,
      requestLoadingVisible: [...document.querySelectorAll('.request-loading-toast')].filter(visible).length,
      personLeaks,
      overflowers,
      scrollRegions,
    };
  }, selectors);
  if (takeScreenshot) await page.screenshot({ path: screenshotPath(label, viewport, route), fullPage: false, timeout: 60_000 });
  await page.close();
  return { status: response?.status() || 0, pageErrors, consoleErrors, ...metrics };
}

function assertCurrentRoute(route, viewport, current, reference) {
  assert.equal(current.status, 200, `${route} ${viewport.name} 当前页面必须可访问`);
  assert.equal(reference.status, 200, `${route} ${viewport.name} 参考页面必须可访问`);
  assert.deepEqual(current.pageErrors, [], `${route} ${viewport.name} 不得出现页面脚本错误`);
  assert.deepEqual(reference.pageErrors, [], `${route} ${viewport.name} 参考页面不得出现脚本错误`);
  assert.equal(current.updateTimeVisible, false, `${route} ${viewport.name} 不得显示或占位“数据更新时间”`);
  assert.equal(current.requestLoadingVisible, 0, `${route} ${viewport.name} 正常数据完成后 loading 气泡必须消失`);
  assert.deepEqual(current.personLeaks, [], `${route} ${viewport.name} 人员姓名槽不得泄露编码`);
  assert.equal(current.documentWidth, current.viewportWidth, `${route} ${viewport.name} 不得产生页面级横向溢出`);
  assert.equal(current.bodyWidth, current.viewportWidth, `${route} ${viewport.name} body 不得产生横向溢出`);
  assert.ok(current.mainWidth <= current.mainClientWidth + 1, `${route} ${viewport.name} 主内容不得横向溢出`);
  assert.deepEqual(current.overflowers, [], `${route} ${viewport.name} 存在未收敛的可见溢出元素`);
  for (const [selector, count] of Object.entries(current.selectorCounts)) assert.ok(count > 0, `${route} ${viewport.name} 缺少页面结构 ${selector}`);
  assert.ok(current.structure.h1 >= 1, `${route} ${viewport.name} 缺少可见一级标题`);
  assert.ok(Math.abs((current.contentTop ?? 0) - (reference.contentTop ?? 0)) <= 4, `${route} ${viewport.name} 页面内容起点与参考包不一致`);
  for (const key of ['topbar', 'frame', 'sidebar']) {
    assert.equal(current[key]?.height, reference[key]?.height, `${route} ${viewport.name} 的 ${key} 高度必须匹配参考包`);
    assert.equal(current[key]?.width, reference[key]?.width, `${route} ${viewport.name} 的 ${key} 宽度必须匹配参考包`);
  }
  assert.equal(current.topbar?.backgroundColor, reference.topbar?.backgroundColor, `${route} ${viewport.name} 顶栏颜色必须匹配参考包`);
  assert.equal(current.main?.backgroundColor, reference.main?.backgroundColor, `${route} ${viewport.name} 主内容背景必须匹配参考包`);
}

const routeEvidence = [];
try {
  for (const pageRecord of PAGE_MATRIX) {
    const route = pageRecord.route;
    const row = { id: pageRecord.id, route, primary: [], overflow: [] };
    for (const viewport of primaryViewports) {
      const reference = await capture(referenceContext, referenceOrigin, route, viewport, 'reference');
      const current = await capture(currentContext, currentOrigin, route, viewport, 'current');
      assertCurrentRoute(route, viewport, current, reference);
      row.primary.push({ viewport, reference, current, screenshots: {
        reference: screenshotPath('reference', viewport, route), current: screenshotPath('current', viewport, route),
      } });
      row.overflow.push({ viewport, passed: true, metrics: {
        documentWidth: current.documentWidth, viewportWidth: current.viewportWidth,
        bodyWidth: current.bodyWidth, mainWidth: current.mainWidth, mainClientWidth: current.mainClientWidth,
      } });
    }
    for (const viewport of additionalOverflowViewports) {
      const current = await capture(currentContext, currentOrigin, route, viewport, 'current-overflow', false);
      assert.equal(current.status, 200, `${route} ${viewport.name} 必须可访问`);
      assert.deepEqual(current.pageErrors, [], `${route} ${viewport.name} 不得出现页面脚本错误`);
      assert.equal(current.updateTimeVisible, false, `${route} ${viewport.name} 不得恢复全局更新时间`);
      assert.deepEqual(current.personLeaks, [], `${route} ${viewport.name} 人员姓名槽不得泄露编码`);
      assert.equal(current.documentWidth, current.viewportWidth, `${route} ${viewport.name} 不得产生页面级横向溢出`);
      assert.equal(current.bodyWidth, current.viewportWidth, `${route} ${viewport.name} body 不得产生横向溢出`);
      assert.ok(current.mainWidth <= current.mainClientWidth + 1, `${route} ${viewport.name} 主内容不得横向溢出`);
      assert.deepEqual(current.overflowers, [], `${route} ${viewport.name} 存在未收敛的可见溢出元素`);
      for (const [selector, count] of Object.entries(current.selectorCounts)) assert.ok(count > 0, `${route} ${viewport.name} 缺少页面结构 ${selector}`);
      row.overflow.push({ viewport, passed: true, metrics: {
        documentWidth: current.documentWidth, viewportWidth: current.viewportWidth,
        bodyWidth: current.bodyWidth, mainWidth: current.mainWidth, mainClientWidth: current.mainClientWidth,
      } });
    }
    routeEvidence.push(row);
    process.stdout.write(`verified ${pageRecord.id}/30 ${route}\n`);
  }
  assert.equal(routeEvidence.length, 30, '必须完成全部 30 个共同路由的视觉证据');
  assert.ok(routeEvidence.every(row => row.primary.length === 3 && row.overflow.length === 6), '每个路由必须具备三档成对截图和六档溢出证据');
  await writeFile(new URL('route-visual-matrix.json', evidenceDir), `${JSON.stringify({
    taskId: 'DEH-UI-PARITY-REPAIR-20261008', currentOrigin, referenceOrigin,
    referenceArchiveSha256: 'F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035',
    generatedAt: new Date().toISOString(), routes: routeEvidence,
  }, null, 2)}\n`, 'utf8');
} finally {
  await referenceContext.close();
  await currentContext.close();
  await browser.close();
}

console.log(JSON.stringify({ passed: true, routes: routeEvidence.length, pairedScreenshots: routeEvidence.length * 3 * 2, responsiveCases: routeEvidence.length * 6 }, null, 2));
