import { randomUUID } from 'node:crypto';
import { setMaxListeners } from 'node:events';
import { FeishuProxyError } from './feishu-open-api-client.mjs';
import {
  createReadIsolationDescriptor,
  fingerprintReadIsolation,
  normalizeReadIdentity
} from './feishu-read-isolation-key.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

export const HOMEPAGE_OPERATION_INPUTS = Object.freeze({
  'COM-001': Object.freeze({}),
  'COM-002': Object.freeze({ platform: 'WEB' }),
  'COM-005': Object.freeze({
    dictTypes: Object.freeze(['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE']),
    includeDisabled: false
  }),
  'WB-001': Object.freeze({ hotLimit: 4, courseLimit: 3, noticeLimit: 4 }),
  'WB-002': Object.freeze({ page: 1, pageSize: 20, sort: 'RELEVANCE' })
});

export const HOMEPAGE_OPERATION_IDS = Object.freeze(Object.keys(HOMEPAGE_OPERATION_INPUTS));
const HOMEPAGE_OPERATION_CONTRACTS = createVerifiedReadOperationContracts();

function identityScope(requestContext = {}) {
  return normalizeReadIdentity(requestContext);
}

function rawIdentityScope(requestContext = {}) {
  const identity = requestContext.identity || {};
  return {
    tenant: String(identity.tenantKey || identity.tenantId || 'default-tenant'),
    identity: {
      userId: String(identity.userId || ''),
      openId: String(identity.openId || ''),
      adAccount: String(identity.adAccount || '')
    }
  };
}

function safeError(error, fallbackTraceId = null) {
  const upstreamStatus = Number(error?.status || 500);
  return {
    code: String(error?.code || 'HOMEPAGE_SYNC_FAILED'),
    message: error instanceof FeishuProxyError ? error.message : '首页数据同步失败',
    status: Number.isInteger(upstreamStatus) && upstreamStatus >= 400 && upstreamStatus <= 599 ? upstreamStatus : 500,
    retryable: false,
    ...(error?.operationId ? { operationId: String(error.operationId) } : {}),
    ...(error?.stage ? { stage: String(error.stage) } : {}),
    traceId: error?.traceId || fallbackTraceId || null
  };
}

function normalizeHomepageFailure(error, {
  operationId = '',
  stage = '',
  fallbackCode = 'HOMEPAGE_SYNC_FAILED',
  fallbackMessage = '首页数据同步失败'
} = {}) {
  const controlled = error instanceof FeishuProxyError;
  const upstreamStatus = Number(controlled ? error.status : 502);
  const status = Number.isInteger(upstreamStatus) && upstreamStatus >= 400 && upstreamStatus <= 599
    ? upstreamStatus
    : 502;
  return new FeishuProxyError(
    controlled && error.code ? String(error.code) : fallbackCode,
    controlled ? error.message : fallbackMessage,
    status,
    {
      ...(operationId || error?.operationId ? { operationId: String(error?.operationId || operationId) } : {}),
      ...(stage || error?.stage ? { stage: String(error?.stage || stage) } : {}),
      ...(error?.traceId ? { traceId: String(error.traceId) } : {})
    }
  );
}

function isTransientAuthorizationFailure(error) {
  const code = String(error?.code || '');
  const status = Number(error?.status || 0);
  if ([401, 403].includes(status)) return false;
  return status === 429
    || [
      'FEISHU_UPSTREAM_TIMEOUT',
      'FEISHU_UPSTREAM_UNAVAILABLE',
      'FEISHU_READ_BUDGET_EXCEEDED',
      'READ_SYNC_DEADLINE_EXCEEDED',
      'TENANT_TOKEN_FAILED',
      'UPSTREAM_INVALID_JSON',
      'HOMEPAGE_AUTHORIZATION_FAILED'
    ].includes(code)
    || (status >= 500 && /^(?:FEISHU_|TENANT_TOKEN_|UPSTREAM_)/.test(code));
}

