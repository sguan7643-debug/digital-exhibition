import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGE_MATRIX, resolvePage } from '../src/fixtures/pages.js';

assert.equal(PAGE_MATRIX.length, 30, '权威路由矩阵必须保留 30 个基线页面');
assert.deepEqual(PAGE_MATRIX.map((page) => page.id), Array.from({ length: 30 }, (_, index) => String(index + 1).padStart(2, '0')));

for (const page of PAGE_MATRIX) {
  assert.ok(page.route.startsWith('/'), `${page.id} 路由必须是站内绝对路径`);
  assert.ok(page.title.length > 1, `${page.id} 缺少页面标题`);
  assert.ok(page.role.length > 1, `${page.id} 缺少访问角色`);
  assert.ok(page.states.includes('normal'), `${page.id} 缺少正常态`);
  assert.ok(page.states.includes('loading'), `${page.id} 缺少加载态`);
  assert.ok(page.states.includes('error'), `${page.id} 缺少错误态`);
  assert.ok(page.states.includes('disabled'), `${page.id} 缺少禁用态`);
  assert.ok(page.states.includes('permission-denied'), `${page.id} 缺少权限不足态`);
  assert.equal(resolvePage(`http://127.0.0.1:4173/test2${page.route}`, 'normal', '/test2')?.id, page.id,
    `${page.id} 必须能在 /test2 子路径部署下解析`);
}

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
for (const page of PAGE_MATRIX) {
  assert.ok(app.includes(`page.id === '${page.id}'`), `${page.id} 必须挂载专用 Vue 页面实现`);
}
assert.doesNotMatch(app, /PortalPage|portal-page/,
  '真实路由不得回退到旧的通用 Portal 模板和稳定 mock 条目');
assert.match(app, /<page-state-boundary/,
  '全部专用页面必须继续由统一六态边界承载');

console.log('30 个权威路由、专用 Vue 页面与统一六态合同测试通过');
