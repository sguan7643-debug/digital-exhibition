import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROGRESS_DOCUMENT_COLUMNS, createTalentProgressController } from '../src/state/talent-progress-controller.js';

const rows=Array.from({length:8},(_,index)=>({
  id:`TEST_PROGRESS_${index+1}`,name:index===0?'海上平台数字化人才培养项目':`测试项目 ${index+1}`,
  progress:index===0?'进行中':'待启动',domain:index===0?'数字化转型':'其他',stage:index===0?'方案设计':'准备',
  status:index===0?'正常':'待启动',documents:Object.fromEntries(PROGRESS_DOCUMENT_COLUMNS.map(label=>[label,index===0?1:'—']))
}));
const controller=createTalentProgressController(rows);
assert.equal(controller.results.length,8);
controller.draft.query='不存在的项目';
controller.submit();
assert.equal(controller.results.length,0,'关键词查询必须真实过滤结果');
assert.equal(controller.announcement,'查询完成，共 0 个项目');
controller.reset();
assert.equal(controller.results.length,8,'重置必须恢复传入的真实读取结果');
Object.assign(controller.draft,{progress:'进行中',domain:'数字化转型',stage:'方案设计',status:'正常'});
controller.submit();
assert.deepEqual(controller.results.map(item=>item.id),['TEST_PROGRESS_1'],'四个筛选必须按 AND 组合');
controller.explainDocument(rows[0],'工作计划书');
assert.match(controller.announcement,/未返回可访问地址/);
controller.explainDetail(rows[0]);
assert.match(controller.announcement,/详情仅在当前页说明/);

const source=readFileSync(new URL('../src/pages/TalentProgressPage.vue',import.meta.url),'utf8');
for(const contract of ["['TAL-003']",'createTalentProgressController','PaginationControl','@submit.prevent="controller.submit"','@reset.prevent="controller.reset"']){
  assert.ok(source.includes(contract),`项目进度真实读取/交互合同缺失：${contract}`);
}
assert.match(source,/:disabled="remoteMode"/,'正式人才写入未启用时文档和详情动作必须禁用');
assert.match(source,/飞书导出接口尚未开放/,'导出必须保持明确禁用说明');
assert.doesNotMatch(source,/PROGRESS_FIXTURES|mock-data/,'项目进度页面不得回退到模拟业务数据');

console.log('TalentProgress：真实读取映射、AND 筛选、重置、分页与禁用写入合同通过');
