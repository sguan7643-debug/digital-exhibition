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
const authorizationScope = Object.freeze({ users: 'authorized-user-001', accessDepartment: 'authorized-dept-001' });
const registeredInstances = [];
const service = createFeishuApprovalService({ client, now: () => 1_000_000, onInstanceCreated: record => {
  if (!registeredInstances.some(item => item.instanceId === record.instanceId)) registeredInstances.push({ instanceId: record.instanceId, businessKey: record.businessKey });
} });

const definition = await service.ensureTestDefinition(session);
assert.equal(definition.approvalCode, 'TEST_APPROVAL_CODE');
assert.equal(calls[0][1].approvalName, '数智展厅海能Work应用上架审批');
assert.doesNotMatch(calls[0][1].approvalName, /^TEST_/, '正常业务审批定义不得恢复 TEST_ 标题前缀');
assert.equal(calls[0][2]?.accessToken, undefined, 'Approval v4 定义创建必须使用服务端 tenant token，不得使用用户 OAuth token');

const created = await service.createInstance({
  applicationType: 'T005',
  title: '海能Work应用上架',
  applicationCode: 'HW-001',
  description: 'TEST_端到端审批实例',
  businessKey: 'TEST_BUSINESS_001', resourceId: 'TEST_HW_001',
  idempotencyKey: 'TEST_IDEM_001', application: authorizationScope
}, session);
assert.match(created.applicationId, /^TEST_APPLICATION_[a-f0-9]{24}$/);
assert.equal(created.instanceId, 'TEST_INSTANCE');
assert.equal(created.status, 'PENDING');
assert.equal(calls[1][1].applicantUserId, 'u_test');
assert.equal(calls[1][1].title, '海能Work应用上架', '审批标题不应被强制添加 TEST_ 前缀');
assert.equal(calls[1][1].applicationCode, 'HW-001');
assert.equal(calls[1][1].approverUserId, 'u_test');
assert.equal(calls[1][2]?.accessToken, undefined, 'Approval v4 实例创建必须使用服务端 tenant token，不得使用用户 OAuth token');
assert.doesNotMatch(JSON.stringify(created), /user-token/);
assert.deepEqual(registeredInstances, [{ instanceId: 'TEST_INSTANCE', businessKey: 'TEST_BUSINESS_001' }], 'created approval instance must be independently registered for cleanup disclosure');

const repeated = await service.createInstance({
  applicationType: 'T005', title: '海能Work应用上架', applicationCode: 'HW-001',
  description: 'TEST_端到端审批实例', businessKey: 'TEST_BUSINESS_001', resourceId: 'TEST_HW_001', idempotencyKey: 'TEST_IDEM_001'
}, session);
assert.deepEqual(repeated, created, 'same TEST_ business/idempotency must replay one instance');
assert.equal(calls.filter(call => call[0] === 'instance').length, 1, 'replay must not call Feishu twice');
assert.equal(registeredInstances.length, 1, 'replay must not duplicate approval instance ledger registration');

