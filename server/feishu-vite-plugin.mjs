import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadFeishuIdentifierContract } from './feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from './feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from './feishu-read-only-service.mjs';
import { loadFormalDictionaryBaseline } from './formal-dictionary-baseline.mjs';
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
import { createFeishuOnboardingApprovalNotifier } from './feishu-onboarding-approval-notifier.mjs';
import { createFeishuApprovalNodeMiddleware } from './feishu-approval-middleware.mjs';
import { createFeishuApprovedAppProjection } from './feishu-approved-app-projection.mjs';
import { createFeishuOnboardingPocOrchestrator } from './feishu-onboarding-poc-orchestrator.mjs';
import { createFeishuOnboardingFileService } from './feishu-onboarding-file-service.mjs';
import { createFeishuOnboardingService } from './feishu-onboarding-service.mjs';
import { createFeishuOnboardingReferenceResolver } from './feishu-onboarding-reference-resolver.mjs';
import { createFeishuOnboardingNodeMiddleware } from './feishu-onboarding-middleware.mjs';
import { createOnboardingUniqueIdentifierClient } from './onboarding-unique-identifier-client.mjs';
import { createHomepageAggregateService } from './homepage-aggregate-service.mjs';
import { createHomepageAggregateNodeMiddleware } from './homepage-aggregate-middleware.mjs';
import { isSameOriginRequest } from './same-origin-request.mjs';
import { createBusinessWriteGovernance } from './business-write-governance.mjs';
import { createBusinessCommandHandlers } from './business-command-handlers.mjs';
import { createPersistentReadCache, snapshotNamespace } from './feishu-persistent-read-cache.mjs';

export async function runFeishuStartupPrewarmSequence({ homepagePrewarm, onboardingPrewarm, shouldContinue = () => true }) {
  try {
    return await homepagePrewarm();
  } finally {
    if (shouldContinue()) {
      await Promise.resolve()
        .then(() => onboardingPrewarm())
        .catch(() => null);
    }
  }
}

function lifecycleError(code, message) {
  return Object.assign(new Error(message), { code });
}

