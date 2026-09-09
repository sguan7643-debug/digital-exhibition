import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRenderer, h, nextTick } from 'vue';
import { APP_CATEGORIES, APP_FIXTURES, PEOPLE_FIXTURES } from '../src/fixtures/mock-data.js';
import {
  createAppsController,
  createShellController,
  createSixStateController,
  createTalentController,
  normalizeAppCategory,
  applicationAccessMode
} from '../src/state/interaction-controllers.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const shell = createShellController();
assert.equal(shell.materialsExpanded, true);
assert.equal(shell.appsExpanded, true);
shell.toggleGroup('materials');
assert.equal(shell.materialsExpanded, false);
assert.equal(shell.appsExpanded, true);
assert.equal(shell.announcement, '素材中心子菜单已收起');
shell.toggleGroup('apps');
assert.equal(shell.materialsExpanded, false);
assert.equal(shell.appsExpanded, false);
assert.equal(shell.announcement, '应用中心子菜单已收起');

assert.deepEqual([...new Set(APP_FIXTURES.map(app => app.category))].sort(),
  ['AI', 'EAD', 'RPA', '其他工具', '可视化报表', '大屏', '数据集', '指标', '海能work应用', '驾驶舱'].sort());
for (const app of APP_FIXTURES) {
  assert.ok(app.department?.trim(), `${app.name} 必须提供负责部门`);
  assert.ok(app.developerDepartment?.trim(), `${app.name} 必须提供开发部门`);
  assert.ok(['direct', 'apply'].includes(app.accessMode), `${app.name} 的访问模式必须有效`);
  assert.equal(applicationAccessMode(app.route), app.accessMode, `${app.name} 的卡片和详情访问模式必须一致`);
}
const apps = createAppsController(APP_FIXTURES);
assert.equal(apps.results.length, APP_FIXTURES.length);
apps.setFilter('category', 'RPA');
assert.ok(apps.results.length > 0 && apps.results.every(app => app.category === 'RPA'));
apps.setFilter('query', '发票');
assert.deepEqual(apps.results.map(app => app.id), ['app-rpa-001']);
apps.setFilter('query', '不存在的应用');
assert.equal(apps.results.length, 0);
apps.reset();
apps.setFilter('category', '可视化');
assert.deepEqual(apps.results.map(app => app.category).sort(), ['大屏', '驾驶舱'].sort());
assert.equal(normalizeAppCategory('可视化报表'), '报表');
for (const category of APP_CATEGORIES) {
  apps.reset();
  apps.setFilter('category', category);
  assert.ok(apps.results.length > 0, `${category} 分类必须至少展示一个应用`);
}
apps.reset();
apps.setSort('usage-desc');
assert.ok(apps.results[0].usage >= apps.results.at(-1).usage);
apps.setView('list');
assert.equal(apps.view, 'list');
assert.equal(apps.announcement, '已切换为列表视图');

const talent = createTalentController(PEOPLE_FIXTURES);
assert.equal(talent.selectedId, null);
assert.equal(talent.drawerOpen, false);
talent.open('person-002');
assert.equal(talent.selected.id, 'person-002');
assert.equal(talent.drawerOpen, true);
talent.close();
assert.equal(talent.drawerOpen, false);
talent.setFilter('department', '技术研发部');
assert.ok(talent.results.length > 0 && talent.results.every(person => person.department === '技术研发部'));
talent.setFilter('query', '云架构');
assert.deepEqual(talent.results.map(person => person.id), ['person-010']);
talent.reset();
assert.equal(talent.results.length, PEOPLE_FIXTURES.length);
assert.equal(talent.selectedId, null);
assert.equal(PEOPLE_FIXTURES.length, 32);
assert.equal(talent.totalPages, 4);
assert.equal(talent.pagedResults.length, 10);
talent.setPage(2);
assert.equal(talent.page, 2);
assert.notEqual(talent.pagedResults[0].id, PEOPLE_FIXTURES[0].id);

const talentCreate = createTalentController(PEOPLE_FIXTURES);
talentCreate.openCreate();
assert.equal(talentCreate.creating, true);
assert.equal(talentCreate.drawerOpen, true);
assert.equal(talentCreate.saveNew(), false);
assert.ok(Object.keys(talentCreate.errors).length > 0);
Object.assign(talentCreate.draft, {
  name: '测试人才', age: '35', inPool: '是', type: '专业人才', department: '采购管理部',
  domain: '供应链', office: '采购一室', tags: '采购,数据', direction: '数字化采购',
  start: '2026-09-01', end: '2026-12-31'
});
const createdTalent = talentCreate.saveNew();
assert.equal(createdTalent.id, 'person-local-033');
assert.equal(createdTalent.age, 35);
assert.equal(talentCreate.fixtures.length, PEOPLE_FIXTURES.length + 1);
assert.equal(talentCreate.fixtures[0].id, createdTalent.id);
assert.equal(talentCreate.drawerOpen, false);
assert.equal(talentCreate.page, 1);

