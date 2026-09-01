import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const main = read('src/main.js');
const app = read('src/App.vue');
const shell = read('src/components/ExhibitionShell.vue');
const workbench = read('src/pages/WorkbenchPage.vue');
const stateBoundary = read('src/components/PageStateBoundary.vue');
const network = read('src/runtime/network-guard.js');
const styles = read('src/style.css');

assert.match(main, /installLocalOnlyNetworkGuard\(\)/);
assert.match(main, /createApp\(App\)(?:\.component\('[^']+',\s*[^)]+\))*\.mount\('#app'\)/);
assert.match(main, /\.component\('AppIcon', AppIcon\)/,
  '应用壳必须全局注册统一矢量图标组件');
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
assert.match(shell, /\.sidebar\{[^}]*overflow-y:auto/,
  '侧栏必须继续允许纵向滚动');
assert.match(shell, /main\{[^}]*overflow-y:auto/,
  '主内容必须继续允许纵向滚动');

console.log('Vue 应用壳、六态与零外网合同测试通过');
