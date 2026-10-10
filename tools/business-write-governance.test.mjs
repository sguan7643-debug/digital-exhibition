import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBusinessCommandHandlers } from '../server/business-command-handlers.mjs';
import { createBusinessWriteGovernance } from '../server/business-write-governance.mjs';
import { createFeishuCompositeOperationService } from '../server/feishu-composite-operation-service.mjs';
import { createFeishuWriteOperationService } from '../server/feishu-write-operation-service.mjs';
import { FEISHU_WRITE_OPERATION_MANIFEST } from '../server/contracts/feishu-write-operation-manifest.mjs';

const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const requestHash = (operationId, input) => `sha256:${createHash('sha256').update(JSON.stringify(stable({ operationId, input }))).digest('hex')}`;
const governed = (operationId, input, extra = {}) => ({
  ...input,
  governance: { confirmed: true, auditContractId: 'business-write.v1', requestHash: requestHash(operationId, input), ...extra }
});

const calls = [];
const records = new Map();
const recordService = {
  async createOnce(input) {
    calls.push(['create', input]);
    const record = { record_id: `rec-${calls.length}`, fields: { ...input.fields, [input.keyField]: input.businessKey, 版本: 1 } };
    records.set(`${input.tableName}:${input.businessKey}`, record);
    return { record, version: 1 };
  },
  async update(input) { calls.push(['update', input]); return { record: { record_id: 'rec-update' }, version: Number(input.ifMatch) + 1 }; },
  async updateMany(input) { calls.push(['updateMany', input]); return { updatedCount: 3, command: 'UPDATE_MANY' }; },
  async remove(input) { calls.push(['remove', input]); return { deleted: true, recordId: 'rec-remove' }; },
  async getRecord(input) {
    return records.get(`${input.tableName}:${input.businessKey}`) || { record_id: 'owned', fields: { 用户ID: 'USER001', 接收人ID: 'USER001' } };
  }
};
const writeService = createFeishuWriteOperationService({
  safeRecordService: recordService,
  commandHandlers: createBusinessCommandHandlers(),
  traceIdFactory: () => 'trace-business-write',
  now: () => new Date('2026-10-07T00:00:00.000Z')
});

for (const plan of FEISHU_WRITE_OPERATION_MANIFEST) {
  assert.equal(plan.requiresTestPrefix, false, `${plan.operationId} 不应再限制 TEST_ 前缀`);
  const input = { businessKey: `BUSINESS_${plan.operationId}`, idempotencyKey: `IDEM_${plan.operationId}`, fields: {} };
  if (plan.requiresVersion) input.ifMatch = 1;
  assert.doesNotThrow(() => writeService.validate(plan.operationId, input), `${plan.operationId} 正式合同应完成受控映射`);
}

const commandFields = {
  'ADM-005': { 状态: 'RESOLVED' },
  'OAN-006': { 状态: 'PUBLISHED' },
  'OAN-007': { 状态: 'OFFLINE' },
  'OAP-009': { 状态: 'PUBLISHED' },
  'ARC-003': { 归档任务ID: 'ARCHIVE-001', 状态: 'PENDING' }
};
for (const plan of FEISHU_WRITE_OPERATION_MANIFEST) {
  const fields = plan.operationId === 'MSG-005'
    ? { 接收人ID: 'USER001', 已读状态: true }
    : commandFields[plan.operationId] || {};
  const input = { businessKey: `BUSINESS_EXEC_${plan.operationId}`, idempotencyKey: `IDEM_EXEC_${plan.operationId}`, fields };
  if (plan.requiresVersion) input.ifMatch = 1;
  const result = await writeService.execute(plan.operationId, input);
  assert.equal(result.code, 'OK', `${plan.operationId} 应具有正式执行映射`);
}

const directory = mkdtempSync(join(tmpdir(), 'deh-business-write-'));
const ledgerFile = join(directory, 'ledger.json');
const approvals = [];
const businessService = createBusinessWriteGovernance({
  writeService,
  recordService,
  ledgerFile,
  approvalResolver: async (instanceId, context, expectation) => {
    approvals.push({ instanceId, context, expectation });
    return { status: 'APPROVED', operationId: expectation.operationId, resourceId: expectation.resourceId };
  },
  now: () => 1791331200000
});
const identity = { userId: 'USER001', adAccount: 'USER001', tenantKey: 'TENANT001' };

