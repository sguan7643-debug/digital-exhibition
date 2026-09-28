import assert from 'node:assert/strict';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';
import { FEISHU_WRITE_OPERATION_MANIFEST } from '../server/contracts/feishu-write-operation-manifest.mjs';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';

assert.equal(FEISHU_WRITE_OPERATION_MANIFEST.length, 36);
assert.deepEqual(
  FEISHU_WRITE_OPERATION_MANIFEST.map(item => item.operationId).sort(),
  OPERATION_REGISTRY.filter(item => item.access === 'write').map(item => item.id).sort()
);
assert.ok(FEISHU_WRITE_OPERATION_MANIFEST.every(item => item.requiresTestPrefix && item.requiresIdempotencyKey));

let record = null;
const updateCalls = [];
const client = {
  async listTables() { return [{ name: '完整性差异记录', table_id: 'tbl-test' }]; },
  async searchRecords(tableId, fieldName, value) {
    if (!record || record.fields[fieldName] !== value) return { items: [] };
    const fields = { ...record.fields };
    if (typeof fields.追踪ID === 'string') fields.追踪ID = [{ type: 'text', text: fields.追踪ID }];
    return { items: [{ ...record, fields }] };
  },
  async createRecord(tableId, fields) { record = { record_id: 'rec-test', fields: { ...fields } }; return record; },
  async updateRecord(tableId, recordId, fields) {
    updateCalls.push({ tableId, recordId, fields });
    record = { ...record, fields: { ...record.fields, ...fields } };
    return { record_id: recordId, fields: { ...fields } };
  },
  async deleteRecord() { record = null; return {}; }
};
const service = createFeishuSafeTestRecordService({ client, wait: async () => {} });
await assert.rejects(() => service.createOnce({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'REAL_1', idempotencyKey: 'TEST_IDEM_1' }), error => error.code === 'TEST_PREFIX_REQUIRED');
const created = await service.createOnce({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', idempotencyKey: 'TEST_IDEM_001', fields: { 状态: 'OPEN' } });
assert.equal(created.replayed, false);
assert.equal(created.version, 1);
const replay = await service.createOnce({
  tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', idempotencyKey: 'TEST_IDEM_001',
  fields: { 状态: 'IGNORED_BY_DEFAULT' }
});
assert.equal(replay.replayed, true);
assert.equal(record.fields.状态, 'OPEN', '默认重放不得隐式更新已有记录');
assert.equal(updateCalls.length, 0);

await assert.rejects(() => service.update({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', ifMatch: 2, fields: { 状态: 'RESOLVED' } }), error => error.code === 'VERSION_CONFLICT');
const updated = await service.update({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', ifMatch: 1, fields: { 状态: 'RESOLVED' } });
assert.equal(updated.version, 2);
const rolledBack = await service.rollback({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', fromVersion: 2, restoreFields: { 状态: 'OPEN' } });
assert.equal(rolledBack.version, 3);
assert.equal(rolledBack.rolledBack, true);
const removed = await service.remove({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', ifMatch: 3 });
assert.equal(removed.deleted, true);
const absent = await service.remove({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', ifMatch: 3 });
assert.equal(absent.alreadyAbsent, true);

const unversionedGovernance = { versionField: '', sourceField: '', traceField: '', deletedField: '' };
await service.createOnce({
  tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_002', idempotencyKey: 'TEST_IDEM_002',
  fields: { 状态: 'OPEN' }, governance: unversionedGovernance
});
const updatesBeforeReconciliation = updateCalls.length;
const reconciled = await service.createOnce({
  tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_002', idempotencyKey: 'TEST_IDEM_002',
  fields: { 状态: 'REPAIRED', 备注: '不得更新' }, governance: unversionedGovernance,
  reconcileFields: ['状态']
});
assert.equal(reconciled.replayed, true);
assert.equal(reconciled.reconciled, true);
assert.equal(reconciled.record.fields['差异ID'], 'TEST_DIFF_002', '飞书部分更新响应必须与原记录字段合并');
assert.equal(record.fields.状态, 'REPAIRED');
assert.equal(record.fields.备注, undefined, '白名单外字段不得在重放修复中更新');
assert.deepEqual(updateCalls.at(-1), { tableId: 'tbl-test', recordId: 'rec-test', fields: { 状态: 'REPAIRED' } });

const alreadyConsistent = await service.createOnce({
  tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_002', idempotencyKey: 'TEST_IDEM_002',
  fields: { 状态: 'REPAIRED' }, governance: unversionedGovernance, reconcileFields: ['状态']
});
assert.equal(alreadyConsistent.reconciled, false);
assert.equal(updateCalls.length, updatesBeforeReconciliation + 1, '字段一致时不得发送无意义更新');
console.log('TEST_ prefix, idempotency replay, allowlisted reconciliation, optimistic conflict, rollback and cleanup contracts passed');
