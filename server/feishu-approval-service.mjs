import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
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
  if (!STATUSES.has(status)) throw new FeishuProxyError('APPROVAL_STATUS_INVALID', '审批上游返回了未知或缺失状态', 502);
  return status;
}

export function createFeishuApprovalService({ client, now = Date.now, registry = new Map(), registryFile = '' } = {}) {
  if (!client?.createApprovalDefinition || !client?.createApprovalInstance || !client?.getApprovalInstance || !client?.approveApprovalTask) {
    throw new Error('飞书审批服务缺少 Approval v4 客户端');
  }
  if (!(registry instanceof Map)) throw new Error('飞书审批实例注册表必须是 Map');
  const testDefinitions = new Map();
  const definitionPromises = new Map();
  const createPromises = new Map();

  function persistRegistry() {
    if (!registryFile) return;
    const directory = dirname(registryFile);
    mkdirSync(directory, { recursive: true });
    const temporary = `${registryFile}.tmp`;
    writeFileSync(temporary, JSON.stringify([...registry.values()], null, 2), 'utf8');
    renameSync(temporary, registryFile);
  }

  if (registryFile && existsSync(registryFile)) {
    try {
      const stored = JSON.parse(readFileSync(registryFile, 'utf8'));
      if (Array.isArray(stored)) for (const record of stored) {
        if (record && typeof record === 'object' && (record.instanceId || record.registryKey)) {
          registry.set(record.instanceId || `pending:${record.registryKey}`, record);
        }
      }
    } catch {
      throw new FeishuProxyError('APPROVAL_REGISTRY_INVALID', '审批实例注册表无法读取', 500);
    }
  }

  function assertTestKey(value, code = 'TEST_IDEMPOTENCY_REQUIRED') {
    const normalized = String(value || '');
    if (!TEST_KEY_PATTERN.test(normalized)) throw new FeishuProxyError(code, '测试审批必须使用 TEST_ 业务键和幂等键', 400);
    return normalized;
  }

  function sessionContext(session) {
    const identity = session?.identity || {};
    const userId = String(identity.userId || '');
    const openId = String(identity.openId || '');
    const subject = String(identity.subject || userId || openId || '');
    if (!subject || !session?.accessToken) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
    return {
      userId: userId || subject,
      subject,
      openId,
      tenantKey: String(identity.tenantKey || identity.tenantId || ''),
      orgId: String(identity.orgId || identity.organizationId || ''),
      permissionSnapshot: Array.isArray(identity.permissions) ? [...new Set(identity.permissions.map(String))].sort() : [],
      accessToken: session.accessToken
    };
  }

  function registryKey(context, businessKey, idempotencyKey) {
    return [context.subject, context.tenantKey, context.orgId, businessKey, idempotencyKey].join('\u0000');
  }

  function stableRequestId(context, key) {
    const digest = createHash('sha256').update(`${context.subject}\u0000${context.tenantKey}\u0000${key}`).digest('hex').slice(0, 32);
    return `TEST_${digest}`;
  }

  function recordFor(instanceId, context, { resourceId = '' } = {}) {
    const record = registry.get(instanceId);
    if (!record) throw new FeishuProxyError('APPROVAL_INSTANCE_NOT_REGISTERED', '审批实例不是本服务创建的 TEST_ 实例', 404);
    const creatorSubject = String(record.creatorSubject || record.creatorUserId || '');
    if (creatorSubject !== context.subject || (record.creatorOpenId && context.openId && record.creatorOpenId !== context.openId)) {
      throw new FeishuProxyError('APPROVAL_INSTANCE_FORBIDDEN', '无权访问其他用户的测试审批实例', 403);
    }
    if (record.tenantKey && record.tenantKey !== context.tenantKey) throw new FeishuProxyError('APPROVAL_INSTANCE_TENANT_MISMATCH', '审批实例不属于当前租户', 403);
    if (record.orgId && record.orgId !== context.orgId) throw new FeishuProxyError('APPROVAL_INSTANCE_ORG_MISMATCH', '审批实例不属于当前组织', 403);
    if (resourceId && record.resourceId !== resourceId) throw new FeishuProxyError('APPROVAL_INSTANCE_RESOURCE_MISMATCH', '审批实例不属于当前资源', 403);
    if (record.expiresAt <= now() || record.cleanupStatus !== 'ACTIVE') {
      record.cleanupStatus = 'EXPIRED';
      persistRegistry();
      throw new FeishuProxyError('APPROVAL_INSTANCE_EXPIRED', '测试审批实例已过期或已清理', 410);
    }
    return record;
  }

  async function ensureTestDefinition(session) {
    const context = sessionContext(session);
    const definitionKey = `${context.subject}\u0000${context.tenantKey}\u0000${context.orgId}`;
    const existing = testDefinitions.get(definitionKey) || [...registry.values()].find(record => record.creatorSubject === context.subject && record.tenantKey === context.tenantKey && record.orgId === context.orgId && record.approvalCode)?.approvalCode && Object.freeze({ approvalCode: [...registry.values()].find(record => record.creatorSubject === context.subject && record.tenantKey === context.tenantKey && record.orgId === context.orgId && record.approvalCode)?.approvalCode, approvalName: TEST_APPROVAL_NAME, creatorUserId: context.userId, createdAt: new Date(now()).toISOString(), expiresAt: now() + REGISTRY_TTL_MS });
    if (existing) return existing;
    if (!definitionPromises.has(definitionKey)) definitionPromises.set(definitionKey, (async () => {
      const created = await client.createApprovalDefinition({
        approvalName: TEST_APPROVAL_NAME,
        description: 'TEST_仅用于数智展厅端到端验收，可安全清理',
        approverUserId: context.userId
      });
      if (!created?.approvalCode) throw new FeishuProxyError('APPROVAL_DEFINITION_FAILED', '测试审批定义创建失败', 502);
      const definition = Object.freeze({ approvalCode: created.approvalCode, approvalName: TEST_APPROVAL_NAME, creatorUserId: context.userId, createdAt: new Date(now()).toISOString(), expiresAt: now() + REGISTRY_TTL_MS });
      testDefinitions.set(definitionKey, definition);
      return definition;
    })().finally(() => definitionPromises.delete(definitionKey)));
    return definitionPromises.get(definitionKey);
  }

  async function createInstance(input = {}, session) {
    const context = sessionContext(session);
    const { userId } = context;
    if (input.applicationType !== 'T005') throw new FeishuProxyError('UNSUPPORTED_APPROVAL_TYPE', '仅海能Work应用使用飞书审批', 400);
    const title = String(input.title || '');
    if (!title.startsWith('TEST_')) throw new FeishuProxyError('TEST_PREFIX_REQUIRED', '审批测试数据必须使用 TEST_ 前缀', 400);
    const applicationCode = String(input.applicationCode || '');
    const resourceId = String(input.resourceId || applicationCode);
    if (!TEST_KEY_PATTERN.test(applicationCode) || !resourceId || resourceId !== applicationCode) throw new FeishuProxyError('TEST_RESOURCE_REQUIRED', '测试审批必须绑定 TEST_ 应用资源', 400);
    const businessKey = assertTestKey(input.businessKey);
    const idempotencyKey = assertTestKey(input.idempotencyKey);
    const key = registryKey(context, businessKey, idempotencyKey);
    const existing = [...registry.values()].find(record => record.registryKey === key);
    if (existing && existing.expiresAt <= now()) throw new FeishuProxyError('APPROVAL_IDEMPOTENCY_EXPIRED', '测试审批幂等记录已过期', 409);
    if (existing?.instanceId) return Object.freeze({ instanceId: existing.instanceId, status: existing.status });
    if (!createPromises.has(key)) createPromises.set(key, (async () => {
      const definition = await ensureTestDefinition(session);
      const record = existing || { instanceId: '', approvalCode: definition.approvalCode, creatorUserId: userId, creatorSubject: context.subject, creatorOpenId: context.openId, tenantKey: context.tenantKey, orgId: context.orgId, resourceId, permissionSnapshot: context.permissionSnapshot, businessKey, idempotencyKey, registryKey: key, requestId: stableRequestId(context, key), createdAt: now(), expiresAt: now() + REGISTRY_TTL_MS, cleanupStatus: 'ACTIVE', status: 'PENDING' };
      if (!existing) registry.set(`pending:${key}`, record);
      persistRegistry();
      try {
        const created = await client.createApprovalInstance({
          approvalCode: record.approvalCode,
          applicantUserId: userId,
          approverUserId: userId,
          title,
          applicationCode,
          description: String(input.description || 'TEST_数智展厅端到端验收'),
          requestId: record.requestId
        });
        const instanceId = validateInstanceId(created?.instanceCode);
        const status = normalizeStatus(created.status);
        registry.delete(`pending:${key}`);
        record.instanceId = instanceId;
        record.status = status;
        registry.set(instanceId, record);
        persistRegistry();
        return Object.freeze({ instanceId, status });
      } catch (error) {
        persistRegistry();
        throw error;
      }
    })().finally(() => createPromises.delete(key)));
    return createPromises.get(key);
  }

  async function getInstance(instanceId, session, options = {}) {
    const context = sessionContext(session);
    const normalized = validateInstanceId(instanceId);
    const record = recordFor(normalized, context, options);
    const result = await client.getApprovalInstance(normalized);
    if (result.approvalCode !== record.approvalCode) throw new FeishuProxyError('APPROVAL_DEFINITION_MISMATCH', '审批实例不属于本服务 TEST_ 定义', 403);
    record.status = normalizeStatus(result.status);
    persistRegistry();
    return Object.freeze({ instanceId: normalized, status: record.status });
  }

  async function approveTestTask(instanceId, session, options = {}) {
    const context = sessionContext(session);
    const { userId } = context;
    const normalized = validateInstanceId(instanceId);
    const record = recordFor(normalized, context, options);
    const current = await client.getApprovalInstance(normalized);
    if (current.approvalCode !== record.approvalCode) throw new FeishuProxyError('APPROVAL_DEFINITION_MISMATCH', '审批实例不属于本服务 TEST_ 定义', 403);
    const task = (current.taskList || []).find(item => item.status === 'PENDING' && (!item.userId || item.userId === userId));
    if (!task?.id) throw new FeishuProxyError('APPROVAL_TASK_NOT_AVAILABLE', '当前用户没有可审批的测试任务', 409);
    await client.approveApprovalTask({
      approvalCode: current.approvalCode,
      instanceCode: normalized,
      userId,
      taskId: task.id,
      comment: 'TEST_数智展厅端到端验收审批'
    });
    record.status = 'APPROVED';
    persistRegistry();
    return Object.freeze({ instanceId: normalized, status: 'APPROVED' });
  }

  function cleanupExpired() {
    let count = 0;
    for (const record of registry.values()) if (record.expiresAt <= now() && record.cleanupStatus === 'ACTIVE') { record.cleanupStatus = 'EXPIRED'; count += 1; }
    if (count) persistRegistry();
    return count;
  }

  return Object.freeze({ ensureTestDefinition, createInstance, getInstance, approveTestTask, cleanupExpired });
}
