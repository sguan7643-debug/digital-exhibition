import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFeishuApprovalService } from '../server/feishu-approval-service.mjs';

const calls = [];
const client = {
  async createApprovalDefinition(input, options) {
    calls.push(['definition', input, options]);
    return { approvalCode: 'TEST_APPROVAL_CODE' };
  },
  async createApprovalInstance(input, options) {
    calls.push(['instance', input, options]);
    return { instanceCode: 'TEST_INSTANCE', status: 'PENDING' };
  },
  async getApprovalInstance(instanceCode, options) {
    calls.push(['get', instanceCode, options]);
    return {
      instanceCode,
      approvalCode: 'TEST_APPROVAL_CODE',
      status: 'APPROVED',
      taskList: [{ id: 'TASK-1', status: 'PENDING', userId: 'u_test' }]
    };
  },
  async approveApprovalTask(input, options) {
    calls.push(['approve', input, options]);
    return { ok: true };
  }
};

const session = Object.freeze({
  identity: Object.freeze({ userId: 'u_test', openId: 'ou_test', tenantKey: 'tenant_test', orgId: 'org_test', permissions: ['apps.onboarding.test'], displayName: '测试用户' }),
  accessToken: 'user-token-server-only'
});
const service = createFeishuApprovalService({ client, now: () => 1_000_000 });

const definition = await service.ensureTestDefinition(session);
assert.equal(definition.approvalCode, 'TEST_APPROVAL_CODE');
assert.match(calls[0][1].approvalName, /^TEST_/);
assert.equal(calls[0][2]?.accessToken, undefined, 'Approval v4 定义创建必须使用服务端 tenant token，不得使用用户 OAuth token');

const created = await service.createInstance({
  applicationType: 'T005',
  title: 'TEST_海能Work应用上架',
  applicationCode: 'HW-001',
  description: 'TEST_端到端审批实例',
  businessKey: 'TEST_BUSINESS_001', resourceId: 'TEST_HW_001',
  idempotencyKey: 'TEST_IDEM_001'
}, session);
assert.deepEqual(created, { instanceId: 'TEST_INSTANCE', status: 'PENDING' });
assert.equal(calls[1][1].applicantUserId, 'u_test');
assert.equal(calls[1][1].applicationCode, 'HW-001');
assert.equal(calls[1][1].approverUserId, 'u_test');
assert.equal(calls[1][2]?.accessToken, undefined, 'Approval v4 实例创建必须使用服务端 tenant token，不得使用用户 OAuth token');
assert.doesNotMatch(JSON.stringify(created), /user-token/);

const repeated = await service.createInstance({
  applicationType: 'T005', title: 'TEST_海能Work应用上架', applicationCode: 'HW-001',
  description: 'TEST_端到端审批实例', businessKey: 'TEST_BUSINESS_001', resourceId: 'TEST_HW_001', idempotencyKey: 'TEST_IDEM_001'
}, session);
assert.deepEqual(repeated, created, 'same TEST_ business/idempotency must replay one instance');
assert.equal(calls.filter(call => call[0] === 'instance').length, 1, 'replay must not call Feishu twice');

const concurrentInputs = {
  applicationType: 'T005', title: 'TEST_并发审批', applicationCode: 'TEST_CONCURRENT_001',
  description: 'TEST_并发幂等', businessKey: 'TEST_BUSINESS_CONCURRENT_001', resourceId: 'TEST_CONCURRENT_001', idempotencyKey: 'TEST_IDEM_CONCURRENT_001'
};
const [concurrentA, concurrentB] = await Promise.all([
  service.createInstance(concurrentInputs, session),
  service.createInstance(concurrentInputs, session)
]);
assert.deepEqual(concurrentA, concurrentB, 'concurrent TEST requests must share one instance');
assert.equal(calls.filter(call => call[0] === 'instance').length, 2, 'concurrent replay must call Feishu once for its key');

await assert.rejects(service.getInstance('UNKNOWN_TEST_INSTANCE', session), error => error.code === 'APPROVAL_INSTANCE_NOT_REGISTERED' && error.status === 404);
await assert.rejects(service.getInstance('TEST_INSTANCE', { identity: { userId: 'u_other' }, accessToken: 'other-token' }), error => error.code === 'APPROVAL_INSTANCE_FORBIDDEN' && error.status === 403);
await assert.rejects(service.getInstance('TEST_INSTANCE', { identity: { userId: 'u_test', openId: 'ou_test', tenantKey: 'tenant_other', orgId: 'org_test' }, accessToken: 'other-token' }), error => error.code === 'APPROVAL_INSTANCE_TENANT_MISMATCH' && error.status === 403);
await assert.rejects(service.getInstance('TEST_INSTANCE', session, { resourceId: 'TEST_OTHER_RESOURCE' }), error => error.code === 'APPROVAL_INSTANCE_RESOURCE_MISMATCH' && error.status === 403);

const expiredRegistry = new Map([['EXPIRED_INSTANCE', {
  instanceId: 'EXPIRED_INSTANCE', approvalCode: 'TEST_APPROVAL_CODE', creatorUserId: 'u_test',
  registryKey: 'expired', createdAt: 0, expiresAt: 1, cleanupStatus: 'ACTIVE', status: 'PENDING'
}]]);
const expiredService = createFeishuApprovalService({ client, now: () => 1_000_000, registry: expiredRegistry });
await assert.rejects(expiredService.getInstance('EXPIRED_INSTANCE', session), error => error.code === 'APPROVAL_INSTANCE_EXPIRED' && error.status === 410);

