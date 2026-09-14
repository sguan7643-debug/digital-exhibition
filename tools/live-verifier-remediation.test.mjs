import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFeishuWriteOperationService } from '../server/feishu-write-operation-service.mjs';
import { runOperationRegistry } from '../server/feishu-live-operation-runner.mjs';

const writeVerifier = readFileSync(new URL('./verify-live-write-operations.mjs', import.meta.url), 'utf8');
const attachmentVerifier = readFileSync(new URL('./verify-live-test-attachment.mjs', import.meta.url), 'utf8');
const adminVerifier = readFileSync(new URL('./verify-live-admin-reads.mjs', import.meta.url), 'utf8');

assert.doesNotMatch(writeVerifier, /catch \(error\) \{[\s\S]{0,500}?break;/, '写验证器不得首错 break');
assert.match(writeVerifier, /executed: results\.length/);
assert.match(writeVerifier, /expected: FEISHU_WRITE_OPERATION_MANIFEST\.length/);
assert.match(writeVerifier, /writeService\.execute\(plan\.operationId[\s\S]*?ifMatch: 99/);
assert.match(writeVerifier, /writeService\.execute\(plan\.operationId[\s\S]*?restoreFields|fields: values\.restored/);
assert.match(attachmentVerifier, /COM-006/);
assert.match(attachmentVerifier, /COM-007/);
assert.match(attachmentVerifier, /retentionPolicy|deleteMedia/);
assert.doesNotMatch(adminVerifier, /catch \{\}/, '管理员清理不得吞掉失败');

const updateCalls = [];
const service = createFeishuWriteOperationService({
  safeRecordService: {
    async update(input) { updateCalls.push(input); return { record: { record_id: 'r' }, version: 2 }; }
  },
  commandHandlers: { 'ADM-005': async () => ({ record: { record_id: 'r' }, version: 3, command: 'handled' }) }
});
await assert.rejects(
  () => service.execute('OAN-006', { businessKey: 'TEST_COMMAND', idempotencyKey: 'TEST_IDEM_COMMAND', ifMatch: 1, fields: { 状态: 'PUBLISHED' } }),
  error => error.code === 'COMMAND_NOT_IMPLEMENTED'
);
assert.equal(updateCalls.length, 0, '未实现 COMMAND 不得降级为 UPDATE');
const command = await service.execute('ADM-005', { businessKey: 'TEST_COMMAND', idempotencyKey: 'TEST_IDEM_COMMAND', ifMatch: 1, fields: { 状态: 'DONE' } });
assert.equal(command.data.command, 'handled');

const createPathCalls = [];
const createPathService = createFeishuWriteOperationService({
  safeRecordService: {
    async createOnce(input) { createPathCalls.push(['create', input]); return { record: { record_id: 'create-r' }, version: 1 }; },
    async update(input) { createPathCalls.push(['update', input]); return { record: { record_id: 'create-r' }, version: Number(input.ifMatch) + 1 }; }
  }
});
const createUpdate = await createPathService.execute('FAV-003', {
  businessKey: 'TEST_CREATE_VERSION',
  idempotencyKey: 'TEST_IDEM_CREATE_VERSION',
  ifMatch: 1,
  fields: { 应用ID: 'APP-001', 用户ID: 'USER-001' }
});
assert.equal(createUpdate.data.version, 2, 'CREATE operation 的版本验证必须仍经由同一公开 operation 路径');
assert.deepEqual(createPathCalls.map(([kind]) => kind), ['update']);

const registry = [{ id: 'READ-001' }, { id: 'READ-002' }, { id: 'READ-003' }];
const run = await runOperationRegistry({
  registry,
  inputFor: operation => ({ operationId: operation.id }),
  execute: async operationId => {
    if (operationId === 'READ-002') throw Object.assign(new Error('source unavailable'), { code: 'SOURCE_UNAVAILABLE' });
    return { code: 'OK', traceId: `trace-${operationId}` };
  }
});
assert.equal(run.results.length, registry.length);
assert.deepEqual(run.results.map(item => item.operationId), registry.map(item => item.id));
assert.equal(run.results[1].status, 'blocked');
assert.equal(run.complete, true);

console.log('live verifier remediation red/green contract passed');
