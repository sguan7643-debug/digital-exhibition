import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canViewAnnouncements, retainViewerRole } from '../src/state/interaction-controllers.js';
import { resolvePage } from '../src/fixtures/pages.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const main = read('src/main.js');
const app = read('src/App.vue');
const shell = read('src/components/ExhibitionShell.vue');
const workbench = read('src/pages/WorkbenchPage.vue');
const stateBoundary = read('src/components/PageStateBoundary.vue');
const network = read('src/runtime/network-guard.js');
const styles = read('src/style.css');

assert.equal(resolvePage('https://test-pre-demo-seaoil.xdata.work/test2/workbench', 'normal', '/test2')?.id, '01',
  '部署到 /test2 时必须先剥离 base path，再匹配逻辑页面路由');
assert.equal(resolvePage('http://127.0.0.1:4173/workbench', 'normal', '/')?.id, '01',
  '本地根路径必须继续匹配工作台路由');

assert.match(main, /installLocalOnlyNetworkGuard\(\)/);
assert.match(
  main,
  /createApp\(App,\s*\{\s*entryAuth\s*\}\)(?:\.component\([^\n]+\))*\.mount\('#app'\)/,
  '应用必须把首入授权结果交给已挂载的入口状态',
);
assert.match(app, /resolvePage\(window\.location/);
assert.match(app, /stateFromLocation/);
assert.match(app, /<exhibition-shell/);
assert.match(app, /page\.id === '01'/);
assert.match(app, /<workbench-page/);
assert.match(app, /<page-state-boundary/);
assert.doesNotMatch(app, /page\.state === 'normal'/);

assert.match(shell, /<header/);
assert.match(shell, /<nav[^>]+aria-label="主导航"/);
assert.match(shell, /aria-current/);
assert.match(shell, /<main/);
assert.match(shell, /:focus-visible/);
assert.match(shell, /canViewAnnouncements\(viewerRole\.value\)/,
  '顶栏公告通知必须依据稳定的浏览者身份判断');
assert.match(shell, /retainViewerRole\(viewerRole\.value, nextRole\)/,
  '管理员进入普通角色标记的公告页后不得丢失身份');
assert.doesNotMatch(shell, /includes\(props\.page\.role\)/,
  '公告权限不得继续直接依赖目标页面角色');
const primaryNavSource = shell.split('const primaryNav = [')[1].split('];')[0];
assert.doesNotMatch(primaryNavSource, /\/points|\/announcements|\/admin/,
  '顶部仅保留七项主导航，积分和管理入口归入个人功能');
assert.match(shell, /v-if="isAdministrator" :href="appHref\('\/admin'\)"/, '管理入口继续按角色显示并保留部署基础路径');
assert.equal(canViewAnnouncements('普通员工'), false);
assert.equal(canViewAnnouncements('运营人员'), true);
assert.equal(canViewAnnouncements('后台管理员'), true);
assert.equal(retainViewerRole('后台管理员', '普通员工'), '后台管理员');
assert.equal(retainViewerRole('普通员工', '普通员工'), '普通员工');

assert.match(shell, /\.top-user>img\{[^}]*filter:none;[^}]*opacity:1/,
  '顶栏个人头像必须保持蓝色彩色');
assert.match(workbench, /\.hero-avatar\{filter:none;opacity:1\}/,
  '工作台个人头像不得再灰度显示');
assert.match(styles, /\.profile-page \.identity>img[^}]*\{[^}]*filter:none!important;[^}]*opacity:1!important/,
  '个人中心头像必须覆盖装饰图片灰度规则');

assert.match(workbench, /上午好，张三丰/);
assert.match(workbench, /应用类型概览/);
assert.match(workbench, /热门应用推荐/);
assert.match(workbench, /培训课堂/);
assert.match(workbench, /公告通知/);
assert.match(workbench, /我的使用统计/);

assert.match(stateBoundary, /permission-denied/);
assert.match(stateBoundary, /aria-busy/);
assert.match(stateBoundary, /本地演示数据暂时不可用/);
assert.match(stateBoundary, /当前角色无权访问该页面。/);
assert.match(stateBoundary, /800/);
assert.match(stateBoundary, /:inert="contentDisabled \|\| !contentVisible"/);
assert.match(stateBoundary, /localState!==\'permission-denied\'/);

assert.match(network, /localhost/);
assert.match(network, /127\.0\.0\.1/);
assert.match(network, /fetch/);
assert.match(network, /XMLHttpRequest/);
assert.match(network, /WebSocket/);
assert.doesNotMatch(main + app + shell + workbench + stateBoundary, /localStorage|sessionStorage|indexedDB/);

assert.match(styles, /\*::-webkit-scrollbar\s*\{\s*width:\s*0(?:px)?\s*;?\s*\}/,
  '系统必须全局隐藏纵向滚动条，但保留纵向滚动能力');
assert.doesNotMatch(styles, /scrollbar-width\s*:\s*none/,
  '不得使用会同时隐藏横向与纵向滚动条的 scrollbar-width:none');
assert.doesNotMatch(styles, /::-webkit-scrollbar\s*\{[^}]*height\s*:\s*0(?:px)?/,
  '横向滚动条高度不得被清零');
assert.match(shell, /\.primary-nav\{[^}]*overflow-x:auto;[^}]*scrollbar-width:none/,
  '主导航必须保留横向滚动能力并局部隐藏可见轨道');
assert.match(shell, /\.primary-nav::-webkit-scrollbar\{[^}]*height:0/,
  '主导航的 WebKit 横向轨道必须局部消除');
assert.doesNotMatch(shell, /\.primary-nav\{[^}]*(?:overflow-x|overflow):(?:hidden|clip)/,
  '消除主导航轨道时不得裁掉超出视口的导航入口');
assert.match(shell, /\.sidebar\{[^}]*overflow-y:auto/,
  '侧栏必须继续允许纵向滚动');
assert.match(shell, /main\{[^}]*overflow-y:auto/,
  '主内容必须继续允许纵向滚动');

console.log('Vue 应用壳、六态与零外网合同测试通过');
