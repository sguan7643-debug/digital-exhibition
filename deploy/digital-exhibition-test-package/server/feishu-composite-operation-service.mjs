import { getOperation } from '../src/integration/operation-registry.js';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

function permissionAllows(permissions, operationId) {
  const values = new Set(Array.isArray(permissions) ? permissions.map(String) : []);
  return values.has('*')
    || values.has('admin.*')
    || values.has('operation:*:execute')
    || values.has(`operation:${operationId}:execute`);
}

export function createFeishuCompositeOperationService({ readService, writeService, browserWriteEnabled = false, businessWriteService }) {
  if (!readService?.execute || !writeService?.execute) throw new Error('复合接口服务缺少读写实现');
  return Object.freeze({
    getReadSyncStatus: (id, context) => readService.getReadSyncStatus(id, context),
    async execute(operationId, input = {}, requestContext = {}) {
      const operation = getOperation(operationId);
      if (!operation) throw new FeishuProxyError('UNKNOWN_OPERATION', '接口不在受控操作清单中', 404);
      if (operation.access !== 'write') {
        if (requestContext.freshRead) {
          const consistentRead = readService.executeRealtimeWithHandoff
            || readService.executeConsistent
            || readService.executeFresh
            || readService.execute;
          return consistentRead.call(readService, operationId, input, requestContext);
        }
        return readService.execute(operationId, input, requestContext);
      }
      if (!businessWriteService && !browserWriteEnabled) throw new FeishuProxyError('BROWSER_TEST_WRITE_DISABLED', '浏览器测试写入门禁未开启', 403);
      if (requestContext.sameOriginRequest !== true) throw new FeishuProxyError('WRITE_ORIGIN_DENIED', '写请求未通过同源校验', 403);
      if (!requestContext.identity?.userId && !requestContext.identity?.openId) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
      const permissionRead = typeof readService.executeConsistent === 'function'
        ? readService.executeConsistent.bind(readService)
        : readService.execute.bind(readService);
      const user = await permissionRead('COM-001', {}, requestContext);
      if (!permissionAllows(user?.data?.permissions, operationId)) {
        const code = operationId === 'APP-005' ? 'APPLICATION_REQUEST_PERMISSION_DENIED' : 'PERMISSION_DENIED';
        throw new FeishuProxyError(code, '当前用户缺少该写操作权限', 403);
      }
      if (!businessWriteService && writeService.requiresRequestGovernance?.(operationId)) {
        throw new FeishuProxyError('REQUEST_GOVERNANCE_REQUIRED', `${operationId} 必须通过正式请求治理链路执行`, 400);
      }
      const result = businessWriteService
        ? await businessWriteService.execute(operationId, input, requestContext)
        : await writeService.execute(operationId, input);
      if (typeof readService.invalidateTables === 'function' && result?.data?.tableName) {
        readService.invalidateTables([result.data.tableName]);
        await readService.flushPersistentCache?.({ discardOnFailure: true });
      }
      return result;
    }
  });
}
