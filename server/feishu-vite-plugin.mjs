import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
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
import { createFeishuFileAccessService, createFeishuFileNodeMiddleware } from './feishu-file-access-service.mjs';
import { createFeishuOAuthAuthorizedHandler, createFeishuOAuthWriteAcceptance } from './feishu-oauth-write-acceptance.mjs';
import { createFeishuApprovalService } from './feishu-approval-service.mjs';
import { createFeishuApprovalNodeMiddleware } from './feishu-approval-middleware.mjs';

export function feishuReadOnlyProxy(options = {}) {
  const contractPath = fileURLToPath(new URL('./contracts/feishu-base-identifiers.json', import.meta.url));
  const identifierContract = loadFeishuIdentifierContract(contractPath);
  const client = createFeishuOpenApiClient(options);
  const fileAccessService = createFeishuFileAccessService({ client });
  const readService = createFeishuReadOnlyService({ client, identifierContract, fileAccessService, allowedAppLaunchHosts: options.allowedAppLaunchHosts });
  const adminClient = createFeishuSchemaAdminClient(options);
  const safeRecordService = createFeishuSafeTestRecordService({ client: adminClient });
  const writeService = createFeishuWriteOperationService({ safeRecordService });
  const service = createFeishuCompositeOperationService({
    readService,
    writeService,
    browserWriteEnabled: options.browserWriteEnabled ?? process.env.FEISHU_BROWSER_TEST_WRITE_ENABLED === '1'
  });
  const oauthEvidencePath = options.oauthEvidencePath ?? process.env.FEISHU_OAUTH_EVIDENCE_PATH ?? '';
  const oauthWriteAcceptanceEnabled = options.oauthWriteAcceptanceEnabled ?? process.env.FEISHU_OAUTH_TEST_WRITE_ACCEPTANCE === '1';
  const oauthWriteAcceptance = createFeishuOAuthWriteAcceptance({ safeRecordService, compositeService: service });
  const authService = createFeishuUserAuthService({
    ...options,
    onAuthorized: createFeishuOAuthAuthorizedHandler({
      evidencePath: oauthEvidencePath,
      writeAcceptanceEnabled: oauthWriteAcceptanceEnabled,
      readService,
      writeAcceptance: oauthWriteAcceptance
    })
  });
  const authMiddleware = createFeishuAuthNodeMiddleware({ authService });
  const approvalRegistryFile = options.approvalRegistryFile ?? process.env.FEISHU_APPROVAL_REGISTRY_PATH ?? join(process.cwd(), '.local', 'feishu-approval-registry.json');
  const approvalService = createFeishuApprovalService({ client, registryFile: approvalRegistryFile });
  const approvalMiddleware = createFeishuApprovalNodeMiddleware({
    service: approvalService,
    resolveUserSession: request => authService.resolveSession(request.headers?.cookie || '')
  });
  const fileMiddleware = createFeishuFileNodeMiddleware({ fileAccessService, resolveIdentity: cookie => authService.resolveIdentity(cookie) });
  const middleware = createFeishuNodeMiddleware({
    service,
    resolveRequestContext: request => {
      const origin = String(request.headers?.origin || '');
      const host = String(request.headers?.host || '');
      let sameOriginRequest = false;
      try {
        const parsed = new URL(origin);
        sameOriginRequest = ['http:', 'https:'].includes(parsed.protocol) && parsed.host === host;
      } catch {
        sameOriginRequest = false;
      }
      return { identity: authService.resolveIdentity(request.headers?.cookie || ''), sameOriginRequest };
    }
  });
  const install = server => {
    server.middlewares.use(authMiddleware);
    server.middlewares.use(approvalMiddleware);
    server.middlewares.use(fileMiddleware);
    server.middlewares.use(middleware);
  };
  return {
    name: 'feishu-secure-operation-proxy',
    configureServer: install,
    configurePreviewServer: install
  };
}