const concurrentInputs = {
  applicationType: 'T005', title: 'TEST_并发审批', applicationCode: 'TEST_CONCURRENT_001',
  description: 'TEST_并发幂等', businessKey: 'TEST_BUSINESS_CONCURRENT_001', resourceId: 'TEST_CONCURRENT_001', idempotencyKey: 'TEST_IDEM_CONCURRENT_001',
  application: authorizationScope
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
const instanceCallsBeforeMissingAuthorization = calls.filter(call => call[0] === 'instance').length;
await assert.rejects(
  service.createInstance({
    applicationType: 'T005', title: 'TEST_缺少授权范围', applicationCode: 'TEST_SCOPE_001',
    resourceId: 'TEST_SCOPE_001', businessKey: 'TEST_BUSINESS_SCOPE_001', idempotencyKey: 'TEST_IDEM_SCOPE_001'
  }, session),
  error => error.code === 'APPROVAL_AUTHORIZATION_REQUIRED' && error.status === 400
);
assert.equal(calls.filter(call => call[0] === 'instance').length, instanceCallsBeforeMissingAuthorization, '缺少适用用户或适用部门时不得调用飞书创建审批');

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
const retryInput = { applicationType: 'T005', title: 'TEST_恢复审批', applicationCode: 'TEST_RECOVERY_001', resourceId: 'TEST_RECOVERY_001', businessKey: 'TEST_BUSINESS_RECOVERY_001', idempotencyKey: 'TEST_IDEM_RECOVERY_001', application: authorizationScope };
const retryService = createFeishuApprovalService({ client: retryClient, registryFile: persistFile, now: () => 1_000_000 });
await assert.rejects(retryService.createInstance(retryInput, session), /upstream timeout/);
const recoveredService = createFeishuApprovalService({ client: retryClient, registryFile: persistFile, now: () => 1_000_000 });
const recovered = await recoveredService.createInstance(retryInput, session);
assert.equal(recovered.instanceId, 'TEST_RECOVERED');
assert.equal(retryCalls[0], retryCalls[1], 'retries must reuse the stable upstream request ID');
rmSync(persistDir, { recursive: true, force: true });

const callbackDir = mkdtempSync(join(tmpdir(), 'xlt-approval-callback-'));
const callbackFile = join(callbackDir, 'registry.json');
let callbackCreateCalls = 0;
let callbackAttempts = 0;
const approvalLedger = [];
const callbackClient = {
  ...client,
  async createApprovalInstance() {
    callbackCreateCalls += 1;
    return { instanceCode: 'TEST_CALLBACK_RECOVERY', status: 'PENDING' };
  }
};
const callbackInput = {
  applicationType: 'T005', title: 'TEST_回调补偿审批', applicationCode: 'TEST_CALLBACK_001',
  resourceId: 'TEST_CALLBACK_001', businessKey: 'TEST_BUSINESS_CALLBACK_001', idempotencyKey: 'TEST_IDEM_CALLBACK_001',
  application: authorizationScope
};
const failingCallbackService = createFeishuApprovalService({
  client: callbackClient,
  registryFile: callbackFile,
  now: () => 1_000_000,
  onInstanceCreated() {
    callbackAttempts += 1;
    throw new Error('ledger callback unavailable');
  }
});
await assert.rejects(failingCallbackService.createInstance(callbackInput, session), /ledger callback unavailable/);
const recoveredCallbackService = createFeishuApprovalService({
  client: callbackClient,
  registryFile: callbackFile,
  now: () => 1_000_000,
  onInstanceCreated(record) {
    callbackAttempts += 1;
    if (!approvalLedger.some(item => item.instanceId === record.instanceId)) approvalLedger.push({ objectType: 'APPROVAL_INSTANCE', instanceId: record.instanceId });
  }
});
const callbackRecovered = await recoveredCallbackService.createInstance(callbackInput, session);
assert.equal(callbackRecovered.instanceId, 'TEST_CALLBACK_RECOVERY');
assert.equal(callbackCreateCalls, 1, 'callback compensation must not create a second remote approval instance');
assert.equal(callbackAttempts, 2, 'restart/retry must compensate the failed ledger callback');
assert.deepEqual(approvalLedger, [{ objectType: 'APPROVAL_INSTANCE', instanceId: 'TEST_CALLBACK_RECOVERY' }], 'compensation must leave exactly one APPROVAL_INSTANCE ledger object');
rmSync(callbackDir, { recursive: true, force: true });

const durableDir = mkdtempSync(join(tmpdir(), 'xlt-approval-durable-'));
const durableFile = join(durableDir, 'registry.json');
let durableNow = Date.parse('2026-09-26T10:00:00Z');
const durableService = createFeishuApprovalService({ client, registryFile: durableFile, now: () => durableNow });
const durable = await durableService.createInstance({
  applicationType: 'T005', title: '长期可查审批', applicationCode: 'HW-DURABLE-001',
  resourceId: 'TEST_DURABLE_RESOURCE', businessKey: 'TEST_DURABLE_BUSINESS', idempotencyKey: 'TEST_DURABLE_IDEMPOTENCY',
  application: authorizationScope
}, session);
durableNow += 8 * 24 * 60 * 60 * 1000;
const durableRestarted = createFeishuApprovalService({ client, registryFile: durableFile, now: () => durableNow });
const durableStatus = await durableRestarted.getInstance(durable.instanceId, session, { resourceId: 'TEST_DURABLE_RESOURCE' });
assert.equal(durableStatus.instanceId, durable.instanceId, '服务重启且可控时钟跨 7 天后仍应查询同一实例');
rmSync(durableDir, { recursive: true, force: true });

const replayBusinessKey = 'TEST_BUSINESS_PROJECTION_REPAIR';
const replayIdempotencyKey = 'TEST_IDEM_PROJECTION_REPAIR';
const replayRegistryKey = ['u_test', 'tenant_test', 'org_test', replayBusinessKey, replayIdempotencyKey].join('\u0000');
const replayRecord = {
  instanceId: 'TEST_REPAIR_INSTANCE', approvalCode: 'TEST_APPROVAL_CODE', creatorUserId: 'u_test', creatorSubject: 'u_test',
  creatorOpenId: 'ou_test', tenantKey: 'tenant_test', orgId: 'org_test', resourceId: 'TEST_REPAIR_RESOURCE',
  businessKey: replayBusinessKey, idempotencyKey: replayIdempotencyKey, registryKey: replayRegistryKey,
  createdAt: 1_000_000, expiresAt: 9_999_999_999, cleanupStatus: 'ACTIVE', status: 'PENDING',
  projectionStatus: 'SYNCED', projectedApprovalStatus: 'PENDING',
  applicationCode: 'TEST_REPAIR_CODE', title: 'TEST_修复旧投影', application: authorizationScope
};
const projectionCalls = [];
const versionedProjection = {
  version: 'feishu-approved-app-projection.test-v2',
  async publish(recordInput) {
    projectionCalls.push(recordInput.instanceId);
    return { onboardingRecordId: 'rec-repaired' };
  }
};
const projectionRepairService = createFeishuApprovalService({
  client, now: () => 1_000_000, registry: new Map([[replayRecord.instanceId, replayRecord]]), projectionService: versionedProjection
});
const replayInput = {
  applicationType: 'T005', title: replayRecord.title, applicationCode: replayRecord.applicationCode,
  resourceId: replayRecord.resourceId, businessKey: replayBusinessKey, idempotencyKey: replayIdempotencyKey,
  application: authorizationScope
};
await projectionRepairService.createInstance(replayInput, session);
assert.deepEqual(projectionCalls, ['TEST_REPAIR_INSTANCE'], '旧同步记录缺少当前投影版本时必须重新投影');
assert.equal(replayRecord.projectedContractVersion, versionedProjection.version);
await projectionRepairService.createInstance(replayInput, session);
assert.equal(projectionCalls.length, 1, '状态和投影版本都一致时不得重复投影');

const failingRecord = { ...replayRecord, projectedContractVersion: '', instanceId: 'TEST_REPAIR_FAILURE' };
const failingProjectionService = createFeishuApprovalService({
  client, now: () => 1_000_000, registry: new Map([[failingRecord.instanceId, failingRecord]]),
  projectionService: { version: versionedProjection.version, async publish() { throw new Error('projection write failed'); } }
});
await assert.rejects(
  failingProjectionService.createInstance(replayInput, session),
  /projection write failed/,
  '投影补写失败时不得向提交方返回成功'
);

const preservedApplications = [];
const fileContextService = createFeishuApprovalService({
  client: {
    ...client,
    async createApprovalInstance() { return { instanceCode: 'TEST_FILE_CONTEXT', status: 'PENDING' }; }
  },
  now: () => 1_000_000,
  projectionService: {
    version: 'feishu-approved-app-projection.file-context',
    async publish(recordInput) {
      preservedApplications.push(recordInput.application);
      return { onboardingRecordId: 'rec-file-context' };
    }
  }
});
await fileContextService.createInstance({
  applicationType: 'T005', title: 'TEST_附件上下文', applicationCode: 'TEST_FILE_CONTEXT',
  resourceId: 'TEST_FILE_CONTEXT', businessKey: 'TEST_BUSINESS_FILE_CONTEXT', idempotencyKey: 'TEST_IDEM_FILE_CONTEXT',
  runId: 'TEST_ONBOARDING_POC_FILE_CONTEXT',
  application: {
    ...authorizationScope,
    attemptId: 'TEST_ATTEMPT_FILE_CONTEXT',
    detailFields: { 使用指南: 'TEST_指南' },
    uploads: [{
      uploadId: 'TEST_UPLOAD_FILE_CONTEXT', purpose: 'APPLICATION_ICON', originalName: 'TEST_icon.png',
      sizeBytes: 68, mimeType: 'image/png', sha256: 'a'.repeat(64), uploadedAt: '2026-09-27T00:00:00.000Z', fileToken: 'box-test-file-token'
    }]
  }
}, session);
assert.equal(preservedApplications[0].attemptId, 'TEST_ATTEMPT_FILE_CONTEXT');
assert.equal(preservedApplications[0].detailFields.使用指南, 'TEST_指南');
assert.equal(preservedApplications[0].uploads.length, 1, '审批注册表必须保留已验证上传文件上下文供通过后投影');
assert.equal(preservedApplications[0].uploads[0].fileToken, 'box-test-file-token');

console.log('Feishu approval service confines writes to TEST_ T005 flows, current-user sessions, idempotent events, and sanitized status');
