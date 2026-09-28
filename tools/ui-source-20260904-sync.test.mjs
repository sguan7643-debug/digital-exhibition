import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const icons = read('src/components/TypeLineIcon.vue');
const style = read('src/style.css');
const apps = read('src/pages/AppsPage.vue');
const favorites = read('src/pages/FavoritesPage.vue');
const announcements = read('src/pages/AnnouncementsPage.vue');
const admin = read('src/pages/AdminPage.vue');
const report = read('src/pages/ReportDetailPage.vue');
const dashboard = read('src/pages/DashboardDetailPage.vue');
const training = read('src/pages/TrainingPage.vue');
const points = read('src/pages/PointsPage.vue');
const certification = read('src/pages/CertificationPage.vue');
const talentPeople = read('src/pages/TalentPeoplePage.vue');
const talentProjects = read('src/pages/TalentProjectsPage.vue');
const operations = read('src/pages/OperationsPage.vue');
const materials = read('src/pages/MaterialsPage.vue');
const retirementMap = JSON.parse(read('tools/ui-regression-retirement-map.json'));

for (const [name, source] of Object.entries({ shell, style, apps, favorites, announcements })) {
  assert.doesNotMatch(source, /#(?:003c73|073e78|063d77)\b/i, `${name} 不得继续使用旧主色`);
}
assert.match(style, /--xlt-navy-900:\s*#0060a6/i);
assert.match(shell, /\.topbar\{height:63px;[^}]*background:#0060a6/i);
assert.doesNotMatch(shell, /top-(?:message|favorite(?:-active)?)\.png/);
for (const name of ['message', 'favorite']) {
  assert.match(icons, new RegExp(`["']${name}["']`));
  assert.match(shell, new RegExp(`TypeLineIcon\\s+name="${name}"`));
}
assert.match(shell, /\.catalogue-group h2,\.scene-search h2\{[^}]*font-size:16px;[^}]*font-weight:700/);
assert.match(shell, /\.catalogue-group nav a,\.catalogue-group nav button\{[^}]*height:36px;[^}]*font-size:15px;[^}]*font-weight:400/);
assert.match(style, /select:not\(\[multiple\]\)\s*\{[^}]*appearance:none;[^}]*background-image:/s);
assert.match(style, /--xlt-font-caption:\s*clamp\(13px/,
  '响应式 caption 字号必须保留 13px 可读下限');
assert.match(style, /\.notice-filters select:not\(\[multiple\]\)\s*\{[^}]*#0060a6[^}]*#0060a6/s,
  '通知筛选下拉箭头必须保持统一蓝色');
assert.match(style, /\.notice-filters input\[type="date"\]::-webkit-calendar-picker-indicator\s*\{[^}]*opacity:\.9;[^}]*filter:/s,
  '通知日期筛选必须保留可辨识的蓝色日历图标规则');

assert.match(apps, /const appTypeStats = computed/);
assert.match(apps, /class="app-type-overview"[\s\S]*TypeLineIcon\s+:name="item\.icon"/);
assert.match(apps, /\.application-grid\.list-view>\.application-card\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(260px,\.55fr\)/);
assert.match(apps, /@container\(max-width:639px\)\{[^}]*\.application-grid\.list-view>\.application-card\{display:flex\}/);
assert.match(apps, /href="\/apps\/onboarding\/apply"/);
assert.match(apps, /\.apps-filter label\{display:grid;flex:1 1 180px;align-items:start;gap:6px;min-width:0;[^}]*font-size:14px;line-height:22px;white-space:nowrap\}/,
  '应用筛选标签必须保持弹性网格、可读字号与不换行标签布局');

assert.match(favorites, /props\.integrationData\?\.\['FAV-002'\]/);
assert.match(favorites, /mapRemoteApp\(item\.resource\)/);
assert.match(favorites, /class="favorite-grid"/);
assert.match(favorites, /<dt>负责部门<\/dt>[\s\S]*<dt>负责人<\/dt>[\s\S]*<dt>开发者<\/dt>/);
assert.match(favorites, /\.favorite-grid footer \.detail-action,[\s\S]*color:\s*#fff;[\s\S]*background:\s*#0060a6/);

for (const source of [report, dashboard]) {
  assert.match(source, /import RemoteAppDetailPage/);
  assert.match(source, /useAppDetailProjection\(props\)/);
  assert.doesNotMatch(source, /BusinessPreviewGallery|IndicatorBuildDialog/);
}
assert.match(admin, /import RemoteRecordPage/);
assert.match(admin, /:record="props\.integrationData"/);
assert.match(announcements, /class="publish-notice"/);
assert.match(training, /class="course-grid"/);
assert.match(points, /class="source-icon"[\s\S]{0,180}<AppIcon[^>]*:size="52"/);
assert.match(points, /\.dynamic-panel li>b\{[^}]*white-space:nowrap\}/,
  '积分动态数值与单位不得换行');
assert.match(points, /\.dynamic-panel li time\{[^}]*white-space:nowrap/,
  '积分动态时间不得换行');
assert.match(points, /@media\(max-width:1100px\)\{\.point-layout\{grid-template-columns:1fr\}/,
  '积分双栏必须在 1100px 以下收敛为单列');

assert.match(certification, /<a\s+class="hero-primary"\s+href="#study">\s*工具学习/);
assert.match(certification, /<section\s+id="study"\s+class="learning-card"[\s\S]*class="learning-filters"/);
assert.match(certification, /class="platform-service"[\s\S]*数字化认证平台[\s\S]*认证服务/);
assert.doesNotMatch(certification, /class="cert-filter"/);
assert.match(certification, /@click="openBooking\(item\)"/);

for (const field of ['name', 'age', 'inPool', 'type', 'department', 'domain', 'office', 'tags', 'direction', 'start', 'end']) {
  assert.match(talentPeople, new RegExp(`controller\\.draft\\.${field}`));
}
assert.match(talentPeople, /@click="openCreate"/);
assert.match(talentPeople, /role="dialog"/);
assert.match(talentPeople, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*clamp\(520px,\s*38vw,\s*680px\)/);
assert.match(talentProjects, /role="dialog"/);
assert.match(talentProjects, /grid-template-columns:minmax\(280px,1\.5fr\) repeat\(4,minmax\(160px,1fr\)\) 80px 80px/);
assert.match(talentProjects, /grid-template-columns:minmax\(0,1fr\) clamp\(520px,38vw,680px\)/);
assert.match(operations, /\.ranking li\{[^}]*min-height:29px;[^}]*font-size:14px;line-height:1\.4/);
assert.match(materials, /\.materials-header p\{[^}]*font-size:14px;line-height:1\.65/);
assert.match(materials, /@media\(max-width:1360px\) and \(min-width:761px\)[\s\S]*button\[type=submit\]\{grid-column:2;grid-row:3\}/);

for (const migration of retirementMap.migrations) {
  assert.equal(migration.destination, 'tools/ui-source-20260904-sync.test.mjs');
  assert.ok(migration.assertions.length > 0);
}
for (const source of [
  'tools/latest-ui-remediation.test.mjs:GlobalTypographyTokens',
  'tools/latest-ui-remediation.test.mjs:NoticeFilterIcons',
  'tools/latest-ui-remediation.test.mjs:AppsPageFilterLabels',
  'tools/latest-ui-remediation.test.mjs:PointsPageDynamics'
]) {
  assert.ok(retirementMap.migrations.some(item => item.source === source), `缺少有效 UI 合同迁移映射：${source}`);
}

console.log('现存 ExhibitionShell、全局样式和页面的适用 UI 源回归合同通过');
