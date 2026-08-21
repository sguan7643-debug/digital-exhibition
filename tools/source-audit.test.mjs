import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sourceFiles = [
  'src/App.vue', 'src/main.js', 'src/style.css', 'src/fixtures/pages.js',
  'src/fixtures/page-content.js', 'src/runtime/network-guard.js',
  'src/components/ExhibitionShell.vue', 'src/pages/WorkbenchPage.vue',
  'src/pages/PortalPage.vue', 'src/pages/GenericPage.vue'
];
const sources = sourceFiles.map(path => [path, readFileSync(new URL(path, root), 'utf8')]);
const joined = sources.map(([, value]) => value).join('\n');

assert.doesNotMatch(joined, /https?:\/\/(?!127\.0\.0\.1|localhost)/i, '源码不得包含外部 HTTP 地址');
assert.doesNotMatch(joined, /localStorage|sessionStorage|indexedDB/, '样机不得写入持久化浏览器存储');
assert.doesNotMatch(joined, /Date\.now\(|new Date\(|Math\.random\(/, '样机不得产生非确定性时间或随机值');
assert.match(joined, /2026-08-19T09:00:00\+08:00/);
assert.match(joined, /FIXTURE_SEED = 817/);

const network = sources.find(([path]) => path.endsWith('network-guard.js'))[1];
for (const capability of ['fetch', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'localhost', '127.0.0.1']) {
  assert.ok(network.includes(capability), `网络守卫缺少 ${capability}`);
}

const shell = sources.find(([path]) => path.endsWith('ExhibitionShell.vue'))[1];
const portal = sources.find(([path]) => path.endsWith('PortalPage.vue'))[1];
const generic = sources.find(([path]) => path.endsWith('GenericPage.vue'))[1];
for (const semantic of ['<header', '<nav', '<aside', '<main', 'aria-current', 'skip-link']) assert.ok(shell.includes(semantic));
for (const semantic of ['<article', '<section', '<form', '<table', '<caption', 'aria-label']) assert.ok(portal.includes(semantic));
for (const state of ['loading', 'empty', 'error', 'disabled', 'permission-denied']) assert.ok(generic.includes(state));
assert.ok((joined.match(/:focus-visible/g) || []).length >= 4, '可交互区域必须声明可见焦点');
assert.ok((joined.match(/@media\(max-width:/g) || []).length >= 4, '必须声明多档响应式布局');
assert.match(joined, /prefers-reduced-motion/);
assert.match(joined, /forced-colors/);

const expectedAssets = {
  'cnooc-logo.png': [126, 43], 'user-avatar.png': [67, 67], 'hero-ocean.png': [827, 136],
  'overview-dataset.png': [68, 68], 'hot-supplier.png': [55, 55],
  'training-ai.png': [58, 60], 'usage-visits.png': [58, 58]
};
for (const [name, [width, height]] of Object.entries(expectedAssets)) {
  const png = readFileSync(new URL(`public/assets/${name}`, root));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), width, `${name} 宽度错误`);
  assert.equal(png.readUInt32BE(20), height, `${name} 高度错误`);
}

console.log('源码静态、确定性、零外网、语义与原子资产检查通过');
