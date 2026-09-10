import assert from 'node:assert/strict';
import { getOnboardingStatus, resolveApprovalTransport, submitOnboarding } from '../src/integration/onboarding-approval.js';

assert.deepEqual(resolveApprovalTransport('T003'), { kind: 'rpa', path: '/api/processInstanceStart', contentType: 'multipart/form-data' });
assert.deepEqual(resolveApprovalTransport('T005'), { kind: 'feishu', path: '/api/v1/approvals/instances', contentType: 'application/json' });
assert.throws(() => resolveApprovalTransport('T001'), /未配置真实审批/);

const calls = [];
const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options });
  if (options.method === 'POST') return new Response(JSON.stringify({ instanceId: 'TEST_INSTANCE', status: 'PENDING' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ instanceId: 'TEST_INSTANCE', status: 'APPROVED' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const submitted = await submitOnboarding({ type: 'T005', name: 'TEST_海能Work', applicationCode: 'TEST_HW_001', summary: 'TEST_申请' }, [], fetchImpl);
assert.deepEqual(submitted, { kind: 'feishu', instanceId: 'TEST_INSTANCE', status: 'PENDING', message: '飞书审批已提交' });
assert.equal(calls[0].url, '/api/v1/approvals/instances');
assert.equal(calls[0].options.credentials, 'same-origin');
assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
const requestBody = JSON.parse(calls[0].options.body);
assert.equal(requestBody.applicationType, 'T005');
assert.equal(requestBody.title, 'TEST_海能Work');
assert.equal(requestBody.businessKey, 'TEST_T005_TEST_HW_001');
assert.equal(requestBody.idempotencyKey, 'TEST_IDEM_T005_TEST_HW_001');
assert.equal(requestBody.description, 'TEST_申请');
assert.doesNotMatch(calls[0].options.body, /token|secret/i);

const status = await getOnboardingStatus('TEST_INSTANCE', fetchImpl);
assert.deepEqual(status, { instanceId: 'TEST_INSTANCE', status: 'APPROVED' });
assert.equal(calls[1].url, '/api/v1/approvals/instances/TEST_INSTANCE');
assert.equal(calls[1].options.credentials, 'same-origin');
await assert.rejects(() => getOnboardingStatus('../bad', fetchImpl), /审批实例标识非法/);

const rpaNoInstance = await submitOnboarding({ type: 'T003', rpaRequest: {} }, [], async () => new Response(JSON.stringify({ code: '00000', message: '操作成功' }), { status: 200 }));
assert.deepEqual(rpaNoInstance, { kind: 'rpa', instanceId: '', status: 'ACCEPTED_UNTRACKED', message: '已受理但暂无可查询编号，请稍后重试' });

console.log('onboarding type routing uses existing RPA backend, server-side Feishu approval, and real status queries');
