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
const client = {
  async listTables() { return [{ name: '完整性差异记录', table_id: 'tbl-test' }]; },
  async searchRecords(tableId, fieldName, value) { return { items: record && record.fields[fieldName] === value ? [record] : [] }; },
  async createRecord(tableId, fields) { record = { record_id: 'rec-test', fields: { ...fields } }; return record; },
  async updateRecord(tableId, recordId, fields) { record = { ...record, fields: { ...record.fields, ...fields } }; return record; },
  async deleteRecord() { record = null; return {}; }
};
const service = createFeishuSafeTestRecordService({ client, wait: async () => {} });
await assert.rejects(() => service.createOnce({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'REAL_1', idempotencyKey: 'TEST_IDEM_1' }), error => error.code === 'TEST_PREFIX_REQUIRED');
const created = await service.createOnce({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', idempotencyKey: 'TEST_IDEM_001', fields: { 状态: 'OPEN' } });
assert.equal(created.replayed, false);
assert.equal(created.version, 1);
const replay = await service.createOnce({ tableName: '完整性差异记录', keyField: '差异ID', businessKey: 'TEST_DIFF_001', idempotencyKey: 'TEST_IDEM_001' });
assert.equal(replay.replayed, true);
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
console.log('TEST_ prefix, idempotency replay, optimistic conflict, rollback and cleanup contracts passed');
