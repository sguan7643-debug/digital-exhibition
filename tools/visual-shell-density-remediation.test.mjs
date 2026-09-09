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
  '统一顶栏必须保持新版 63px 几何'
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
assert.match(favorites, /\.favorite-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
  '新版收藏首屏必须使用三列自适应卡片');
assert.match(favorites, /\.favorite-grid > article\s*\{[\s\S]*?min-height:\s*314px/,
  '新版收藏卡片必须为完整元数据和四项操作预留高度');
assert.match(favorites, /\.favorite-title-row h2\s*\{[\s\S]*?text-overflow:\s*ellipsis/,
  '收藏卡片标题必须保持单行截断，避免破坏卡片栅格');
assert.match(favorites, /\.favorite-grid dl\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  '收藏卡片元数据必须按两列稳定排布');
assert.match(favorites, /\.favorite-grid footer\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/,
  '收藏卡片必须完整保留四项操作');
assert.match(favorites, /\.favorite-grid > article\s*\{[\s\S]*?background:\s*#fff/,
  '新版收藏卡片必须使用白色表面');
assert.match(notice, /\.notice-sheet\{[^}]*background:#fafcff/,
  '通知详情主内容面板必须使用像素模拟正向的蓝白表面色');
assert.match(notice, /\.notice-page\{[^}]*padding:28px 21px 0 7px/,
  '通知详情主体必须按冻结参考校准四向内容起点');
assert.match(messages, /\.messages-page\{[^}]*padding:27px 27px 21px 40px/,
  '消息中心主体必须按冻结参考校准顶部与左侧配准');
assert.match(announcements, /\.announcements-page\s*\{[^}]*padding:\s*27px 26px 15px/,
  '公告通知主体必须按新版 UI 校准内容边距');
assert.match(announcements, /\.announcements-page > header\s*\{[^}]*min-height:\s*83px/,
  '公告通知标题区必须为新版统计卡预留稳定节奏');
assert.match(appAdmin, /\.app-admin\{padding:31px 33px 20px 19px/,
  '应用运营管理主体必须按冻结参考校准四向内容起点');
assert.match(appAdmin, /\.app-admin-stats\{[^}]*margin:24px 0 15px/,
  '应用运营管理统计区必须按冻结参考校准上下节奏');
assert.match(appAdmin, /\.app-admin header>a\{[^}]*margin-top:12px/,
  '新建应用按钮必须按冻结参考校准垂直位置');
assert.match(favorites, /\.favorites-page\s*\{[\s\S]*?padding:\s*16px 18px 22px/,
  '统一 63px 顶栏下，收藏页必须沿用新版内容边距');

console.log('统一顶栏不回退与收藏首屏密度视觉合同通过');
