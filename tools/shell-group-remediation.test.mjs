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
for(const contract of ['sidebar-toggle','sidebar-collapsed','aria-controls="sidebar-content"','aria-controls="apps-group-menu"','v-show="compactSidebar || shellState.appsExpanded"','aria-label="应用分类"','class="scene-search"','id="main-content"'])
  assert.ok(source.includes(contract), `收缩导航合同缺失：${contract}`);
assert.ok(!source.includes('id="materials-group-menu"'), '左侧不再显示素材分类');
assert.match(source,/sidebar-collapsed \.page-frame\{grid-template-columns:56px/, '收起为56px图标栏');
assert.match(source,/\.group-toggle[^}]*border:0/,'分组切换必须使用可聚焦原生按钮而非静态图标');

console.log('侧栏收缩、应用分类与场景搜索合同通过');
