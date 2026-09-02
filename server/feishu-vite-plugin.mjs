import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from './feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from './feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from './feishu-read-only-service.mjs';
import { createFeishuNodeMiddleware } from './feishu-proxy-handler.mjs';
import { createFeishuSchemaAdminClient } from './feishu-schema-admin-client.mjs';
import { createFeishuSafeTestRecordService } from './feishu-safe-test-record-service.mjs';
import { createFeishuWriteOperationService } from './feishu-write-operation-service.mjs';
import { createFeishuCompositeOperationService } from './feishu-composite-operation-service.mjs';
import { createFeishuUserAuthService } from './feishu-user-auth-service.mjs';
import { createFeishuAuthNodeMiddleware } from './feishu-auth-middleware.mjs';

export function feishuReadOnlyProxy(options = {}) {
  const contractPath = fileURLToPath(new URL('./contracts/feishu-base-identifiers.json', import.meta.url));
  const identifierContract = loadFeishuIdentifierContract(contractPath);
  const client = createFeishuOpenApiClient(options);
  const readService = createFeishuReadOnlyService({ client, identifierContract });
  const adminClient = createFeishuSchemaAdminClient(options);
  const safeRecordService = createFeishuSafeTestRecordService({ client: adminClient });
  const writeService = createFeishuWriteOperationService({ safeRecordService });
  const service = createFeishuCompositeOperationService({ readService, writeService });
  const authService = createFeishuUserAuthService(options);
  const authMiddleware = createFeishuAuthNodeMiddleware({ authService });
  const middleware = createFeishuNodeMiddleware({
    service,
    resolveRequestContext: request => ({ identity: authService.resolveIdentity(request.headers?.cookie || '') })
  });
  const install = server => {
    server.middlewares.use(authMiddleware);
    server.middlewares.use(middleware);
  };
  return {
    name: 'feishu-secure-operation-proxy',
    configureServer: install,
    configurePreviewServer: install
  };
}
