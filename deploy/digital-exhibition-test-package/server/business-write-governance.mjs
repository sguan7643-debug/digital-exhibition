import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FEISHU_WRITE_OPERATION_BY_ID } from './contracts/feishu-write-operation-manifest.mjs';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

const actorFields = { 'COM-011': '用户ID', 'MSG-005': '接收人ID', 'ANN-004': '用户ID', 'FAV-003': '用户ID', 'APP-005': '申请人ID', 'APP-006': '申请人ID', 'APP-008': '评论人ID', 'TRN-004': '用户ID', 'CER-004': '用户ID', 'COM-009': '创建用户ID', 'PTS-005': '创建用户ID', 'OPS-002': '创建用户ID', 'OPS-004': '触发人ID', 'INT-002': '触发人ID', 'OAN-004': '发布人ID', 'OAN-005': '发布人ID', 'OAP-010': '授权人ID' };
const ownerFields = { 'FAV-004': '用户ID', 'MSG-003': '接收人ID', 'MSG-004': '接收人ID', 'TRN-005': '用户ID' };
const approvalRequired = new Set(['OAP-009', 'OAP-010', 'OAN-006']);
const draftOnlyOperations = new Set(['OAN-004', 'OAN-005', 'OAP-004', 'OAP-005']);
const publishedStates = new Set(['APPROVED', 'PUBLISHED', 'ONLINE', 'ENABLED', '已通过', '已发布', '已上架', '启用']);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const text = value => Array.isArray(value) ? value.map(item => item?.text ?? item).join('') : String(value ?? '');

// A single Node service serializes record mutations. The durable journal prevents
// a crash/ambiguous upstream result from silently repeating a business write.
export function createBusinessWriteGovernance({ writeService, recordService, ledgerFile, approvalResolver, now = Date.now }) {
  const entries = ledgerFile && existsSync(ledgerFile) ? JSON.parse(readFileSync(ledgerFile, 'utf8')) : {};
  const locks = new Map();
  function persist() {
    if (!ledgerFile) return;
    mkdirSync(dirname(ledgerFile), { recursive: true });
    const temp = `${ledgerFile}.tmp`;
    writeFileSync(temp, JSON.stringify(entries), { mode: 0o600 });
    renameSync(temp, ledgerFile);
  }
  async function execute(operationId, input, context = {}) {
    const identity = context.identity || {};
    const actor = String(identity.adAccount || identity.userId || identity.openId || '');
    if (!actor) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
    const plan = FEISHU_WRITE_OPERATION_BY_ID.get(operationId);
    if (!plan) throw new FeishuProxyError('WRITE_OPERATION_NOT_ENABLED', '正式写操作未登记', 503);
    const contract = input?.governance;
    if (contract?.confirmed !== true || contract.auditContractId !== 'business-write.v1') throw new FeishuProxyError('WRITE_CONFIRMATION_REQUIRED', '写操作需要明确确认和正式审计合同', 400);
    const { governance, ...businessInput } = input;
    const digest = hash({ operationId, input: businessInput });
    if (contract.requestHash !== `sha256:${digest}`) throw new FeishuProxyError('REQUEST_HASH_MISMATCH', '写请求摘要校验失败', 400);
    if (!String(input.businessKey || '').trim() || !String(input.idempotencyKey || '').trim()) throw new FeishuProxyError('IDEMPOTENCY_REQUIRED', '业务键和幂等键不能为空', 400);
    writeService.validateClientInput?.(operationId, businessInput);
    const tenant = String(identity.tenantKey || identity.tenantId || 'default');
    const key = hash({ tenant, actor, operationId, idempotencyKey: input.idempotencyKey });
    const lockKey = hash({ tenant, table: plan.tableName, businessKey: input.businessKey });
    const previous = locks.get(lockKey) || Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
      const existing = entries[key];
      if (existing) {
        if (existing.requestHash !== digest) throw new FeishuProxyError('IDEMPOTENCY_CONFLICT', '同一幂等键不能用于不同请求', 409);
        if (existing.state === 'completed') return { ...existing.result, data: { ...existing.result.data, replayed: true } };
        throw new FeishuProxyError('WRITE_OUTCOME_UNCONFIRMED', '前次写入结果待核对，不能重复执行', 409);
      }
      const fields = { ...(businessInput.fields || {}) };
      const binding = actorFields[operationId];
      if (binding) {
        if (fields[binding] && text(fields[binding]) !== actor) throw new FeishuProxyError('ACTOR_MISMATCH', '业务操作人必须是当前授权用户', 403);
        fields[binding] = actor;
      }
      if (ownerFields[operationId]) {
        const record = await recordService.getRecord({ ...plan, businessKey: input.businessKey });
        if (!record || text(record.fields?.[ownerFields[operationId]]) !== actor) throw new FeishuProxyError('RECORD_OWNER_DENIED', '只能修改本人业务记录', 403);
      }
      if (draftOnlyOperations.has(operationId) && publishedStates.has(String(fields['状态'] || '').trim().toUpperCase())) {
        throw new FeishuProxyError('DIRECT_PUBLISH_FORBIDDEN', '新增或编辑操作不能绕过审批直接发布', 403);
      }
      if (approvalRequired.has(operationId)) {
        if (!contract.approvalInstanceId || !approvalResolver) throw new FeishuProxyError('BUSINESS_APPROVAL_REQUIRED', '该操作需要绑定真实审批通过的业务实例', 409);
        const resource = String(fields['应用ID'] || input.businessKey);
        const approval = await approvalResolver(contract.approvalInstanceId, context, { operationId, resourceId: resource });
        if (approval.status !== 'APPROVED' || approval.resourceId !== resource || approval.operationId !== operationId) throw new FeishuProxyError('BUSINESS_APPROVAL_MISMATCH', '审批状态、业务资源或操作不匹配', 403);
      }
      if (['APP-005','APP-006'].includes(operationId)) {
        const statusField = operationId === 'APP-005' ? '状态' : '本地状态';
        if (fields[statusField] && !['PENDING','待处理','待审批'].includes(fields[statusField])) throw new FeishuProxyError('APPROVAL_STATE_FORBIDDEN', '申请不能由前端直接设为已通过', 403);
        fields[statusField] = 'PENDING';
      }
      writeService.validate?.(operationId, { ...businessInput, fields }, { governed: true });
      const entry = { operationId, businessKey: input.businessKey, actor, tenant, requestHash: digest, changedFields: Object.keys(fields), state: 'prepared', startedAt: now() };
      entries[key] = entry;
      persist();
      try {
        const result = await writeService.execute(operationId, { ...businessInput, fields }, { governed: true });
        entry.result = result;
        entry.state = 'completed';
        entry.finishedAt = now();
        persist();
        return result;
      } catch (error) {
        entry.state = 'unconfirmed';
        entry.errorCode = error.code || 'WRITE_FAILED';
        entry.finishedAt = now();
        persist();
        throw error;
      }
    });
    locks.set(lockKey, pending);
    try { return await pending; } finally { if (locks.get(lockKey) === pending) locks.delete(lockKey); }
  }
  return Object.freeze({ execute });
}
