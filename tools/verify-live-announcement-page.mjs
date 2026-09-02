import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.EXHIBITION_TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const responses = [];
  const diagnostics = [];
  page.on('pageerror', error => diagnostics.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) diagnostics.push(`http ${response.status()}: ${response.url()}`);
    if (response.url().includes('/api/v1/operations/')) {
      responses.push({ operation: response.url().split('/').at(-1), status: response.status() });
    }
  });
  await page.goto(`${baseUrl}/announcements`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-integration-mode="remote"]').waitFor({ state: 'attached', timeout: 10_000 });
  await page.locator('[data-integration-status]').filter({ hasText: '数据已更新' }).waitFor({ state: 'attached', timeout: 45_000 });
  await page.locator('.notice-table tbody tr').first().waitFor({ state: 'visible', timeout: 10_000 });
  const integrationMode = await page.locator('[data-integration-mode]').getAttribute('data-integration-mode');
  const rowCount = await page.locator('.notice-table tbody tr').count();
  const pageSize = await page.locator('.notice-table .pagination-control select').inputValue();
  const markAllDisabled = await page.getByRole('button', { name: '全部标为已读' }).isDisabled();
  const statsLabel = await page.locator('.notice-stats article').first().locator('strong').textContent();
  assert.equal(integrationMode, 'remote');
  assert.deepEqual(responses.sort((a, b) => a.operation.localeCompare(b.operation)), [
    { operation: 'ANN-001', status: 200 }, { operation: 'ANN-002', status: 200 }
  ]);
  assert.ok(rowCount > 0, '公告页必须显示飞书公告记录');
  assert.equal(pageSize, '10');
  assert.equal(markAllDisabled, true, '表中没有用户已读字段时写入口必须禁用');
  assert.equal(statsLabel, '公告总数');
  assert.deepEqual(diagnostics, []);
  console.log(JSON.stringify({ integrationMode, responses, rowCount, pageSize, readWriteDisabled: markAllDisabled }));
} finally {
  await browser.close();
}
