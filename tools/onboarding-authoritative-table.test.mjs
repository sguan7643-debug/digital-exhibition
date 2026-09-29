import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOnboardingService } from '../server/feishu-onboarding-service.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const tableNames = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const rowsByName = new Map([
  ['上架申请', [
    { record_id: 'rec-rpa', fields: { 申请单号: 'PA-RPA-001', 关联应用ID: 'APP-RPA-001', 应用类型ID: 'T003', 申请人ID: 'USER-1', 应用名称: '采购机器人', 应用编码: 'RPA-001', 所属业务域ID: 'BD003', 状态: 'APPROVED', 当前审批节点: '审批通过', 提交时间: '2026-09-29 19:00:00', 完成时间: 1790709000000, 审批实例ID: 'INSTANCE-RPA-001', 授权用户: 'USER-1', 授权部门: 'DEPT-1' } },
    { record_id: 'rec-work', fields: { 申请单号: 'PA-WORK-001', 关联应用ID: 'APP-WORK-001', 应用类型ID: 'T005', 申请人ID: 'USER-1', 应用名称: '协同助手', 应用编码: 'WORK-001', 所属业务域ID: 'BD005', 状态: 'PENDING', 当前审批节点: '飞书审批中', 提交时间: '2026-09-29 18:00:00', 审批实例ID: 'INSTANCE-WORK-001', 授权用户: 'USER-1', 授权部门: 'DEPT-1' } },
    { record_id: 'rec-other', fields: { 申请单号: 'PA-OTHER-001', 申请人ID: 'USER-2', 应用名称: '他人应用', 状态: 'PENDING', 提交时间: '2026-09-29 20:00:00' } }
  ]],
  ['用户字典', [
    { record_id: 'user-1', fields: { AD账号: 'USER-1', 姓名: '用户甲' }, },
    { record_id: 'user-2', fields: { AD账号: 'USER-2', 姓名: '用户乙' }, }
  ]],
  ['部门字典', [{ record_id: 'dept-1', fields: { 部门ID: 'DEPT-1', 部门名称: '信息化部门' } }]],
  ['应用类型配置', [
    { record_id: 'type-rpa', fields: { 类型ID: 'T003', 类型名称: 'RPA' } },
    { record_id: 'type-work', fields: { 类型ID: 'T005', 类型名称: '海能Work应用' } }
  ]],
  ['业务域字典', [
    { record_id: 'domain-3', fields: { 业务域ID: 'BD003', 业务域名称: '供应链管理' } },
    { record_id: 'domain-5', fields: { 业务域ID: 'BD005', 业务域名称: '数字化办公' } }
  ]]
]);
const calls = [];
const client = {
  async listRecords(tableId, query = {}) {
    const tableName = tableNames.get(tableId);
    calls.push({ tableName, query });
    const items = rowsByName.get(tableName) || [];
    return { items, total: items.length, hasMore: false, nextPageToken: '' };
  }
};
const readService = createFeishuReadOnlyService({
  client,
  identifierContract,
  appProjectionCacheMs: 0,
  now: () => new Date('2026-09-29T12:00:00.000Z'),
  traceIdFactory: () => 'trace-onboarding-authoritative'
});
const context = { identity: { userId: 'USER-1', openId: 'OPEN-1' } };

const applications = await readService.listCurrentOnboardingApplications(context);
assert.equal(applications.length, 2, '我的申请必须包含上架申请表中的 RPA 和海能 Work 申请');
assert.deepEqual(applications.map(item => item.applicationId), ['PA-RPA-001', 'PA-WORK-001'], '列表必须按提交时间倒序且不能混入他人申请');
assert.equal(applications[0].applicationTypeName, 'RPA');
assert.equal(applications[0].applicationName, '采购机器人');
assert.equal(applications[0].businessDomainName, '供应链管理');
assert.deepEqual(applications[0].authorizedUserNames, ['用户甲']);
assert.deepEqual(applications[0].authorizedDepartments, ['信息化部门']);
assert.equal(applications[0].instanceId, 'INSTANCE-RPA-001');
assert.ok(calls.some(call => call.tableName === '上架申请' && call.query.filter), '上架申请读取必须在服务端携带当前申请人过滤条件');

const detail = await readService.getCurrentOnboardingApplication('PA-RPA-001', context);
assert.equal(detail.applicationCode, 'RPA-001');
assert.equal(detail.status, 'APPROVED');
await assert.rejects(
  readService.getCurrentOnboardingApplication('PA-OTHER-001', context),
  error => error?.code === 'RESOURCE_NOT_FOUND' && error?.status === 404,
  '不得读取其他申请人的上架申请'
);

const onboardingService = createFeishuOnboardingService({
  approvalService: { async createInstance() { throw new Error('not used'); }, async getInstance() { throw new Error('not used'); } },
  fileAccessService: { createGrant() { throw new Error('not used'); } },
  readService
});
const session = { identity: context.identity, accessToken: 'server-only' };
const routedList = await onboardingService.list(session);
assert.deepEqual(routedList.items.map(item => item.applicationId), ['PA-RPA-001', 'PA-WORK-001'], '上线申请接口必须以权威表读取结果为准');
assert.equal((await onboardingService.get('PA-RPA-001', session)).applicationName, '采购机器人');

console.log('my applications reads every application type from 上架申请 and scopes rows to the OAuth identity');
