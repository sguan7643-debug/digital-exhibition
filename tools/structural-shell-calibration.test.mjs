import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const globalStyles = read('src/style.css');
const app = read('src/App.vue');

assert.match(app, /class="sr-only integration-source-status"/,
  '集成数据源状态必须继续提供给辅助技术');
assert.match(globalStyles, /\.sr-only\{position:absolute!important;width:1px!important;height:1px!important;/,
  '插槽中的集成状态必须由全局 sr-only 合同隐藏于视觉、保留于辅助技术');

const topbarHeights = [...shell.matchAll(/\.topbar\{height:(\d+)px/g)].map(match => Number(match[1]));
assert.deepEqual([...new Set(topbarHeights)], [69],
  '共享顶栏不得在样式表末尾从 69px 覆盖为另一高度');
assert.doesNotMatch(shell, /\.topbar\{[^}]*background:#0060a6/,
  '共享顶栏不得被覆盖为偏亮蓝色');
assert.match(shell, /\.topbar\{height:69px;[^}]*background:#00396e;/,
  '共享顶栏必须采用冻结新版 69px 深蓝几何');
assert.match(shell, /@media\(min-width:1421px\)\{\.primary-nav a\{min-width:0;flex:1 1 0\}\}/,
  '宽屏十个主导航目的地必须均分可用宽度，不得在右侧留下大块空白');

console.log('代表页公共壳层：全局 sr-only、69px 深蓝顶栏与宽屏导航均分合同通过');