const applicationInput = {
  businessKey: 'APPLICATION-2026-001', idempotencyKey: 'IDEM-APPLICATION-001',
  fields: { 应用ID: 'APP-001', 申请理由: '正式业务申请' }
};
const createCallsBeforeApplication = calls.filter(([kind]) => kind === 'create').length;
const first = await businessService.execute('APP-005', governed('APP-005', applicationInput), { identity });
assert.equal(first.code, 'OK');
assert.equal(calls.at(-1)[1].fields['申请人ID'], 'USER001', '申请人必须绑定当前登录身份');
assert.equal(calls.at(-1)[1].fields['状态'], 'PENDING', '申请必须从待审批状态开始');
const replay = await businessService.execute('APP-005', governed('APP-005', applicationInput), { identity });
assert.equal(replay.data.replayed, true, '相同幂等请求不得重复写入');
assert.equal(calls.filter(([kind]) => kind === 'create').length, createCallsBeforeApplication + 1);

const conflict = { ...applicationInput, fields: { ...applicationInput.fields, 申请理由: '不同内容' } };
await assert.rejects(() => businessService.execute('APP-005', governed('APP-005', conflict), { identity }), error => error.code === 'IDEMPOTENCY_CONFLICT');

const spoof = { businessKey: 'FAVORITE-001', idempotencyKey: 'IDEM-FAVORITE-001', fields: { 应用ID: 'APP-001', 用户ID: 'OTHER' } };
await assert.rejects(() => businessService.execute('FAV-003', governed('FAV-003', spoof), { identity }), error => error.code === 'ACTOR_MISMATCH');

const bypass = { businessKey: 'APP-001', idempotencyKey: 'IDEM-BYPASS-001', ifMatch: 1, fields: { 状态: 'PUBLISHED' } };
await assert.rejects(() => businessService.execute('OAP-005', governed('OAP-005', bypass), { identity }), error => error.code === 'DIRECT_PUBLISH_FORBIDDEN');

const publish = { businessKey: 'APP-001', idempotencyKey: 'IDEM-PUBLISH-001', ifMatch: 1, fields: { 状态: 'PUBLISHED' } };
await businessService.execute('OAP-009', governed('OAP-009', publish, { approvalInstanceId: 'APPROVAL-001' }), { identity });
assert.deepEqual(approvals.at(-1).expectation, { operationId: 'OAP-009', resourceId: 'APP-001' });
assert.equal(calls.at(-1)[0], 'update');

const markAll = { businessKey: 'READ-ALL-USER001', idempotencyKey: 'IDEM-READ-ALL-001', fields: { 接收人ID: 'USER001', 已读状态: true } };
const markAllResult = await businessService.execute('MSG-005', governed('MSG-005', markAll), { identity });
assert.equal(markAllResult.data.updatedCount, 3);
assert.equal(calls.at(-1)[0], 'updateMany');
assert.equal(calls.at(-1)[1].matchValue, 'USER001');

const ledger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
assert.ok(Object.values(ledger).some(entry => entry.state === 'completed' && entry.actor === 'USER001'));
assert.ok(Object.values(ledger).every(entry => !('fields' in entry)), '审计台账只记录字段名和摘要，不落业务字段值');

let consistentPermissionReads = 0;
let persistentInvalidationFlushes = 0;
const readService = {
  async execute(operationId) { return operationId === 'COM-001' ? { data: { permissions: ['operation:APP-005:execute'] } } : { data: {} }; },
  async executeConsistent(operationId) {
    consistentPermissionReads += 1;
    return operationId === 'COM-001' ? { data: { permissions: ['operation:APP-005:execute'] } } : { data: {} };
  },
  invalidateTables() {},
  async flushPersistentCache(options) {
    assert.deepEqual(options, { discardOnFailure: true }, '正式写失效必须在持久提交失败时隔离旧快照');
    persistentInvalidationFlushes += 1;
  },
  getReadSyncStatus() {}
};
const composite = createFeishuCompositeOperationService({ readService, writeService, businessWriteService: businessService });
const allowedInput = { businessKey: 'APPLICATION-2026-002', idempotencyKey: 'IDEM-APPLICATION-002', fields: { 应用ID: 'APP-002' } };
assert.equal((await composite.execute('APP-005', governed('APP-005', allowedInput), { identity, sameOriginRequest: true })).code, 'OK');
assert.equal(consistentPermissionReads, 1, '正式写入权限必须实时回源校验，不能读取普通业务缓存');
assert.equal(persistentInvalidationFlushes, 1, '正式写成功后必须在响应前持久化精确失效结果');
await assert.rejects(() => composite.execute('FAV-003', governed('FAV-003', spoof), { identity, sameOriginRequest: true }), error => error.code === 'PERMISSION_DENIED');
await assert.rejects(() => composite.execute('APP-005', governed('APP-005', allowedInput), { identity, sameOriginRequest: false }), error => error.code === 'WRITE_ORIGIN_DENIED');

rmSync(directory, { recursive: true, force: true });
console.log('36 formal write mappings, identity, permission, approval, idempotency and audit governance passed');
