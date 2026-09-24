import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sourceFiles = [
  'src/App.vue', 'src/main.js', 'src/style.css', 'src/h5.css', 'src/fixtures/pages.js',
  'src/runtime/network-guard.js',
  'src/state/interaction-controllers.js',
  'src/components/ExhibitionShell.vue', 'src/components/TypeLineIcon.vue',
  'src/components/RemoteAppDetailPage.vue', 'src/components/RemoteRecordPage.vue',
  'src/components/PageStateBoundary.vue',
  'src/pages/WorkbenchPage.vue',
  'src/pages/MessagesPage.vue', 'src/pages/FavoritesPage.vue', 'src/pages/ProfilePage.vue',
  'src/pages/AnnouncementsPage.vue', 'src/pages/NoticeDetailPage.vue', 'src/pages/AppsPage.vue',
  'src/pages/MaterialsPage.vue',
  'src/pages/ToolDetailPage.vue', 'src/pages/HainengWorkDetailPage.vue', 'src/pages/ReportDetailPage.vue',
  'src/pages/DashboardDetailPage.vue', 'src/pages/DatasetDetailPage.vue', 'src/pages/MetricDetailPage.vue',
  'src/pages/AiDetailPage.vue', 'src/pages/EadDetailPage.vue',
  'src/pages/RpaDetailPage.vue', 'src/pages/OnboardingPage.vue', 'src/pages/OnboardingApplyPage.vue', 'src/pages/PointsPage.vue',
  'src/pages/PointsDetailsPage.vue', 'src/pages/TrainingPage.vue', 'src/pages/OperationsPage.vue',
  'src/pages/AnnouncementAdminPage.vue', 'src/pages/AnnouncementEditorPage.vue',
  'src/pages/AppAdminPage.vue', 'src/pages/AppEditorPage.vue', 'src/pages/AdminPage.vue',
  'src/pages/CertificationPage.vue', 'src/pages/TalentPeoplePage.vue',
  'src/pages/TalentProjectsPage.vue', 'src/pages/TalentProgressPage.vue'
];
const sources = sourceFiles.map(path => [path, readFileSync(new URL(path, root), 'utf8')]);
const joined = sources.map(([, value]) => value).join('\n');

assert.doesNotMatch(joined, /https?:\/\/(?!127\.0\.0\.1|localhost)/i, '源码不得包含外部 HTTP 地址');
assert.doesNotMatch(joined, /localStorage|sessionStorage|indexedDB/, '样机不得写入持久化浏览器存储');
assert.doesNotMatch(joined, /Math\.random\(/, '源码不得使用非安全随机值');
assert.doesNotMatch(joined, /\b(?:APP|PEOPLE|MESSAGE|FAVORITE|ANNOUNCEMENT|HOT_APP|PROJECT|PROGRESS)_FIXTURES\b/, '源码不得重新引入业务模拟数据');

const network = sources.find(([path]) => path.endsWith('network-guard.js'))[1];
for (const capability of ['fetch', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'localhost', '127.0.0.1']) {
  assert.ok(network.includes(capability), `网络守卫缺少 ${capability}`);
}

const shell = sources.find(([path]) => path.endsWith('ExhibitionShell.vue'))[1];
const remoteRecord = sources.find(([path]) => path.endsWith('RemoteRecordPage.vue'))[1];
const stateBoundary = sources.find(([path]) => path.endsWith('PageStateBoundary.vue'))[1];
for (const semantic of ['<header', '<nav', '<aside', '<main', 'aria-current', 'skip-link']) assert.ok(shell.includes(semantic));
for (const semantic of ['<article', '<section', '<dl', 'role="status"', 'role="alert"']) assert.ok(remoteRecord.includes(semantic));
for (const state of ['loading', 'empty', 'error', 'disabled', 'permission-denied']) assert.ok(stateBoundary.includes(state));
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
