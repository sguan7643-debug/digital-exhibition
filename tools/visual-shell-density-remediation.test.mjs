import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const messages = read('src/pages/MessagesPage.vue');
const announcements = read('src/pages/AnnouncementsPage.vue');
const appAdmin = read('src/pages/AppAdminPage.vue');
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
  /page:1,pageSize:10,announcement/,
  '收藏页必须遵循全系统统一的默认每页 10 条合同'
);
assert.match(favorites, /PaginationControl/, '收藏页必须复用共享分页组件');
assert.match(favorites, /class="favorite-filters"[\s\S]*@click="resetData">重置<\/button>[\s\S]*<\/form>/,
  '演示数据重置必须位于冻结筛选栏，而不是挤压分页');
assert.doesNotMatch(favorites, /class="favorite-pagination"[\s\S]{0,220}@click="resetData"/,
  '分页栏不得包含冻结参考中不存在的演示重置按钮');
assert.match(favorites, /grid-template-columns:repeat\(4,1fr\)/, '收藏首屏必须保留四列卡片');
assert.match(favorites, /height:211px/, '收藏卡片高度必须保持冻结参考 211px');
assert.match(favorites, /\.favorite-grid h2\{[^}]*font-size:16px/,
  '收藏卡片标题字号必须匹配冻结参考层级');
assert.match(favorites, /\.favorite-grid>article>p\{[^}]*font-size:11px/,
  '收藏卡片摘要字号必须匹配冻结参考层级');
assert.match(favorites, /\.favorite-grid dl div\{[^}]*font-size:10px/,
  '收藏卡片元数据字号必须匹配冻结参考层级');
assert.match(favorites, /\.favorite-grid footer a,\.favorite-grid footer button\{[^}]*font-size:11px/,
  '收藏卡片操作字号必须匹配冻结参考层级');
assert.match(favorites, /\.favorite-grid\{[^}]*background:#fafcff/,
  '收藏首屏八卡结果区必须使用像素模拟正向的蓝白表面色');
assert.match(notice, /\.notice-sheet\{[^}]*background:#fafcff/,
  '通知详情主内容面板必须使用像素模拟正向的蓝白表面色');
assert.match(notice, /\.notice-page\{[^}]*padding:28px 21px 0 7px/,
  '通知详情主体必须按冻结参考校准四向内容起点');
assert.match(messages, /\.messages-page\{[^}]*padding:27px 27px 21px 40px/,
  '消息中心主体必须按冻结参考校准顶部与左侧配准');
assert.match(announcements, /\.announcements-page\{[^}]*padding:47px 26px 15px 39px/,
  '公告通知主体必须按冻结参考校准顶部与左侧配准');
assert.match(announcements, /\.announcements-page>header\{height:78px/,
  '公告通知标题区高度必须让统计卡起点匹配冻结参考');
assert.match(appAdmin, /\.app-admin\{padding:31px 33px 20px 19px/,
  '应用运营管理主体必须按冻结参考校准四向内容起点');
assert.match(appAdmin, /\.app-admin-stats\{[^}]*margin:24px 0 15px/,
  '应用运营管理统计区必须按冻结参考校准上下节奏');
assert.match(appAdmin, /\.app-admin header>a\{[^}]*margin-top:12px/,
  '新建应用按钮必须按冻结参考校准垂直位置');
assert.match(favorites, /@media\(min-width:761px\)\{\.favorites-page\{padding-top:33px\}\}/,
  '统一 63px 顶栏下，收藏页必须用 33px 顶距对齐冻结内容起点，不能改变全局顶栏');

console.log('统一顶栏不回退与收藏首屏密度视觉合同通过');
