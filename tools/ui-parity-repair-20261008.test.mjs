import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8');

function sourceGraph(relativePath, visited = new Set()) {
  const absolutePath = resolve(root, relativePath);
  if (visited.has(absolutePath) || !existsSync(absolutePath)) return '';
  visited.add(absolutePath);
  const source = readFileSync(absolutePath, 'utf8');
  const imports = [...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)]
    .map(match => match[1])
    .map(specifier => {
      const candidate = resolve(dirname(absolutePath), specifier);
      if (extname(candidate)) return candidate;
      for (const suffix of ['.vue', '.js', '.mjs']) {
        if (existsSync(`${candidate}${suffix}`)) return `${candidate}${suffix}`;
      }
      return candidate;
    });
  return [source, ...imports.map(file => sourceGraph(file, visited))].join('\n');
}

const app = read('src/App.vue');
const styles = read('src/style.css');

assert.doesNotMatch(app, /data-update-time|数据更新时间/,
  '全站必须删除可见的数据更新时间节点，不能保留隐藏节点或占位');
assert.doesNotMatch(styles, /\.data-update-time\b/,
  '全站必须删除数据更新时间的布局样式');
assert.match(app, /request-loading-overlay/,
  '后继任务批准的前台请求全页面 loading 必须保留');
assert.doesNotMatch(app, /request-loading-toast/,
  '旧右上角 loading 气泡不得回归');

const routeContracts = new Map([
  ['WorkbenchPage.vue', ['workbench-page', 'hero-panel', 'dashboard-grid']],
  ['MessagesPage.vue', ['messages-page', 'message-filters', 'message-panel']],
  ['FavoritesPage.vue', ['favorites-page', 'favorite-filters', 'favorite-grid']],
  ['ProfilePage.vue', ['profile-page', 'profile-top', 'quick-panel']],
  ['AnnouncementsPage.vue', ['announcements-page', 'notice-filters', 'notice-table']],
  ['NoticeDetailPage.vue', ['notice-page', 'notice-sheet', 'notice-footer']],
  ['AppsPage.vue', ['apps-page', 'app-type-overview', 'application-grid']],
  ['ToolDetailPage.vue', ['tool-detail', 'detail-metrics', 'info-grid', 'file-list']],
  ['HainengWorkDetailPage.vue', ['work-detail', 'detail-metrics', 'work-info', 'video-cell']],
  ['ReportDetailPage.vue', ['report-detail', 'detail-metrics', 'feature-grid', 'training-row']],
  ['DashboardDetailPage.vue', ['dashboard-detail', 'detail-metrics', 'feature-grid', 'detail-panel--preview']],
  ['DatasetDetailPage.vue', ['dataset-detail', 'detail-metrics', 'preview-wide', 'dataset-training']],
  ['MetricDetailPage.vue', ['metric-detail', 'detail-metrics', 'metric-strip', 'metric-table']],
  ['AiDetailPage.vue', ['ai-detail', 'detail-metrics', 'ai-table', 'training-row']],
  ['EadDetailPage.vue', ['ead-detail', 'detail-metrics', 'ead-info', 'ead-flow']],
  ['RpaDetailPage.vue', ['rpa-detail', 'rpa-metrics', 'rpa-recording', 'rpa-flow']],
  ['OnboardingPage.vue', ['onboarding-page']],
  ['PointsPage.vue', ['points-page', 'point-layout', 'rule-panel']],
  ['PointsDetailsPage.vue', ['points-details', 'point-filter', 'point-table']],
  ['TrainingPage.vue', ['training-page', 'training-hero', 'course-grid']],
  ['OperationsPage.vue', ['operations-page', 'ops-stats', 'ops-grid']],
  ['AnnouncementAdminPage.vue', ['admin-list', 'admin-stats', 'admin-table']],
  ['AnnouncementEditorPage.vue', ['editor-page', 'basic-grid', 'editor-split']],
  ['AppAdminPage.vue', ['app-admin', 'app-admin-stats', 'app-admin-table']],
  ['AppEditorPage.vue', ['app-editor', 'edit-main', 'assets-form']],
  ['AdminPage.vue', ['backend-page', 'config-grid', 'log-panel']],
  ['CertificationPage.vue', ['cert-page', 'cert-layout', 'platform-service']],
  ['TalentPeoplePage.vue', ['talent-people', 'talent-body', 'talent-table-scroll']],
  ['TalentProjectsPage.vue', ['talent-projects', 'projects-body', 'table-scroll']],
  ['TalentProgressPage.vue', ['progress-page', 'talent-local-nav', 'progress-table']],
]);

assert.equal(routeContracts.size, 30, 'UI 一致性合同必须逐页覆盖全部 30 个共同路由');
for (const [page, markers] of routeContracts) {
  const graph = sourceGraph(`src/pages/${page}`);
  for (const marker of markers) {
    assert.ok(graph.includes(marker), `${page} 缺少参考结构标记 ${marker}`);
  }
}

for (const [page, kind] of [
  ['ToolDetailPage.vue', 'tool'],
  ['HainengWorkDetailPage.vue', 'work'],
  ['ReportDetailPage.vue', 'report'],
  ['DashboardDetailPage.vue', 'dashboard'],
  ['DatasetDetailPage.vue', 'dataset'],
  ['MetricDetailPage.vue', 'metric'],
  ['AiDetailPage.vue', 'ai'],
  ['EadDetailPage.vue', 'ead'],
  ['RpaDetailPage.vue', 'rpa'],
]) {
  assert.match(read(`src/pages/${page}`), new RegExp(`kind=["']${kind}["']`),
    `${page} 必须声明独立的 ${kind} 详情族，不能只传图标复用稀疏页面`);
}

const personProjectionSources = [
  read('server/feishu-read-only-service.mjs'),
  read('server/feishu-onboarding-reference-resolver.mjs'),
].join('\n');
assert.match(personProjectionSources, /resolvePersonDisplayName/,
  '服务端必须提供共享的权威人员姓名解析合同');
assert.doesNotMatch(personProjectionSources,
  /(?:userLookup|users)\.get\([^\n]+\)\s*\|\|\s*[A-Za-z_$][\w$]*(?:Id|ID)\b/,
  '用户字典未命中时不得把人员编码回退成用户可见姓名');

const appsPage = read('src/pages/AppsPage.vue');
assert.match(appsPage, /data-person-name/,
  '应用卡片的负责人和开发者姓名槽必须可被可访问性与泄漏回归检查定位');
assert.doesNotMatch(read('src/pages/OnboardingApplyPage.vue'), /\$\{user\.displayName\}（\$\{user\.userId\}）/,
  '人员选择控件不得把用户编码拼接到可见姓名中');

console.log('DEH-UI-PARITY-REPAIR-20261008：30 路由结构、人员姓名与全局占位合同通过');
