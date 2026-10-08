import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [app, shell, styles, h5, remoteDetail] = await Promise.all([
  read('src/App.vue'),
  read('src/components/ExhibitionShell.vue'),
  read('src/style.css'),
  read('src/h5.css'),
  read('src/components/RemoteAppDetailPage.vue')
]);

// DEH-UI-PARITY-20260930: the approved source package is the visual authority.
assert.doesNotMatch(app, /request-activity-banner|integration-toast-stack/,
  '全局请求状态不得以参考包中不存在的右上角气泡展示');
assert.doesNotMatch(styles, /request-activity-banner|integration-toast-stack/,
  '正式样式不得残留右上角请求气泡规则');
assert.match(shell,
  /@media\(min-width:761px\) and \(max-width:940px\)\{\.page-frame,\.standard-shell \.page-frame\{grid-template-columns:150px minmax\(0,1fr\)/,
  '761–940px 的侧栏宽度必须与参考包一致为 150px');
assert.doesNotMatch(shell, /@media\(min-width:1421px\)\{\.primary-nav a\{min-width:0;flex:1 1 0\}\}/,
  '宽屏导航不得保留参考包之外的强制均分覆盖');
assert.doesNotMatch(shell, /@media\(min-width:761px\) and \(max-width:1280px\)\{\.top-user span\{display:grid/,
  '中等宽度账号区域不得保留参考包之外的强制展开覆盖');
assert.match(shell,
  /@media\(min-width:761px\)\{\.certification-shell \.topbar\{height:63px\}\.certification-shell \.page-frame\{grid-template-columns:220px minmax\(0,1fr\)\}\}/,
  '数字化认证桌面壳层必须保留参考包的完整几何规则');

// Visual parity must not roll back live data, base-path support or accessibility.
assert.match(app, /:account-identity="entryAuth\.identity"/,
  '真实授权用户身份必须继续注入页面壳层');
assert.match(app, /prependAppBasePath/,
  '测试环境子路径支持必须保留');
assert.match(remoteDetail, /data-authoritative-detail="true"/,
  '权威详情数据的可视边界必须保留');
assert.match(h5, /horizontal-scroll-region/,
  '移动端表格可访问横向滚动能力必须保留');

console.log('approved 2026-09-30 reference parity guard passed');
