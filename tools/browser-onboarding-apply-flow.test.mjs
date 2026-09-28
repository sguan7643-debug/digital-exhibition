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

const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
let approvalRequest = null;
let onboardingRequest = null;
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/v1/auth/feishu/session', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    code: 'OK',
    authenticated: true,
    identity: { userId: 'linmm', displayName: '林敏敏' }
  })
}));
await page.route('**/api/v1/operations/COM-003', async route => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    code: 'OK', traceId: 'trace-com-003', data: {
      items: [{ orgId: 'D004', orgCode: 'D004', orgName: '物资采购中心', orgType: 'DEPARTMENT', parentId: '', pathIds: ['D004'], pathNames: ['物资采购中心'], level: 1, sortOrder: 1, enabled: true, hasChildren: false, userCount: 1, children: [] }],
      includeUsers: false, userCount: 1, total: 1, source: 'feishu'
    }
  }) });
});
await page.route('**/api/v1/operations/COM-004', async route => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    code: 'OK', traceId: 'trace-com-004', data: {
      items: [{ userId: 'linmm', employeeNo: '10001', displayName: '林敏敏', avatarUrl: '', orgId: 'D004', orgName: '物资采购中心', departmentId: 'D004', departmentName: '物资采购中心', officeId: '', officeName: '', title: '测试人员', mobileMasked: '139****0000', emailMasked: 'l***@example.com', enabled: true }],
      total: 1, page: 1, pageSize: 100, totalPages: 1, hasPrevious: false, hasNext: false, hasMore: false, sort: 'name,asc', filtersApplied: {}, source: 'feishu'
    }
  }) });
});
await page.route('**/api/v1/operations/COM-005', async route => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    code: 'OK', traceId: 'trace-com-005', data: {
      itemsByType: {
        APPLICATION_TYPE: [
          { dictType: 'APPLICATION_TYPE', value: 'T003', label: 'RPA应用', description: null, colorToken: null, iconFileId: null, sortOrder: 3, enabled: true, parentValue: null, extra: null },
          { dictType: 'APPLICATION_TYPE', value: 'T005', label: '海能work应用', description: null, colorToken: null, iconFileId: null, sortOrder: 5, enabled: true, parentValue: null, extra: null }
        ],
        BUSINESS_DOMAIN: [{ dictType: 'BUSINESS_DOMAIN', value: 'BD004', label: '物资采购', description: null, colorToken: null, iconFileId: null, sortOrder: 1, enabled: true, parentValue: null, extra: null }]
      },
      version: 'TEST_DICTIONARIES_V1', updatedAt: '2026-09-28T00:00:00.000Z'
    },
    dataStale: false, isComplete: true
  }) });
});
await page.route('**/api/processInstanceStart', async route => {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type'
      }
    });
    return;
  }
  approvalRequest = {
    method: route.request().method(),
    contentType: route.request().headers()['content-type'],
    body: route.request().postData()
  };
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    },
    body: JSON.stringify({ code: '00000', message: '操作成功' })
  });
});
await page.route('**/api/v1/onboarding/uploads', async route => {
  await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
    uploadId: 'TEST_UPLOAD_ICON', purpose: 'APPLICATION_ICON', fileId: 'TEST_FILE_ICON',
    fileName: 'test-hw-icon.png', mimeType: 'image/png', sizeBytes: 12, sha256: 'a'.repeat(64)
  }) });
});
await page.route('**/api/v1/onboarding/applications', async route => {
  if (route.request().method() === 'POST') {
    onboardingRequest = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
      applicationId: 'TEST_APPLICATION', instanceId: 'TEST_INSTANCE', resourceId: 'TEST_HW_001', status: 'PENDING'
    }) });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
});
await page.route('**/api/v1/onboarding/applications/TEST_APPLICATION*', async route => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    applicationId: 'TEST_APPLICATION', instanceId: 'TEST_INSTANCE', resourceId: 'TEST_HW_001',
    applicationName: 'TEST_海能Work应用上架', applicationCode: 'TEST_HW_001', applicationType: 'T005',
    businessDomain: 'BD004', applicant: 'linmm', applicantName: '林敏敏', status: 'PENDING',
    currentNode: '飞书审批中', submittedAt: '2026-09-28T00:00:00.000Z', lastSyncedAt: '2026-09-28T00:00:00.000Z',
    authorizedUsers: ['linmm'], authorizedDepartments: ['物资采购中心'], attachments: [], icon: null
  }) });
});

