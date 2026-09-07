import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PEOPLE_FIXTURES } from '../src/fixtures/mock-data.js';
import { createTalentController } from '../src/state/interaction-controllers.js';
import { PROJECT_FIXTURES, createTalentProjectController } from '../src/state/talent-project-controller.js';

const read = file => readFileSync(new URL(`../src/pages/${file}`, import.meta.url), 'utf8');
const people = read('TalentPeoplePage.vue');
const projects = read('TalentProjectsPage.vue');
const progress = read('TalentProgressPage.vue');

const peopleController = createTalentController(PEOPLE_FIXTURES);
const projectController = createTalentProjectController(PROJECT_FIXTURES);
assert.equal(peopleController.drawerOpen, false, '人才库默认不得打开详情抽屉');
assert.equal(projectController.drawerOpen, false, '人才项目默认不得打开新增或编辑抽屉');
assert.equal(peopleController.pageSize, 10, '人才库默认每页必须为 10 条');
assert.equal(projectController.pageSize, 10, '人才项目默认每页必须为 10 条');

for (const column of ['年龄','本期是否在库','领域/专业','责任科室','能力标签-新','培养方向','轮岗计划-开始时间','轮岗计划-结束时间']) {
  assert.ok(people.includes(`<th scope="col">${column}</th>`), `人才库必须恢复冻结参考列：${column}`);
}
for (const binding of ['person.age','person.inPool','person.office','person.tags','person.direction','person.start','person.end']) {
  assert.ok(people.includes(`{{ ${binding} }}`), `人才库必须呈现确定性字段：${binding}`);
}
assert.doesNotMatch(people, /onMounted\([^)]*controller\.open/s, '人才库 mounted 不得隐式打开详情');
assert.doesNotMatch(projects, /onMounted\([^)]*controller\.open(?:Create|Edit)/s, '人才项目 mounted 不得隐式打开新增或编辑抽屉');
assert.doesNotMatch(progress, /role="dialog"|drawer-open/, '项目进度默认页不得伪造抽屉');

for (const [source, marker, label] of [
  [people, '.talent-body th{height:48px;', '人才库表头 48px'],
  [people, '.talent-body td{height:53px;', '人才库数据行 53px'],
  [projects, '.projects-body th{height:48px;', '人才项目表头 48px'],
  [projects, '.projects-body td{height:64px;', '人才项目两行数据行 64px'],
  [progress, '.progress-page th{height:60px;', '项目进度两行表头 60px'],
  [progress, '.progress-page td{height:67px;', '项目进度数据行 67px']
]) assert.ok(source.includes(marker), `${label}必须采用量化交接的独立表格密度`);

for (const [source, marker, label] of [
  [people, 'font-size:13px;line-height:20px', '人才库'],
  [projects, 'font-size:13px;line-height:20px', '人才项目'],
  [progress, 'font-size:13px;line-height:20px', '项目进度']
]) assert.ok(source.includes(marker), `${label}表格文字不得靠缩小字号挤列`);

for (const [source, marker, label] of [
  [people, 'grid-template-columns:224px repeat(4,124px) 68px 68px;gap:16px', '人才库筛选'],
  [projects, 'grid-template-columns:316px repeat(4,128px) 80px 80px;gap:16px', '人才项目筛选'],
  [progress, 'grid-template-columns:224px repeat(4,128px) 68px 68px;gap:16px', '项目进度筛选']
]) assert.ok(source.includes(marker), `${label}必须采用量化交接的独立列宽与 16px 间距`);

console.log('人才三页冻结列、默认关闭抽屉、10条分页与紧凑表格密度合同通过');
