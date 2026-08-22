import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRenderer, h, nextTick } from 'vue';
import { APP_FIXTURES, PEOPLE_FIXTURES } from '../src/fixtures/mock-data.js';
import {
  createAppsController,
  createShellController,
  createSixStateController,
  createTalentController
} from '../src/state/interaction-controllers.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const shell = createShellController();
assert.equal(shell.expanded, true);
shell.toggle();
assert.equal(shell.expanded, false);
assert.equal(shell.announcement, '左侧导航已收起');
shell.toggle();
assert.equal(shell.expanded, true);
assert.equal(shell.announcement, '左侧导航已展开');

assert.deepEqual([...new Set(APP_FIXTURES.map(app => app.category))].sort(),
  ['AI', 'RPA', '可视化报表', '大屏', '数据集', '指标', '海能work应用', '驾驶舱'].sort());
const apps = createAppsController(APP_FIXTURES);
assert.equal(apps.results.length, APP_FIXTURES.length);
apps.setFilter('category', 'RPA');
assert.ok(apps.results.length > 0 && apps.results.every(app => app.category === 'RPA'));
apps.setFilter('query', '发票');
assert.deepEqual(apps.results.map(app => app.id), ['app-rpa-001']);
apps.setFilter('query', '不存在的应用');
assert.equal(apps.results.length, 0);
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
  setup: () => () => h('button', {
    'aria-expanded': String(mountedShell.expanded),
    onClick: () => mountedShell.toggle()
  }, mountedShell.expanded ? '收起' : '展开')
}).mount(root);
assert.equal(root.children[0].props['aria-expanded'], 'true');
root.children[0].props.onClick();
await nextTick();
assert.equal(root.children[0].props['aria-expanded'], 'false');
assert.equal(root.children[0].text, '展开');

const shellSource = read('src/components/ExhibitionShell.vue');
const appSource = read('src/App.vue');
const appsSource = read('src/pages/AppsPage.vue');
const talentSource = read('src/pages/TalentPeoplePage.vue');
for (const contract of ['aria-expanded', '@click="toggleSidebar"', 'sidebar-collapsed']) {
  assert.ok(shellSource.includes(contract), `壳层未接通交互合同：${contract}`);
}
for (const contract of ['compact-sidebar-nav', ':aria-label="label"', 'window.history.pushState'])
  assert.ok(shellSource.includes(contract), `收起态/同壳导航合同缺失：${contract}`);
assert.doesNotMatch(shellSource, /location\.assign\(/, '应用分类不得整页重载并丢失壳层状态');
for (const contract of ['createAppsController', 'setCategory', 'filteredApps', 'aria-pressed', '清空筛选']) {
  assert.ok(appsSource.includes(contract), `应用中心未接通交互合同：${contract}`);
}
for (const contract of ['createTalentController', 'role="dialog"', 'aria-modal="true"', '@keydown.esc', '查看详情']) {
  assert.ok(talentSource.includes(contract), `人才库未接通交互合同：${contract}`);
}
for (const contract of ['xltTalentDrawer', 'window.history.pushState', 'window.history.back()', 'setBackgroundInert', 'focusDrawer'])
  assert.ok(talentSource.includes(contract), `人才抽屉 History/隔离合同缺失：${contract}`);
for (const contract of ['pagedPeople', 'controller.setPage', '共 {{ controller.results.length }} 条'])
  assert.ok(talentSource.includes(contract), `人才库真实分页合同缺失：${contract}`);
assert.ok(!talentSource.includes('>更多<'), '人才库不得保留“更多”操作');
for (const contract of ['handleInternalNavigation', 'window.history.pushState', 'restoreRouteSession', '(target||main).focus()'])
  assert.ok(appSource.includes(contract), `站内路由未保持壳层状态/焦点：${contract}`);

console.log('第一批 mounted/interaction：壳层、应用中心、人才库、六态行为通过');
