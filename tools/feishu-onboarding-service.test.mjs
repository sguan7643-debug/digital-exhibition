import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFeishuOnboardingService } from '../server/feishu-onboarding-service.mjs';

const dir = mkdtempSync(join(tmpdir(), 'feishu-onboarding-'));
const registryFile = join(dir, 'applications.json');
const session = { identity: { userId: 'u_owner', openId: 'ou_owner', displayName: '申请人' }, accessToken: 'server-only' };
const otherSession = { identity: { userId: 'u_other', openId: 'ou_other' }, accessToken: 'other-server-only' };
const approvalCalls = [];
let currentStatus = 'PENDING';
const approvalService = {
  async createInstance(input) {
    approvalCalls.push(['create', input]);
    return { applicationId: input.applicationId, instanceId: `INSTANCE_${approvalCalls.filter(call => call[0] === 'create').length}`, status: currentStatus };
  },
  async getInstance(instanceId) {
    approvalCalls.push(['get', instanceId]);
    return { instanceId, status: currentStatus };
  }
};
const grants = [];
const fileAccessService = {
  createGrant(input) {
    grants.push(input);
    return { url: '/api/v1/files/content/opaque-grant', expiresAt: '2026-09-26T10:05:00.000Z' };
  }
};
const orchestrator = { prepared: { ready: true, runId: 'TEST_ONBOARDING_POC_RUN', baseFingerprint: 'a'.repeat(64) }, async prepare() { return this.prepared; } };
let nowValue = Date.parse('2026-09-26T10:00:00Z');

const service = createFeishuOnboardingService({ approvalService, fileAccessService, orchestrator, registryFile, now: () => nowValue });
service.registerUploadedFile({ attemptId: 'TEST_ATTEMPT_SPOOF', uploadId: 'TEST_UPLOAD_SPOOF_ICON', purpose: 'APPLICATION_ICON', originalName: 'spoof.png', sizeBytes: 100, mimeType: 'image/png', detectedType: 'PNG', sha256: '0'.repeat(64), uploadedAt: '2026-09-26T09:54:00.000Z', fileToken: 'server-file-token-spoof' }, session);
await assert.rejects(
  () => service.submit({
    attemptId: 'TEST_ATTEMPT_SPOOF',
    application: { name: '伪造申请人', applicationCode: 'HW-SPOOF', type: 'T005', domain: 'PROCUREMENT', applicant: 'u_other', department: 'dept-owner', users: 'u_owner', accessDepartment: 'dept-owner' },
    uploadIds: ['TEST_UPLOAD_SPOOF_ICON']
  }, session),
  error => error?.code === 'ONBOARDING_APPLICANT_MISMATCH' && error?.status === 403,
  'client applicant must match the authenticated session before any approval write'
);
assert.equal(approvalCalls.length, 0, 'spoofed applicant must not reach approval reads or writes');
assert.equal((await service.list(session)).total, 0, 'spoofed applicant must not persist an application record');
service.registerUploadedFile({ attemptId: 'TEST_ATTEMPT_ONE', uploadId: 'TEST_UPLOAD_ICON', purpose: 'APPLICATION_ICON', originalName: 'logo.png', sizeBytes: 100, mimeType: 'image/png', detectedType: 'PNG', sha256: '1'.repeat(64), uploadedAt: '2026-09-26T09:55:00.000Z', fileToken: 'server-file-token-icon' }, session);
service.registerUploadedFile({ attemptId: 'TEST_ATTEMPT_ONE', uploadId: 'TEST_UPLOAD_DOC', purpose: 'APPLICATION_ATTACHMENT', originalName: '说明.pdf', sizeBytes: 200, mimeType: 'application/pdf', detectedType: 'PDF', sha256: '2'.repeat(64), uploadedAt: '2026-09-26T09:56:00.000Z', fileToken: 'server-file-token-doc' }, session);

const input = {
  attemptId: 'TEST_ATTEMPT_ONE',
  application: {
    name: '采购协同助手', applicationCode: 'HW-PROC-001', type: 'T005', domain: 'PROCUREMENT', summary: '采购协同',
    applicant: 'u_owner', department: 'dept-owner', users: 'u_owner', accessDepartment: 'dept-owner', detailFields: { 使用指南: '按说明使用' }
  },
  uploadIds: ['TEST_UPLOAD_ICON', 'TEST_UPLOAD_DOC']
};
const created = await service.submit(input, session);
assert.equal(created.applicationId.startsWith('TEST_APPLICATION_'), true);
assert.equal(created.instanceId, 'INSTANCE_1');
assert.equal(created.status, 'PENDING');
assert.equal(approvalCalls.filter(call => call[0] === 'create').length, 1);
const replayed = await service.submit(input, session);
assert.deepEqual(replayed, created);
assert.equal(approvalCalls.filter(call => call[0] === 'create').length, 1, 'same attempt must not create another approval instance');

