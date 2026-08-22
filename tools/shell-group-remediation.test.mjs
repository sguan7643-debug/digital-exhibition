import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createShellController } from '../src/state/interaction-controllers.js';

const shell=createShellController();
assert.equal(shell.materialsExpanded,true,'素材中心默认展开');
assert.equal(shell.appsExpanded,true,'应用中心默认展开');
shell.toggleGroup('materials');
assert.equal(shell.materialsExpanded,false,'素材中心按钮只折叠素材子菜单');
assert.equal(shell.appsExpanded,true,'素材中心折叠不得影响应用中心');
assert.equal(shell.announcement,'素材中心子菜单已收起');
shell.toggleGroup('apps');
assert.equal(shell.materialsExpanded,false,'应用中心折叠不得改变素材中心状态');
assert.equal(shell.appsExpanded,false,'应用中心按钮只折叠应用子菜单');
shell.toggleGroup('materials');
assert.equal(shell.materialsExpanded,true,'两个分组必须允许一开一关');
assert.equal(shell.appsExpanded,false,'两个分组状态必须完全独立');

const source=readFileSync(new URL('../src/components/ExhibitionShell.vue',import.meta.url),'utf8');
for(const forbidden of ['sidebar-toggle','toggleSidebar','sidebar-collapsed','compact-sidebar-nav'])assert.ok(!source.includes(forbidden),`不得保留全局整栏折叠实现：${forbidden}`);
for(const contract of [
  'aria-controls="materials-group-menu"','aria-controls="apps-group-menu"',
  ':aria-expanded="String(shellState.materialsExpanded)"',':aria-expanded="String(shellState.appsExpanded)"',
  'id="materials-group-menu"','id="apps-group-menu"','v-show="shellState.materialsExpanded"','v-show="shellState.appsExpanded"',
  'aria-label="素材中心子菜单"','aria-label="应用分类"','class="scene-search"','id="main-content"'
])assert.ok(source.includes(contract),`独立分组展开合同缺失：${contract}`);
assert.match(source,/\.page-frame\{[^}]*grid-template-columns:220px minmax\(0,1fr\)/,'主内容必须保持固定侧栏列，不随分组折叠水平位移');
assert.match(source,/\.group-toggle[^}]*border:0/,'分组切换必须使用可聚焦原生按钮而非静态图标');

console.log('侧栏分组修复：无全局折叠、双分组独立、默认展开与 aria/布局合同通过');
