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

const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(`${origin}/apps/onboarding/apply`, { waitUntil: 'domcontentloaded' });
  await page.locator('form.apply-form').waitFor();
  assert.equal(await page.getByLabel('应用类型*').inputValue(), 'T003');
  assert.match(await page.getByLabel('应用名称*').inputValue(), /^TEST_RPA_/);
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'TEST_RPA_应用图标.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#2456d6"/></svg>')
  });

  const responsePromise = page.waitForResponse(response =>
    response.url().endsWith('/api/processInstanceStart') && response.request().method() === 'POST',
    { timeout: 120000 }
  );
  await page.getByRole('button', { name: '提交审核' }).click();
  const response = await responsePromise;
  const result = await response.json();
  console.log(JSON.stringify({ httpStatus: response.status(), code: result.code, message: result.message }));
  assert.equal(response.status(), 200);
  assert.deepEqual(errors, []);
  assert.equal(result.code, '00000', `后端业务失败：${result.message || result.code}`);
  await page.getByRole('heading', { name: '申请已提交' }).waitFor();
  console.log('真实审批联调通过：浏览器 → 4174 同源代理 → 10.151.23.119:28080 → 审批返回成功');
} finally {
  await browser.close();
}
