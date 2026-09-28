import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const map = JSON.parse(readFileSync(new URL('./ui-regression-retirement-map.json', import.meta.url), 'utf8'));
assert.equal(map.version, 'ui-regression-retirement-map.v1');
assert.equal(map.retirements.length, 3);
for (const retirement of map.retirements) {
  assert.equal(existsSync(new URL(`../${retirement.missing}`, import.meta.url)), false, `${retirement.missing} 必须保持明确退役，不能以模拟实现回填`);
  assert.ok(retirement.reason.length >= 12, `${retirement.missing} 缺少退役原因`);
  assert.ok(retirement.replacements.length >= 2, `${retirement.missing} 缺少替代覆盖映射`);
  for (const replacement of retirement.replacements) assert.equal(existsSync(new URL(`../${replacement}`, import.meta.url)), true, `替代覆盖不存在：${replacement}`);
}
const indicator = map.retirements.find(item => item.missing.endsWith('IndicatorBuildDialog.vue'));
assert.ok(indicator.replacements.includes('src/components/RemoteAppDetailPage.vue'));
assert.deepEqual(map.migrations.map(item => item.source.split(':').at(-1)), [
  'CertificationPage', 'TalentPeoplePage', 'TalentProjectsPage', 'OperationsPage', 'MaterialsPage',
  'GlobalTypographyTokens', 'NoticeFilterIcons', 'AppsPageFilterLabels', 'PointsPageDynamics'
]);

console.log('缺失 fixture/component 断言已明确退役，并映射到现存远端详情与交互回归测试');
