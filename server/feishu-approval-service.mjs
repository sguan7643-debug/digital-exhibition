import { randomUUID } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

const TEST_APPROVAL_NAME = 'TEST_数智展厅海能Work应用上架审批';
const INSTANCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
const STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

function requireSession(session) {
  const userId = String(session?.identity?.userId || '');
  if (!userId || !session?.accessToken) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
  return { userId, accessToken: session.accessToken };
}

function validateInstanceId(value) {
  const instanceId = String(value || '');
  if (!INSTANCE_ID_PATTERN.test(instanceId)) throw new FeishuProxyError('INVALID_APPROVAL_INSTANCE_ID', '审批实例标识非法', 400);
  return instanceId;
}

function normalizeStatus(value) {
  const status = String(value || '').toUpperCase();
  return STATUSES.has(status) ? status : 'PENDING';
}

export function createFeishuApprovalService({ client, now = Date.now, randomId = randomUUID } = {}) {
  if (!client?.createApprovalDefinition || !client?.createApprovalInstance || !client?.getApprovalInstance || !client?.approveApprovalTask) {
    throw new Error('飞书审批服务缺少 Approval v4 客户端');
  }
  let testDefinition = null;
  const eventIds = new Set();
  const eventStatuses = new Map();

  async function ensureTestDefinition(session) {
    const { userId, accessToken } = requireSession(session);
    if (!testDefinition) {
      const created = await client.createApprovalDefinition({
        approvalName: TEST_APPROVAL_NAME,
        description: 'TEST_仅用于数智展厅端到端验收，可安全清理',
        approverUserId: userId
      }, { accessToken });
      if (!created?.approvalCode) throw new FeishuProxyError('APPROVAL_DEFINITION_FAILED', '测试审批定义创建失败', 502);
      testDefinition = Object.freeze({ approvalCode: created.approvalCode, approvalName: TEST_APPROVAL_NAME, createdAt: new Date(now()).toISOString() });
    }
    return testDefinition;
  }

  async function createInstance(input = {}, session) {
    const { userId, accessToken } = requireSession(session);
    if (input.applicationType !== 'T005') throw new FeishuProxyError('UNSUPPORTED_APPROVAL_TYPE', '仅海能Work应用使用飞书审批', 400);
    const title = String(input.title || '');
    if (!title.startsWith('TEST_')) throw new FeishuProxyError('TEST_PREFIX_REQUIRED', '审批测试数据必须使用 TEST_ 前缀', 400);
    const definition = await ensureTestDefinition(session);
    const created = await client.createApprovalInstance({
      approvalCode: definition.approvalCode,
      applicantUserId: userId,
      approverUserId: userId,
      title,
      applicationCode: String(input.applicationCode || 'TEST_UNSPECIFIED'),
      description: String(input.description || 'TEST_数智展厅端到端验收'),
      requestId: `TEST_${randomId()}`
    }, { accessToken });
    const instanceId = validateInstanceId(created?.instanceCode);
    return Object.freeze({ instanceId, status: normalizeStatus(created.status) });
  }

  async function getInstance(instanceId, session) {
    const { accessToken } = requireSession(session);
    const normalized = validateInstanceId(instanceId);
    const result = await client.getApprovalInstance(normalized, { accessToken });
    return Object.freeze({ instanceId: normalized, status: eventStatuses.get(normalized) || normalizeStatus(result.status) });
  }

  async function approveTestTask(instanceId, session) {
    const { userId, accessToken } = requireSession(session);
    const normalized = validateInstanceId(instanceId);
    const current = await client.getApprovalInstance(normalized, { accessToken });
    const task = (current.taskList || []).find(item => item.status === 'PENDING' && (!item.userId || item.userId === userId));
    if (!task?.id) throw new FeishuProxyError('APPROVAL_TASK_NOT_AVAILABLE', '当前用户没有可审批的测试任务', 409);
    await client.approveApprovalTask({
      approvalCode: current.approvalCode,
      instanceCode: normalized,
      userId,
      taskId: task.id,
      comment: 'TEST_数智展厅端到端验收审批'
    }, { accessToken });
    eventStatuses.set(normalized, 'APPROVED');
    return Object.freeze({ instanceId: normalized, status: 'APPROVED' });
  }

  async function handleEvent(input = {}) {
    const eventId = String(input.eventId || '');
    const instanceId = validateInstanceId(input.instanceId);
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(eventId)) throw new FeishuProxyError('INVALID_APPROVAL_EVENT_ID', '审批事件标识非法', 400);
    if (eventIds.has(eventId)) return Object.freeze({ accepted: true, duplicate: true });
    eventIds.add(eventId);
    eventStatuses.set(instanceId, normalizeStatus(input.status));
    return Object.freeze({ accepted: true, duplicate: false });
  }

  return Object.freeze({ ensureTestDefinition, createInstance, getInstance, approveTestTask, handleEvent });
}
