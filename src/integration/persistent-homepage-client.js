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
      if (latest?.updatedAt > observedAt) return decorate(latest.value, latest, 'fresh');
      const result = await client.load({ ...options, forceRefresh: true, silent: background || options.silent });
      if (result.status !== 200) return result;
      const record = await cache.write(key, result, { operationIds: ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002'] });
      if (background) emit({ origin: 'local', background: true, record });
      return decorate(result, record, 'network');
    });
    try { return await inFlight; } finally { inFlight = null; }
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

