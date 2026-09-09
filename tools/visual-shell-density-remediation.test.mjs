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
  /page:\s*1,\s*pageSize:\s*10,\s*announcement/,
  '收藏页必须遵循全系统统一的默认每页 10 条合同'
);
assert.match(favorites, /PaginationControl/, '收藏页必须复用共享分页组件');
const favoriteFilters = favorites.match(/<form[\s\S]*?class="favorite-filters"[\s\S]*?<\/form>/)?.[0] ?? '';
const favoriteTools = favorites.match(/<div class="favorite-tools">[\s\S]*?<\/div>/)?.[0] ?? '';
assert.match(favoriteFilters, /type="reset">重置/, '收藏筛选栏必须与应用中心一样保留重置操作');
assert.match(favoriteFilters, /type="submit">查询/, '收藏筛选栏必须与应用中心一样保留查询操作');
assert.match(favoriteTools, /@click="resetData"[\s\S]*?>恢复收藏</,
  '演示收藏恢复必须放在结果工具栏，不能挤压筛选或分页');
assert.doesNotMatch(favorites, /class="favorite-pagination"[\s\S]{0,220}@click="resetData"/,
  '分页栏不得包含演示数据恢复按钮');
assert.match(favorites, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  '收藏页必须与应用中心一致使用桌面三列独立卡片');
assert.match(favorites, /min-height:\s*314px/, '收藏卡片必须为放大后的字段与操作保留可读高度');
assert.match(favorites, /\.favorite-grid\s*>\s*article\s*\{[^}]*background:\s*#fff;[^}]*border:\s*1px solid #dce5ef;[^}]*border-radius:\s*7px/,
  '收藏卡片必须采用应用中心同款独立白色卡片');
assert.doesNotMatch(favorites, /nth-child\(4n\)|nth-child\(n\s*\+\s*5\)/,
  '收藏页不得保留四列拼表式边框规则');
assert.match(favorites, /@media\s*\(max-width:\s*1360px\)[\s\S]*?\.favorite-grid:not\(\.list-view\)[\s\S]*?repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  '收藏页在中等分辨率必须收敛为两列');
assert.match(favorites, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.favorite-grid,[\s\S]*?grid-template-columns:\s*1fr/,
  '收藏页在窄屏必须收敛为单列');
assert.match(notice, /\.notice-sheet\{[^}]*background:#fafcff/,
  '通知详情主内容面板必须使用像素模拟正向的蓝白表面色');
assert.match(notice, /\.notice-page\{[^}]*padding:28px 21px 0 7px/,
  '通知详情主体必须按冻结参考校准四向内容起点');
assert.match(messages, /\.messages-page\{[^}]*padding:27px 27px 21px 40px/,
  '消息中心主体必须按冻结参考校准顶部与左侧配准');
assert.doesNotMatch(messages, /<i\s+v-if="!item\.read"/,
  '已读消息也必须保留未读点占位，避免后续内容跨列错位');
assert.match(messages, /<i\s+:class="\{ placeholder: item\.read \}"/,
  '消息行必须以不可见占位保持已读和未读行使用同一列结构');
assert.match(messages, /grid-template-columns:44px 116px 10px minmax\(320px,1fr\) 128px 72px 150px/,
  '消息类型、正文、时间、状态和操作必须使用稳定的完整列宽');
assert.match(messages, /\.message-panel li>\.message-type\{[^}]*white-space:nowrap/,
  '消息类型标签必须保持单行');
assert.match(messages, /\.message-panel li>\.message-state\{[^}]*min-width:58px[^}]*white-space:nowrap/,
  '已读/未读状态标签必须拥有稳定宽度并保持单行');
assert.match(messages, /\.message-panel li>a,\.message-panel li>button\{[^}]*white-space:nowrap/,
  '消息操作不得纵向拆分');
assert.match(announcements, /\.announcements-page\s*\{[^}]*padding:\s*47px 26px 15px 39px/,
  '公告通知主体必须按冻结参考校准顶部与左侧配准');
assert.match(announcements, /\.announcements-page\s*>\s*header\s*\{[^}]*height:\s*78px/,
  '公告通知标题区高度必须让统计卡起点匹配冻结参考');
assert.match(appAdmin, /\.app-admin\{padding:31px 33px 20px 19px/,
  '应用运营管理主体必须按冻结参考校准四向内容起点');
assert.match(appAdmin, /\.app-admin-stats\{[^}]*margin:24px 0 15px/,
  '应用运营管理统计区必须按冻结参考校准上下节奏');
assert.match(appAdmin, /\.app-admin header>a\{[^}]*margin-top:12px/,
  '新建应用按钮必须按冻结参考校准垂直位置');
assert.doesNotMatch(favorites, /favorite-hero|favorite-stats/,
  '收藏页应使用应用中心同款轻量标题区，不再保留独立大横幅和统计板块');

console.log('统一顶栏不回退与收藏首屏密度视觉合同通过');