await assert.rejects(
  service.createInstance({ applicationType: 'T003', title: 'TEST_RPA' }, session),
  error => error.code === 'UNSUPPORTED_APPROVAL_TYPE' && error.status === 400
);
await assert.rejects(
  service.createInstance({ applicationType: 'T005', title: '生产应用' }, session),
  error => error.code === 'TEST_PREFIX_REQUIRED' && error.status === 400
);
await assert.rejects(
  service.createInstance({ applicationType: 'T005', title: 'TEST_应用', applicationCode: 'TEST_B001', resourceId: 'TEST_B001', businessKey: 'B-001', idempotencyKey: 'I-001' }, session),
  error => error.code === 'TEST_IDEMPOTENCY_REQUIRED' && error.status === 400
);
await assert.rejects(
  service.createInstance({ applicationType: 'T005', title: 'TEST_应用', applicationCode: 'NOT_TEST_RESOURCE', resourceId: 'NOT_TEST_RESOURCE', businessKey: 'TEST_BUSINESS_002', idempotencyKey: 'TEST_IDEM_002' }, session),
  error => error.code === 'TEST_RESOURCE_REQUIRED' && error.status === 400
);
await assert.rejects(
  service.createInstance({ applicationType: 'T003', title: 'TEST_应用', applicationCode: 'TEST_RESOURCE', resourceId: 'TEST_RESOURCE', businessKey: 'TEST_BUSINESS_003', idempotencyKey: 'TEST_IDEM_003' }, session),
  error => error.code === 'UNSUPPORTED_APPROVAL_TYPE' && error.status === 400
);
await assert.rejects(
  service.createInstance({ applicationType: 'T005', title: 'TEST_应用' }, null),
  error => error.code === 'USER_AUTH_REQUIRED' && error.status === 401
);

const status = await service.getInstance('TEST_INSTANCE', session);
assert.equal(status.status, 'APPROVED');
assert.equal(status.instanceId, 'TEST_INSTANCE');

const approved = await service.approveTestTask('TEST_INSTANCE', session);
assert.equal(approved.instanceId, 'TEST_INSTANCE');
assert.equal(approved.status, 'APPROVED');
assert.equal(calls.find(call => call[0] === 'approve')[1].taskId, 'TASK-1');
assert.equal(calls.find(call => call[0] === 'approve')[1].userId, 'u_test');
assert.equal(calls.find(call => call[0] === 'approve')[2]?.accessToken, undefined, 'Approval v4 审批动作必须使用服务端 tenant token，不得使用用户 OAuth token');

assert.equal(service.handleEvent, undefined, 'browser-facing approval events must not be exposed');

await assert.rejects(
  service.getInstance('../unsafe', session),
  error => error.code === 'INVALID_APPROVAL_INSTANCE_ID' && error.status === 400
);

const unknownStatusClient = { ...client, async getApprovalInstance() { return { approvalCode: 'TEST_APPROVAL_CODE', status: 'WAITING_FOR_MAGIC' }; } };
const unknownStatusService = createFeishuApprovalService({ client: unknownStatusClient, registry: new Map([['TEST_UNKNOWN_STATUS', { instanceId: 'TEST_UNKNOWN_STATUS', approvalCode: 'TEST_APPROVAL_CODE', creatorUserId: 'u_test', creatorSubject: 'u_test', creatorOpenId: 'ou_test', tenantKey: 'tenant_test', orgId: 'org_test', resourceId: 'TEST_HW_001', registryKey: 'x', createdAt: 0, expiresAt: 9_999_999_999, cleanupStatus: 'ACTIVE', status: 'PENDING' }]]), now: () => 1_000_000 });
await assert.rejects(unknownStatusService.getInstance('TEST_UNKNOWN_STATUS', session), error => error.code === 'APPROVAL_STATUS_INVALID' && error.status === 502);

const persistDir = mkdtempSync(join(tmpdir(), 'xlt-approval-'));
const persistFile = join(persistDir, 'registry.json');
let retry = true;
const retryCalls = [];
const retryClient = {
  ...client,
  async createApprovalInstance(input, options) {
    retryCalls.push(input.requestId);
    if (retry) { retry = false; throw new Error('upstream timeout after acceptance'); }
    return { instanceCode: 'TEST_RECOVERED', status: 'PENDING' };
  }
};
const retryInput = { applicationType: 'T005', title: 'TEST_恢复审批', applicationCode: 'TEST_RECOVERY_001', resourceId: 'TEST_RECOVERY_001', businessKey: 'TEST_BUSINESS_RECOVERY_001', idempotencyKey: 'TEST_IDEM_RECOVERY_001' };
const retryService = createFeishuApprovalService({ client: retryClient, registryFile: persistFile, now: () => 1_000_000 });
await assert.rejects(retryService.createInstance(retryInput, session), /upstream timeout/);
const recoveredService = createFeishuApprovalService({ client: retryClient, registryFile: persistFile, now: () => 1_000_000 });
const recovered = await recoveredService.createInstance(retryInput, session);
assert.equal(recovered.instanceId, 'TEST_RECOVERED');
assert.equal(retryCalls[0], retryCalls[1], 'retries must reuse the stable upstream request ID');
rmSync(persistDir, { recursive: true, force: true });

console.log('Feishu approval service confines writes to TEST_ T005 flows, current-user sessions, idempotent events, and sanitized status');
