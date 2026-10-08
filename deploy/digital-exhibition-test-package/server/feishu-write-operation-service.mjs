import { FEISHU_WRITE_OPERATION_BY_ID } from './contracts/feishu-write-operation-manifest.mjs';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

function requireInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '写接口 input 必须是对象', 400);
  const allowed = new Set(['businessKey', 'idempotencyKey', 'ifMatch', 'fields']);
  if (Object.keys(input).some(key => !allowed.has(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '写接口包含未允许的输入字段', 400);
  if (typeof input.fields !== 'object' || input.fields === null || Array.isArray(input.fields)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'fields 必须是对象', 400);
}

function sanitizeFields(plan, fields) {
  const allowed = new Set(plan.allowedFields);
  const sanitized = {};
  for (const [name, value] of Object.entries(fields)) {
    if (!allowed.has(name)) throw new FeishuProxyError('FIELD_NOT_ALLOWED', `字段不在 ${plan.operationId} 白名单中`, 422);
    if (name === plan.keyField || ['版本', '追踪ID', '来源系统', '已删除'].includes(name)) {
      throw new FeishuProxyError('MANAGED_FIELD_FORBIDDEN', '受控字段由安全代理维护', 422);
    }
    sanitized[name] = value;
  }
  return sanitized;
}

export function createFeishuWriteOperationService({ safeRecordService, commandHandlers = {}, now = () => new Date(), traceIdFactory = () => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}` }) {
  if (!safeRecordService) throw new Error('缺少安全测试记录服务');
  function validate(operationId, input) {
    const plan = FEISHU_WRITE_OPERATION_BY_ID.get(operationId);
    if (!plan) throw new FeishuProxyError('WRITE_OPERATION_NOT_ENABLED', '写接口尚未完成受控映射', 503);
    requireInput(input);
    const fields = sanitizeFields(plan, input.fields);
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
    async execute(operationId, input) {
      const { plan, fields } = validate(operationId, input);
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
      return {
        code: 'OK',
        data: {
          operationId, tableName: plan.tableName, businessKey: input.businessKey,
          recordId: result.record?.record_id || result.recordId || '', version: result.version || 0,
          replayed: Boolean(result.replayed), deleted: Boolean(result.deleted), alreadyAbsent: Boolean(result.alreadyAbsent),
          command: result.command || '', updatedCount: Number(result.updatedCount || 0)
        },
        traceId: traceIdFactory(), schemaVersion: 'feishu-business-write.v1', sourceUpdatedAt: now().toISOString(),
        isComplete: true, dataStale: false
      };
    }
  });
}
