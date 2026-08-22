import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const workbench = read('src/pages/WorkbenchPage.vue');
const workbenchFixtures = read('src/state/workbench-profile-controllers.js');
const workbenchAuthority = workbench + workbenchFixtures;

for (const label of ['素材中心', 'RPA', '大屏', '驾驶舱', '可视化报表', '指标', '数据集', 'AI', '海能work应用', '场景化搜索']) {
  assert.ok(shell.includes(label), `工作台侧栏缺少：${label}`);
}

for (const content of [
  '上午好，张三丰',
  '数据截至：2025-05-08',
  '最后更新：10:18',
  '数据集',
  '186',
  '帆软报表',
  '92',
  'RPA机器人',
  '64',
  'EAD应用',
  '18',
  'AI智能体',
  '27',
  '其他应用',
  '35',
  '供应商评估看板',
  '库存周转分析报表',
  '增值税发票查验机器人',
  '电子发票录入校验',
  '应用访问次数',
  '应用使用次数',
  '收藏应用数'
]) {
  assert.ok(workbenchAuthority.includes(content), `工作台缺少权威内容：${content}`);
}

assert.match(workbench, /\/assets\/overview-dataset\.png/);
assert.match(workbenchAuthority, /\/assets\/hot-supplier\.png/);
assert.match(workbench, /\/assets\/training-ai\.png/);
assert.match(workbench, /\/assets\/usage-visits\.png/);
assert.doesNotMatch(workbench, /2026年8月19日/);

console.log('首页工作台权威布局与原子资产合同测试通过');
