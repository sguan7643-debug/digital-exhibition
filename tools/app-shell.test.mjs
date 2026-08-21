import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const main = read('src/main.js');
const app = read('src/App.vue');
const shell = read('src/components/ExhibitionShell.vue');
const workbench = read('src/pages/WorkbenchPage.vue');
const generic = read('src/pages/GenericPage.vue');
const network = read('src/runtime/network-guard.js');

assert.match(main, /installLocalOnlyNetworkGuard\(\)/);
assert.match(main, /createApp\(App\)\.mount\('#app'\)/);
assert.match(app, /resolvePage\(window\.location/);
assert.match(app, /stateFromLocation/);
assert.match(app, /<exhibition-shell/);
assert.match(app, /page\.id === '01'/);
assert.match(app, /<workbench-page/);
assert.match(app, /<generic-page/);

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

assert.match(generic, /permission-denied/);
assert.match(generic, /aria-busy/);
assert.match(generic, /内容加载失败，请重试。/);
assert.match(generic, /当前角色无权访问该页面。/);
assert.match(generic, /800/);

assert.match(network, /localhost/);
assert.match(network, /127\.0\.0\.1/);
assert.match(network, /fetch/);
assert.match(network, /XMLHttpRequest/);
assert.match(network, /WebSocket/);
assert.doesNotMatch(main + app + shell + workbench + generic, /localStorage|sessionStorage|indexedDB/);

console.log('Vue 应用壳、六态与零外网合同测试通过');
