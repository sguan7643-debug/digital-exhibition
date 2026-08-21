import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGE_CONTENT } from '../src/fixtures/page-content.js';

const expectedKinds = {
  '02': 'messages', '03': 'cards', '04': 'profile', '05': 'announcements', '06': 'notice-detail',
  '07': 'apps', '08': 'app-detail', '09': 'app-detail', '10': 'app-detail', '11': 'app-detail',
  '12': 'app-detail', '13': 'app-detail', '14': 'app-detail', '15': 'app-detail', '16': 'app-detail',
  '17': 'onboarding', '18': 'points', '19': 'points-detail', '20': 'training', '21': 'operations',
  '22': 'management-table', '23': 'editor', '24': 'management-table', '25': 'editor', '26': 'admin',
  '27': 'certification', '28': 'talent-table', '29': 'talent-table', '30': 'talent-table'
};

assert.deepEqual(Object.keys(PAGE_CONTENT), Object.keys(expectedKinds));
for (const [id, kind] of Object.entries(expectedKinds)) {
  const content = PAGE_CONTENT[id];
  assert.equal(content.kind, kind, `${id} 的页面类型错误`);
  assert.ok(content.heading.length > 1, `${id} 缺少标题`);
  assert.ok(content.description.length > 5, `${id} 缺少说明`);
  assert.ok(content.items.length >= 3, `${id} 缺少稳定 mock 条目`);
}

const portal = readFileSync(new URL('../src/pages/PortalPage.vue', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
for (const kind of new Set(Object.values(expectedKinds))) assert.ok(portal.includes(kind), `模板缺少 ${kind}`);
assert.match(portal, /aria-label="筛选条件"/);
assert.match(portal, /<table/);
assert.match(portal, /<form/);
assert.match(app, /<portal-page/);

console.log('其余 29 页的权威页面类型与确定性内容合同测试通过');
