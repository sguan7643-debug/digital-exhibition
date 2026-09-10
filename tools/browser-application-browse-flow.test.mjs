import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const executablePath = [process.env.BROWSER_EXECUTABLE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find(fs.existsSync);
if (!executablePath) throw new Error('未找到 Edge/Chromium');
const origin = process.env.EXHIBITION_TEST_ORIGIN || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${origin}/apps?category=RPA`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '应用中心', level: 1 }).waitFor();
  assert.equal(await page.getByText('RPA', { exact: true }).first().count(), 1);
  const cards = page.locator('.apps-grid > article');
  assert.ok(await cards.count() >= 1);
  for (const category of await cards.locator('.app-tags mark:first-child').allTextContents()) assert.equal(category.trim(), 'RPA');
  await page.getByLabel('应用名称或关键词').fill('招投标');
  await page.getByRole('button', { name: '查询' }).click();
  assert.equal(await cards.count(), 1);
  await cards.first().getByRole('link', { name: '查看详情' }).click();
  await page.waitForURL('**/apps/rpa-001');
  await page.getByRole('heading', { name: '供应商信息自动录入机器人' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('应用浏览 Edge 链路通过：T003 筛选、关键词检索、单一结果、详情导航');
} finally { await browser.close(); }