export function createFeishuMiddlewareStack(options = {}) {
  const contractPath = fileURLToPath(new URL('./contracts/feishu-base-identifiers.json', import.meta.url));
  const identifierContract = loadFeishuIdentifierContract(contractPath);
  const client = createFeishuOpenApiClient(options);
  const fileAccessService = createFeishuFileAccessService({ client });
  const appId = options.appId ?? process.env.FEISHU_APP_ID ?? '';
  const appSecret = options.appSecret ?? process.env.FEISHU_APP_SECRET ?? '';
  const baseToken = options.baseToken ?? process.env.FEISHU_BASE_TOKEN ?? '';
  const formalDictionaryBaseline = options.formalDictionaryBaseline
    ?? loadFormalDictionaryBaseline(options.formalDictionaryBaselinePath);
  const cacheContractGeneration = 'deh-real-data-v3';
  const baselineGeneration = String(formalDictionaryBaseline?.sha256 || 'baseline-missing').trim().toLowerCase();
  const persistentCacheEnabled = options.persistentCacheEnabled
    ?? (process.env.FEISHU_RUNTIME_CACHE_ENABLED === '1' || (process.env.FEISHU_RUNTIME_CACHE_ENABLED !== '0' && process.platform !== 'win32'));
  const runtimeCacheDir = options.runtimeCacheDir ?? process.env.FEISHU_RUNTIME_CACHE_DIR ?? '/home/seaoil/pre-demo/runtime-cache/';
  const persistentCache = createPersistentReadCache({
    enabled: persistentCacheEnabled,
    directory: runtimeCacheDir,
    maxDiskBytes: Math.min(3 * 1024 * 1024 * 1024, Number(options.runtimeCacheMaxBytes ?? process.env.FEISHU_RUNTIME_CACHE_MAX_BYTES) || 3 * 1024 * 1024 * 1024),
    namespace: snapshotNamespace({ appId: `${appId}\u0000${cacheContractGeneration}\u0000${baselineGeneration}`, baseToken }),
    requiredOwner: options.runtimeCacheOwner ?? process.env.FEISHU_RUNTIME_CACHE_OWNER ?? (process.platform === 'win32' ? '' : 'seaoil-deh'),
    forbiddenValues: [appSecret, baseToken]
  });
  const memoryCacheMaxBytes = Math.min(
    256 * 1024 * 1024,
    Number(options.memoryCacheMaxBytes ?? process.env.FEISHU_MEMORY_CACHE_MAX_BYTES) || 256 * 1024 * 1024
  );
  const cacheEventLogger = options.cacheEventLogger || (event => {
    console.info('[deh-cache]', JSON.stringify(event));
  });
  const readService = createFeishuReadOnlyService({
    client,
    identifierContract,
    fileAccessService,
    allowedAppLaunchHosts: options.allowedAppLaunchHosts,
    coldMissBudgetMs: options.coldMissBudgetMs ?? 5_000,
    syncTaskTimeoutMs: Math.min(25_000, Number(options.syncTaskTimeoutMs ?? process.env.FEISHU_SYNC_TASK_TIMEOUT_MS) || 25_000),
    maxSyncConcurrency: Math.min(3, Number(options.maxSyncConcurrency ?? process.env.FEISHU_SYNC_MAX_CONCURRENCY) || 3),
    operationCacheMaxBytes: Math.max(1_024, Math.floor(memoryCacheMaxBytes / 2)),
    tableReadCacheMaxBytes: Math.max(1_024, Math.floor(memoryCacheMaxBytes / 2)),
    persistentCache,
    eventLogger: cacheEventLogger,
    formalDictionaryBaseline,
    formalDictionaryBaselineRequired: options.formalDictionaryBaselineRequired === true
  });
  const adminClient = createFeishuSchemaAdminClient(options);
  const safeRecordService = createFeishuSafeTestRecordService({ client: adminClient });
  const writeService = createFeishuWriteOperationService({ safeRecordService });
  const businessRecordService = createFeishuSafeTestRecordService({ client: createFeishuSchemaAdminClient({ ...options, recordWriteEnabled: true }), production: true });
  let approvalService = null;
  const commandHandlers = { ...createBusinessCommandHandlers(), ...(options.businessCommandHandlers || {}) };
  const businessApprovalResolver = options.businessApprovalResolver || ((instanceId, context, expectation) => {
    if (!approvalService?.resolveBusinessApproval) throw new Error('正式审批解析服务尚未初始化');
    return approvalService.resolveBusinessApproval(instanceId, context, expectation);
  });
  const businessWriteService = createBusinessWriteGovernance({
    writeService: createFeishuWriteOperationService({ safeRecordService: businessRecordService, commandHandlers }),
    recordService: businessRecordService,
    approvalResolver: businessApprovalResolver,
    ledgerFile: options.businessWriteLedgerFile || join(process.cwd(), '.local', 'business-write-ledger.json')
  });
  const service = createFeishuCompositeOperationService({
    readService,
    persistentCache,
    writeService,
    businessWriteService,
    browserWriteEnabled: options.browserWriteEnabled ?? process.env.FEISHU_BROWSER_TEST_WRITE_ENABLED === '1'
  });
  const oauthEvidencePath = options.oauthEvidencePath ?? process.env.FEISHU_OAUTH_EVIDENCE_PATH ?? '';
  const oauthWriteAcceptanceEnabled = options.oauthWriteAcceptanceEnabled ?? process.env.FEISHU_OAUTH_TEST_WRITE_ACCEPTANCE === '1';
  const oauthWriteAcceptance = createFeishuOAuthWriteAcceptance({ safeRecordService, compositeService: service });
  const oauthEvidenceHandler = createFeishuOAuthAuthorizedHandler({
    evidencePath: oauthEvidencePath,
    writeAcceptanceEnabled: oauthWriteAcceptanceEnabled,
    readService,
    writeAcceptance: oauthWriteAcceptance
  });
  const identityWarmups = new Map();
  const startIdentityWarmup = identity => {
    const principal = String(identity?.adAccount || identity?.userId || identity?.openId || '').trim();
    if (!principal) return Promise.resolve([]);
    const key = `${String(identity?.tenantKey || '')}\u0000${principal}`;
    const existing = identityWarmups.get(key);
    if (existing) return existing;
    const requestContext = { identity };
    const warmup = Promise.allSettled([
      readService.execute('COM-001', {}, requestContext),
      readService.execute('WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, requestContext),
      readService.execute('APP-001', {}, requestContext),
      readService.execute('APP-002', { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' }, requestContext),
      readService.execute('COM-004', { page: 1, pageSize: 100, sort: 'name,asc' }, requestContext)
    ]).finally(() => {
      if (identityWarmups.get(key) === warmup) identityWarmups.delete(key);
    });
    identityWarmups.set(key, warmup);
    warmup.catch(() => {});
    return warmup;
  };
  const authService = createFeishuUserAuthService({
    ...options,
    storeFile: options.userAuthStoreFile ?? process.env.FEISHU_USER_AUTH_STORE_PATH ?? join(process.cwd(), '.local', 'feishu-user-auth-sessions.json'),
    onAuthorized: identity => {
      void startIdentityWarmup(identity);
      return oauthEvidenceHandler(identity);
    }
  });
  const authMiddleware = createFeishuAuthNodeMiddleware({
    authService,
    resolveIdentityProfile: identity => readService.resolveCurrentUserProfile({ identity }),
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
  const approvalNotifier = createFeishuOnboardingApprovalNotifier({ client });
  approvalService = createFeishuApprovalService({
    client,
    registryFile: approvalRegistryFile,
    projectionService: approvalProjection,
    approvalNotifier,
    preWriteGate: input => onboardingOrchestrator.execute(input),
    onInstanceCreated: record => onboardingOrchestrator.appendLedger({ objectType: 'APPROVAL_INSTANCE', instanceId: record.instanceId, businessKey: record.businessKey, applicationId: record.applicationId, cleanupStrategy: 'RETAIN_APPROVAL_INSTANCE' }),
    onProjected: async () => {
      readService.invalidateAppProjection();
      await readService.flushPersistentCache?.({ discardOnFailure: true });
    }
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
  const onboardingReferenceResolver = createFeishuOnboardingReferenceResolver({ readService, client });
  const onboardingService = createFeishuOnboardingService({
    approvalService,
    fileAccessService,
    onboardingFileService,
    uniqueIdentifierProvider: onboardingUniqueIdentifierClient,
    referenceResolver: onboardingReferenceResolver,
    readService,
    orchestrator: onboardingOrchestrator,
    registryFile: options.onboardingRegistryFile ?? process.env.FEISHU_ONBOARDING_REGISTRY_PATH ?? join(process.cwd(), '.local', 'feishu-onboarding-applications.json')
  });
  const onboardingMiddleware = createFeishuOnboardingNodeMiddleware({
    service: onboardingService,
    resolveUserSession: request => authService.resolveSession(request.headers?.cookie || '')
  });
  const resolveRequestContext = request => {
      return {
        identity: authService.resolveIdentity(request.headers?.cookie || ''),
        sameOriginRequest: isSameOriginRequest(request.headers, request.method)
      };
  };
  const homepageService = createHomepageAggregateService({
    readService,
    prewarm: options.prewarm,
    requirePersistentCache: options.requirePersistentCache !== false,
    responseBudgetMs: options.homepageResponseBudgetMs,
    taskTimeoutMs: Math.min(25_000, Number(options.syncTaskTimeoutMs ?? process.env.FEISHU_SYNC_TASK_TIMEOUT_MS) || 25_000),
    eventLogger: cacheEventLogger
  });
  const homepageMiddleware = createHomepageAggregateNodeMiddleware({
    service: homepageService,
    resolveRequestContext
  });
  const prewarmEnabled = options.prewarm !== false;
  let prewarmPromise = null;
  let closePromise = null;
  let closed = false;
  const startupPrewarm = typeof options.startupPrewarm === 'function'
    ? options.startupPrewarm
    : () => runFeishuStartupPrewarmSequence({
        homepagePrewarm: async () => {
          const result = await homepageService.startPrewarm();
          for (const identity of authService.listAuthorizedIdentities?.() || []) {
            void startIdentityWarmup(identity);
          }
          return result;
        },
        onboardingPrewarm: () => onboardingOrchestrator.prewarm(),
        shouldContinue: () => !closed
      });
  const startPrewarm = () => {
    if (prewarmPromise) return prewarmPromise;
    if (closed) return Promise.reject(lifecycleError('MIDDLEWARE_STACK_CLOSED', '服务已关闭，不能启动预热'));
    prewarmPromise = prewarmEnabled
      ? Promise.resolve().then(() => startupPrewarm({ homepageService, onboardingOrchestrator, readService }))
      : Promise.resolve({ state: 'disabled' });
    return prewarmPromise;
  };
  const close = () => {
    if (closePromise) return closePromise;
    closed = true;
    closePromise = Promise.resolve().then(async () => {
      await readService.close?.();
      await prewarmPromise?.catch(() => null);
    });
    return closePromise;
  };
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
    homepageService,
    startPrewarm,
    close
  });
}

export function feishuReadOnlyProxy(options = {}) {
  let stack = null;
  const configuredServers = new WeakSet();
  const getStack = () => {
    if (!stack) stack = createFeishuMiddlewareStack(options);
    return stack;
  };
  const configure = server => {
    if (!server || configuredServers.has(server)) return;
    configuredServers.add(server);
    const currentStack = getStack();
    currentStack.install(server);
    const httpServer = server.httpServer;
    if (!httpServer) return;

    let closed = false;
    const startAfterListening = () => {
      if (closed) return;
      void currentStack.startPrewarm().catch(() => null);
    };
    const closeStack = () => {
      closed = true;
      httpServer.off('listening', startAfterListening);
      void currentStack.close().catch(() => null);
    };
    httpServer.once('close', closeStack);
    if (httpServer.listening) queueMicrotask(startAfterListening);
    else httpServer.once('listening', startAfterListening);
  };
  return {
    name: 'feishu-secure-operation-proxy',
    configureServer: configure,
    configurePreviewServer: configure
  };
}
