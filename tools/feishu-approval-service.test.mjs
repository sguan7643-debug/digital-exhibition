import assert from 'node:assert/strict';
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
  identity: Object.freeze({ userId: 'u_test', openId: 'ou_test', displayName: '测试用户' }),
  accessToken: 'user-token-server-only'
});
const service = createFeishuApprovalService({ client, now: () => 1_000_000 });

const definition = await service.ensureTestDefinition(session);
assert.equal(definition.approvalCode, 'TEST_APPROVAL_CODE');
assert.match(calls[0][1].approvalName, /^TEST_/);
assert.equal(calls[0][2].accessToken, 'user-token-server-only');

const created = await service.createInstance({
  applicationType: 'T005',
  title: 'TEST_海能Work应用上架',
  applicationCode: 'TEST_HW_001',
  description: 'TEST_端到端审批实例'
}, session);
assert.deepEqual(created, { instanceId: 'TEST_INSTANCE', status: 'PENDING' });
assert.equal(calls[1][1].applicantUserId, 'u_test');
assert.equal(calls[1][1].approverUserId, 'u_test');
assert.equal(calls[1][2].accessToken, 'user-token-server-only');
assert.doesNotMatch(JSON.stringify(created), /user-token/);

await assert.rejects(
  service.createInstance({ applicationType: 'T003', title: 'TEST_RPA' }, session),
  error => error.code === 'UNSUPPORTED_APPROVAL_TYPE' && error.status === 400
);
await assert.rejects(
  service.createInstance({ applicationType: 'T005', title: '生产应用' }, session),
  error => error.code === 'TEST_PREFIX_REQUIRED' && error.status === 400
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

const firstEvent = await service.handleEvent({ eventId: 'evt-1', instanceId: 'TEST_INSTANCE', status: 'APPROVED' });
const repeatedEvent = await service.handleEvent({ eventId: 'evt-1', instanceId: 'TEST_INSTANCE', status: 'REJECTED' });
assert.deepEqual(firstEvent, { accepted: true, duplicate: false });
assert.deepEqual(repeatedEvent, { accepted: true, duplicate: true });

await assert.rejects(
  service.getInstance('../unsafe', session),
  error => error.code === 'INVALID_APPROVAL_INSTANCE_ID' && error.status === 400
);

console.log('Feishu approval service confines writes to TEST_ T005 flows, current-user sessions, idempotent events, and sanitized status');
