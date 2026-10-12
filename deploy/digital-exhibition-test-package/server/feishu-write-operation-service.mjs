import { FEISHU_WRITE_OPERATION_BY_ID } from './contracts/feishu-write-operation-manifest.mjs';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

function requireInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '写接口 input 必须是对象', 400);
  const allowed = new Set(['businessKey', 'idempotencyKey', 'ifMatch', 'fields']);
  if (Object.keys(input).some(key => !allowed.has(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '写接口包含未允许的输入字段', 400);
  if (typeof input.fields !== 'object' || input.fields === null || Array.isArray(input.fields)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'fields 必须是对象', 400);
}

function sanitizeFields(plan, fields, { clientBoundary = false } = {}) {
  const allowed = new Set(clientBoundary ? plan.clientAllowedFields : plan.allowedFields);
  const operationFields = new Set(plan.allowedFields);
  const sanitized = {};
  for (const [name, value] of Object.entries(fields)) {
    if (!allowed.has(name)) {
      if (clientBoundary && (operationFields.has(name) || plan.serverControlledFields?.includes(name))) {
        throw new FeishuProxyError('SERVER_CONTROLLED_FIELD_FORBIDDEN', `${name} 由服务端维护，客户端不得提交`, 400, { field: name });
      }
      throw new FeishuProxyError('FIELD_NOT_ALLOWED', `字段不在 ${plan.operationId} 白名单中`, 422, { field: name });
    }
    if (name === plan.keyField || ['版本', '追踪ID', '来源系统', '已删除'].includes(name)) {
      throw new FeishuProxyError('MANAGED_FIELD_FORBIDDEN', '受控字段由安全代理维护', 422);
    }
    sanitized[name] = value;
  }
  return sanitized;
}

function fieldPresent(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function requireRequiredFields(plan, fields) {
  const missing = (plan.requiredFields || []).filter(name => !fieldPresent(fields[name]));
  if (missing.length) {
    throw new FeishuProxyError('REQUIRED_FIELD_MISSING', `${plan.operationId} 缺少必填字段：${missing.join('、')}`, 400, { requiredFields: missing });
  }
}

function requireOperationFields(plan, fields) {
  if (plan.initialStatus && fields['状态'] != null && fields['状态'] !== plan.initialStatus) {
    throw new FeishuProxyError('APPROVAL_STATE_FORBIDDEN', '申请不能绕过审批初始状态', 403);
  }
}

function operationResponseData(plan, input, result, version) {
  if (plan.responseKind === 'FAVORITE') {
    return { favoriteId: input.businessKey, favoriteVersion: version };
  }
  if (plan.responseKind === 'APPLICATION_REQUEST') {
    return {
      applicationRequestId: input.businessKey,
      requestId: input.businessKey,
      applicationId: String(input.fields['应用ID']),
      status: plan.initialStatus
    };
  }
  return {};
}

export function createFeishuWriteOperationService({ safeRecordService, commandHandlers = {}, now = () => new Date(), traceIdFactory = () => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}` }) {
  if (!safeRecordService) throw new Error('缺少安全测试记录服务');
  function validateClientInput(operationId, input) {
    const plan = FEISHU_WRITE_OPERATION_BY_ID.get(operationId);
    if (!plan) throw new FeishuProxyError('WRITE_OPERATION_NOT_ENABLED', '写接口尚未完成受控映射', 503);
    requireInput(input);
    const fields = sanitizeFields(plan, input.fields, { clientBoundary: true });
    requireRequiredFields(plan, fields);
    return { plan, fields };
  }
  function validate(operationId, input, { governed = false } = {}) {
    const plan = FEISHU_WRITE_OPERATION_BY_ID.get(operationId);
    if (!plan) throw new FeishuProxyError('WRITE_OPERATION_NOT_ENABLED', '写接口尚未完成受控映射', 503);
    requireInput(input);
    if (plan.requiresRequestGovernance && governed !== true) {
      throw new FeishuProxyError('REQUEST_GOVERNANCE_REQUIRED', `${operationId} 必须通过正式请求治理链路执行`, 400);
    }
    const fields = sanitizeFields(plan, input.fields);
    requireRequiredFields(plan, fields);
    if (plan.mode === 'CREATE' && input.ifMatch != null) {
      throw new FeishuProxyError('IF_MATCH_FORBIDDEN', '新增操作不接受版本条件', 400);
    }
    if (plan.requiresVersion && (!Number.isInteger(Number(input.ifMatch)) || Number(input.ifMatch) < 1)) {
      throw new FeishuProxyError('IF_MATCH_REQUIRED', '该写操作必须提供正整数版本', 428);
    }
    if (plan.mode === 'COMMAND') {
      const handler = typeof commandHandlers === 'function' ? commandHandlers : commandHandlers[operationId];
      if (typeof handler !== 'function') throw new FeishuProxyError('COMMAND_NOT_IMPLEMENTED', `${operationId} COMMAND 尚未配置专用处理器`, 501);
    }
    return { plan, fields };
  }
  return Object.freeze({
    validate,
    validateClientInput,
    requiresRequestGovernance(operationId) {
      return FEISHU_WRITE_OPERATION_BY_ID.get(operationId)?.requiresRequestGovernance === true;
    },
    async execute(operationId, input, options = {}) {
      const { plan, fields } = validate(operationId, input, options);
      requireOperationFields(plan, fields);
      let result;
      if (plan.mode === 'CREATE') {
        result = input.ifMatch == null
          ? await safeRecordService.createOnce({ tableName: plan.tableName, keyField: plan.keyField, businessKey: input.businessKey, idempotencyKey: input.idempotencyKey, fields, governance: plan.governance })
          : await safeRecordService.update({ tableName: plan.tableName, keyField: plan.keyField, businessKey: input.businessKey, ifMatch: input.ifMatch, fields, governance: plan.governance });
      } else if (plan.mode === 'UPSERT') {
        result = input.ifMatch == null
          ? await safeRecordService.createOnce({ tableName: plan.tableName, keyField: plan.keyField, businessKey: input.businessKey, idempotencyKey: input.idempotencyKey, fields, governance: plan.governance })
          : await safeRecordService.update({ tableName: plan.tableName, keyField: plan.keyField, businessKey: input.businessKey, ifMatch: input.ifMatch, fields, governance: plan.governance });
      } else if (plan.mode === 'DELETE') {
        result = await safeRecordService.remove({ tableName: plan.tableName, keyField: plan.keyField, businessKey: input.businessKey, ifMatch: input.ifMatch, governance: plan.governance });
      } else if (plan.mode === 'COMMAND') {
        const handler = typeof commandHandlers === 'function' ? commandHandlers : commandHandlers[operationId];
        if (typeof handler !== 'function') throw new FeishuProxyError('COMMAND_NOT_IMPLEMENTED', `${operationId} COMMAND 尚未配置专用处理器`, 501);
        result = await handler({ operationId, plan, businessKey: input.businessKey, idempotencyKey: input.idempotencyKey, ifMatch: input.ifMatch, fields, safeRecordService });
      } else if (plan.mode === 'UPDATE_MANY') {
        if (!plan.matchField || !safeRecordService.updateMany) throw new FeishuProxyError('UPDATE_MANY_NOT_IMPLEMENTED', `${operationId} 批量更新尚未配置`, 501);
        const matchValue = fields[plan.matchField];
        if (!String(matchValue || '').trim()) throw new FeishuProxyError('BATCH_MATCH_VALUE_REQUIRED', '批量更新缺少受控匹配值', 400);
        const patch = { ...fields };
        delete patch[plan.matchField];
        result = await safeRecordService.updateMany({ tableName: plan.tableName, matchField: plan.matchField, matchValue, fields: patch, governance: plan.governance });
      } else if (plan.mode === 'UPDATE') {
        result = await safeRecordService.update({ tableName: plan.tableName, keyField: plan.keyField, businessKey: input.businessKey, ifMatch: input.ifMatch, fields, governance: plan.governance });
      } else {
        throw new FeishuProxyError('WRITE_OPERATION_NOT_ENABLED', `${operationId} 写入模式未实现`, 503);
      }
      const rawVersion = Number(result.version || (plan.mode === 'DELETE' ? input.ifMatch : 0));
      if (plan.responseKind && (!Number.isInteger(rawVersion) || rawVersion < 1)) {
        throw new FeishuProxyError('FEISHU_UPSTREAM_ERROR', '飞书写入结果缺少有效版本', 502);
      }
      const version = Number.isFinite(rawVersion) ? rawVersion : 0;
      return {
        code: 'OK',
        data: {
          operationId, tableName: plan.tableName, businessKey: input.businessKey,
          recordId: result.record?.record_id || result.recordId || '', version,
          replayed: Boolean(result.replayed), deleted: Boolean(result.deleted), alreadyAbsent: Boolean(result.alreadyAbsent),
          command: result.command || '', updatedCount: Number(result.updatedCount || 0),
          ...operationResponseData(plan, input, result, version)
        },
        traceId: traceIdFactory(), schemaVersion: plan.responseSchemaVersion, sourceUpdatedAt: now().toISOString(),
        isComplete: true, dataStale: false
      };
    }
  });
}
