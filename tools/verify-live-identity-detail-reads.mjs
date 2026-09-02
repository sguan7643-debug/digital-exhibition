import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const suffix = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const marker = name => `TEST_${name}_${suffix}`;
const userId = marker('USER');
const applicationId = marker('APPLICATION');
const exportId = marker('EXPORT');
const courseId = marker('COURSE');
const registrationId = marker('REGISTRATION');
const certificationId = marker('CERTIFICATION');
const sessionId = marker('SESSION');
const bookingId = marker('BOOKING');
const adminClient = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const safeService = createFeishuSafeTestRecordService({ client: adminClient });
const readService = createFeishuReadOnlyService({ client: createFeishuOpenApiClient(), identifierContract, appProjectionCacheMs: 0 });
const contracts = createVerifiedReadOperationContracts();
const context = { identity: { userId, openId: userId } };
const created = [];
const results = [];

async function create(tableName, keyField, businessKey, fields) {
  const result = await safeService.createOnce({ tableName, keyField, businessKey, idempotencyKey: marker(`IDEMPOTENCY_${created.length}`), fields });
  created.push({ tableName, keyField, businessKey, version: result.version || 1 });
  return result;
}

async function cleanup() {
  for (const target of [...created].reverse()) {
    try { await safeService.remove({ ...target, ifMatch: target.version }); } catch {}
  }
}

try {
  await create('应用复用申请', '申请编号', applicationId, {
    应用ID: marker('APP'), 申请类型: 'REUSE', 申请人ID: userId, 申请原因: 'TEST_ 接口联调', 本地状态: 'SUBMITTED',
    提交时间: Date.now(), 幂等键: marker('APP_IDEMPOTENCY')
  });
  await create('导出任务', '导出任务ID', exportId, {
    导出类型: 'TEST_APP_LIST', 格式: 'CSV', 状态: 'COMPLETED', 进度: 100, 总行数: 1, 已处理行数: 1,
    创建用户ID: userId, 完成时间: Date.now()
  });
  await create('培训课程', '课程ID', courseId, {
    培训标题: 'TEST_ 联调课程', 分类: 'TEST', 讲师姓名: 'TEST_ 讲师', 开始时间: '2030-01-01 09:00', 格式: 'ONLINE',
    培训简介: 'TEST_ 身份接口联调', 状态: 'OPEN', 学习入口URL: 'https://example.invalid/test-course',
    入口过期时间: Date.parse('2030-01-01T00:00:00.000Z'), 直播状态: 'LIVE'
  });
  await create('培训报名', '报名编号', registrationId, { 课程ID: courseId, 用户ID: userId, 状态: 'REGISTERED', 报名时间: Date.now(), 幂等键: marker('REG_IDEMPOTENCY') });
  await create('认证项目', '认证编码', certificationId, {
    认证名称: 'TEST_ 联调认证', 认证类型: 'TEST', 认证说明: 'TEST_ 认证详情联调', 适用人群: 'TEST_ 用户', 主办单位: 'TEST_ 数字化中心',
    考试规则: 'TEST_ 闭卷', 通过规则: 'TEST_ 80分', 启用: true
  });
  await create('考试场次', '场次编码', sessionId, {
    认证项目ID: certificationId, 场次名称: 'TEST_ 第一场', 考试开始: Date.parse('2030-01-02T01:00:00.000Z'),
    考试结束: Date.parse('2030-01-02T03:00:00.000Z'), 考试地点: 'TEST_ 北京考点', 容量: 20, 已预约人数: 1, 状态: 'OPEN'
  });
  await create('考试预约', '预约编号', bookingId, {
    认证项目ID: certificationId, 考试场次ID: sessionId, 用户ID: userId, 状态: 'RESERVED', 预约时间: Date.now(), 幂等键: marker('BOOK_IDEMPOTENCY')
  });

  const calls = [
    ['APP-010', { applicationId, includeHistory: true }], ['COM-010', { exportId }],
    ['TRN-006', { courseId, sourcePage: '/training/test' }], ['CER-003', { certificationId }]
  ];
  for (const [operationId, input] of calls) {
    const response = await readService.execute(operationId, input, context);
    validateContractSchema(response, contracts[operationId].successSchema, operationId);
    results.push({ operationId, passed: true, sourceUpdatedAt: response.sourceUpdatedAt });
  }
} finally {
  await cleanup();
}

const tables = await adminClient.listTables();
let cleanupComplete = true;
for (const target of created) {
  const table = tables.find(item => item.name === target.tableName);
  const remaining = table ? await adminClient.searchRecords(table.table_id, target.keyField, target.businessKey) : { items: [] };
  if (remaining.items.length) cleanupComplete = false;
}
const passed = results.length === 4 && results.every(item => item.passed) && cleanupComplete;
console.log(JSON.stringify({ passed, expected: 4, verified: results.length, cleanupComplete, results }, null, 2));
if (!passed) process.exitCode = 2;
