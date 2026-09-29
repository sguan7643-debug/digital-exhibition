import { FeishuProxyError } from './feishu-open-api-client.mjs';

const ROLE_ORDER = Object.freeze(['接入人', '开通人']);

function normalizedRecipientId(value) {
  return String(value || '').trim().slice(0, 256);
}

function notificationRecipients(record = {}) {
  const application = record.application && typeof record.application === 'object' ? record.application : {};
  const recipients = new Map();
  const add = (recipientId, role) => {
    const normalized = normalizedRecipientId(recipientId);
    if (!normalized) return;
    if (!recipients.has(normalized)) recipients.set(normalized, new Set());
    recipients.get(normalized).add(role);
  };
  add(application.contact, '接入人');
  add(application.users, '开通人');
  return [...recipients.entries()].map(([recipientId, roles]) => ({
    recipientId,
    roles: ROLE_ORDER.filter(role => roles.has(role))
  }));
}

function notificationText(applicationName, roles) {
  const normalizedName = String(applicationName || '未命名应用').trim().slice(0, 200) || '未命名应用';
  return `海能Work应用“${normalizedName}”已上架，您是本应用的${roles.join('、')}。`;
}

export function createFeishuOnboardingApprovalNotifier({ client } = {}) {
  if (!client?.sendTextMessage) throw new Error('海能Work上架通知缺少飞书消息客户端');

  async function notify(record = {}, { alreadySent = [] } = {}) {
    if (String(record.status || '').toUpperCase() !== 'APPROVED') {
      return Object.freeze({ complete: false, sentRecipientIds: [], recipientCount: 0 });
    }
    const applicationType = String(record.applicationType || 'T005').toUpperCase();
    if (applicationType !== 'T005') {
      return Object.freeze({ complete: false, sentRecipientIds: [], recipientCount: 0 });
    }

    const completed = new Set((Array.isArray(alreadySent) ? alreadySent : []).map(normalizedRecipientId).filter(Boolean));
    const recipients = notificationRecipients(record);
    const pending = recipients.filter(item => !completed.has(item.recipientId));
    const results = await Promise.allSettled(pending.map(item => client.sendTextMessage({
      receiveId: item.recipientId,
      receiveIdType: 'user_id',
      text: notificationText(record.application?.name || record.title, item.roles)
    })));

    const failures = [];
    results.forEach((result, index) => {
      const recipient = pending[index];
      if (result.status === 'fulfilled') completed.add(recipient.recipientId);
      else failures.push({ recipientId: recipient.recipientId, reason: result.reason });
    });

    const sentRecipientIds = [...completed];
    if (failures.length) {
      const error = new FeishuProxyError('FEISHU_ONBOARDING_NOTIFICATION_FAILED', '海能Work应用上架通知发送失败', 502, {
        failedRecipientIds: failures.map(item => item.recipientId),
        sentRecipientIds
      });
      error.cause = failures[0].reason;
      throw error;
    }
    return Object.freeze({ complete: true, sentRecipientIds, recipientCount: recipients.length });
  }

  return Object.freeze({ notify });
}

