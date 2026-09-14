import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { cleanupAndVerify } from '../server/feishu-live-cleanup.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const suffix = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const marker = name => `TEST_${name}_${suffix}`;
const userId = marker('ADMIN');
const archiveTaskId = marker('ARCHIVE');
const adminClient = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const readService = createFeishuReadOnlyService({ client: createFeishuOpenApiClient(), identifierContract, appProjectionCacheMs: 0 });
const contracts = createVerifiedReadOperationContracts();
const context = { identity: { userId, openId: userId } };
const tables = await adminClient.listTables();
const tableByName = new Map(tables.map(table => [table.name, table]));
const created = [];
const results = [];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function create(tableName, fields) {
  const table = tableByName.get(tableName);
  if (!table) throw new Error(`找不到表：${tableName}`);
  const record = await adminClient.createRecord(table.table_id, fields);
  created.push({ tableId: table.table_id, recordId: record.record_id });
  await sleep(900);
}
async function cleanup() {
  return cleanupAndVerify({
    targets: [...created].reverse(),
    cleanup: async target => { await adminClient.deleteRecord(target.tableId, target.recordId); await sleep(500); }
  });
}

let cleanupResult = { ok: false, outcomes: [] };
try {
  for (const permissionCode of ['admin.integrations.view', 'admin.audit.view', 'admin.archive.view', 'admin.health.view', 'admin.permissions.view', 'operations.dashboard.view', 'operations.announcements.manage', 'operations.apps.manage']) {
    await create('用户权限', { 主键: marker(`PERMISSION_${permissionCode}`), AD账号: userId, 权限编码: permissionCode, 启用: true });
  }
  await create('多维表连接配置', { 连接编码: marker('CONNECTION'), 连接名称: 'TEST_ 联调连接', 'Base Token掩码': 'TEST_bas***', 环境: 'TEST', 启用: true, 最后健康状态: 'HEALTHY', 版本号: 1 });
  await create('后台操作日志', { 审计ID: marker('AUDIT'), 请求ID: marker('REQUEST'), 操作人ID: userId, 模块编码: 'TEST', 动作编码: 'VIEW', 资源类型: 'TEST', 资源ID: marker('RESOURCE'), HTTP方法: 'GET', 路径: '/test', IP掩码: 'TEST_10.***', 结果编码: 'OK', 发生时间: Date.now(), 耗时毫秒: 10 });
  await create('接口调用日志', { 日志ID: marker('LOG'), 请求ID: marker('REQUEST'), 集成ID: 'TEST_FEISHU', 方向: 'OUTBOUND', 操作编码: 'LIST_RECORDS', HTTP方法: 'GET', 端点掩码: 'TEST_/bitable/***', 状态: 'SUCCESS', HTTP状态: 200, 开始时间: Date.now(), 结束时间: Date.now(), 耗时毫秒: 10 });
  await create('后台任务执行记录', { 执行ID: marker('EXECUTION'), 任务ID: marker('JOB'), 触发类型: 'MANUAL', 触发人ID: userId, 开始时间: Date.now(), 状态: 'SUCCEEDED', 进度: 100, 总数: 1, 成功数: 1, 失败数: 0, 跳过数: 0 });
  await create('归档任务', { 归档任务ID: archiveTaskId, 归档批次号: marker('BATCH'), 数据分类: 'TEST', 资源类型: 'TEST', 状态: 'SUCCEEDED', 阶段: 'VERIFIED', 源记录数: 1, 已归档数: 1, 已删除数: 0, 失败数: 0, 源校验和: 'TEST_SOURCE_HASH', 归档校验和: 'TEST_ARCHIVE_HASH', 归档位置掩码: 'TEST_bucket/***' });
  await create('归档执行记录', { 执行记录ID: marker('ARCHIVE_EXECUTION'), 归档任务ID: archiveTaskId, 资源类型: 'TEST', 源记录ID: marker('SOURCE'), 归档记录ID: marker('TARGET'), 动作: 'VERIFY', 状态: 'SUCCEEDED' });

  const calls = [
    ['INT-001', { environment: 'TEST', page: 1, pageSize: 10 }],
    ['ADM-003', { operatorId: userId, page: 1, pageSize: 10 }],
    ['ADM-004', { integrationCode: 'TEST_FEISHU', page: 1, pageSize: 10 }],
    ['INT-004', { view: 'EXECUTIONS', page: 1, pageSize: 10 }],
    ['ARC-002', { archiveTaskId }],
    ['OPS-001', { period: 'WEEK', timezone: 'Asia/Shanghai', topN: 10 }],
    ['OAN-001', {}], ['OAN-002', { page: 1, pageSize: 10 }],
    ['OAP-001', {}], ['OAP-002', { page: 1, pageSize: 10 }]
  ];
  const responseByOperation = new Map();
  for (const [operationId, input] of calls) {
    const response = await readService.execute(operationId, input, context);
    validateContractSchema(response, contracts[operationId].successSchema, operationId);
    responseByOperation.set(operationId, response);
    results.push({ operationId, passed: true });
  }
  const announcementId = responseByOperation.get('OAN-002')?.data?.items?.[0]?.announcementId;
  const app = responseByOperation.get('OAP-002')?.data?.items?.[0];
  if (!announcementId || !app?.appId || !app?.typeCode) throw new Error('真实公告或应用数据为空，无法完成详情读验证');
  const detailCalls = [
    ['OAN-003', { announcementId }],
    ['OAN-008', { title: 'TEST_ 公告预览', contentHtml: '<p>TEST_ 安全内容</p>', previewMode: 'DESKTOP' }],
    ['OAP-003', { appId: app.appId }],
    ['OAP-006', { typeCode: app.typeCode, schemaVersion: 1, publicData: {}, typeExtension: {}, submissionChannel: 'INTERNAL', resourcePermissions: [] }],
    ['OAP-008', { appId: app.appId, page: 1, pageSize: 10 }],
    ['OAP-011', { typeCode: app.typeCode, usage: 'DETAIL' }],
    ['ADM-006', { period: 'DAY' }],
    ['ADM-007', { subjectType: 'USER', subjectId: userId, resourceType: 'ADMIN', resourceId: 'GLOBAL', permissionCode: 'admin.integrations.view' }],
    ['INT-003', { dryRun: true, reason: 'TEST_ 结构核验' }],
    ['INT-005', { connectionCode: marker('CONNECTION'), idempotencyKey: marker('DIFF_IDEMPOTENCY'), sampleLimit: 100 }]
  ];
  for (const [operationId, input] of detailCalls) {
    const response = await readService.execute(operationId, input, context);
    validateContractSchema(response, contracts[operationId].successSchema, operationId);
    results.push({ operationId, passed: true });
  }
} finally {
  cleanupResult = await cleanup();
}

let cleanupComplete = true;
for (const target of created) {
  const tableName = [...tableByName].find(([, table]) => table.table_id === target.tableId)?.[0];
  const key = tableName === '用户权限' ? 'AD账号' : null;
  if (key) {
    const remaining = await adminClient.searchRecords(target.tableId, key, userId);
    if (remaining.items.length) cleanupComplete = false;
  }
}
const passed = results.length === 20 && results.every(item => item.passed) && cleanupComplete && cleanupResult.ok;
console.log(JSON.stringify({ passed, expected: 20, verified: results.length, cleanupComplete, cleanupErrors: cleanupResult.outcomes.filter(item => !item.ok), results }, null, 2));
if (!passed) process.exitCode = 2;
