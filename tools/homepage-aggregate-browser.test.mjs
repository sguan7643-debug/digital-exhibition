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

async function authorize(page, userId = 'browser-user') {
  await page.route('**/api/v1/auth/feishu/session', route => route.fulfill({
    status: 200, headers: jsonHeaders,
    body: JSON.stringify({ code: 'OK', authenticated: true, identity: { userId } })
  }));
}

const browser = await chromium.launch({ headless: true, executablePath });
try {
  const recoveryPage = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await authorize(recoveryPage);
  const recoveryErrors = [];
  recoveryPage.on('pageerror', error => recoveryErrors.push(error.message));
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
    if (statusCalls === 1) {
      return route.fulfill({
        status: 504, headers: jsonHeaders,
        body: JSON.stringify({ code: 'FEISHU_READ_BUDGET_EXCEEDED', message: '任务状态暂时不可用', retryAfterSeconds: 1 })
      });
    }
    return route.fulfill({
      status: 200, headers: jsonHeaders,
      body: JSON.stringify({ code: 'OK', syncId: 'sync-browser-auto', state: 'completed', traceId: 'trace-browser-auto', result: freshBody() })
    });
  });
  const response = await recoveryPage.goto(`${origin}/workbench`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  assert.equal(response?.status(), 200);
  await recoveryPage.locator('.request-loading-toast').waitFor({ state: 'visible', timeout: 8_000 });
  await recoveryPage.locator('.request-loading-toast').waitFor({ state: 'hidden', timeout: 8_000 });
  assert.equal(aggregateCalls, 1, '同步完成后必须直接消费任务结果，不得重发首页聚合请求');
  assert.equal(statusCalls, 2, '任务状态短暂失败后必须继续查询同一任务');
  assert.deepEqual(recoveryErrors, [], '任务状态短暂失败不得产生未捕获页面异常');
  await recoveryPage.close();

  const transientPage = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await authorize(transientPage, 'browser-user-transient');
  const pageErrors = [];
  transientPage.on('pageerror', error => pageErrors.push(error.message));
  let transientCalls = 0;
  await transientPage.route('**/api/v1/homepage', route => {
    transientCalls += 1;
    return route.fulfill({
      status: transientCalls === 1 ? 503 : 200,
      headers: jsonHeaders,
      body: JSON.stringify(transientCalls === 1
        ? { code: 'FEISHU_UPSTREAM_TIMEOUT', message: '飞书暂时不可用', traceId: 'trace-transient' }
        : freshBody())
    });
  });
  await transientPage.goto(`${origin}/workbench`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  for (let attempt = 0; attempt < 40 && transientCalls < 2; attempt += 1) await transientPage.waitForTimeout(100);
  await transientPage.locator('.request-loading-toast').waitFor({ state: 'hidden', timeout: 8_000 });
  assert.equal(transientCalls, 2, '首页临时503后必须自动重试，无需用户刷新');
  assert.deepEqual(pageErrors, [], '临时503不得产生未捕获页面异常');
  await transientPage.close();

  const sizes = [320, 760, 1366, 1920];
  for (const width of sizes) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await authorize(page, `browser-user-${width}`);
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
    assert.equal(await page.locator('.integration-recovery').count(), 0, `后台同步气泡在 ${width}px 下均不得展示`);
    await page.waitForTimeout(2_300);
    assert.equal(await page.locator('.integration-recovery').count(), 0, '后台轮询期间不得重新弹出同步气泡');
    assert.ok(polls >= 1, '关闭气泡不得停止后台轻量状态轮询');
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('homepage aggregate background recovery stays silent across 320/760/1366/1920 layouts');
