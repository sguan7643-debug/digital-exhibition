import { FeishuProxyError } from './feishu-open-api-client.mjs';

const UPDATE_COMMANDS = Object.freeze(['ADM-005', 'OAN-006', 'OAN-007', 'OAP-009']);

export function createBusinessCommandHandlers() {
  const handlers = {};
  for (const operationId of UPDATE_COMMANDS) {
    handlers[operationId] = async ({ plan, businessKey, ifMatch, fields, safeRecordService }) => {
      if (!Object.keys(fields).length) throw new FeishuProxyError('COMMAND_FIELDS_REQUIRED', `${operationId} 缺少命令字段`, 400);
      const result = await safeRecordService.update({
        tableName: plan.tableName,
        keyField: plan.keyField,
        businessKey,
        ifMatch,
        fields,
        governance: plan.governance
      });
      return { ...result, command: operationId };
    };
  }
  handlers['ARC-003'] = async ({ plan, businessKey, idempotencyKey, fields, safeRecordService }) => {
    if (!fields['归档任务ID']) throw new FeishuProxyError('ARCHIVE_TASK_REQUIRED', '恢复任务必须绑定归档任务', 400);
    const result = await safeRecordService.createOnce({
      tableName: plan.tableName,
      keyField: plan.keyField,
      businessKey,
      idempotencyKey,
      fields,
      governance: plan.governance
    });
    return { ...result, command: 'ARC-003' };
  };
  return Object.freeze(handlers);
}
