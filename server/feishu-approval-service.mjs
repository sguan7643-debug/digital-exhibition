import { randomUUID } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

const TEST_APPROVAL_NAME = 'TEST_数智展厅海能Work应用上架审批';
const INSTANCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
const STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
const TEST_KEY_PATTERN = /^TEST_[A-Za-z0-9_-]{1,256}$/;
const REGISTRY_TTL_MS = 24 * 60 * 60 * 1000;

function requireSession(session) {
  const userId = String(session?.identity?.userId || session?.identity?.openId || '');
  const openId = String(session?.identity?.openId || '');
  if (!userId || !session?.accessToken) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
  return { userId, openId, accessToken: session.accessToken };
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

export function createFeishuApprovalService({ client, now = Date.now, randomId = randomUUID, registry = new Map() } = {}) {
  if (!client?.createApprovalDefinition || !client?.createApprovalInstance || !client?.getApprovalInstance || !client?.approveApprovalTask) {
    throw new Error('飞书审批服务缺少 Approval v4 客户端');
  }
  const testDefinitions = new Map();
  const definitionPromises = new Map();
  const createPromises = new Map();

  function assertTestKey(value, code = 'TEST_IDEMPOTENCY_REQUIRED') {
    const normalized = String(value || '');
    if (!TEST_KEY_PATTERN.test(normalized)) throw new FeishuProxyError(code, '测试审批必须使用 TEST_ 业务键和幂等键', 400);
    return normalized;
  }

  function registryKey(userId, businessKey, idempotencyKey) {
    return `${userId}\u0000${businessKey}\u0000${idempotencyKey}`;
  }

  function recordFor(instanceId, userId) {
    const record = registry.get(instanceId);
    if (!record) throw new FeishuProxyError('APPROVAL_INSTANCE_NOT_REGISTERED', '审批实例不是本服务创建的 TEST_ 实例', 404);
    if (record.creatorUserId !== userId) throw new FeishuProxyError('APPROVAL_INSTANCE_FORBIDDEN', '无权访问其他用户的测试审批实例', 403);
    if (record.expiresAt <= now() || record.cleanupStatus !== 'ACTIVE') {
      record.cleanupStatus = 'EXPIRED';
      throw new FeishuProxyError('APPROVAL_INSTANCE_EXPIRED', '测试审批实例已过期或已清理', 410);
    }
    return record;
  }

  async function ensureTestDefinition(session) {
    const { userId, accessToken } = requireSession(session);
    const existing = testDefinitions.get(userId);
    if (existing) return existing;
    if (!definitionPromises.has(userId)) definitionPromises.set(userId, (async () => {
      const created = await client.createApprovalDefinition({
        approvalName: TEST_APPROVAL_NAME,
        description: 'TEST_仅用于数智展厅端到端验收，可安全清理',
        approverUserId: userId
      }, { accessToken });
      if (!created?.approvalCode) throw new FeishuProxyError('APPROVAL_DEFINITION_FAILED', '测试审批定义创建失败', 502);
      const definition = Object.freeze({ approvalCode: created.approvalCode, approvalName: TEST_APPROVAL_NAME, creatorUserId: userId, createdAt: new Date(now()).toISOString(), expiresAt: now() + REGISTRY_TTL_MS });
      testDefinitions.set(userId, definition);
      return definition;
    })().finally(() => definitionPromises.delete(userId)));
    return definitionPromises.get(userId);
  }

  async function createInstance(input = {}, session) {
    const { userId, openId, accessToken } = requireSession(session);
    if (input.applicationType !== 'T005') throw new FeishuProxyError('UNSUPPORTED_APPROVAL_TYPE', '仅海能Work应用使用飞书审批', 400);
    const title = String(input.title || '');
    if (!title.startsWith('TEST_')) throw new FeishuProxyError('TEST_PREFIX_REQUIRED', '审批测试数据必须使用 TEST_ 前缀', 400);
    const businessKey = assertTestKey(input.businessKey);
    const idempotencyKey = assertTestKey(input.idempotencyKey);
    const key = registryKey(userId, businessKey, idempotencyKey);
    const existing = [...registry.values()].find(record => record.registryKey === key);
    if (existing) return Object.freeze({ instanceId: existing.instanceId, status: existing.status });
    if (!createPromises.has(key)) createPromises.set(key, (async () => {
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
      const status = normalizeStatus(created.status);
      registry.set(instanceId, { instanceId, approvalCode: definition.approvalCode, creatorUserId: userId, creatorOpenId: openId, businessKey, idempotencyKey, registryKey: key, createdAt: now(), expiresAt: now() + REGISTRY_TTL_MS, cleanupStatus: 'ACTIVE', status });
      return Object.freeze({ instanceId, status });
    })().finally(() => createPromises.delete(key)));
    return createPromises.get(key);
  }

  async function getInstance(instanceId, session) {
    const { userId, accessToken } = requireSession(session);
    const normalized = validateInstanceId(instanceId);
    const record = recordFor(normalized, userId);
    const result = await client.getApprovalInstance(normalized, { accessToken });
    if (result.approvalCode !== record.approvalCode) throw new FeishuProxyError('APPROVAL_DEFINITION_MISMATCH', '审批实例不属于本服务 TEST_ 定义', 403);
    record.status = normalizeStatus(result.status);
    return Object.freeze({ instanceId: normalized, status: record.status });
  }

  async function approveTestTask(instanceId, session) {
    const { userId, accessToken } = requireSession(session);
    const normalized = validateInstanceId(instanceId);
    const record = recordFor(normalized, userId);
    const current = await client.getApprovalInstance(normalized, { accessToken });
    if (current.approvalCode !== record.approvalCode) throw new FeishuProxyError('APPROVAL_DEFINITION_MISMATCH', '审批实例不属于本服务 TEST_ 定义', 403);
    const task = (current.taskList || []).find(item => item.status === 'PENDING' && (!item.userId || item.userId === userId));
    if (!task?.id) throw new FeishuProxyError('APPROVAL_TASK_NOT_AVAILABLE', '当前用户没有可审批的测试任务', 409);
    await client.approveApprovalTask({
      approvalCode: current.approvalCode,
      instanceCode: normalized,
      userId,
      taskId: task.id,
      comment: 'TEST_数智展厅端到端验收审批'
    }, { accessToken });
    record.status = 'APPROVED';
    return Object.freeze({ instanceId: normalized, status: 'APPROVED' });
  }

  return Object.freeze({ ensureTestDefinition, createInstance, getInstance, approveTestTask });
}
