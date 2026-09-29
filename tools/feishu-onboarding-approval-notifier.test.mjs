import assert from 'node:assert/strict';
import { createFeishuApprovalService } from '../server/feishu-approval-service.mjs';
import { createFeishuOnboardingApprovalNotifier } from '../server/feishu-onboarding-approval-notifier.mjs';

const messages = [];
const messageClient = {
  async sendTextMessage(input) {
    messages.push(input);
    return { messageId: `message-${messages.length}` };
  }
};
const notifier = createFeishuOnboardingApprovalNotifier({ client: messageClient });

const separate = await notifier.notify({
  status: 'APPROVED', applicationType: 'T005',
  application: { name: '供应链驾驶舱', contact: 'user-contact', users: 'user-access' }
});
assert.equal(separate.complete, true);
assert.deepEqual(separate.sentRecipientIds, ['user-contact', 'user-access']);
assert.deepEqual(messages, [
  { receiveId: 'user-contact', receiveIdType: 'user_id', text: '海能Work应用“供应链驾驶舱”已上架，您是本应用的接入人。' },
  { receiveId: 'user-access', receiveIdType: 'user_id', text: '海能Work应用“供应链驾驶舱”已上架，您是本应用的开通人。' }
]);

messages.length = 0;
await notifier.notify({
  status: 'APPROVED', applicationType: 'T005',
  application: { name: '经营分析', contact: 'same-user', users: 'same-user' }
});
assert.deepEqual(messages, [
  { receiveId: 'same-user', receiveIdType: 'user_id', text: '海能Work应用“经营分析”已上架，您是本应用的接入人、开通人。' }
]);

messages.length = 0;
await notifier.notify({
  status: 'APPROVED', applicationType: 'T005',
  application: { name: '复用测试', contact: 'already-sent', users: 'pending-user' }
}, { alreadySent: ['already-sent'] });
assert.deepEqual(messages.map(item => item.receiveId), ['pending-user'], 'partial retry must skip recipients already notified');

const serviceMessages = [];
const approvalClient = {
  async createApprovalDefinition() { return { approvalCode: 'APPROVAL_CODE' }; },
  async createApprovalInstance() { return { instanceCode: 'INSTANCE_001', status: 'PENDING' }; },
  async getApprovalInstance() { return { approvalCode: 'APPROVAL_CODE', status: 'APPROVED', taskList: [] }; },
  async approveApprovalTask() { return { ok: true }; }
};
const integratedNotifier = createFeishuOnboardingApprovalNotifier({
  client: { async sendTextMessage(input) { serviceMessages.push(input); return { messageId: `service-${serviceMessages.length}` }; } }
});
const service = createFeishuApprovalService({
  client: approvalClient,
  now: () => Date.parse('2026-09-28T12:00:00Z'),
  projectionService: { version: 'test-v1', async publish() { return { ok: true }; } },
  approvalNotifier: integratedNotifier
});
const session = { identity: { userId: 'creator', openId: 'creator-open' }, accessToken: 'session-token' };
await service.createInstance({
  applicationType: 'T005', title: '消息幂等测试', applicationCode: 'HW-001',
  businessKey: 'TEST_BUSINESS_MESSAGE_001', resourceId: 'TEST_RESOURCE_MESSAGE_001', idempotencyKey: 'TEST_IDEMPOTENCY_MESSAGE_001',
  application: { name: '消息幂等测试', contact: 'contact-user', users: 'access-user', accessDepartment: 'department-1' }
}, session);
await service.getInstance('INSTANCE_001', session);
await service.getInstance('INSTANCE_001', session);
assert.equal(serviceMessages.length, 2, 'repeated approval sync must notify each selected person exactly once');

console.log('Feishu onboarding approval notification passed');