const scheduled = [];
const sixState = createSixStateController('error', (callback, delay) => scheduled.push({ callback, delay }));
sixState.retry();
assert.equal(sixState.state, 'loading');
assert.equal(scheduled[0].delay, 800);
scheduled[0].callback();
assert.equal(sixState.state, 'normal');
assert.equal(sixState.announcement, '内容加载完成');

// Mount a Vue interaction harness with the production controller. This executes
// the click handler and reactive render cycle without requiring a browser DOM.
const hostOps = {
  createElement: type => ({ type, props: {}, children: [], text: '' }),
  createText: text => ({ type: '#text', text }),
  createComment: text => ({ type: '#comment', text }),
  setText: (node, text) => { node.text = text; },
  setElementText: (node, text) => { node.text = text; node.children = []; },
  parentNode: node => node.parent || null,
  nextSibling: () => null,
  insert: (child, parent) => { child.parent = parent; parent.children.push(child); },
  remove: child => { if (child.parent) child.parent.children = child.parent.children.filter(node => node !== child); },
  patchProp: (node, key, _previous, value) => { node.props[key] = value; }
};
const renderer = createRenderer(hostOps);
const mountedShell = createShellController();
const root = { type: 'root', children: [] };
renderer.createApp({
  setup: () => () => h('div', {}, [h('button', {
    'aria-expanded': String(mountedShell.materialsExpanded),
    'aria-controls': 'materials-group-menu',
    onClick: () => mountedShell.toggleGroup('materials')
  }, mountedShell.materialsExpanded ? '收起素材中心子菜单' : '展开素材中心子菜单'),h('button', {
    'aria-expanded': String(mountedShell.appsExpanded),
    'aria-controls': 'apps-group-menu',
    onClick: () => mountedShell.toggleGroup('apps')
  }, mountedShell.appsExpanded ? '收起应用中心子菜单' : '展开应用中心子菜单')])
}).mount(root);
assert.equal(root.children[0].children[0].props['aria-expanded'], 'true');
assert.equal(root.children[0].children[1].props['aria-expanded'], 'true');
root.children[0].children[0].props.onClick();
await nextTick();
assert.equal(root.children[0].children[0].props['aria-expanded'], 'false');
assert.equal(root.children[0].children[1].props['aria-expanded'], 'true');
assert.equal(root.children[0].children[0].text, '展开素材中心子菜单');

const shellSource = read('src/components/ExhibitionShell.vue');
const appSource = read('src/App.vue');
const appsSource = read('src/pages/AppsPage.vue');
const talentSource = read('src/pages/TalentPeoplePage.vue');
for (const contract of ['aria-controls="materials-group-menu"', 'aria-controls="apps-group-menu"', "@click=\"shellState.toggleGroup('materials')\"", "@click=\"shellState.toggleGroup('apps')\""]) {
  assert.ok(shellSource.includes(contract), `壳层未接通交互合同：${contract}`);
}
for (const forbidden of ['sidebar-toggle','sidebar-collapsed','compact-sidebar-nav'])
  assert.ok(!shellSource.includes(forbidden), `壳层不得保留整栏折叠合同：${forbidden}`);
assert.ok(shellSource.includes('window.history.pushState'), '应用分类必须保持同壳路由');
assert.doesNotMatch(shellSource, /location\.assign\(/, '应用分类不得整页重载并丢失壳层状态');
for (const contract of ['createAppsController', 'setCategory', 'filteredApps', 'aria-pressed', '清空筛选']) {
  assert.ok(appsSource.includes(contract), `应用中心未接通交互合同：${contract}`);
}
for (const contract of ['createTalentController', 'role="dialog"', 'aria-modal="true"', '@keydown.esc', '查看详情']) {
  assert.ok(talentSource.includes(contract), `人才库未接通交互合同：${contract}`);
}
for (const contract of ['xltTalentDrawer', 'window.history.pushState', 'window.history.back()', 'setBackgroundInert', 'focusDrawer'])
  assert.ok(talentSource.includes(contract), `人才抽屉 History/隔离合同缺失：${contract}`);
for (const contract of ['pagedPeople', 'controller.setPage'])
  assert.ok(talentSource.includes(contract), `人才库真实分页合同缺失：${contract}`);
assert.match(talentSource, /<PaginationControl[\s\S]*?:total="filteredPeople\.length"/,
  '人才库分页总数必须来自当前筛选结果');
for (const contract of ['@click="openCreate"', 'controller.openCreate()', 'updateDrawerQuery("create"', 'submitCreate'])
  assert.ok(talentSource.includes(contract), `新增人才右侧填写合同缺失：${contract}`);
assert.ok(!talentSource.includes('>更多<'), '人才库不得保留“更多”操作');
for (const contract of ['handleInternalNavigation', 'window.history.pushState', 'restoreRouteSession', '(target||main).focus()'])
  assert.ok(appSource.includes(contract), `站内路由未保持壳层状态/焦点：${contract}`);

console.log('第一批 mounted/interaction：壳层、应用中心、人才库、六态行为通过');
