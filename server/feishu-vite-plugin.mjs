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
import { createFeishuApprovedAppProjection } from './feishu-approved-app-projection.mjs';
import { createFeishuOnboardingPocOrchestrator } from './feishu-onboarding-poc-orchestrator.mjs';
import { createFeishuOnboardingFileService } from './feishu-onboarding-file-service.mjs';
import { createFeishuOnboardingService } from './feishu-onboarding-service.mjs';
import { createFeishuOnboardingNodeMiddleware } from './feishu-onboarding-middleware.mjs';
import { createOnboardingUniqueIdentifierClient } from './onboarding-unique-identifier-client.mjs';
import { createHomepageAggregateService } from './homepage-aggregate-service.mjs';
import { createHomepageAggregateNodeMiddleware } from './homepage-aggregate-middleware.mjs';

export function createFeishuMiddlewareStack(options = {}) {
  const contractPath = fileURLToPath(new URL('./contracts/feishu-base-identifiers.json', import.meta.url));
  const identifierContract = loadFeishuIdentifierContract(contractPath);
  const client = createFeishuOpenApiClient(options);
  const fileAccessService = createFeishuFileAccessService({ client });
  const readService = createFeishuReadOnlyService({
    client,
    identifierContract,
    fileAccessService,
    allowedAppLaunchHosts: options.allowedAppLaunchHosts,
    coldMissBudgetMs: options.coldMissBudgetMs ?? 1_500
  });
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
    storeFile: options.userAuthStoreFile ?? process.env.FEISHU_USER_AUTH_STORE_PATH ?? join(process.cwd(), '.local', 'feishu-user-auth-sessions.json'),
    onAuthorized: createFeishuOAuthAuthorizedHandler({
      evidencePath: oauthEvidencePath,
      writeAcceptanceEnabled: oauthWriteAcceptanceEnabled,
      readService,
      writeAcceptance: oauthWriteAcceptance
    })
  });
  const authMiddleware = createFeishuAuthNodeMiddleware({
    authService,
    defaultReturnTo: options.defaultAuthReturnTo ?? process.env.FEISHU_AUTH_DEFAULT_RETURN_TO ?? '/test2/'
  });
  const approvalRegistryFile = options.approvalRegistryFile ?? process.env.FEISHU_APPROVAL_REGISTRY_PATH ?? join(process.cwd(), '.local', 'feishu-approval-registry.json');
  const approvalAdminClient = createFeishuSchemaAdminClient({ ...options, recordWriteEnabled: true });
  const approvalRecordService = createFeishuSafeTestRecordService({ client: approvalAdminClient });
  const onboardingLedgerFile = options.onboardingLedgerFile ?? process.env.FEISHU_ONBOARDING_POC_LEDGER_PATH ?? join(process.cwd(), '.local', 'feishu-onboarding-poc-ledger.json');
  const onboardingOrchestrator = createFeishuOnboardingPocOrchestrator({
    adminClient: approvalAdminClient,
    identityClient: client,
    baseToken: options.baseToken ?? process.env.FEISHU_BASE_TOKEN ?? '',
    expectedFingerprint: options.pocBaseFingerprint ?? process.env.FEISHU_POC_BASE_FINGERPRINT ?? '',
    ledgerFile: onboardingLedgerFile
  });
  const approvalProjection = createFeishuApprovedAppProjection({ safeRecordService: approvalRecordService, orchestrator: onboardingOrchestrator });
  const approvalService = createFeishuApprovalService({
    client,
    registryFile: approvalRegistryFile,
    projectionService: approvalProjection,
    preWriteGate: input => onboardingOrchestrator.execute(input),
    onInstanceCreated: record => onboardingOrchestrator.appendLedger({ objectType: 'APPROVAL_INSTANCE', instanceId: record.instanceId, businessKey: record.businessKey, applicationId: record.applicationId, cleanupStrategy: 'RETAIN_APPROVAL_INSTANCE' }),
    onProjected: () => readService.invalidateAppProjection()
  });
  const approvalMiddleware = createFeishuApprovalNodeMiddleware({
    service: approvalService,
    resolveUserSession: request => authService.resolveSession(request.headers?.cookie || '')
  });
  const fileMiddleware = createFeishuFileNodeMiddleware({ fileAccessService, resolveIdentity: cookie => authService.resolveIdentity(cookie) });
  const onboardingFileService = createFeishuOnboardingFileService({ adminClient: approvalAdminClient, safeRecordService: approvalRecordService, orchestrator: onboardingOrchestrator });
  const onboardingUniqueIdentifierClient = createOnboardingUniqueIdentifierClient({
    baseUrl: options.uniqueIdentifierBackendUrl ?? process.env.FEISHU_UNIQUE_IDENTIFIER_BACKEND_URL ?? 'http://10.151.23.119:28080',
    fetchImpl: options.uniqueIdentifierFetch ?? globalThis.fetch
  });
  const onboardingService = createFeishuOnboardingService({
    approvalService,
    fileAccessService,
    onboardingFileService,
    uniqueIdentifierProvider: onboardingUniqueIdentifierClient,
    orchestrator: onboardingOrchestrator,
    registryFile: options.onboardingRegistryFile ?? process.env.FEISHU_ONBOARDING_REGISTRY_PATH ?? join(process.cwd(), '.local', 'feishu-onboarding-applications.json')
  });
  const onboardingMiddleware = createFeishuOnboardingNodeMiddleware({
    service: onboardingService,
    resolveUserSession: request => authService.resolveSession(request.headers?.cookie || '')
  });
  const resolveRequestContext = request => {
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
  };
  const homepageService = createHomepageAggregateService({
    readService,
    prewarm: options.prewarm,
    responseBudgetMs: options.homepageResponseBudgetMs
  });
  const homepageMiddleware = createHomepageAggregateNodeMiddleware({
    service: homepageService,
    resolveRequestContext
  });
  if (options.prewarm !== false) queueMicrotask(() => {
    homepageService.startPrewarm();
    onboardingOrchestrator.prewarm().catch(() => null);
  });
  const middleware = createFeishuNodeMiddleware({
    service,
    resolveRequestContext
  });
  const install = server => {
    server.middlewares.use(authMiddleware);
    server.middlewares.use(onboardingMiddleware);
    server.middlewares.use(approvalMiddleware);
    server.middlewares.use(fileMiddleware);
    server.middlewares.use(homepageMiddleware);
    server.middlewares.use(middleware);
  };
  return Object.freeze({
    middlewares: Object.freeze([authMiddleware, onboardingMiddleware, approvalMiddleware, fileMiddleware, homepageMiddleware, middleware]),
    install,
    authService,
    approvalService,
    onboardingService,
    onboardingOrchestrator,
    readService,
    homepageService
  });
}

export function feishuReadOnlyProxy(options = {}) {
  const stack = createFeishuMiddlewareStack(options);
  return {
    name: 'feishu-secure-operation-proxy',
    configureServer: stack.install,
    configurePreviewServer: stack.install
  };
}
