import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/TrainingPage.vue', import.meta.url), 'utf8');

assert.match(source, /\.training-hero\{[^}]*border:1px solid #f4faff/,
  '培训 Hero 外框必须使用冻结参考的低对比蓝白色');
assert.match(source, /\.hero-stats article\{[^}]*border:1px solid #f4faff/,
  '培训统计卡边框必须与冻结参考一致');
assert.match(source, /\.training-tabs\{[^}]*border-bottom:1px solid #f4faff/,
  '培训分类分隔线不得继续使用过重蓝灰色');
assert.match(source, /\.course-grid>article\{[^}]*border:1px solid #f4faff/,
  '培训课程卡边框必须与冻结参考一致');
assert.match(source, /\.training-pagination button\{[^}]*border:1px solid #f4faff/,
  '培训分页边框必须使用同一低对比层级');

console.log('培训页 fresh 低对比边框视觉合同通过');
