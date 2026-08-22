import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const favorites = read('src/pages/FavoritesPage.vue');
const notice = read('src/pages/NoticeDetailPage.vue');
const controllers = read('src/state/content-controllers.js');

assert.match(
  shell,
  /\.topbar\{height:63px/,
  '统一顶栏必须保持用户已验收的 63px 几何'
);
assert.doesNotMatch(shell, /\.(?:standard-shell|app-detail-shell) \.topbar\s*\{/,
  '逐页视觉校准不得破坏统一顶栏结构和尺寸');
assert.match(
  controllers,
  /page:1,pageSize:8,announcement/,
  '收藏页首屏必须按冻结参考渲染两行共 8 张卡片'
);
assert.match(favorites, /<option>8条\/页<\/option>/, '分页可感知文案必须与实际 8 条页大小一致');
assert.match(favorites, /class="favorite-filters"[\s\S]*@click="resetData">重置<\/button>[\s\S]*<\/form>/,
  '演示数据重置必须位于冻结筛选栏，而不是挤压分页');
assert.doesNotMatch(favorites, /class="favorite-pagination"[\s\S]{0,220}@click="resetData"/,
  '分页栏不得包含冻结参考中不存在的演示重置按钮');
assert.match(favorites, /grid-template-columns:repeat\(4,1fr\)/, '收藏首屏必须保留四列卡片');
assert.match(favorites, /height:211px/, '收藏卡片高度必须保持冻结参考 211px');
assert.match(favorites, /\.favorite-grid\{[^}]*background:#fafcff/,
  '收藏首屏八卡结果区必须使用像素模拟正向的蓝白表面色');
assert.match(notice, /\.notice-sheet\{[^}]*background:#fafcff/,
  '通知详情主内容面板必须使用像素模拟正向的蓝白表面色');
assert.match(favorites, /@media\(min-width:761px\)\{\.favorites-page\{padding-top:33px\}\}/,
  '统一 63px 顶栏下，收藏页必须用 33px 顶距对齐冻结内容起点，不能改变全局顶栏');

console.log('统一顶栏不回退与收藏首屏密度视觉合同通过');
