import { beginRequest, endRequest } from './request-status.js';
export function createPersistentHomepageClient({ client, cache, freshMs = 30_000, maxStaleMs = 86_400_000, now = Date.now }) {
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
      const deadline = Date.now() + 60_000;
      while (result.body?.syncId && (result.status === 202 || result.body.refreshing)) {
        if (options.signal?.aborted) throw options.signal.reason;
        if (Date.now() > deadline) throw new Error('首页同步超时');
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (options.signal?.aborted) throw options.signal.reason;
        const status = await client.status(result.body.syncId, options);
        if (status.state === 'completed' && status.result) { result = { status: 200, body: status.result }; break; }
        if (['failed', 'expired'].includes(status.state)) throw new Error(status.errorCode || '首页同步失败');
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
