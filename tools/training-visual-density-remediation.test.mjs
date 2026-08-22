import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/TrainingPage.vue', import.meta.url), 'utf8');

for (const asset of [
  'training-course-01.png',
  'training-course-02.png',
  'training-course-03.png',
  'training-course-04.png',
  'training-course-05.png',
  'training-course-06.png',
]) {
  assert.ok(source.includes(asset),
    `培训课程必须逐卡使用冻结培训页的同源原子图标：${asset}`);
}
for (const staleAsset of [
  'training-ai.png',
  'training-procurement.png',
  'training-community.png',
  'hot-invoice.png',
  'overview-ai.png',
]) {
  assert.ok(!source.includes(staleAsset),
    `培训课程不得继续复用其他页面或错误语义的图标：${staleAsset}`);
}

assert.match(source, /\.training-page\{padding:24px 19px 18px/,
  '培训页主体必须按 fresh 纵向配准下移 6px，保持固定壳层不变');
assert.match(source, /\.training-hero\{[^}]*border:1px solid #f4faff/,
  '培训 Hero 外框必须使用冻结参考的低对比蓝白色');
assert.match(source, /\.hero-stats article\{[^}]*border:1px solid #f4faff/,
  '培训统计卡边框必须与冻结参考一致');
assert.match(source, /\.hero-stats article\{[^}]*background:#fafcff/,
  '培训统计卡必须使用像素模拟正向的蓝白表面色');
assert.match(source, /\.training-tabs\{[^}]*border-bottom:1px solid #f4faff/,
  '培训分类分隔线不得继续使用过重蓝灰色');
assert.match(source, /\.course-grid>article\{[^}]*border:1px solid #f4faff/,
  '培训课程卡边框必须与冻结参考一致');
assert.match(source, /\.course-grid>article\{[^}]*background:#fafcff/,
  '培训课程卡必须使用像素模拟正向的蓝白表面色');
assert.match(source, /\.training-pagination button\{[^}]*border:1px solid #f4faff/,
  '培训分页边框必须使用同一低对比层级');

console.log('培训页 fresh 低对比边框视觉合同通过');
