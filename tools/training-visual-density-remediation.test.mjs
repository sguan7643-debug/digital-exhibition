import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/TrainingPage.vue', import.meta.url), 'utf8');

assert.doesNotMatch(source, /training-course-\d+\.png/,
  '培训课程不得继续使用包含文字或控件的复合截图裁切');
assert.match(source, /<dl class="course-status">[\s\S]*报名人数[\s\S]*活动形式/,
  '培训课程必须用真实 HTML 分段展示报名状态');
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

assert.match(source, /\.training-page\s*\{[\s\S]*?min-height:\s*100%;[\s\S]*?padding:\s*18px 20px 26px/,
  '培训页主体必须使用 2026-09-04 视觉源内容边距');
assert.match(source, /\.training-hero\s*\{[^}]*border:\s*1px solid #d5e2ed/,
  '培训 Hero 外框必须使用新版蓝灰边框');
assert.match(source, /\.hero-stats article\s*\{[^}]*background:\s*rgba\(255, 255, 255, 0\.88\);[^}]*border:\s*1px solid #d5e2ed/,
  '培训统计卡必须使用新版通透蓝白表面');
assert.match(source, /\.training-tabs\s*\{[^}]*border-bottom:\s*1px solid #d9e3ec/,
  '培训分类分隔线必须使用新版层级');
assert.match(source, /\.course-grid > article\s*\{[^}]*min-height:\s*276px;[^}]*background:\s*#fff;[^}]*border:\s*1px solid #d6e1eb/,
  '培训课程卡必须使用新版方正卡片比例');
assert.match(source, /\.course-grid > article\s*\{[^}]*min-height:\s*340px/,
  '培训课程卡最终高度必须容纳新版内容层级');
assert.match(source, /\.training-pagination button\s*\{[^}]*border:\s*1px solid #d2dce6/,
  '培训分页边框必须使用同一新版层级');

console.log('培训页 fresh 低对比边框视觉合同通过');
