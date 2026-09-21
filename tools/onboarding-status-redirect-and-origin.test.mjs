import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFeishuApprovalDispatcher } from '../server/feishu-approval-middleware.mjs';
import { getPageIntegrationContract } from '../src/integration/page-integration-matrix.js';

const applyPage = readFileSync(new URL('../src/pages/OnboardingApplyPage.vue', import.meta.url), 'utf8');
assert.match(applyPage, /window\.location\.assign\(statusHref\.value\)/, '飞书审批创建成功后必须自动进入审批状态页');
assert.deepEqual(
  getPageIntegrationContract('/apps/onboarding/status')?.readOperationIds,
  [],
  '审批状态页只能查询当前审批实例，不得自动加载无关的应用运营接口'
);

const session = { identity: { userId: 'u_test' }, accessToken: 'server-only' };
const dispatch = createFeishuApprovalDispatcher({
  service: {
    async ensureTestDefinition() { return { approvalCode: 'TEST_CODE' }; },
    async createInstance() { return { instanceId: 'TEST_INSTANCE', status: 'PENDING' }; },
    async getInstance(instanceId) { return { instanceId, status: 'PENDING' }; },
    async approveTestTask() { return { instanceId: 'TEST_INSTANCE', status: 'APPROVED' }; }
  },
  resolveUserSession: request => request.headers?.cookie === 'session=valid' ? session : null
});

const status = await dispatch({
  method: 'GET',
  url: '/api/v1/approvals/instances/TEST_INSTANCE?resourceId=TEST_RESOURCE',
  headers: { host: '127.0.0.1:4173', cookie: 'session=valid', 'sec-fetch-site': 'same-origin' }
});
assert.equal(status.status, 200, '浏览器同源 GET 未携带 Origin 时必须允许查询自己的审批状态');

const crossSite = await dispatch({
  method: 'GET',
  url: '/api/v1/approvals/instances/TEST_INSTANCE',
  headers: { host: '127.0.0.1:4173', cookie: 'session=valid', 'sec-fetch-site': 'cross-site' }
});
assert.equal(crossSite.status, 403, '不能因放行同源 GET 而放行跨站读取');

console.log('onboarding success redirect and browser same-origin approval status query passed');
