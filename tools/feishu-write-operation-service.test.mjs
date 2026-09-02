import assert from 'node:assert/strict';
import { createFeishuWriteOperationService } from '../server/feishu-write-operation-service.mjs';
import { createFeishuCompositeOperationService } from '../server/feishu-composite-operation-service.mjs';

const calls = [];
const safeRecordService = {
  async createOnce(input) { calls.push(['create', input]); return { record: { record_id: 'rec-write' }, version: 1, replayed: false }; },
  async update(input) { calls.push(['update', input]); return { record: { record_id: 'rec-write' }, version: Number(input.ifMatch) + 1 }; },
  async remove(input) { calls.push(['delete', input]); return { deleted: true, recordId: 'rec-write' }; }
};
const service = createFeishuWriteOperationService({ safeRecordService, now: () => new Date('2026-09-02T08:30:00.000Z'), traceIdFactory: () => 'trace-write-test' });
const created = await service.execute('APP-006', { businessKey: 'TEST_REUSE_001', idempotencyKey: 'TEST_IDEM_001', fields: { 应用ID: 'APP-001', 申请原因: '联调' } });
assert.equal(created.code, 'OK');
assert.equal(created.data.tableName, '应用复用申请');
assert.equal(created.data.version, 1);
assert.equal(calls[0][1].fields['申请原因'], '联调');
await assert.rejects(() => service.execute('APP-006', { businessKey: 'TEST_REUSE_001', idempotencyKey: 'TEST_IDEM_001', fields: { 非法字段: 'x' } }), error => error.code === 'FIELD_NOT_ALLOWED');
await assert.rejects(() => service.execute('APP-006', { businessKey: 'TEST_REUSE_001', idempotencyKey: 'TEST_IDEM_001', fields: { 版本: 99 } }), error => error.code === 'FIELD_NOT_ALLOWED' || error.code === 'MANAGED_FIELD_FORBIDDEN');
const updated = await service.execute('OAN-005', { businessKey: 'TEST_NOTICE_001', idempotencyKey: 'TEST_IDEM_002', ifMatch: 1, fields: { 公告标题: '测试公告' } });
assert.equal(updated.data.version, 2);
const deleted = await service.execute('FAV-004', { businessKey: 'TEST_FAV_001', idempotencyKey: 'TEST_IDEM_003', ifMatch: 1, fields: {} });
assert.equal(deleted.data.deleted, true);
const identity = { userId: 'TEST_USER' };
const readService = { execute: async id => id === 'COM-001'
  ? { code: 'OK', data: { permissions: ['operation:APP-006:execute'] } }
  : { id, kind: 'read' } };
const composite = createFeishuCompositeOperationService({ readService, writeService: service, browserWriteEnabled: true });
assert.equal((await composite.execute('APP-001', {})).kind, 'read');
const browserInput = { businessKey: 'TEST_REUSE_002', idempotencyKey: 'TEST_IDEM_004', fields: {} };
await assert.rejects(() => createFeishuCompositeOperationService({ readService, writeService: service }).execute('APP-006', browserInput, { identity, sameOriginRequest: true }), error => error.code === 'BROWSER_TEST_WRITE_DISABLED');
await assert.rejects(() => composite.execute('APP-006', browserInput, { identity }), error => error.code === 'WRITE_ORIGIN_DENIED');
await assert.rejects(() => composite.execute('APP-006', browserInput, { sameOriginRequest: true }), error => error.code === 'USER_AUTH_REQUIRED');
await assert.rejects(() => composite.execute('FAV-003', { businessKey: 'TEST_FAV_002', idempotencyKey: 'TEST_IDEM_005', fields: {} }, { identity, sameOriginRequest: true }), error => error.code === 'PERMISSION_DENIED');
assert.equal((await composite.execute('APP-006', browserInput, { identity, sameOriginRequest: true })).code, 'OK');
console.log('36-operation write mapping, field whitelist, composite routing and write envelopes passed');
