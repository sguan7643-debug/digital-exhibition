import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const rowsByName = new Map([
  ['用户字典', [{ record_id: 'u1', fields: { 用户ID: 'USER-1', 姓名: '用户甲' } }]],
  ['应用索引', [{ record_id: 'app1', fields: { 应用ID: 'APP-1', 应用名称: '采购助手', 应用类型: 'AI', 状态: 'ONLINE' } }]],
  ['应用类型配置', [{ record_id: 'type1', fields: { 类型ID: 'AI', 类型编码: 'AI', 类型名称: 'AI智能体' } }]],
  ['业务域字典', []], ['部门字典', []], ['场景字典', []],
  ['使用申请', [{ record_id: 'use1', fields: { 主键: 'USE-1', 申请编号: 'USE-NO-1', 应用ID: 'APP-1', 申请人ID: 'USER-1', 状态: 'PENDING', 提交时间: '2026-09-02T01:00:00.000Z', 更新时间: '2026-09-02T02:00:00.000Z' } }]],
  ['上架申请', []], ['应用复用申请', []], ['外部成果提交记录', []],
  ['培训课程', [{ record_id: 'course1', fields: { 课程ID: 'COURSE-1', 培训标题: '采购课程', 状态: 'OPEN', 学习入口URL: 'https://training.example/course-1', 入口过期时间: '2026-09-03T00:00:00.000Z', 直播状态: 'LIVE' } }]],
  ['培训报名', [{ record_id: 'registration1', fields: { 报名编号: 'REG-1', 课程ID: 'COURSE-1', 用户ID: 'USER-1', 状态: 'REGISTERED' } }]],
  ['认证项目', [{ record_id: 'cert1', fields: { 认证编码: 'CERT-1', 认证名称: '采购认证', 认证类型: 'BUSINESS', 认证说明: '采购能力认证', 适用人群: '采购人员、项目经理', 主办单位: '数字化中心', 考试规则: '闭卷考试', 通过规则: '80 分', 启用: true } }]],
  ['考试场次', [{ record_id: 'session1', fields: { 场次编码: 'SESSION-1', 认证项目ID: 'CERT-1', 场次名称: '第一场', 考试地点: '北京考点', 考试开始: '2026-09-10T01:00:00.000Z', 考试结束: '2026-09-10T03:00:00.000Z', 容量: 20, 已预约人数: 3, 状态: 'OPEN' } }]],
  ['考试预约', [{ record_id: 'booking1', fields: { 预约编号: 'BOOK-1', 认证项目ID: 'CERT-1', 考试场次ID: 'SESSION-1', 用户ID: 'USER-1', 状态: 'RESERVED' } }]],
  ['导出任务', [{ record_id: 'export1', fields: { 导出任务ID: 'EXPORT-1', 导出类型: 'APP_LIST', 状态: 'COMPLETED', 进度: 100, 总行数: 12, 已处理行数: 12, 文件ID: 'FILE-1', 创建用户ID: 'USER-1', 创建时间: '2026-09-02T01:00:00.000Z', 完成时间: '2026-09-02T01:01:00.000Z' } }]]
]);
const tableNames = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const client = { async listRecords(tableId) { const items = rowsByName.get(tableNames.get(tableId)) || []; return { items, total: items.length, hasMore: false, nextPageToken: '' }; } };
const service = createFeishuReadOnlyService({ client, identifierContract, appProjectionCacheMs: 0, now: () => new Date('2026-09-02T05:00:00.000Z'), traceIdFactory: () => 'trace-detail' });
const context = { identity: { userId: 'USER-1', openId: 'OPEN-1' } };
const contracts = createVerifiedReadOperationContracts();
const responses = new Map();

responses.set('APP-010', await service.execute('APP-010', { applicationId: 'USE-1', includeHistory: true }, context));
assert.equal(responses.get('APP-010').data.businessType, 'APP_USE');
assert.equal(responses.get('APP-010').data.applicantId, 'USER-1');
assert.equal(responses.get('APP-010').data.externalSubmissionStatus, 'NOT_SUBMITTED');

responses.set('TRN-006', await service.execute('TRN-006', { courseId: 'COURSE-1', sourcePage: '/training/COURSE-1', deviceId: 'DEVICE-1' }, context));
assert.equal(responses.get('TRN-006').data.allowed, true);
assert.equal(responses.get('TRN-006').data.launchUrl, 'https://training.example/course-1');

responses.set('CER-003', await service.execute('CER-003', { certificationId: 'CERT-1' }, context));
assert.equal(responses.get('CER-003').data.examSites[0].remaining, 17);
assert.equal(responses.get('CER-003').data.myStatus.bookingId, 'BOOK-1');

responses.set('COM-010', await service.execute('COM-010', { exportId: 'EXPORT-1' }, context));
assert.equal(responses.get('COM-010').data.file.fileId, 'FILE-1');
assert.equal(responses.get('COM-010').data.processedRows, 12);

for (const operationId of ['APP-010', 'TRN-006', 'CER-003', 'COM-010']) {
  assert.doesNotThrow(() => validateContractSchema(responses.get(operationId), contracts[operationId].successSchema, operationId));
  assert.equal(resolveRemoteReadOperation(operationId).remoteEnabled, true);
  await assert.rejects(service.execute(operationId, {}, {}), error => error.code === 'USER_AUTH_REQUIRED');
}
await assert.rejects(service.execute('APP-010', { applicationId: 'USE-1', userId: 'USER-2' }, context), error => error.code === 'INVALID_OPERATION_INPUT');
await assert.rejects(service.execute('COM-010', { exportId: 'EXPORT-1' }, { identity: { userId: 'USER-2' } }), error => error.code === 'RESOURCE_NOT_FOUND');

console.log('feishu-identity-detail-reads: ok');
