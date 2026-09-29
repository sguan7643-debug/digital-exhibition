import { createHash, randomUUID } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function identityScope(requestContext = {}) {
  const identity = requestContext.identity || {};
  return {
    tenant: String(identity.tenantKey || identity.tenantId || 'default-tenant'),
    user: String(identity.adAccount || identity.userId || identity.openId || 'anonymous'),
    permissions: Array.isArray(identity.permissions) ? [...identity.permissions].map(String).sort() : []
  };
}

function safeError(error) {
  const upstreamStatus = Number(error?.status || 503);
  return {
    code: String(error?.code || 'HOMEPAGE_SYNC_FAILED'),
    message: error instanceof FeishuProxyError ? error.message : '首页数据同步失败',
    status: [401, 403].includes(upstreamStatus) ? upstreamStatus : 503,
    traceId: error?.traceId || null
  };
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
    isComplete: response?.isComplete !== false,
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
    errorCode: String(error?.code || 'HOMEPAGE_SECTION_FAILED')
  }];
}

export function resolveHomepageResponseBudgetMs(value) {
  const configured = Number(value ?? 25_000);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 29_000) : 25_000;
}

export function createHomepageAggregateService(options = {}) {
  const readService = options.readService;
  if (!readService?.peekOperation || !readService?.executeFresh) {
    throw new Error('首页聚合服务缺少可缓存读取能力');
  }
  const now = options.now || Date.now;
  const idFactory = options.idFactory || (() => `sync-${randomUUID()}`);
  const traceIdFactory = options.traceIdFactory || (() => `trace-${randomUUID()}`);
  const responseBudgetMs = resolveHomepageResponseBudgetMs(
    options.responseBudgetMs ?? process.env.HOMEPAGE_RESPONSE_BUDGET_MS
  );
  const taskRetentionMs = Number(options.taskRetentionMs ?? 120_000);
  const tasksByKey = new Map();
  const tasksById = new Map();
  let readiness = options.prewarm === false
    ? { state: 'ready', startedAt: null, completedAt: null, errorCode: null }
    : { state: 'warming', startedAt: null, completedAt: null, errorCode: null };
  let prewarmPromise = null;

  function ownerKey(requestContext) {
    return fingerprint(identityScope(requestContext));
  }

  function requireIdentity(requestContext) {
    const identity = requestContext?.identity || {};
    if (!identity.adAccount && !identity.userId && !identity.openId) {
      throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
    }
  }

  function taskKey(requestContext) {
    return fingerprint({
      owner: identityScope(requestContext),
      inputs: HOMEPAGE_OPERATION_INPUTS,
      contractVersion: 'homepage-aggregate.v1'
    });
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

  function startTask(requestContext, { forceRefresh = false } = {}) {
    cleanupTasks();
    const key = taskKey(requestContext);
    const existing = tasksByKey.get(key);
    if (existing && (existing.state === 'queued' || existing.state === 'running')) return existing;
    if (existing?.state === 'failed' && !forceRefresh && existing.finishedAt && now() - existing.finishedAt < taskRetentionMs) {
      return existing;
    }

    const task = {
      id: idFactory(),
      key,
      ownerKey: ownerKey(requestContext),
      state: 'queued',
      aggregateState: 'syncing',
      createdAt: now(),
      updatedAt: now(),
      finishedAt: null,
      expiredAt: null,
      traceId: traceIdFactory(),
      result: null,
      error: null,
      promise: null
    };
    tasksByKey.set(key, task);
    tasksById.set(task.id, task);
    task.promise = (async () => {
      task.state = 'running';
      task.updatedAt = now();
      const settled = await Promise.allSettled(HOMEPAGE_OPERATION_IDS.map(operationId => readService.executeFresh(
        operationId,
        HOMEPAGE_OPERATION_INPUTS[operationId],
        requestContext
      )));
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
      if (availableCount === 0 || authorizationFailure) {
        const effectiveFailure = authorizationFailure || firstFailure;
        task.error = safeError(effectiveFailure?.reason);
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
      task.error = safeError(error);
      task.state = 'failed';
      task.updatedAt = now();
      task.finishedAt = now();
      return null;
    });
    return task;
  }

  async function readHomepage(requestContext = {}, { forceRefresh = false } = {}) {
    requireIdentity(requestContext);
    cleanupTasks();
    const cached = cachedAggregate(requestContext);
    const cachedCount = Object.keys(cached.data).length;
    if (!forceRefresh && cachedCount === HOMEPAGE_OPERATION_IDS.length && cached.aggregateState === 'fresh') {
      return { status: 200, body: cached };
    }

    const task = startTask(requestContext, { forceRefresh });
    if (cachedCount > 0) {
      const failed = task.state === 'failed';
      const sections = Object.fromEntries(Object.entries(cached.sections).map(([operationId, section]) => [operationId,
        section.available ? section : { ...section, state: failed ? 'error' : 'syncing', refreshing: !failed, errorCode: task.error?.code || null }
      ]));
      return {
        status: 200,
        body: {
          ...cached,
          sections,
          refreshing: task.state === 'queued' || task.state === 'running',
          syncId: task.id,
          traceId: task.traceId
        }
      };
    }

    let timer;
    await Promise.race([
      task.promise,
      new Promise(resolve => { timer = setTimeout(resolve, responseBudgetMs); })
    ]).finally(() => clearTimeout(timer));

    if (task.state === 'failed' && [401, 403].includes(task.error?.status)) {
      const error = task.error;
      throw new FeishuProxyError(error.code, error.message, error.status, { traceId: task.traceId });
    }
    const refreshed = cachedAggregate(requestContext);
    if (Object.keys(refreshed.data).length > 0) {
      return {
        status: 200,
        body: {
          ...refreshed,
          refreshing: task.state === 'queued' || task.state === 'running',
          syncId: task.state === 'running' ? task.id : null,
          traceId: task.traceId
        }
      };
    }
    if (task.state === 'failed') {
      const error = task.error || { code: 'HOMEPAGE_SYNC_FAILED', message: '首页数据同步失败', status: 503 };
      throw new FeishuProxyError(error.code, error.message, error.status, { traceId: task.traceId });
    }
    return {
      status: 202,
      body: {
        code: 'HOMEPAGE_SYNCING',
        state: task.state,
        syncId: task.id,
        pollAfterMs: 2_000,
        traceId: task.traceId
      }
    };
  }

  function getSyncStatus(syncId, requestContext = {}) {
    requireIdentity(requestContext);
    cleanupTasks();
    const task = tasksById.get(String(syncId || ''));
    if (!task) throw new FeishuProxyError('SYNC_JOB_NOT_FOUND', '同步任务不存在或已过期', 404);
    if (task.ownerKey !== ownerKey(requestContext)) {
      throw new FeishuProxyError('SYNC_JOB_FORBIDDEN', '无权查看该同步任务', 403);
    }
    return {
      code: 'OK',
      syncId: task.id,
      state: task.state,
      aggregateState: task.aggregateState,
      retryable: task.state === 'failed',
      errorCode: task.error?.code || null,
      createdAt: new Date(task.createdAt).toISOString(),
      updatedAt: new Date(task.updatedAt).toISOString(),
      traceId: task.traceId
    };
  }

  function startPrewarm() {
    if (prewarmPromise) return prewarmPromise;
    readiness = { state: 'warming', startedAt: now(), completedAt: null, errorCode: null };
    prewarmPromise = Promise.resolve().then(() => Promise.all(['COM-005', 'WB-002'].map(operationId => (
      readService.executeFresh(operationId, HOMEPAGE_OPERATION_INPUTS[operationId], {})
    )))).then(() => {
      readiness = { state: 'ready', startedAt: readiness.startedAt, completedAt: now(), errorCode: null };
      return readiness;
    }).catch(error => {
      const publicContext = {};
      const publicReady = ['COM-005', 'WB-002'].every(operationId => readService.peekOperation(
        operationId,
        HOMEPAGE_OPERATION_INPUTS[operationId],
        publicContext
      ));
      readiness = {
        state: publicReady ? 'degraded' : 'failed',
        startedAt: readiness.startedAt,
        completedAt: now(),
        errorCode: String(error?.code || 'PREWARM_FAILED')
      };
      return readiness;
    });
    return prewarmPromise;
  }

  function getReadiness() {
    return { ...readiness, ready: readiness.state === 'ready' || readiness.state === 'degraded' };
  }

  return Object.freeze({ readHomepage, getSyncStatus, startPrewarm, getReadiness });
}
