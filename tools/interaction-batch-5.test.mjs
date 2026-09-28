import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTalentProjectController } from '../src/state/talent-project-controller.js';

const PROJECT_FIXTURES = Array.from({ length: 15 }, (_, index) => ({
  id: index === 0 ? 'PRJ20250608001' : `TEST_PROJECT_${String(index + 1).padStart(3, '0')}`,
  name: index === 0 ? '海上平台数字化人才培养项目' : `测试人才项目 ${index + 1}`,
  department: '测试部门', owner: '测试提出人', description: '测试项目说明', date: '2026-09-01',
  progress: index === 0 || index % 2 ? '进行中' : '待启动', domain: '数字化转型', technology: '人工智能',
  manager: '测试经理', members: '6', scale: '小型', difficulty: '中等',
}));

const projects=createTalentProjectController(PROJECT_FIXTURES);
assert.equal(PROJECT_FIXTURES.length,15);
assert.equal(projects.totalPages,2);
assert.equal(projects.pagedResults.length,10);
projects.setFilter('progress','进行中');
assert.ok(projects.results.every(item=>item.progress==='进行中'));
projects.setFilter('query','海上平台');
assert.deepEqual(projects.results.map(item=>item.id),['PRJ20250608001']);
projects.resetFilters();
projects.openCreate();
assert.equal(projects.drawerOpen,true);
assert.equal(projects.mode,'create');
assert.equal(projects.save(),false);
for(const [key,value] of Object.entries({name:'演示新增项目',department:'人力资源部',owner:'张三',description:'固定种子817新增项目',date:'2026-08-19',progress:'待启动',domain:'数字化转型',technology:'人工智能',manager:'李四',members:'6',scale:'小型',difficulty:'中等'}))projects.setDraft(key,value);
assert.equal(projects.save(),false);
assert.equal(projects.fixtures.length,PROJECT_FIXTURES.length);
assert.equal(projects.announcement,'正式人才写入接口尚未启用');
projects.openEdit(PROJECT_FIXTURES[0].id);
projects.setDraft('name','海上平台数字化人才培养项目（修订）');
assert.equal(projects.save(),false);
assert.equal(projects.fixtures.find(item=>item.id===PROJECT_FIXTURES[0].id).name,'海上平台数字化人才培养项目');

const source=readFileSync(new URL('../src/pages/TalentProjectsPage.vue',import.meta.url),'utf8');
for(const contract of ['createTalentProjectController','role="dialog"','aria-modal="true"','xltProjectDrawer','window.history.pushState','window.history.back()','trapFocus','focusFirstError','scope="col"'])assert.ok(source.includes(contract),`PP29/F07 未接线：${contract}`);

console.log('第五批 interaction：人才项目筛选、分页、对称 History 与可访问编辑抽屉通过');
