import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/TrainingPage.vue', import.meta.url), 'utf8');

assert.doesNotMatch(source, /training-course-\d+\.png/,
  '培训课程卡片必须移除装饰性图表图片');
assert.doesNotMatch(source, /course-grid[\s\S]*?<header><img/,
  '培训卡片头部不得继续保留图片槽位');
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

assert.match(source, /\.training-page\s*\{[^}]*min-height:\s*100%;[^}]*padding:\s*18px 20px 26px/,
  '培训页主体必须与全站内容边距对齐');
assert.match(source, /\.course-grid\s*>\s*article\s*\{[^}]*min-height:\s*340px;[^}]*border-radius:\s*7px/,
  '培训卡片必须提高纵向比例并保持操作区底部对齐');
assert.match(source, /@media\s*\(max-width:\s*1280px\)\s*\{[\s\S]*?\.course-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/,
  '培训卡片必须在中等分辨率切换为双列');
assert.match(source, /<dl class="course-status">[\s\S]*?<dt>报名人数<\/dt>[\s\S]*?<dt>活动形式<\/dt>/,
  '培训卡片状态信息必须按应用卡片方式分段展示');
assert.match(source, /\.course-grid\s*>\s*article\s*>\s*header\s*\{[^}]*display:\s*grid/,
  '培训卡片头部必须使用稳定的纵向网格排版');
assert.match(source, /09-04（周五）14:00/,
  '培训演示数据必须使用当前档期而不是过期月份');

console.log('培训页 fresh 低对比边框视觉合同通过');
