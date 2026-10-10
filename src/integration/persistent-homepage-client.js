import { beginRequest, endRequest } from './request-status.js';
export function createPersistentHomepageClient({
  client,
  cache,
  freshMs = 30_000,
  maxStaleMs = 86_400_000,
  now = Date.now,
  pollMinMs: configuredPollMinMs = 100,
  pollMaxMs: configuredPollMaxMs = 5_000,
  syncTimeoutMs: configuredSyncTimeoutMs = 60_000
}) {
  const key = cache.key('homepage', {});
  let inFlight = null;
  const subscribers = new Set();
  const emit = event => subscribers.forEach(listener => { try { listener(event); } catch { /* isolated */ } });
  cache.subscribe?.(event => {
    if (event.record?.key === key) emit({ ...event, background: true });
  });

  const decorate = (result, record, status) => ({
    ...result,
    body: {
      ...result.body,
      ...(status === 'stale' ? { aggregateState: 'stale', dataStale: true, refreshing: true } : {}),
      browserCache: { status, updatedAt: new Date(record.updatedAt).toISOString() }
    }
  });

  const pollMinMs = Math.max(1, Number(configuredPollMinMs) || 100);
  const pollMaxMs = Math.max(pollMinMs, Number(configuredPollMaxMs) || 5_000);
  const syncTimeoutMs = Math.max(pollMaxMs, Number(configuredSyncTimeoutMs) || 60_000);
  const resolvePollDelay = value => Math.max(
    pollMinMs,
    Math.min(pollMaxMs, Number(value?.pollAfterMs) || Number(value?.retryAfterSeconds) * 1_000 || 2_000)
  );
  const waitForPoll = (delayMs, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new DOMException('请求已取消', 'AbortError'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.('abort', onAbort);
      reject(signal.reason || new DOMException('请求已取消', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener?.('abort', onAbort, { once: true });
  });

  async function refresh(options = {}, observedAt = 0, background = false) {
    if (inFlight) return inFlight;
    inFlight = cache.runExclusive(key, async () => {
      const latest = await cache.read(key);
      if (!options.forceRefresh && latest?.updatedAt > observedAt) return decorate(latest.value, latest, 'fresh');
      const token = background || options.silent ? null : beginRequest('正在加载首页数据');
      try {
      let result = await client.load({ ...options, forceRefresh: options.forceRefresh === true, silent: true });
      if (result.status === 200 && result.body.syncId && result.body.refreshing) {
        void completeSync(result, { silent: true }).then(async latestResult => {
          const record = await cache.write(key, latestResult, { operationIds: ['COM-001','COM-002','COM-005','WB-001','WB-002'] });
          emit({ origin: 'local', background: true, record });
        }).catch(() => {});
        return latest ? decorate(latest.value, latest, 'stale') : result;
      }
      result = await completeSync(result, options);
      if (result.status !== 200) return result;
      if (result.body?.dataStale === true) return latest ? decorate(latest.value, latest, 'stale') : result;
      const record = await cache.write(key, result, { operationIds: ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002'] });
      if (background) emit({ origin: 'local', background: true, record });
      return decorate(result, record, 'network');
      } finally { endRequest(token); }
    });
    try { return await inFlight; } finally { inFlight = null; }
  }

  async function completeSync(result, options = {}) {
      const deadline = Date.now() + syncTimeoutMs;
      let pollDelayMs = resolvePollDelay(result.body);
      while (result.body?.syncId && (result.status === 202 || result.body.refreshing)) {
        if (options.signal?.aborted) throw options.signal.reason;
        if (Date.now() >= deadline) throw Object.assign(new Error('首页同步超时'), { state: 'timeout', retryable: true });
        await waitForPoll(pollDelayMs, options.signal);
        if (options.signal?.aborted) throw options.signal.reason;
        let status;
        try {
          status = await client.status(result.body.syncId, options);
        } catch (error) {
          if (options.signal?.aborted) throw options.signal.reason || error;
          if (error?.retryable === false || Date.now() >= deadline) throw error;
          pollDelayMs = resolvePollDelay(error);
          continue;
        }
        if (status.state === 'completed' && status.result) { result = { status: 200, body: status.result }; break; }
        if (status.state === 'completed') {
          throw Object.assign(new Error('首页同步任务完成但缺少结果'), { state: 'schema-drift', retryable: false });
        }
        if (['queued', 'running'].includes(status.state)) {
          pollDelayMs = resolvePollDelay(status);
          continue;
        }
        if (['failed', 'expired'].includes(status.state)) {
          throw Object.assign(new Error(status.error?.message || status.errorCode || '首页同步失败'), {
            state: status.state === 'expired' ? 'timeout' : (status.error?.state || 'error'),
            retryable: false,
            code: status.error?.code || status.errorCode || 'HOMEPAGE_SYNC_FAILED'
          });
        }
      }
      return result;
  }

  async function load(options = {}) {
    if (options.forceRefresh) return refresh(options, 0, false);
    const record = await cache.read(key);
    const age = record ? now() - record.updatedAt : Infinity;
    if (record && age <= maxStaleMs) {
      if (age > freshMs) void refresh(options, record.updatedAt, true).catch(() => {});
      return decorate(record.value, record, age > freshMs ? 'stale' : 'fresh');
    }
    return refresh(options, record?.updatedAt || 0, false);
  }

  return Object.freeze({
    load,
    status: (...args) => client.status(...args),
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); }
  });
}