function sectionFromResponse(response, stateOverride) {
  const state = stateOverride || (response?.dataStale === true ? 'stale' : 'fresh');
  return {
    state,
    available: true,
    data: response?.data,
    traceId: response?.traceId || null,
    sourceUpdatedAt: response?.sourceUpdatedAt || null,
    dataStale: state === 'stale',
    refreshing: response?.refreshing === true,
    isComplete: response?.isComplete === true,
    retryable: state === 'stale'
  };
}

function aggregateSections(sectionEntries, { refreshing = false, syncId = null, traceId = null } = {}) {
  const sections = Object.fromEntries(sectionEntries);
  const availableEntries = sectionEntries.filter(([, section]) => section?.available === true);
  const unavailableEntries = sectionEntries.filter(([, section]) => section?.available !== true);
  const data = Object.fromEntries(availableEntries.map(([operationId, section]) => [operationId, section.data]));
  const stale = availableEntries.some(([, section]) => section.dataStale === true);
  const aggregateState = unavailableEntries.length ? 'partial' : stale ? 'stale' : 'fresh';
  const sourceTimes = availableEntries.map(([, section]) => section.sourceUpdatedAt).filter(Boolean).sort();
  return {
    code: 'OK',
    aggregateState,
    data,
    sections,
    dataStale: stale,
    refreshing,
    syncId,
    sourceUpdatedAt: sourceTimes.at(-1) || null,
    traceId: traceId || availableEntries.map(([, section]) => section.traceId).find(Boolean) || null
  };
}

function pendingSection(operationId, error) {
  return [operationId, {
    state: error?.code === 'FEISHU_INITIAL_SYNCING' ? 'syncing' : 'error',
    available: false,
    traceId: error?.traceId || null,
    sourceUpdatedAt: null,
    dataStale: false,
    refreshing: error?.code === 'FEISHU_INITIAL_SYNCING',
    isComplete: false,
    retryable: error?.status !== 401 && error?.status !== 403,
    errorCode: String(error?.code || 'HOMEPAGE_SECTION_FAILED'),
    operationId
  }];
}

export function resolveHomepageResponseBudgetMs(value) {
  const configured = Number(value ?? 5_000);
  if (!Number.isFinite(configured) || configured <= 0) return 4_500;
  return configured >= 1_000 ? Math.min(configured, 4_500) : configured;
}

function createAggregateAbortController() {
  const controller = new AbortController();
  setMaxListeners(0, controller.signal);
  return controller;
}

