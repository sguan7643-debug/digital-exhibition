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
const appId = 'APP001';
const now = Date.now();
const month = new Date(now).toISOString().slice(0, 7);
const adminClient = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const safeService = createFeishuSafeTestRecordService({ client: adminClient });
const readService = createFeishuReadOnlyService({
  client: createFeishuOpenApiClient(), identifierContract, appProjectionCacheMs: 0
});
const contracts = createVerifiedReadOperationContracts();
const context = { identity: { userId, openId: userId, displayName: marker('DISPLAY_NAME'), tenantKey: marker('TENANT') } };
const created = [];
const results = [];

const noGovernance = Object.freeze({ versionField: null, traceField: null, sourceField: null, deletedField: null });

async function create(tableName, keyField, businessKey, fields, governance = {}) {
  const result = await safeService.createOnce({
    tableName, keyField, businessKey, idempotencyKey: marker(`IDEMPOTENCY_${created.length}`), fields, governance
  });
  created.push({ tableName, keyField, businessKey, version: result.version || 1, governance });
  return result;
}

async function cleanup() {
  for (const target of [...created].reverse()) {
    try { await safeService.remove({ ...target, ifMatch: target.version }); } catch {}
  }
}

try {
  await create('用户字典', 'AD账号', userId, {
    姓名: marker('用户'), 工号: marker('EMPLOYEE'), 所属部门ID: marker('DEPARTMENT'), 所属部门名称: marker('部门'),
    组织ID: marker('ORG'), 组织名称: marker('组织'), 邮箱脱敏值: 'T***@example.test', 手机号脱敏值: '138****0000',
    启用: true, 任职状态: 'ACTIVE'
  });
  await create('用户权限', '主键', marker('PERMISSION'), {
    AD账号: userId, 主体类型: 'USER', 主体ID: userId, 权限编码: '*', 数据范围: marker('ORG'), 状态: 'ACTIVE', 启用: true
  });
  await create('消息通知', '消息ID', marker('MESSAGE'), {
    接收人ID: userId, 消息标题: marker('消息标题'), 消息内容: marker('消息内容'), 分类: 'TEST', 已读状态: '未读',
    消息时间: new Date(now).toISOString(), 消息类型编码: 'TEST', 消息摘要: marker('消息摘要'), 优先级: 'HIGH',
    发送人ID: userId, 目标类型: 'APP', 目标ID: appId, 目标路径: `/apps/${appId}`
  });
  await create('应用收藏', '主键', marker('FAVORITE'), {
    应用ID: appId, 用户ID: userId, 收藏时间: new Date(now).toISOString(), 资源类型: 'APP', 资源ID: appId, 有效: true
  });
  await create('积分余额', '主键', marker('BALANCE'), {
    用户ID: userId, 当前总积分: 90, 应用使用累计: 100, 本月积分: 90, 上月积分: 0,
    最后更新时间: new Date(now).toISOString()
  }, noGovernance);
  await create('积分流水', '流水ID', marker('LEDGER_INCOME'), {
    流水号: marker('SERIAL_INCOME'), 用户ID: userId, 积分类型编码: 'TEST_USE', 来源编码: 'TEST_APP_USE',
    方向: 'INCOME', 变动积分: 100, 变动前余额: 0, 变动后余额: 100, 状态: 'EFFECTIVE',
    发生时间: now - 1000, 备注: marker('积分收入'), 幂等键: marker('LEDGER_INCOME_IDEMPOTENCY')
  }, noGovernance);
  await create('积分流水', '流水ID', marker('LEDGER_EXPENSE'), {
    流水号: marker('SERIAL_EXPENSE'), 用户ID: userId, 积分类型编码: 'TEST_REDEEM', 来源编码: 'TEST_REDEEM',
    方向: 'EXPENSE', 变动积分: -10, 变动前余额: 100, 变动后余额: 90, 状态: 'EFFECTIVE',
    发生时间: now, 备注: marker('积分支出'), 幂等键: marker('LEDGER_EXPENSE_IDEMPOTENCY')
  }, noGovernance);
  await create('积分月度汇总', '主键', marker('MONTHLY_POINTS'), {
    用户ID: userId, 年月: month, 月度总积分: 90, 应用使用月度合计: 100
  }, noGovernance);
  await create('用户累计统计', '主键', marker('USER_TOTAL'), {
    用户ID: userId, 累计访问应用次数: 20, 累计使用应用次数: 12, 累计收藏次数: 1
  }, noGovernance);
  await create('用户月度统计', '主键', marker('USER_MONTH'), {
    用户ID: userId, 年月: month, 当月访问次数: 4, 当月使用次数: 3, 当月收藏次数: 1
  }, noGovernance);
  await create('使用申请', '主键', marker('USE_REQUEST'), {
    应用ID: appId, 申请人ID: userId, 申请理由: marker('联调申请'), 状态: 'PENDING',
    申请时间: new Date(now).toISOString(), 申请编号: marker('USE_REQUEST_NO'), 提交时间: now,
    幂等键: marker('USE_REQUEST_IDEMPOTENCY')
  });

  const calls = [
    ['COM-001', {}], ['COM-002', { platform: 'WEB' }],
    ['WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }],
    ['WB-003', { recentMessageLimit: 5, todoLimit: 5 }], ['WB-004', { page: 1, pageSize: 10 }],
    ['MSG-001', {}], ['MSG-002', { page: 1, pageSize: 10 }],
    ['FAV-001', { resourceType: 'APP' }], ['FAV-002', { resourceType: 'APP', page: 1, pageSize: 10 }],
    ['PTS-001', { month }], ['PTS-002', { page: 1, pageSize: 10 }], ['PTS-003', { groupBy: 'SOURCE' }]
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
const passed = results.length === 12 && results.every(item => item.passed) && cleanupComplete;
console.log(JSON.stringify({ passed, expected: 12, verified: results.length, cleanupComplete, results }, null, 2));
if (!passed) process.exitCode = 2;
