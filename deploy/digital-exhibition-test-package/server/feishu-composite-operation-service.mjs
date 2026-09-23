import { getOperation } from '../src/integration/operation-registry.js';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

function permissionAllows(permissions, operationId) {
  const values = new Set(Array.isArray(permissions) ? permissions.map(String) : []);
  return values.has('*')
    || values.has('admin.*')
    || values.has('operation:*:execute')
    || values.has(`operation:${operationId}:execute`);
}

export function createFeishuCompositeOperationService({ readService, writeService, browserWriteEnabled = false }) {
  if (!readService?.execute || !writeService?.execute) throw new Error('复合接口服务缺少读写实现');
  return Object.freeze({
    async execute(operationId, input = {}, requestContext = {}) {
      const operation = getOperation(operationId);
      if (!operation) throw new FeishuProxyError('UNKNOWN_OPERATION', '接口不在受控操作清单中', 404);
      if (operation.access !== 'write') return readService.execute(operationId, input, requestContext);
      if (!browserWriteEnabled) throw new FeishuProxyError('BROWSER_TEST_WRITE_DISABLED', '浏览器测试写入门禁未开启', 403);
      if (requestContext.sameOriginRequest !== true) throw new FeishuProxyError('WRITE_ORIGIN_DENIED', '写请求未通过同源校验', 403);
      if (!requestContext.identity?.userId && !requestContext.identity?.openId) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
      const user = await readService.execute('COM-001', {}, requestContext);
      if (!permissionAllows(user?.data?.permissions, operationId)) {
        throw new FeishuProxyError('PERMISSION_DENIED', '当前用户缺少该写操作权限', 403);
      }
      const result = await writeService.execute(operationId, input);
      if (typeof readService.invalidateTables === 'function' && result?.data?.tableName) {
        readService.invalidateTables([result.data.tableName]);
      }
      return result;
    }
  });
}
