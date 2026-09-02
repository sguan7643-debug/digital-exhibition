import { getOperation } from '../src/integration/operation-registry.js';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

export function createFeishuCompositeOperationService({ readService, writeService }) {
  if (!readService?.execute || !writeService?.execute) throw new Error('复合接口服务缺少读写实现');
  return Object.freeze({
    async execute(operationId, input = {}) {
      const operation = getOperation(operationId);
      if (!operation) throw new FeishuProxyError('UNKNOWN_OPERATION', '接口不在受控操作清单中', 404);
      return operation.access === 'write' ? writeService.execute(operationId, input) : readService.execute(operationId, input);
    }
  });
}
