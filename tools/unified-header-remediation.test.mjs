import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../src/components/ExhibitionShell.vue', import.meta.url), 'utf8');

const expectedDestinations = [
  '首页工作台', '素材中心', '人才管理', '应用中心', '培训课堂',
  '积分中心', '数字化认证', '运营管理', '公告通知', '后台管理'
];

assert.match(shell, /const primaryNav = basePrimaryNav;/,
  '所有页面必须复用同一份新版主导航，不得按页面切换菜单数据');
assert.doesNotMatch(shell, /appsPrimaryNav|reportPrimaryNav/,
  '不得保留应用中心或报表页专用头部导航');
assert.match(shell, /<span>数智产品展厅<\/span>/,
  '所有页面的头部必须使用同一个产品标题');
assert.doesNotMatch(shell, /数字化认证平台/,
  '页面不得切换成另一套头部标题');

const navSource = shell.match(/const basePrimaryNav = \[([\s\S]*?)\n\];/)?.[1] ?? '';
for (const label of expectedDestinations) {
  const count = navSource.split(`'${label}'`).length - 1;
  assert.equal(count, 1, `主导航目的地“${label}”必须且只能在共享数据源中声明一次`);
}

assert.match(shell, /\.topbar\{height:69px;[^}]*background:#00396e;[^}]*border-bottom:0\}/,
  '新版头部必须统一为 69px 深蓝样式');
assert.match(shell, /\.brand\{[^}]*flex:0 0 198px;[^}]*color:#fff;[^}]*font-size:26px/,
  '所有页面必须共享同一标题几何和颜色');
assert.match(shell, /\.primary-nav a\{[^}]*color:#fff;/,
  '共享主导航必须统一使用新版白色文字');
assert.match(shell, /\.primary-nav a\[aria-current='page'\]::after\{[^}]*background:#fff\}/,
  '每页只通过统一白色下划线表达当前导航项');
assert.doesNotMatch(shell, /\.ui-update-(?:workbench|apps|report) \.topbar/,
  '页面 variant 不得覆盖共享头部样式');
assert.doesNotMatch(shell, /\.certification-shell \.topbar/,
  '认证页不得使用不同高度的头部');

console.log('全站唯一新版头部导航合同测试通过');