export function createHomepageAggregateService(options = {}) {
  const readService = options.readService;
  if (!readService?.peekOperation || !readService?.executeFresh) {
    throw new Error('首页聚合服务缺少可缓存读取能力');
  }
  const executeBackground = typeof readService.executeBackground === 'function'
    ? readService.executeBackground.bind(readService)
    : readService.executeFresh.bind(readService);
  const now = options.now || Date.now;
  const idFactory = options.idFactory || (() => `sync-${randomUUID()}`);
  const traceIdFactory = options.traceIdFactory || (() => `trace-${randomUUID()}`);
  const responseBudgetMs = resolveHomepageResponseBudgetMs(
    options.responseBudgetMs ?? process.env.HOMEPAGE_RESPONSE_BUDGET_MS
  );
  const requirePersistentCache = options.requirePersistentCache === true;
  const taskRetentionMs = Math.max(600_000, Number(options.taskRetentionMs ?? 600_000) || 600_000);
  const taskTimeoutMs = Math.max(1, Math.min(25_000, Number(options.taskTimeoutMs ?? 25_000) || 25_000));
  const tasksByKey = new Map();
  const tasksById = new Map();
  let readiness = options.prewarm === false
    ? { state: 'ready', startedAt: null, completedAt: null, errorCode: null }
    : { state: 'warming', startedAt: null, completedAt: null, errorCode: null };
  let prewarmPromise = null;

  function ownerKey(requestContext) {
    return fingerprintReadIsolation(identityScope(requestContext));
  }

  function rawOwnerKey(requestContext) {
    return fingerprintReadIsolation(rawIdentityScope(requestContext));
  }

  function provisionalTaskKey(requestContext) {
    return `provisional:${fingerprintReadIsolation({ owner: rawIdentityScope(requestContext), inputs: HOMEPAGE_OPERATION_INPUTS })}`;
  }

  function requireIdentity(requestContext) {
    const identity = requestContext?.identity || {};
    if (!identity.adAccount && !identity.userId && !identity.openId) {
      throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
    }
  }

  function taskKey(requestContext) {
    return fingerprintReadIsolation({
      operations: HOMEPAGE_OPERATION_IDS.map(operationId => createReadIsolationDescriptor(
        operationId,
        HOMEPAGE_OPERATION_INPUTS[operationId],
        requestContext
      )),
      contractVersion: 'homepage-aggregate.v1'
    });
  }

  async function authorizeRequestContext(requestContext) {
    try {
      requireIdentity(requestContext);
      if (typeof readService.authorizeRequestContext === 'function') {
        return await readService.authorizeRequestContext(requestContext);
      }
      return requestContext;
    } catch (error) {
      throw normalizeHomepageFailure(error, {
        stage: 'authorization',
        fallbackCode: 'HOMEPAGE_AUTHORIZATION_FAILED',
        fallbackMessage: '首页实时权限校验失败'
      });
    }
  }

  async function executeHomepageOperation(operationId, requestContext) {
    try {
      const response = await executeBackground(operationId, HOMEPAGE_OPERATION_INPUTS[operationId], requestContext);
      if (!response || response.code !== 'OK' || response.isComplete !== true) {
        throw new FeishuProxyError('HOMEPAGE_SECTION_INCOMPLETE', '首页子操作未返回完整成功数据', 502, { operationId });
      }
      try {
        validateContractSchema(response, HOMEPAGE_OPERATION_CONTRACTS[operationId]?.successSchema, `${operationId} success`);
      } catch (error) {
        throw new FeishuProxyError('READ_SUCCESS_SCHEMA_INVALID', '首页子操作未通过成功数据合同校验', 502, {
          operationId,
          schemaError: String(error?.message || error)
        });
      }
      return response;
    } catch (error) {
      throw normalizeHomepageFailure(error, {
        operationId,
        stage: 'operation',
        fallbackCode: 'HOMEPAGE_SECTION_FAILED',
        fallbackMessage: '首页子操作同步失败'
      });
    }
  }

  function cleanupTasks() {
    const timestamp = now();
    for (const [id, task] of tasksById) {
      if (!task.finishedAt || timestamp - task.finishedAt < taskRetentionMs) continue;
      if (task.state !== 'expired') {
        task.state = 'expired';
        task.updatedAt = timestamp;
        task.expiredAt = timestamp;
        if (tasksByKey.get(task.key) === task) tasksByKey.delete(task.key);
        continue;
      }
      if (timestamp - task.expiredAt < taskRetentionMs) continue;
      tasksById.delete(id);
      if (tasksByKey.get(task.key) === task) tasksByKey.delete(task.key);
    }
  }

  function cachedAggregate(requestContext) {
    const entries = HOMEPAGE_OPERATION_IDS.map(operationId => {
      const response = readService.peekOperation(operationId, HOMEPAGE_OPERATION_INPUTS[operationId], requestContext);
      return response ? [operationId, sectionFromResponse(response)] : [operationId, {
        state: 'syncing', available: false, traceId: null, sourceUpdatedAt: null,
        dataStale: false, refreshing: false, isComplete: false, retryable: true
      }];
    });
    return aggregateSections(entries);
  }

  function startTask(requestContext, { forceRefresh = false, deadlineAt, controller } = {}) {
    cleanupTasks();
    const key = taskKey(requestContext);
    const existing = tasksByKey.get(key);
    if (existing && (existing.state === 'queued' || existing.state === 'running')) return existing;
    if (existing?.state === 'failed' && !forceRefresh && existing.finishedAt && now() - existing.finishedAt < taskRetentionMs) {
      return existing;
    }

    const canonicalOwnerKey = ownerKey(requestContext);
    const provisionalKey = provisionalTaskKey(requestContext);
    const provisional = tasksByKey.get(provisionalKey);
    const reusableProvisional = provisional
      && (provisional.state === 'queued' || provisional.state === 'running')
      && (!provisional.authorizationKey || provisional.authorizationKey === canonicalOwnerKey)
      ? provisional
      : null;
    const taskController = reusableProvisional?.controller || controller || createAggregateAbortController();
    const effectiveDeadlineAt = Math.min(
      Number.isFinite(Number(reusableProvisional?.deadlineAt)) ? Number(reusableProvisional.deadlineAt) : Number.POSITIVE_INFINITY,
      Number.isFinite(Number(deadlineAt)) ? Number(deadlineAt) : Number.POSITIVE_INFINITY,
      now() + taskTimeoutMs
    );
    requestContext.syncDeadlineAtMs = effectiveDeadlineAt;
    requestContext.syncAbortSignal = taskController.signal;
    const task = {
      id: reusableProvisional?.id || idFactory(),
      key,
      ownerKey: canonicalOwnerKey,
      rawOwnerKey: rawOwnerKey(requestContext),
      authorizationKey: canonicalOwnerKey,
      state: 'queued',
      aggregateState: 'syncing',
      createdAt: reusableProvisional?.createdAt || now(),
      updatedAt: now(),
      finishedAt: null,
      expiredAt: null,
      traceId: reusableProvisional?.traceId || traceIdFactory(),
      controller: taskController,
      deadlineAt: effectiveDeadlineAt,
      result: null,
      error: null,
      promise: null
    };
    tasksByKey.set(key, task);
    if (reusableProvisional) tasksByKey.set(provisionalKey, task);
    tasksById.set(task.id, task);
    task.promise = (async () => {
      task.state = 'running';
      task.updatedAt = now();
      let deadlineTimer;
      const executeBatch = () => Promise.allSettled(HOMEPAGE_OPERATION_IDS.map(operationId => executeHomepageOperation(
        operationId,
        requestContext
      )));
      const execution = typeof readService.runWithSharedReadBatch === 'function'
        ? readService.runWithSharedReadBatch(executeBatch)
        : executeBatch();
      const deadline = new Promise((_, reject) => {
        deadlineTimer = setTimeout(() => {
          const error = new FeishuProxyError('READ_SYNC_DEADLINE_EXCEEDED', '数据同步超时', 504);
          taskController.abort(error);
          reject(error);
        }, Math.max(0, effectiveDeadlineAt - now()));
      });
      const settled = await Promise.race([execution, deadline]).finally(() => clearTimeout(deadlineTimer));
      const entries = settled.map((result, index) => {
        const operationId = HOMEPAGE_OPERATION_IDS[index];
        return result.status === 'fulfilled'
          ? [operationId, sectionFromResponse(result.value, 'fresh')]
          : pendingSection(operationId, result.reason);
      });
      const result = aggregateSections(entries, { traceId: task.traceId });
      const availableCount = Object.keys(result.data).length;
      const firstFailure = settled.find(item => item.status === 'rejected');
      const authorizationFailure = settled.find(item => item.status === 'rejected' && [401, 403].includes(item.reason?.status));
      if (availableCount !== HOMEPAGE_OPERATION_IDS.length || authorizationFailure) {
        const effectiveFailure = authorizationFailure || firstFailure;
        task.error = safeError(effectiveFailure?.reason || new FeishuProxyError(
          'HOMEPAGE_INCOMPLETE',
          '首页完整数据尚未取得',
          502
        ), task.traceId);
        task.state = 'failed';
      } else {
        task.result = result;
        task.aggregateState = result.aggregateState;
        task.state = 'completed';
      }
      task.updatedAt = now();
      task.finishedAt = now();
      return task.result;
    })().catch(error => {
      task.error = safeError(error, task.traceId);
      task.state = 'failed';
      task.updatedAt = now();
      task.finishedAt = now();
      return null;
    });
    return task;
  }

  function startProvisionalTask(requestContext, completion, authorizedContextProvider, { deadlineAt, controller } = {}) {
    cleanupTasks();
    // Concurrent requests for one raw identity share the same in-flight real-time
    // authorization, so this provisional alias can safely converge on one handle.
    const key = provisionalTaskKey(requestContext);
    const existing = tasksByKey.get(key);
    if (existing && (existing.state === 'queued' || existing.state === 'running')) {
      completion.catch(() => {});
      return existing;
    }
    const taskController = controller || createAggregateAbortController();
    const effectiveDeadlineAt = Math.min(
      Number.isFinite(Number(deadlineAt)) ? Number(deadlineAt) : Number.POSITIVE_INFINITY,
      now() + taskTimeoutMs
    );
    const task = {
      id: idFactory(),
      key,
      provisional: true,
      ownerKey: rawOwnerKey(requestContext),
      rawOwnerKey: rawOwnerKey(requestContext),
      authorizationKey: null,
      state: 'running',
      aggregateState: 'syncing',
      createdAt: now(),
      updatedAt: now(),
      finishedAt: null,
      expiredAt: null,
      traceId: traceIdFactory(),
      controller: taskController,
      deadlineAt: effectiveDeadlineAt,
      result: null,
      error: null,
      promise: null
    };
    tasksByKey.set(key, task);
    tasksById.set(task.id, task);
    let deadlineTimer;
    const deadline = new Promise((_, reject) => {
      deadlineTimer = setTimeout(() => {
        const error = new FeishuProxyError('READ_SYNC_DEADLINE_EXCEEDED', '数据同步超时', 504);
        taskController.abort(error);
        reject(error);
      }, Math.max(0, effectiveDeadlineAt - now()));
    });
    task.promise = Promise.race([completion, deadline]).then(response => {
      const authorizedContext = authorizedContextProvider?.();
      if (authorizedContext) task.authorizationKey = ownerKey(authorizedContext);
      if (response?.status === 202 && response.body?.syncId) {
        const canonicalTask = tasksById.get(String(response.body.syncId));
        if (canonicalTask) {
          task.result = canonicalTask.result;
          task.error = canonicalTask.error;
          task.aggregateState = canonicalTask.aggregateState;
          task.state = canonicalTask.state === 'queued' ? 'running' : canonicalTask.state;
          task.updatedAt = now();
          task.finishedAt = canonicalTask.finishedAt || now();
          return task.result;
        }
      }
      if (!response || response.status !== 200 || Object.keys(response.body?.data || {}).length !== HOMEPAGE_OPERATION_IDS.length) {
        throw new FeishuProxyError('HOMEPAGE_INCOMPLETE', '首页完整数据尚未取得', 502);
      }
      task.result = response.body;
      task.aggregateState = response.body.aggregateState || 'fresh';
      task.state = 'completed';
      task.updatedAt = now();
      task.finishedAt = now();
      return task.result;
    }).catch(error => {
      const authorizedContext = authorizedContextProvider?.();
      if (authorizedContext) task.authorizationKey = ownerKey(authorizedContext);
      task.error = safeError(error, task.traceId);
      task.state = 'failed';
      task.updatedAt = now();
      task.finishedAt = now();
      return null;
    }).finally(() => clearTimeout(deadlineTimer));
    return task;
  }

  async function readHomepage(requestContext = {}, { forceRefresh = false } = {}) {
    const current = now();
    const suppliedStartedAt = Number(requestContext.requestReceivedAtMs);
    const startedAt = Number.isFinite(suppliedStartedAt) && suppliedStartedAt >= 0 && suppliedStartedAt <= current + 1_000
      ? suppliedStartedAt
      : current;
    const taskDeadlineAt = startedAt + taskTimeoutMs;
    const controller = createAggregateAbortController();
    const controlledContext = {
      ...requestContext,
      syncDeadlineAtMs: taskDeadlineAt,
      syncAbortSignal: controller.signal
    };
    let authorizedContext = null;
    let task = null;
    const completion = (async () => {
      authorizedContext = await authorizeRequestContext(controlledContext);
      cleanupTasks();
      const cached = cachedAggregate(authorizedContext);
      const cachedCount = Object.keys(cached.data).length;
      if (!forceRefresh && cachedCount === HOMEPAGE_OPERATION_IDS.length && cached.aggregateState === 'fresh') {
        return { status: 200, body: cached };
      }

      task = startTask(authorizedContext, { forceRefresh, deadlineAt: taskDeadlineAt, controller });
      if (cachedCount === HOMEPAGE_OPERATION_IDS.length) {
        const failed = task.state === 'failed';
        return {
          status: 200,
          body: {
            ...cached,
            refreshing: !failed && (task.state === 'queued' || task.state === 'running'),
            syncId: task.id,
            traceId: task.traceId
          }
        };
      }

      await task.promise;
      if (task.state === 'completed' && task.result
          && Object.keys(task.result.data || {}).length === HOMEPAGE_OPERATION_IDS.length) {
        return { status: 200, body: task.result };
      }
      return {
        status: 202,
        body: {
          code: 'HOMEPAGE_SYNCING',
          message: '请求处理中',
          state: task.state,
          syncId: task.id,
          pollAfterMs: 2_000,
          traceId: task.traceId
        }
      };
    })();

    const remaining = Math.max(0, startedAt + responseBudgetMs - now());
    let responseTimer;
    const outcome = await Promise.race([
      completion.then(response => ({ completed: true, response })),
      new Promise(resolve => { responseTimer = setTimeout(() => resolve({ completed: false }), remaining); })
    ]).finally(() => clearTimeout(responseTimer));
    if (outcome.completed) return outcome.response;

    const handoffTask = task || startProvisionalTask(
      requestContext,
      completion,
      () => authorizedContext,
      { deadlineAt: taskDeadlineAt, controller }
    );
    return {
      status: 202,
      body: {
        code: 'HOMEPAGE_SYNCING',
        message: '请求处理中',
        state: handoffTask.state,
        syncId: handoffTask.id,
        pollAfterMs: 2_000,
        traceId: handoffTask.traceId
      }
    };
  }

  async function getSyncStatus(syncId, requestContext = {}) {
    requireIdentity(requestContext);
    cleanupTasks();
    const task = tasksById.get(String(syncId || ''));
    if (!task) throw new FeishuProxyError('SYNC_JOB_NOT_FOUND', '同步任务不存在或已过期', 404);
    const currentRawOwnerKey = rawOwnerKey(requestContext);
    if ((task.rawOwnerKey || (task.provisional ? task.ownerKey : '')) !== currentRawOwnerKey) {
      throw new FeishuProxyError('SYNC_JOB_FORBIDDEN', '无权查看该同步任务', 403);
    }
    let statusAuthorization;
    if (typeof readService.authorizeTaskStatus === 'function') {
      statusAuthorization = await readService.authorizeTaskStatus('', requestContext);
    } else {
      try {
        statusAuthorization = { context: await authorizeRequestContext(requestContext), deferred: false };
      } catch (error) {
        if (!isTransientAuthorizationFailure(error)) throw error;
        statusAuthorization = { context: null, deferred: true };
      }
    }
    if (!statusAuthorization.deferred) {
      const currentOwnerKey = ownerKey(statusAuthorization.context);
      if (task.authorizationKey && task.authorizationKey !== currentOwnerKey) {
        throw new FeishuProxyError('SYNC_JOB_FORBIDDEN', '当前权限或数据范围已变化，不能查看该同步任务', 403);
      }
    }
    const actualState = task.state === 'queued' ? 'running' : task.state;
    const authorizationPending = statusAuthorization.deferred && actualState !== 'running';
    const state = authorizationPending ? 'running' : actualState;
    return {
      code: 'OK',
      syncId: task.id,
      state,
      aggregateState: authorizationPending ? 'syncing' : task.aggregateState,
      errorCode: state === 'failed' ? task.error?.code || null : null,
      createdAt: new Date(task.createdAt).toISOString(),
      updatedAt: new Date(task.updatedAt).toISOString(),
      traceId: task.traceId,
      ...(state === 'running' ? { pollAfterMs: 2_000 } : {}),
      ...(state === 'failed' && task.error ? { error: { ...task.error, retryable: false } } : {}),
      ...(state === 'completed' && task.result ? { result: task.result } : {})
    };
  }

  function startPrewarm() {
    if (prewarmPromise) return prewarmPromise;
    readiness = { state: 'warming', startedAt: now(), completedAt: null, errorCode: null };
    prewarmPromise = Promise.resolve().then(() => typeof readService.prewarm === 'function'
      ? readService.prewarm()
      : Promise.all(['COM-005', 'WB-002'].map(operationId => (
          executeBackground(operationId, HOMEPAGE_OPERATION_INPUTS[operationId], {})
        )))).then(async () => {
      if (requirePersistentCache && typeof readService.checkPersistentCacheHealth === 'function') {
        const persistentHealth = await readService.checkPersistentCacheHealth();
        if (!persistentHealth?.enabled) {
          throw new FeishuProxyError('CACHE_PERSISTENCE_REQUIRED', '服务器持久快照缓存未启用', 503);
        }
      }
      if (typeof readService.getStartupCacheState === 'function') {
        const startup = await readService.getStartupCacheState();
        if (!startup?.completed || Number(startup.usableEntries || 0) < 1) {
          throw new FeishuProxyError('CACHE_STARTUP_HIT_FAILED', '服务器缓存恢复后无法实际命中', 503);
        }
      }
      readiness = { state: 'ready', startedAt: readiness.startedAt, completedAt: now(), errorCode: null };
      return readiness;
    }).catch(error => {
      readiness = {
        state: 'failed',
        startedAt: readiness.startedAt,
        completedAt: now(),
        errorCode: String(error?.code || 'PREWARM_FAILED')
      };
      return readiness;
    });
    return prewarmPromise;
  }

  async function getReadiness() {
    const current = { ...readiness };
    if (current.state === 'ready' && typeof readService.checkPersistentCacheHealth === 'function') {
      try {
        const persistentHealth = await readService.checkPersistentCacheHealth();
        if ((requirePersistentCache && !persistentHealth?.enabled)
            || (persistentHealth?.enabled && (persistentHealth.healthy === false || persistentHealth.lastError || persistentHealth.writeSuspended))) {
          return {
            ...current,
            state: 'failed',
            ready: false,
            errorCode: persistentHealth?.enabled ? 'CACHE_RUNTIME_UNAVAILABLE' : 'CACHE_PERSISTENCE_REQUIRED',
            cacheError: String(persistentHealth?.lastError || (persistentHealth?.enabled ? 'CACHE_WRITES_SUSPENDED' : 'CACHE_DISABLED'))
          };
        }
      } catch (error) {
        return {
          ...current,
          state: 'failed',
          ready: false,
          errorCode: 'CACHE_RUNTIME_UNAVAILABLE',
          cacheError: String(error?.code || error?.message || 'CACHE_HEALTH_CHECK_FAILED')
        };
      }
    }
    return { ...current, ready: current.state === 'ready' };
  }

  return Object.freeze({ readHomepage, getSyncStatus, startPrewarm, getReadiness });
}
