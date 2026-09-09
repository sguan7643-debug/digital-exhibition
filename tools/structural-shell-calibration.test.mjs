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
assert.deepEqual([...new Set(topbarHeights)], [63],
  '共享顶栏不得在样式表末尾从 63px 覆盖为另一高度');
assert.match(shell, /\.topbar\{height:63px;[^}]*background:#0060a6;/,
  '共享顶栏必须采用本次新版 63px 品牌蓝几何');
assert.match(shell, /@media\(min-width:1421px\)\{\.primary-nav a\{min-width:0;flex:1 1 0\}\}/,
  '宽屏十个主导航目的地必须均分可用宽度，不得在右侧留下大块空白');
assert.match(shell, /\.exhibition-shell\{[^}]*grid-template-columns:minmax\(0,1fr\)/,
  '窄宽详情页的统一壳层不得被顶部导航最小内容宽度撑出视口');
assert.match(shell, /@media\(min-width:761px\) and \(max-width:940px\)\{\.page-frame,\.standard-shell \.page-frame\{grid-template-columns:220px minmax\(0,1fr\)/,
  '桌面与窄桌面视口必须保持用户批准的 220px 固定侧栏');
assert.doesNotMatch(shell, /grid-template-columns:150px minmax\(0,1fr\)/,
  '统一壳层不得在窄桌面重新引入 150px 侧栏');

console.log('代表页公共壳层：全局 sr-only、63px 品牌蓝顶栏、宽屏导航均分与窄宽防溢出合同通过');
