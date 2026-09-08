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
page.on('pageerror', error => errors.push(error.message));

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
  assert.equal(await page.locator('legend', { hasText: '附件上传（选填）' }).count(), 1);

  await page.getByRole('link', { name: '取消' }).click();
  await page.waitForURL('**/apps');

  await page.getByRole('link', { name: '应用上线申请' }).click();
  await page.waitForURL('**/apps/onboarding/apply');
  await page.locator('form.apply-form').waitFor();
  await page.locator('form.apply-form').evaluate(form => { form.noValidate = true; });
  await page.getByRole('button', { name: '提交审核' }).click();
  assert.equal(await page.getByRole('heading', { name: '申请已提交' }).count(), 1);
  await page.getByRole('link', { name: '查看审批状态' }).click();
  await page.waitForURL('**/apps/onboarding/status');
  await page.getByRole('heading', { name: '审批状态' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: '审批状态' }).count(), 1);
  assert.deepEqual(errors, []);
  console.log('应用上线申请浏览器链路通过：进入表单、取消返回、提交反馈、查看审批状态');
} finally {
  await browser.close();
}
