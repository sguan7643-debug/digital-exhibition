import assert from 'node:assert/strict';
import { PAGE_MATRIX, FIXTURE_CLOCK, FIXTURE_SEED, resolvePage } from '../src/fixtures/pages.js';

const expectedRoutes = [
  '/workbench',
  '/messages',
  '/favorites',
  '/profile',
  '/announcements',
  '/announcements/notice-001',
  '/apps',
  '/apps/tool-001',
  '/apps/haineng-work-001',
  '/apps/report-001',
  '/apps/dashboard-001',
  '/apps/dataset-001',
  '/apps/metric-001',
  '/apps/ai-001',
  '/apps/ead-001',
  '/apps/rpa-001',
  '/apps/onboarding/status',
  '/points',
  '/points/details',
  '/training',
  '/operations',
  '/operations/announcements',
  '/operations/announcements/notice-001/edit',
  '/operations/apps',
  '/operations/apps/app-001/edit',
  '/admin',
  '/certification',
  '/talent/people',
  '/talent/projects',
  '/talent/progress'
];

assert.equal(PAGE_MATRIX.length, 30);
assert.deepEqual(
  PAGE_MATRIX.map(page => page.route),
  expectedRoutes
);
assert.equal(new Set(PAGE_MATRIX.map(page => page.id)).size, 30);
assert.equal(new Set(PAGE_MATRIX.map(page => page.fixture)).size, 30);
assert.equal(FIXTURE_CLOCK, '2026-08-19T09:00:00+08:00');
assert.equal(FIXTURE_SEED, 817);

for (const page of PAGE_MATRIX) {
  assert.match(page.id, /^\d{2}$/);
  assert.match(page.reference, /\.png$/);
  assert.ok(Number.isInteger(page.width) && page.width > 0);
  assert.ok(Number.isInteger(page.height) && page.height > 0);
  assert.match(page.sha256, /^[A-F0-9]{64}$/);
  assert.ok(['canvas', 'fullPage'].includes(page.capture));
  assert.deepEqual(page.states.slice(0, 5), ['normal', 'loading', 'error', 'disabled', 'permission-denied']);
  assert.equal(page.states.includes('empty'), page.empty);
}
assert.deepEqual(
  PAGE_MATRIX.filter(page => page.capture === 'fullPage').map(page => page.id),
  ['08', '10', '11', '12', '16']
);
assert.equal(PAGE_MATRIX.filter(page => page.empty).length, 15);

assert.equal(resolvePage('/talent/people?drawer=person-001').id, '28');
assert.equal(resolvePage('/talent/projects?drawer=create').id, '29');
assert.equal(resolvePage('/unknown'), undefined);
assert.equal(resolvePage('/workbench', 'loading').state, 'loading');
assert.equal(resolvePage('/profile', 'empty').state, 'normal');
assert.equal(resolvePage('/messages', 'empty').state, 'empty');

console.log('30 路由与确定性 fixture 合同测试通过');
