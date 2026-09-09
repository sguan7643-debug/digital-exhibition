import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const index = read('index.html');
const main = read('src/main.js');
const shell = read('src/components/ExhibitionShell.vue');
const h5 = read('src/h5.css');
const pagination = read('src/components/PaginationControl.vue');

assert.match(index, /name="viewport"[^>]+width=device-width/,
  'H5 页面必须声明设备宽度视口');
assert.match(index, /viewport-fit=cover/,
  'H5 页面必须允许安全区适配');
assert.match(main, /import '\.\/h5\.css'/,
  'H5 样式层必须在应用入口加载');

for (const token of [
  'mobile-nav-toggle', 'platform-sidebar', 'mobile-drawer-close',
  'mobile-primary-nav', 'sidebar-backdrop', 'mobileMenuOpen',
  'handleShellKeydown', ':inert', '100dvh', 'safe-area-inset-bottom'
]) {
  assert.ok(shell.includes(token), `移动端应用壳缺少 ${token}`);
}
assert.match(shell, /aria-controls="platform-sidebar"/);
assert.match(shell, /aria-expanded="String\(mobileMenuOpen\)"/);
assert.match(shell, /event\.key === 'Escape'/);
assert.match(shell, /event\.key !== 'Tab'/);
assert.match(shell, /<main id="main-content"[^>]+:inert="mobileViewport && mobileMenuOpen"/,
  '移动抽屉打开后必须屏蔽背景主内容');
assert.match(shell, /:role="mobileViewport && mobileMenuOpen \? 'dialog' : undefined"/,
  '移动抽屉打开时必须暴露为模态对话框');
assert.match(shell, /:aria-modal="mobileViewport && mobileMenuOpen \? 'true' : undefined"/,
  '移动抽屉必须声明模态语义');
assert.match(shell, /closeMobileMenu\(true\)/,
  '抽屉筛选与关闭后必须恢复可预测焦点');
assert.match(shell, /grid-template-rows:calc\(56px \+ env\(safe-area-inset-top\)\)/,
  '移动壳层顶部必须计入设备安全区');
assert.match(shell, /@media\(min-width:761px\)\{\.certification-shell/,
  '认证页桌面几何不得覆盖手机布局');
assert.match(shell, /\.catalogue-group nav a,\.catalogue-group nav button\{height:44px/,
  '抽屉分类入口必须保留 44px 触控高度');
assert.match(shell, /\.group-heading,\.catalogue-group h2,\.scene-search h2\{height:44px\}/,
  '抽屉分组标题与开关必须共享 44px 行高');

for (const selector of [
  '.apps-grid', '.materials-grid', '.favorite-grid', '.course-grid',
  '.message-panel li', '.product-detail', '.apply-form', '.pagination-control',
  '.talent-body.drawer-open>aside', '.projects-body.drawer-open>aside',
  '.table-scroll', '.notice-table', '.point-table', '.point-tabs',
  '.editor-page form>footer', '.app-editor>form', '.operations-page .period'
]) {
  assert.ok(h5.includes(selector), `H5 样式缺少关键页面覆盖：${selector}`);
}
assert.match(h5, /@media \(max-width: 760px\)/);
assert.match(h5, /font-size:\s*16px\s*!important/,
  '移动表单控件需避免 iOS 聚焦自动放大');
assert.match(h5, /-webkit-overflow-scrolling:\s*touch/,
  '宽表和标签栏需保留触控滚动');
assert.doesNotMatch(h5, /talent-body\.drawer-open>aside[^}]*width:\s*100vw/s,
  '人才抽屉不得用 100vw 叠加滚动条宽度');
assert.match(h5, /\.talent-body>main,\.projects-body>main[\s\S]*?min-width:\s*0\s*!important/,
  '人才宽表的网格项必须允许收缩，横向滚动只留在表格容器');
assert.match(h5, /\.point-tabs[\s\S]*?flex-wrap:\s*wrap\s*!important[\s\S]*?overflow-x:\s*visible\s*!important/,
  '积分分类应在窄屏完整换行，不能裁字或藏到不可见视口外');
assert.match(h5, /\.notice-table table \{ min-width: 1050px !important; \}/,
  '公告宽表必须保留原始列宽契约');
assert.match(h5, /\.progress-table table \{ min-width: 1450px !important; \}/,
  '进度宽表必须保留原始列宽契约');

assert.match(pagination, /mobile-page-summary/,
  '移动分页必须提供当前页摘要');
assert.match(pagination, /pageItems/,
  '桌面分页也应使用窗口页码，避免页数无限扩张');
assert.doesNotMatch(pagination, /min-width:\s*max-content/,
  '移动分页不得强制撑宽页面');

console.log('H5 导航、卡片、表单、表格与分页响应式合同测试通过');
