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
const appBase = String(process.env.EXHIBITION_TEST_APP_BASE || '/test2').replace(/\/$/, '');
const sha256 = 'abcdef0123456789'.repeat(4);
const detail = {
  applicationId: 'TEST_APP_QA',
  businessId: 'TEST_BUSINESS_QA',
  resourceId: 'TEST_RESOURCE_QA',
  instanceId: '',
  applicationName: 'TEST_窄屏响应式验证',
  applicationCode: 'TEST_HW_QA',
  applicationType: '海能Work应用',
  businessDomain: '供应链管理',
  applicantName: '测试申请人',
  submittedAt: '2026-09-26T12:00:00.000Z',
  lastSyncedAt: '2026-09-26T12:01:00.000Z',
  status: 'PENDING',
  currentNode: '审批中',
  authorizedUsers: ['测试用户'],
  authorizedDepartments: ['测试部门'],
  icon: {
    fileId: 'TEST_ICON_QA',
    fileName: 'TEST_ONBOARDING_ICON_QA.png',
    detectedType: 'PNG',
    mimeType: 'image/png',
    sizeBytes: 128,
    sha256,
    previewable: true,
    uploadedAt: '2026-09-26T12:00:00.000Z'
  },
  attachments: []
};

const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext();

async function installRoutes(page) {
  await page.route('**/api/v1/auth/feishu/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'OK', identity: { userId: 'TEST_USER_QA', displayName: '测试申请人' } })
  }));
  await page.route('**/api/v1/onboarding/applications/TEST_APP_QA', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(detail)
  }));
  await page.route('**/api/v1/operations/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'OK', data: { items: [], total: 0 } })
  }));
}

try {
  const detailPage = await context.newPage();
  await detailPage.setViewportSize({ width: 320, height: 800 });
  await installRoutes(detailPage);
  await detailPage.goto(`${origin}${appBase}/apps/onboarding/status?applicationId=TEST_APP_QA`, { waitUntil: 'domcontentloaded' });
  const hash = detailPage.locator('.icon-file code');
  await hash.waitFor();
  const hashGeometry = await hash.evaluate(element => {
    const box = element.getBoundingClientRect();
    const parentBox = element.parentElement.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      box: { left: box.left, right: box.right, width: box.width },
      parent: { left: parentBox.left, right: parentBox.right, width: parentBox.width },
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      display: style.display,
      width: style.width,
      minWidth: style.minWidth,
      maxWidth: style.maxWidth,
      whiteSpace: style.whiteSpace,
      userSelect: style.userSelect,
      overflowWrap: style.overflowWrap,
      wordBreak: style.wordBreak,
      text: element.textContent
    };
  });

  const applyPage = await context.newPage();
  await applyPage.setViewportSize({ width: 320, height: 800 });
  await installRoutes(applyPage);
  await applyPage.goto(`${origin}${appBase}/apps/onboarding/apply`, { waitUntil: 'domcontentloaded' });
  const authLinkCount = await applyPage.getByRole('link', { name: '飞书授权' }).count();
  const backLink = applyPage.getByRole('link', { name: '返回应用中心' });
  await backLink.waitFor();
  const backAt320 = await backLink.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, display: getComputedStyle(element).display };
  });
  await applyPage.setViewportSize({ width: 760, height: 900 });
  const backAt760 = await backLink.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, display: getComputedStyle(element).display };
  });

  const failures = [];
  if (hashGeometry.box.right > hashGeometry.viewportWidth + 0.5) failures.push(`icon hash exceeds viewport: ${hashGeometry.box.right} > ${hashGeometry.viewportWidth}`);
  if (hashGeometry.box.width > hashGeometry.parent.width + 0.5) failures.push(`icon hash exceeds parent: ${hashGeometry.box.width} > ${hashGeometry.parent.width}`);
  if (hashGeometry.documentWidth > hashGeometry.viewportWidth + 0.5) failures.push(`document has horizontal overflow: ${hashGeometry.documentWidth} > ${hashGeometry.viewportWidth}`);
  if (!hashGeometry.text.includes(sha256)) failures.push('full SHA-256 is not exposed as selectable text');
  if (hashGeometry.userSelect === 'none') failures.push('SHA-256 text cannot be selected for copying');
  if (authLinkCount !== 0) failures.push(`Feishu authorization link remains focusable: ${authLinkCount}`);
  if (backAt320.height < 44) failures.push(`Back target at 320px is ${backAt320.height}px high; expected >= 44px`);
  if (backAt760.height < 44) failures.push(`Back target at 760px is ${backAt760.height}px high; expected >= 44px`);

  assert.deepEqual(failures, [], JSON.stringify({ hashGeometry, authLinkCount, backAt320, backAt760, failures }, null, 2));
  console.log(JSON.stringify({ hashGeometry, authLinkCount, backAt320, backAt760 }, null, 2));
  console.log('onboarding narrow-screen hash, removed authorization entry, and back target accessibility passed');
} finally {
  await context.close();
  await browser.close();
}
