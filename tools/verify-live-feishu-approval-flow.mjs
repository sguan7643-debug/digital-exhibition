import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuApprovalService } from '../server/feishu-approval-service.mjs';

const approvalCode = process.argv.find(value => value.startsWith('--approval-code='))?.slice(16) || '';
assert.match(approvalCode, /^[A-Z0-9-]{16,64}$/, '必须传入已创建的 TEST_ 审批定义 Code');

const chromePath = [
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].find(candidate => fs.existsSync(candidate));
assert.ok(chromePath, '未找到 Google Chrome');

const client = createFeishuOpenApiClient();
const users = await client.listUsersByDepartment('0', {
  pageSize: 10,
  userIdType: 'user_id',
  departmentIdType: 'open_department_id'
});
const userId = users.items.map(item => String(item.user_id || '')).find(Boolean);
assert.ok(userId, '飞书通讯录未返回可用于 TEST_ 审批的 user_id');

const now = Date.now();
const registry = new Map([['definition:seed', {
  creatorSubject: userId,
  tenantKey: '',
  orgId: '',
  approvalCode,
  expiresAt: now + 60 * 60 * 1000,
  cleanupStatus: 'ACTIVE'
}]]);
const service = createFeishuApprovalService({ client, registry });
const session = {
  identity: { userId, subject: userId, tenantKey: '', orgId: '', permissions: [] },
  accessToken: 'server-side-live-verification'
};
const suffix = String(now);
const resourceId = `TEST_HW_LIVE_${suffix}`;
let created = null;

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route('**/api/v1/approvals/instances**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    try {
      if (request.method() === 'POST' && url.pathname === '/api/v1/approvals/instances') {
        created = await service.createInstance(JSON.parse(request.postData() || '{}'), session);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
        return;
      }
      if (request.method() === 'GET') {
        const instanceId = decodeURIComponent(url.pathname.split('/').at(-1));
        const result = await service.getInstance(instanceId, session, { resourceId: url.searchParams.get('resourceId') || '' });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
        return;
      }
      await route.abort('blockedbyclient');
    } catch (error) {
      await route.fulfill({
        status: Number(error.status || 500),
        contentType: 'application/json',
        body: JSON.stringify({ code: error.code || 'LIVE_TEST_FAILED', message: error.message })
      });
    }
  });

  await page.goto('http://127.0.0.1:4173/apps/onboarding/apply?type=T005', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('应用类型*').selectOption('T005');
  await page.getByLabel('应用名称*').fill(`TEST_海能Work应用上架_${suffix}`);
  await page.getByLabel('应用编码').fill(resourceId);
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'test-hainengwork-icon.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#0060a6"/></svg>')
  });
  await page.getByRole('button', { name: '提交审核' }).click();
  await page.locator('.submit-success').waitFor({ state: 'visible' });
  assert.ok(created?.instanceId, '正式页面未创建真实飞书审批实例');

  const before = await service.getInstance(created.instanceId, session, { resourceId });
  assert.equal(before.status, 'PENDING');
  await service.approveTestTask(created.instanceId, session, { resourceId });
  const after = await service.getInstance(created.instanceId, session, { resourceId });
  assert.equal(after.status, 'APPROVED');

  await page.getByRole('link', { name: '查看审批状态' }).click();
  await page.waitForURL('**/apps/onboarding/status?**');
  await page.getByText('审批已通过', { exact: true }).waitFor({ state: 'visible' });

  console.log(JSON.stringify({
    passed: true,
    approvalCode,
    instanceCode: created.instanceId,
    finalStatus: after.status,
    pageSubmitted: true,
    statusPageApproved: true,
    localRegistryCleanup: 'in-memory registry released on process exit',
    remoteCleanup: 'approved instances and API-created definitions cannot be deleted; retained with TEST_ markers'
  }, null, 2));
} finally {
  await browser.close();
}
