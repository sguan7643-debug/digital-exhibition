import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const candidates = [
  process.env.BROWSER_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('未找到 Edge/Chromium');

const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4173/test2';
const jsonHeaders = { 'Content-Type': 'application/json' };
const operationIds = ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002'];

function freshBody() {
  const data = {
    'COM-001': { permissions: [] },
    'COM-002': { items: [] },
    'COM-005': { itemsByType: {} },
    'WB-001': {
      profile: {}, greeting: { text: '欢迎使用数智产品展厅' }, hero: {}, appTypeOverview: [],
      hotApps: [], courses: [], announcements: [],
      usage: { appVisitCount: 0, appUseCount: 0, favoriteAppCount: 0, visitChange: 0, useChange: 0, favoriteChange: 0 }
    },
    'WB-002': { items: [], total: 0, page: 1, pageSize: 20 }
  };
  return {
    code: 'OK', aggregateState: 'fresh', data,
    sections: Object.fromEntries(operationIds.map(operationId => [operationId, {
      state: 'fresh', available: true, data: data[operationId], dataStale: false,
      isComplete: true, retryable: false, sourceUpdatedAt: '2026-09-24T00:00:00.000Z', traceId: `trace-${operationId}`
    }])),
    dataStale: false, refreshing: false, syncId: null,
    sourceUpdatedAt: '2026-09-24T00:00:00.000Z', traceId: 'trace-fresh-browser'
  };
}

async function authorize(page) {
  await page.route('**/api/v1/auth/feishu/session', route => route.fulfill({
    status: 200, headers: jsonHeaders,
    body: JSON.stringify({ code: 'OK', authenticated: true, identity: { userId: 'browser-user' } })
  }));
}

const browser = await chromium.launch({ headless: true, executablePath });
try {
  const recoveryPage = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await authorize(recoveryPage);
  let aggregateCalls = 0;
  let statusCalls = 0;
  await recoveryPage.route('**/api/v1/homepage', route => {
    aggregateCalls += 1;
    const body = aggregateCalls === 1
      ? { code: 'HOMEPAGE_SYNCING', state: 'running', syncId: 'sync-browser-auto', pollAfterMs: 1000, traceId: 'trace-browser-auto' }
      : freshBody();
    return route.fulfill({ status: aggregateCalls === 1 ? 202 : 200, headers: jsonHeaders, body: JSON.stringify(body) });
  });
  await recoveryPage.route('**/api/v1/sync-jobs/**', route => {
    statusCalls += 1;
    return route.fulfill({
      status: 200, headers: jsonHeaders,
      body: JSON.stringify({ code: 'OK', syncId: 'sync-browser-auto', state: 'completed', traceId: 'trace-browser-auto' })
    });
  });
  const response = await recoveryPage.goto(`${origin}/workbench`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  assert.equal(response?.status(), 200);
  await recoveryPage.waitForSelector('.integration-recovery', { timeout: 10_000 });
  const recoverySemantics = await recoveryPage.locator('.integration-recovery').evaluate(node => ({
    role: node.getAttribute('role'),
    live: node.getAttribute('aria-live'),
    animation: getComputedStyle(node).animationName
  }));
  assert.deepEqual(recoverySemantics, { role: 'status', live: 'polite', animation: 'none' });
  await recoveryPage.waitForSelector('.integration-recovery', { state: 'detached', timeout: 10_000 });
  assert.equal(aggregateCalls, 2, '完成后只允许一次聚合重取');
  assert.equal(statusCalls, 1, '恢复路径只需一次完成状态查询');
  await recoveryPage.close();

  const sizes = [320, 760, 1366, 1920];
  for (const width of sizes) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await authorize(page);
    let polls = 0;
    await page.route('**/api/v1/homepage', route => route.fulfill({
      status: 202, headers: jsonHeaders,
      body: JSON.stringify({ code: 'HOMEPAGE_SYNCING', state: 'running', syncId: `sync-manual-${width}`, pollAfterMs: 1000, traceId: `trace-manual-${width}` })
    }));
    await page.route('**/api/v1/sync-jobs/**', route => {
      polls += 1;
      return route.fulfill({
        status: 200, headers: jsonHeaders,
        body: JSON.stringify({ code: 'OK', syncId: `sync-manual-${width}`, state: 'running', traceId: `trace-manual-${width}` })
      });
    });
    await page.goto(`${origin}/workbench`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    const bubble = page.locator('.integration-recovery');
    await bubble.waitFor({ timeout: 10_000 });
    const geometry = await bubble.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, viewport: document.documentElement.clientWidth };
    });
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport && geometry.width <= geometry.viewport, `气泡必须适配 ${width}px`);
    const retry = page.getByRole('button', { name: '重试受影响数据' });
    const close = page.getByRole('button', { name: '关闭数据请求提示' });
    assert.equal(await retry.isEnabled(), true);
    assert.equal(await close.isEnabled(), true);
    await close.click();
    await page.waitForTimeout(2_200);
    assert.equal(await bubble.count(), 0, '同一失败任务轮询后不得重新弹出已关闭气泡');
    assert.ok(polls >= 1, '关闭气泡不得停止后台轻量状态轮询');
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('homepage aggregate browser recovery, dismissal, accessibility, reduced-motion, and 320/760/1366/1920 layouts passed');
