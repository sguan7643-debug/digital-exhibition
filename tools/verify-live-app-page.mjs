import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.EXHIBITION_TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const responses = [];
  const diagnostics = [];
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => diagnostics.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.status() >= 400) diagnostics.push(`http ${response.status()}: ${response.url()}`);
    if (response.url().includes('/api/v1/operations/')) {
      responses.push({ operation: response.url().split('/').at(-1), status: response.status() });
    }
  });
  await page.goto(`${baseUrl}/apps`, { waitUntil: 'domcontentloaded' });
  try {
    await page.locator('[data-integration-mode="remote"]').waitFor({ state: 'attached', timeout: 10_000 });
    await page.locator('[data-integration-status]').filter({ hasText: '数据已更新' }).waitFor({ state: 'attached', timeout: 45_000 });
    await page.locator('.apps-grid h2').first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch (error) {
    console.error(JSON.stringify({ diagnostics, title: await page.title(), body: (await page.locator('body').innerText()).slice(0, 1000) }));
    throw error;
  }
  const sourceStatus = await page.locator('[data-integration-status]').textContent();
  const integrationMode = await page.locator('[data-integration-mode]').getAttribute('data-integration-mode');
  const names = await page.locator('.apps-grid h2').allTextContents();
  const total = await page.locator('.apps-tools strong').textContent();
  const pageSize = await page.locator('.apps-pagination select').inputValue();
  console.log(JSON.stringify({ phase: 'observed', integrationMode, sourceStatus, responses, diagnostics, displayedApps: names.length, total, pageSize }));
  assert.equal(integrationMode, 'remote');
  assert.match(sourceStatus, /受控代理数据/);
  assert.deepEqual(responses.sort((a, b) => a.operation.localeCompare(b.operation)), [
    { operation: 'APP-001', status: 200 }, { operation: 'APP-002', status: 200 }
  ]);
  assert.ok(names.length > 0, '应用中心必须显示飞书应用记录');
  assert.match(total, /全部应用\s+\d+\s+个/);
  assert.equal(pageSize, '10');
  console.log(JSON.stringify({ integrationMode, sourceStatus, responseCount: responses.length, displayedApps: names.length, total, pageSize }));
} finally {
  await browser.close();
}
