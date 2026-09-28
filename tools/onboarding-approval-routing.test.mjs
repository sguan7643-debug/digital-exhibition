import assert from 'node:assert/strict';
import {
  confirmOnboardingAttempt, createOnboardingAttempt, getOnboardingApplication, getOnboardingStatus,
  listOnboardingApplications, normalizeApplicationType, resolveApprovalTransport, submitOnboarding,
  syncOnboardingApplication
} from '../src/integration/onboarding-approval.js';

assert.deepEqual(resolveApprovalTransport('T003'), { kind: 'rpa', path: '/api/processInstanceStart', contentType: 'multipart/form-data' });
assert.deepEqual(resolveApprovalTransport('T005'), { kind: 'feishu', path: '/api/v1/approvals/instances', contentType: 'application/json' });
assert.equal(normalizeApplicationType('RPA'), 'T003');
assert.equal(normalizeApplicationType('HAINENG'), 'T005');
assert.throws(() => resolveApprovalTransport('T001'), /未配置真实审批/);
assert.equal(createOnboardingAttempt('TEST_ATTEMPT_FIXED'), 'TEST_ATTEMPT_FIXED');

const calls = [];
const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options });
  if (url === '/api/v1/onboarding/applications' && options.method === 'POST') return Response.json({ applicationId: 'TEST_APPLICATION_ONE', instanceId: 'TEST_INSTANCE', resourceId: 'TEST_RESOURCE', status: 'PENDING' }, { status: 201 });
  if (url === '/api/v1/onboarding/applications' && options.method === 'GET') return Response.json({ items: [], total: 0 });
  if (url.endsWith('/sync')) return Response.json({ applicationId: 'TEST_APPLICATION_ONE', status: 'APPROVED' });
  if (url.includes('/api/v1/onboarding/attempts/')) return Response.json({ applicationId: 'TEST_APPLICATION_ONE', instanceId: 'TEST_INSTANCE', status: 'PENDING' });
  if (url.includes('/api/v1/onboarding/applications/')) return Response.json({ applicationId: 'TEST_APPLICATION_ONE', status: 'PENDING' });
  return Response.json({ instanceId: 'TEST_INSTANCE', status: 'APPROVED' });
};

const submitted = await submitOnboarding({
  type: 'HAINENG', attemptId: 'TEST_ATTEMPT_FIXED', name: '海能Work', applicationCode: 'HW-001', summary: '申请',
  applicant: 'authorized-user-001', department: 'authorized-dept-001', users: 'authorized-user-001', accessDepartment: 'authorized-dept-001', domain: 'PROCUREMENT',
  uploadIds: ['TEST_UPLOAD_ICON'], detailFields: { 使用指南: '使用指南' }
}, [], fetchImpl);
assert.deepEqual(submitted, { kind: 'feishu', applicationId: 'TEST_APPLICATION_ONE', instanceId: 'TEST_INSTANCE', resourceId: 'TEST_RESOURCE', status: 'PENDING', message: '飞书审批已提交' });
assert.equal(calls[0].url, '/api/v1/onboarding/applications');
assert.equal(calls[0].options.credentials, 'same-origin');
const requestBody = JSON.parse(calls[0].options.body);
assert.equal(requestBody.attemptId, 'TEST_ATTEMPT_FIXED');
assert.equal(requestBody.application.name, '海能Work', '审批标题和应用名称不得强制 TEST_ 前缀');
assert.equal(requestBody.application.applicationCode, 'HW-001');
assert.deepEqual(requestBody.uploadIds, ['TEST_UPLOAD_ICON']);
assert.doesNotMatch(calls[0].options.body, /token|secret/i);

assert.deepEqual(await listOnboardingApplications(fetchImpl), { items: [], total: 0 });
assert.equal((await getOnboardingApplication('TEST_APPLICATION_ONE', fetchImpl)).applicationId, 'TEST_APPLICATION_ONE');
assert.equal((await syncOnboardingApplication('TEST_APPLICATION_ONE', fetchImpl)).status, 'APPROVED');
assert.equal((await confirmOnboardingAttempt('TEST_ATTEMPT_FIXED', fetchImpl)).applicationId, 'TEST_APPLICATION_ONE');

const status = await getOnboardingStatus('TEST_INSTANCE', fetchImpl);
assert.deepEqual(status, { instanceId: 'TEST_INSTANCE', status: 'APPROVED' });
await assert.rejects(() => getOnboardingStatus('../bad', fetchImpl), /审批实例标识非法/);

const rpaNoInstance = await submitOnboarding({ type: 'T003', rpaRequest: {} }, [], async () => Response.json({ code: '00000', message: '操作成功' }));
assert.deepEqual(rpaNoInstance, { kind: 'rpa', instanceId: '', status: 'ACCEPTED_UNTRACKED', message: '已受理但暂无可查询编号，请稍后重试' });

const replayCalls = [];
for (let index = 0; index < 2; index += 1) await submitOnboarding({
  type: 'T005', attemptId: 'TEST_ATTEMPT_STABLE', name: '正常业务标题', applicationCode: 'HW-002', domain: 'D', applicant: 'U', department: 'D', users: 'U', accessDepartment: 'D', uploadIds: ['TEST_UPLOAD']
}, [], async (_url, options) => { replayCalls.push(JSON.parse(options.body)); return Response.json({ applicationId: 'TEST_APPLICATION_STABLE', instanceId: 'TEST_INSTANCE_STABLE', resourceId: 'TEST_RESOURCE_STABLE', status: 'PENDING' }, { status: 201 }); });
assert.equal(replayCalls.length, 2);
assert.equal(replayCalls[0].attemptId, replayCalls[1].attemptId, '同一提交 attempt 的所有确认必须保持稳定，不得换幂等身份');

console.log('onboarding routing keeps RPA compatibility and uses stable applicationId/attempt APIs for T005');