async function fillRequiredFields({ type, name, code }) {
  await page.getByLabel('应用类型*').selectOption(type);
  await page.getByLabel('所属部门*').first().selectOption({ label: '物资采购中心' });
  await page.getByLabel('联系电话*').first().fill('13900000000');
  await page.getByLabel('联系邮箱*').first().fill('linmm@example.com');
  await page.getByLabel('应用名称*').fill(name);
  if (code) await page.getByLabel('应用编码').fill(code);
  await page.getByLabel('所属应用域*').selectOption('BD004');
  await page.getByLabel('摘要*').fill('TEST_应用上架浏览器流程');
  await page.getByLabel('应用简介*').fill('TEST_验证申请提交、审批跟踪和持久化详情。');
  await page.getByLabel('开发合作方信息*').fill('TEST_内部POC');
  await page.getByLabel('Web应用地址*').fill('https://example.invalid/test-app');
  if (type === 'T003') await page.getByLabel('RPA所属平台').fill('测试平台');
  const contact = page.locator('fieldset').filter({ hasText: '接入人信息' });
  await contact.getByLabel('所属部门*').selectOption({ label: '物资采购中心' });
  await contact.getByLabel('接入人*').selectOption('linmm');
  await contact.getByLabel('联系电话*').fill('13900000000');
  await contact.getByLabel('联系邮箱*').fill('linmm@example.com');
}

try {
  await page.goto(`${origin}/apps`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: '应用上线申请' }).click();
  await page.waitForURL('**/apps/onboarding/apply');
  await page.locator('form.apply-form').waitFor();
  assert.equal(await page.getByRole('heading', { name: '应用上架申请' }).count(), 1);
  assert.equal(await page.locator('form.apply-form').count(), 1);
  const contactLabels = await page.locator('fieldset').filter({ hasText: '接入人信息' }).locator('label').allTextContents();
  assert.match(contactLabels[0], /所属部门/);
  assert.match(contactLabels[1], /接入人/);
  const permissionLabels = await page.locator('fieldset').filter({ hasText: '应用权限开通' }).locator('label').allTextContents();
  assert.match(permissionLabels[0], /适用部门/);
  assert.match(permissionLabels[1], /适用用户/);
  assert.equal(await page.locator('legend', { hasText: '申请附件（选填）' }).count(), 1);

  await page.getByRole('link', { name: '取消' }).click();
  await page.waitForURL('**/apps');

  await page.getByRole('link', { name: '应用上线申请' }).click();
  await page.waitForURL('**/apps/onboarding/apply');
  await page.locator('form.apply-form').waitFor();
  await fillRequiredFields({ type: 'T003', name: 'TEST_RPA应用上架', code: 'RPA-TEST-20260910' });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'test-rpa-icon.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
  });
  await page.getByRole('button', { name: '提交审核' }).click();
  await page.waitForURL('**/apps/onboarding/status');
  assert.equal(approvalRequest?.method, 'POST');
  assert.match(approvalRequest?.contentType || '', /^multipart\/form-data; boundary=/);
  assert.match(approvalRequest?.body || '', /name="request"/);
  assert.match(approvalRequest?.body || '', /"应用类型":"T003"/);
  assert.match(approvalRequest?.body || '', /"应用编码":"RPA-TEST-20260910"/);
  assert.match(approvalRequest?.body || '', /"申请人联系电话":"13900000000"/);
  assert.match(approvalRequest?.body || '', /"申请人联系邮箱":"linmm@example\.com"/);
  assert.match(approvalRequest?.body || '', /"接入人所属部门ID":"D004"/);
  assert.match(approvalRequest?.body || '', /"RPA所属平台":"测试平台"/);
  assert.match(approvalRequest?.body || '', /name="file"; filename="test-rpa-icon\.png"/);

  await page.goto(`${origin}/apps/onboarding/apply`, { waitUntil: 'domcontentloaded' });
  await page.locator('form.apply-form').waitFor();
  await fillRequiredFields({ type: 'T005', name: 'TEST_海能Work应用上架', code: 'TEST_HW_001' });
  const permission = page.locator('fieldset').filter({ hasText: '应用权限开通' });
  await permission.getByLabel('适用部门*').selectOption({ label: '物资采购中心' });
  await permission.getByLabel('适用用户*').selectOption('linmm');
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'test-hw-icon.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
  });
  await page.locator('.upload-list li.ready').waitFor();
  await page.getByRole('button', { name: '提交审核' }).click();
  await page.waitForURL('**/apps/onboarding/status?applicationId=TEST_APPLICATION');
  await page.getByText('飞书审批中', { exact: true }).first().waitFor();
  assert.equal(onboardingRequest.application.type, 'T005');
  assert.equal(onboardingRequest.application.name, 'TEST_海能Work应用上架');
  assert.equal(onboardingRequest.application.applicationCode, 'TEST_HW_001');
  assert.deepEqual(onboardingRequest.uploadIds, ['TEST_UPLOAD_ICON']);
  assert.match(onboardingRequest.attemptId, /^TEST_ATTEMPT_/);
  assert.deepEqual(errors, []);
  console.log('应用上线申请浏览器链路通过：RPA 后端提交、T005 飞书实例提交、真实状态查询');
} finally {
  await browser.close();
}