const list = await service.list(session);
assert.equal(list.items.length, 1);
assert.equal(list.items[0].applicationId, created.applicationId);
assert.equal(JSON.stringify(list).includes('server-file-token'), false);
await assert.rejects(() => service.get(created.applicationId, otherSession), error => error.status === 404, 'non-owner and absent applications must share a non-enumerating response');

const detail = await service.get(created.applicationId, session);
assert.equal(detail.icon.fileName, 'logo.png');
assert.equal(detail.attachments[0].sha256, '2'.repeat(64));
assert.equal(JSON.stringify(detail).includes('server-file-token'), false);
assert.equal(detail.businessId.startsWith('TEST_ONBOARDING_'), true);
assert.equal(detail.resourceId.startsWith('TEST_APP_'), true);
assert.equal(detail.applicationName, '采购协同助手');
assert.equal(detail.applicationCode, 'HW-PROC-001');
assert.equal(detail.applicationType, 'T005');
assert.equal(detail.runId, 'TEST_ONBOARDING_POC_RUN');
assert.equal(detail.businessDomain, 'PROCUREMENT');
assert.deepEqual(detail.authorizedUsers, ['u_owner']);
assert.deepEqual(detail.authorizedDepartments, ['dept-owner']);

currentStatus = 'APPROVED';
const synced = await service.sync(created.applicationId, session);
assert.equal(synced.status, 'APPROVED');
assert.equal(approvalCalls.filter(call => call[0] === 'get').length, 1);
const grant = await service.grantFileAccess(created.applicationId, 'TEST_UPLOAD_DOC', 'DOWNLOAD', session);
assert.equal(grant.url, '/api/v1/files/content/opaque-grant');
assert.equal(grants[0].fileToken, 'server-file-token-doc');

for (const [ownerSession, suffix] of [[session, 'OWNER'], [otherSession, 'OTHER']]) {
  service.registerUploadedFile({ attemptId: 'TEST_ATTEMPT_SHARED', uploadId: `TEST_UPLOAD_${suffix}_ICON`, purpose: 'APPLICATION_ICON', originalName: `${suffix}.png`, sizeBytes: 100, mimeType: 'image/png', detectedType: 'PNG', sha256: suffix === 'OWNER' ? '3'.repeat(64) : '4'.repeat(64), uploadedAt: '2026-09-26T09:57:00.000Z', fileToken: `server-file-token-${suffix}` }, ownerSession);
}
const sharedAttemptInput = owner => ({
  attemptId: 'TEST_ATTEMPT_SHARED',
  application: { name: `${owner}应用`, applicationCode: `HW-${owner}`, type: 'T005', domain: 'PROCUREMENT', applicant: owner, department: `dept-${owner}`, users: owner, accessDepartment: `dept-${owner}` },
  uploadIds: [`TEST_UPLOAD_${owner === 'u_owner' ? 'OWNER' : 'OTHER'}_ICON`]
});
const [ownerShared, otherShared] = await Promise.all([
  service.submit(sharedAttemptInput('u_owner'), session),
  service.submit(sharedAttemptInput('u_other'), otherSession)
]);
assert.notEqual(ownerShared.applicationId, otherShared.applicationId, '不同用户使用相同 attemptId 时不得共享提交任务');
assert.notEqual(ownerShared.instanceId, otherShared.instanceId, '不同用户使用相同 attemptId 时必须各自创建审批实例');
assert.equal(approvalCalls.filter(call => call[0] === 'create').length, 3);

nowValue += 8 * 24 * 60 * 60 * 1000;
const restarted = createFeishuOnboardingService({ approvalService, fileAccessService, orchestrator, registryFile, now: () => nowValue });
const restored = await restarted.get(created.applicationId, session);
assert.equal(restored.instanceId, 'INSTANCE_1');
assert.equal(restored.status, 'APPROVED');
assert.equal(restored.attachments.length, 1);
const resyncedAfterEightDays = await restarted.sync(created.applicationId, session);
assert.equal(resyncedAfterEightDays.instanceId, 'INSTANCE_1');

rmSync(dir, { recursive: true, force: true });
console.log('onboarding service keeps one attempt, isolates owners, grants token-free file access, and restores after eight controlled days');
