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
  ['用户字典', [{ record_id: 'u1', fields: { 用户ID: 'ADMIN-1', 姓名: '管理员' } }]],
  ['用户权限', [
    { record_id: 'p1', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.integrations.view', 启用: true } },
    { record_id: 'p2', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.audit.view', 启用: true } },
    { record_id: 'p3', fields: { 用户ID: 'ADMIN-1', 权限编码: 'admin.archive.view', 启用: true } }
  ]],
  ['消息通知', []], ['应用收藏', []], ['积分余额', []],
  ['多维表连接配置', [{ record_id: 'conn1', fields: { 连接编码: 'CONN-1', 环境: 'TEST', 'Base Token掩码': 'bas***123', 启用: true, 最后健康状态: 'HEALTHY', 版本号: 2 } }]],
  ['后台操作日志', [{ record_id: 'audit1', fields: { 审计ID: 'AUDIT-1', 请求ID: 'REQ-1', 操作人ID: 'ADMIN-1', 模块编码: 'APP', 动作编码: 'VIEW', 资源类型: 'APP', 资源ID: 'APP-1', HTTP方法: 'GET', 路径: '/apps/APP-1', IP掩码: '10.***.1', 结果编码: 'OK', 发生时间: '2026-09-02T01:00:00.000Z', 耗时毫秒: 12 } }]],
  ['部门字典', []],
  ['接口调用日志', [{ record_id: 'log1', fields: { 日志ID: 'LOG-1', 请求ID: 'REQ-1', 集成ID: 'FEISHU', 方向: 'OUTBOUND', 操作编码: 'LIST_RECORDS', HTTP方法: 'GET', 端点掩码: '/bitable/***', 状态: 'SUCCESS', HTTP状态: 200, 开始时间: '2026-09-02T01:00:00.000Z', 结束时间: '2026-09-02T01:00:01.000Z', 耗时毫秒: 1000 } }]],
  ['后台任务执行记录', [{ record_id: 'exec1', fields: { 执行ID: 'EXEC-1', 任务ID: 'JOB-1', 触发类型: 'MANUAL', 触发人ID: 'ADMIN-1', 开始时间: '2026-09-02T01:00:00.000Z', 状态: 'SUCCEEDED', 进度: 100, 总数: 1, 成功数: 1, 失败数: 0, 跳过数: 0 } }]],
  ['归档任务', [{ record_id: 'archive1', fields: { 归档任务ID: 'ARCHIVE-1', 状态: 'SUCCEEDED', 阶段: 'VERIFIED', 源记录数: 10, 已归档数: 10, 已删除数: 0, 失败数: 0, 源校验和: 'SOURCE-HASH', 归档校验和: 'ARCHIVE-HASH', 归档位置掩码: 'bucket/***' } }]],
  ['归档执行记录', [{ record_id: 'archive-exec1', fields: { 执行记录ID: 'AEXEC-1', 归档任务ID: 'ARCHIVE-1', 动作: 'VERIFY', 状态: 'SUCCEEDED', 源记录ID: 'SOURCE-1', 归档记录ID: 'TARGET-1' } }]]
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

for (const operationId of ['INT-001', 'ADM-003', 'ADM-004', 'INT-004', 'ARC-002']) {
  validateContractSchema(responses.get(operationId), contracts[operationId].successSchema, operationId);
  assert.equal(resolveRemoteReadOperation(operationId).remoteEnabled, true);
}
await assert.rejects(service.execute('ADM-003', {}, { identity: { userId: 'USER-2' } }), error => error.code === 'PERMISSION_DENIED');
await assert.rejects(service.execute('INT-001', { appToken: 'secret' }, context), error => error.code === 'INVALID_OPERATION_INPUT');
console.log('feishu-admin-read-batch: ok');
