import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'file:///C:/Users/20266/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = 'http://127.0.0.1:4173';
const output = resolve('evidence/form-control-route-remediation');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--disable-background-networking', '--force-device-scale-factor=1']
});

const results = [];
const pageErrors = [];
const externalRequests = [];
const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('request', request => {
  const url = new URL(request.url());
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
});

async function tabRoundTrip(locator) {
  await locator.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert.equal(await locator.evaluate(node => node === document.activeElement), true, 'Tab 必须把键盘焦点送回目标控件');
  await page.waitForTimeout(180);
}

async function styleSnapshot(locator) {
  return locator.evaluate(node => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      tag: node.tagName.toLowerCase(),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      backgroundColor: style.backgroundColor,
      cursor: style.cursor,
      ariaInvalid: node.getAttribute('aria-invalid'),
      width: rect.width,
      height: rect.height
    };
  });
}

function assertBlueSingleRing(before, focused, label) {
  assert.equal(focused.outlineStyle, 'none', `${label} 不得保留浏览器或橙色 outline`);
  assert.match(focused.borderColor, /rgb\(8, 111, 232\)/, `${label} 必须使用冻结蓝色边框`);
  assert.match(focused.boxShadow, /rgba\(8, 112, 232, 0\.18\)/, `${label} 必须只有低对比蓝色外环`);
  assert.equal(focused.width, before.width, `${label} 聚焦不能改变宽度`);
  assert.equal(focused.height, before.height, `${label} 聚焦不能改变高度`);
  assert.doesNotMatch(`${focused.borderColor} ${focused.boxShadow}`, /255, 159, 26/, `${label} 不得出现橙色表单焦点`);
}

async function visit(route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, `${route} 必须 HTTP 200`);
  await page.evaluate(() => document.fonts.ready);
}

async function verifyControl({ name, route, selector, comboSelector }) {
  await visit(route);
  const control = page.locator(selector).first();
  await control.waitFor({ state: 'visible' });
  const before = await styleSnapshot(control);
  await page.screenshot({ path: resolve(output, `${name}-unfocused.png`), animations: 'disabled' });
  await tabRoundTrip(control);
  const focused = await styleSnapshot(control);
  let combo = null;
  if (comboSelector) {
    assert.equal(focused.outlineStyle, 'none', `${name} 内层 input 不得保留浏览器 outline`);
    assert.equal(focused.width, before.width, `${name} 聚焦不能改变宽度`);
    assert.equal(focused.height, before.height, `${name} 聚焦不能改变高度`);
    assert.doesNotMatch(`${focused.borderColor} ${focused.boxShadow}`, /255, 159, 26/, `${name} 不得出现橙色表单焦点`);
    combo = await styleSnapshot(page.locator(comboSelector).first());
    assert.match(combo.borderColor, /rgb\(8, 111, 232\)/, `${name} 组合控件必须由外层承载蓝色边框`);
    assert.match(combo.boxShadow, /rgba\(8, 112, 232, 0\.18\)/, `${name} 组合控件必须由外层承载蓝色外环`);
    assert.equal(focused.boxShadow, 'none', `${name} 组合控件内层 input 不得重复绘制外环`);
  } else {
    assertBlueSingleRing(before, focused, name);
  }
  await page.screenshot({ path: resolve(output, `${name}-focused.png`), animations: 'disabled' });
  results.push({ name, route, selector, before, focused, combo });
}

try {
  await visit('/');
  assert.equal(new URL(page.url()).pathname, '/workbench', '首次进入根路径必须无闪烁初始化为 /workbench');
  assert.equal(await page.getByText('页面不存在加载失败').count(), 0, '首次进入不得显示不存在页面错误态');
  results.push({ name: 'root-route', route: '/', resolvedPath: new URL(page.url()).pathname });

  await verifyControl({
    name: 'workbench-scene-search',
    route: '/workbench',
    selector: '.scene-search input[type="search"]',
    comboSelector: '.scene-search label'
  });
  await verifyControl({
    name: 'announcements-type-select',
    route: '/announcements',
    selector: '.notice-filters select'
  });
  await verifyControl({
    name: 'announcements-date-range',
    route: '/announcements',
    selector: '.date-range input[aria-label="开始日期"]',
    comboSelector: '.date-range'
  });
  await verifyControl({
    name: 'operations-admin-filter',
    route: '/operations/apps',
    selector: '.app-admin form input'
  });
  await verifyControl({
    name: 'talent-filter',
    route: '/talent/people',
    selector: '.talent-body form input[aria-label="搜索人才"]'
  });
  await verifyControl({
    name: 'announcement-editor-textarea',
    route: '/operations/announcements/notice-001/edit',
    selector: '.editor-page textarea'
  });

  await visit('/talent/projects?drawer=create');
  const disabled = page.locator('aside input[name="id"]');
  await disabled.waitFor({ state: 'visible' });
  const disabledStyle = await styleSnapshot(disabled);
  assert.equal(await disabled.isDisabled(), true, '抽屉编号字段必须保持 disabled');
  assert.equal(disabledStyle.cursor, 'not-allowed', 'disabled 字段必须使用统一禁用光标');
  await page.getByRole('button', { name: '保存' }).click();
  const invalid = page.locator('aside input[name="name"]');
  assert.equal(await invalid.getAttribute('aria-invalid'), 'true', '首错字段必须暴露 aria-invalid');
  assert.equal(await invalid.evaluate(node => node === document.activeElement), true, '提交错误后必须聚焦首错字段');
  await page.waitForTimeout(180);
  const errorStyle = await styleSnapshot(invalid);
  assert.match(errorStyle.borderColor, /rgb\(198, 40, 40\)/, '错误字段必须使用统一红色边框');
  assert.doesNotMatch(`${errorStyle.borderColor} ${errorStyle.boxShadow}`, /255, 159, 26/, '错误字段不得出现橙色焦点框');
  await page.screenshot({ path: resolve(output, 'talent-drawer-disabled-error.png'), animations: 'disabled' });
  results.push({ name: 'talent-drawer-disabled-error', route: '/talent/projects?drawer=create', disabled: disabledStyle, error: errorStyle });

  assert.deepEqual(pageErrors, [], '真实 Edge 不得出现 pageerror');
  assert.deepEqual(externalRequests, [], '真实 Edge 不得访问非本地网络');
} finally {
  await writeFile(resolve(output, 'browser-results.json'), `${JSON.stringify({ results, pageErrors, externalRequests }, null, 2)}\n`, 'utf8');
  await context.close();
  await browser.close();
}

console.log(JSON.stringify({ result: 'pass', cases: results.length, pageErrors, externalRequests, output }, null, 2));
