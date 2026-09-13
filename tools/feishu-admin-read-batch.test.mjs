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
  ['用户字典', [{ record_id: 'u1', fields: { AD账号: 'ADMIN-1', 姓名: '管理员' } }]],
  ['用户权限', [
    { record_id: 'p1', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.integrations.view', 启用: true } },
    { record_id: 'p2', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.audit.view', 启用: true } },
    { record_id: 'p3', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.archive.view', 启用: true } },
    { record_id: 'p4', fields: { 用户ID: 'ADMIN-1', 权限编码: 'operations.dashboard.view', 启用: true } },
    { record_id: 'p5', fields: { 用户ID: 'ADMIN-1', 权限编码: 'operations.announcements.manage', 启用: true } },
    { record_id: 'p6', fields: { 用户ID: 'ADMIN-1', 权限编码: 'operations.apps.manage', 启用: true } },
    { record_id: 'p7', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.health.view', 启用: true } },
    { record_id: 'p8', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.permissions.view', 启用: true } }
  ]],
  ['消息通知', []], ['应用收藏', []], ['积分余额', []],
  ['多维表连接配置', [{ record_id: 'conn1', fields: { 连接编码: 'CONN-1', 环境: 'TEST', 'Base Token掩码': 'bas***123', 启用: true, 最后健康状态: 'HEALTHY', 版本号: 2 } }]],
  ['后台操作日志', [{ record_id: 'audit1', fields: { 审计ID: 'AUDIT-1', 请求ID: 'REQ-1', 操作人ID: 'ADMIN-1', 模块编码: 'APP', 动作编码: 'VIEW', 资源类型: 'APP', 资源ID: 'APP-1', HTTP方法: 'GET', 路径: '/apps/APP-1', IP掩码: '10.***.1', 结果编码: 'OK', 发生时间: '2026-09-02T01:00:00.000Z', 耗时毫秒: 12 } }]],
  ['部门字典', []],
  ['接口调用日志', [{ record_id: 'log1', fields: { 日志ID: 'LOG-1', 请求ID: 'REQ-1', 集成ID: 'FEISHU', 方向: 'OUTBOUND', 操作编码: 'LIST_RECORDS', HTTP方法: 'GET', 端点掩码: '/bitable/***', 状态: 'SUCCESS', HTTP状态: 200, 开始时间: '2026-09-02T01:00:00.000Z', 结束时间: '2026-09-02T01:00:01.000Z', 耗时毫秒: 1000 } }]],
  ['后台任务执行记录', [{ record_id: 'exec1', fields: { 执行ID: 'EXEC-1', 任务ID: 'JOB-1', 触发类型: 'MANUAL', 触发人ID: 'ADMIN-1', 开始时间: '2026-09-02T01:00:00.000Z', 状态: 'SUCCEEDED', 进度: 100, 总数: 1, 成功数: 1, 失败数: 0, 跳过数: 0 } }]],
  ['归档任务', [{ record_id: 'archive1', fields: { 归档任务ID: 'ARCHIVE-1', 状态: 'SUCCEEDED', 阶段: 'VERIFIED', 源记录数: 10, 已归档数: 10, 已删除数: 0, 失败数: 0, 源校验和: 'SOURCE-HASH', 归档校验和: 'ARCHIVE-HASH', 归档位置掩码: 'bucket/***' } }]],
  ['归档执行记录', [{ record_id: 'archive-exec1', fields: { 执行记录ID: 'AEXEC-1', 归档任务ID: 'ARCHIVE-1', 动作: 'VERIFY', 状态: 'SUCCEEDED', 源记录ID: 'SOURCE-1', 归档记录ID: 'TARGET-1' } }]]
  ,['日统计汇总', [{ record_id: 'daily1', fields: { 汇总编码: 'DAY-1', 统计日期: '2026-09-02', 指标编码: 'VISIT_COUNT', 指标值: 12 } }]],
  ['统计指标定义', [{ record_id: 'metric1', fields: { 指标编码: 'VISIT_COUNT', 指标名称: '访问量', 单位: '次', 口径版本: '1' } }]],
  ['公告通知', [{ record_id: 'ann1', fields: { 公告ID: 'ANN-1', 公告标题: '系统公告', 分类: 'SYSTEM', 状态: 'PUBLISHED', 发布时间: '2026-09-02', 更新时间: '2026-09-02', 版本: 1 } }]],
  ['应用索引', [{ record_id: 'app1', fields: { 应用ID: 'APP-1', 应用名称: '采购助手', 应用类型: 'AI', 状态: 'ONLINE', 使用量: 10, 收藏数: 2 } }]],
  ['应用类型配置', [{ record_id: 'type1', fields: { 类型ID: 'AI', 类型编码: 'AI', 类型名称: 'AI智能体' } }]],
  ['业务域字典', []], ['场景字典', []], ['上架申请', []]
  ,['公告关联对象', []], ['应用关联', []], ['附件资料', []], ['演示截图录屏', []], ['应用评论', []], ['外部成果提交记录', []], ['完整性差异记录', []], ['异常处理记录', []]
]);
const tableNames = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const client = { async listRecords(tableId) { const items = rowsByName.get(tableNames.get(tableId)) || []; return { items, total: items.length, hasMore: false, nextPageToken: '' }; } };
const service = createFeishuReadOnlyService({ client, identifierContract, now: () => new Date('2026-09-02T05:00:00.000Z'), traceIdFactory: () => 'trace-admin' });
const context = { identity: { userId: 'ADMIN-1' } };
const contracts = createVerifiedReadOperationContracts();
const responses = new Map();

responses.set('INT-001', await service.execute('INT-001', { page: 1, pageSize: 10 }, context));
assert.equal(responses.get('INT-001').data.items[0].appTokenMasked, 'bas***123');
responses.set('ADM-003', await service.execute('ADM-003', { page: 1, pageSize: 10 }, context));
assert.equal(responses.get('ADM-003').data.items[0].operatorName, '管理员');
responses.set('ADM-004', await service.execute('ADM-004', { page: 1, pageSize: 10 }, context));
assert.equal(responses.get('ADM-004').data.items[0].endpointMasked, '/bitable/***');
responses.set('INT-004', await service.execute('INT-004', { view: 'EXECUTIONS', page: 1, pageSize: 10 }, context));
assert.equal(responses.get('INT-004').data.items[0].executionId, 'EXEC-1');
responses.set('ARC-002', await service.execute('ARC-002', { archiveTaskId: 'ARCHIVE-1' }, context));
assert.equal(responses.get('ARC-002').data.executions[0].action, 'VERIFY');
responses.set('OPS-001', await service.execute('OPS-001', { period: 'DAY', timezone: 'Asia/Shanghai' }, context));
assert.equal(responses.get('OPS-001').data.metrics[0].value, 12);
responses.set('OAN-001', await service.execute('OAN-001', {}, context));
assert.equal(responses.get('OAN-001').data.publishedCount, 1);
responses.set('OAN-002', await service.execute('OAN-002', { page: 1, pageSize: 10 }, context));
assert.equal(responses.get('OAN-002').data.items[0].announcementId, 'ANN-1');
responses.set('OAP-001', await service.execute('OAP-001', {}, context));
assert.equal(responses.get('OAP-001').data.onlineCount, 1);
responses.set('OAP-002', await service.execute('OAP-002', { page: 1, pageSize: 10 }, context));
assert.equal(responses.get('OAP-002').data.items[0].appId, 'APP-1');
responses.set('OAN-003', await service.execute('OAN-003', { announcementId: 'ANN-1' }, context));
assert.equal(responses.get('OAN-003').data.editable, true);
const previewInput = { title: '预览', contentHtml: '<p>安全</p><script>bad()</script>', previewMode: 'DESKTOP' };
validateContractSchema(previewInput, contracts['OAN-008'].requestSchema, 'OAN-008 request');
responses.set('OAN-008', await service.execute('OAN-008', previewInput, context));
assert.equal(responses.get('OAN-008').data.warnings[0].code, 'UNSAFE_CONTENT_REMOVED');
assert.equal(responses.get('OAN-008').data.sanitizedContentHtml, '<p>安全</p>');
assert.throws(() => validateContractSchema({ ...previewInput, appSecret: 'must-not-pass' }, contracts['OAN-008'].requestSchema, 'OAN-008 request'));
responses.set('OAP-003', await service.execute('OAP-003', { appId: 'APP-1' }, context));
assert.equal(responses.get('OAP-003').data.editable, true);
responses.set('OAP-006', await service.execute('OAP-006', { typeCode: 'AI', schemaVersion: 1, publicData: {}, typeExtension: {}, submissionChannel: 'INTERNAL', resourcePermissions: [] }, context));
assert.equal(responses.get('OAP-006').data.valid, true);
responses.set('OAP-008', await service.execute('OAP-008', { appId: 'APP-1', page: 1, pageSize: 10 }, context));
assert.equal(responses.get('OAP-008').data.total, 0);
responses.set('OAP-011', await service.execute('OAP-011', { typeCode: 'AI', usage: 'DETAIL' }, context));
assert.equal(responses.get('OAP-011').data.typeCode, 'AI');
responses.set('ADM-006', await service.execute('ADM-006', { period: 'DAY' }, context));
assert.ok(Array.isArray(responses.get('ADM-006').data.integrations));
responses.set('ADM-007', await service.execute('ADM-007', { subjectType: 'USER', subjectId: 'ADMIN-1', resourceType: 'ADMIN', resourceId: 'GLOBAL', permissionCode: 'admin.integrations.view' }, context));
assert.equal(responses.get('ADM-007').data.allowed, true);
responses.set('INT-003', await service.execute('INT-003', { dryRun: true, reason: 'test' }, context));
assert.equal(responses.get('INT-003').data.checkedTables, 64);
responses.set('INT-005', await service.execute('INT-005', { connectionCode: 'CONN-1', idempotencyKey: 'TEST-IDEM', sampleLimit: 100 }, context));
assert.equal(responses.get('INT-005').data.status, 'SUCCEEDED');

for (const operationId of ['INT-001', 'ADM-003', 'ADM-004', 'INT-004', 'ARC-002', 'OPS-001', 'OAN-001', 'OAN-002', 'OAP-001', 'OAP-002', 'OAN-003', 'OAN-008', 'OAP-003', 'OAP-006', 'OAP-008', 'OAP-011', 'ADM-006', 'ADM-007', 'INT-003', 'INT-005']) {
  validateContractSchema(responses.get(operationId), contracts[operationId].successSchema, operationId);
  assert.equal(resolveRemoteReadOperation(operationId).remoteEnabled, true);
}
await assert.rejects(service.execute('ADM-003', {}, { identity: { userId: 'USER-2' } }), error => error.code === 'PERMISSION_DENIED');
await assert.rejects(service.execute('INT-001', { appToken: 'secret' }, context), error => error.code === 'INVALID_OPERATION_INPUT');
console.log('feishu-admin-read-batch: ok');
