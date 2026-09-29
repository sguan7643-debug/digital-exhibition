function decorate(value, record, status) {
  return {
    ...value,
    browserCache: { status, updatedAt: new Date(record.updatedAt).toISOString() }
  };
}

export function createPersistentReadClient(options = {}) {
  const client = options.client;
  const cache = options.cache;
  const isCacheableOperation = options.isCacheableOperation || (() => false);
  const freshMs = Number(options.freshMs) || 30_000;
  const maxStaleMs = Number(options.maxStaleMs) || 86_400_000;
  const now = options.now || Date.now;
  const inFlight = new Map();
  const subscribers = new Set();
  const emit = event => subscribers.forEach(listener => { try { listener(event); } catch { /* isolated */ } });

  cache.subscribe?.(event => emit({ ...event, background: true }));
  const operationKey = (operationId, input) => cache.key('operation', { operationId, input: input || {} });

  async function fetchOne(operationId, input, requestOptions, observedAt = 0, background = false) {
    const key = operationKey(operationId, input);
    if (inFlight.has(key)) return inFlight.get(key);
    const pending = cache.runExclusive(key, async () => {
      const latest = await cache.read(key);
      if (latest?.updatedAt > observedAt) return decorate(latest.value, latest, 'fresh');
      const value = await client.execute(operationId, input, { ...requestOptions, silent: background || requestOptions?.silent });
      const record = await cache.write(key, value, { operationIds: [operationId] });
      if (background) emit({ origin: 'local', background: true, record });
      return decorate(value, record, 'network');
    });
    inFlight.set(key, pending);
    try { return await pending; } finally { if (inFlight.get(key) === pending) inFlight.delete(key); }
  }

  async function execute(operationId, input = {}, requestOptions = {}) {
    if (!isCacheableOperation(operationId) || requestOptions.forceRefresh) {
      return client.execute(operationId, input, requestOptions);
    }
    const key = operationKey(operationId, input);
    const record = await cache.read(key);
    const age = record ? now() - record.updatedAt : Infinity;
    if (record && age <= maxStaleMs) {
      if (age > freshMs) void fetchOne(operationId, input, requestOptions, record.updatedAt, true).catch(() => {});
      return decorate(record.value, record, age > freshMs ? 'stale' : 'fresh');
    }
    return fetchOne(operationId, input, requestOptions, record?.updatedAt || 0, false);
  }

  async function fetchBatch(requests, requestOptions = {}, observed = new Map(), background = false) {
    const batchKey = cache.key('batch', requests.map(request => operationKey(request.operationId, request.input)).sort());
    if (inFlight.has(batchKey)) return inFlight.get(batchKey);
    const pending = cache.runExclusive(batchKey, async () => {
      const unresolved = [];
      const resolved = new Map();
      for (const request of requests) {
        const key = operationKey(request.operationId, request.input);
        const latest = await cache.read(key);
        if (latest?.updatedAt > (observed.get(key) || 0)) resolved.set(key, { status: 'fulfilled', value: decorate(latest.value, latest, 'fresh') });
        else unresolved.push(request);
      }
      if (unresolved.length) {
        const results = typeof client.executeBatch === 'function'
          ? await client.executeBatch(unresolved, { ...requestOptions, silent: background || requestOptions.silent })
          : await Promise.all(unresolved.map(async request => {
              try { return { status: 'fulfilled', value: await client.execute(request.operationId, request.input, { ...requestOptions, silent: background || requestOptions.silent }) }; }
              catch (reason) { return { status: 'rejected', reason }; }
            }));
        for (let index = 0; index < unresolved.length; index += 1) {
          const request = unresolved[index];
          const result = results[index];
          const key = operationKey(request.operationId, request.input);
          if (result.status === 'fulfilled') {
            const record = await cache.write(key, result.value, { operationIds: [request.operationId] });
            resolved.set(key, { status: 'fulfilled', value: decorate(result.value, record, 'network') });
            if (background) emit({ origin: 'local', background: true, record });
          } else resolved.set(key, result);
        }
      }
      return requests.map(request => resolved.get(operationKey(request.operationId, request.input)));
    });
    inFlight.set(batchKey, pending);
    try { return await pending; } finally { if (inFlight.get(batchKey) === pending) inFlight.delete(batchKey); }
  }

  async function executeBatch(requests = [], requestOptions = {}) {
    const results = new Array(requests.length);
    const misses = [];
    const stale = [];
    const observed = new Map();
    for (let index = 0; index < requests.length; index += 1) {
      const request = requests[index];
      if (!isCacheableOperation(request.operationId) || requestOptions.forceRefresh) { misses.push({ ...request, index }); continue; }
      const key = operationKey(request.operationId, request.input);
      const record = await cache.read(key);
      const age = record ? now() - record.updatedAt : Infinity;
      if (record && age <= maxStaleMs) {
        results[index] = { status: 'fulfilled', value: decorate(record.value, record, age > freshMs ? 'stale' : 'fresh') };
        if (age > freshMs) { stale.push(request); observed.set(key, record.updatedAt); }
      } else { misses.push({ ...request, index }); observed.set(key, record?.updatedAt || 0); }
    }
    if (stale.length) void fetchBatch(stale, requestOptions, observed, true).catch(() => {});
    if (misses.length) {
      const fetched = await fetchBatch(misses, requestOptions, observed, false);
      misses.forEach((request, index) => { results[request.index] = fetched[index]; });
    }
    return results;
  }

  return Object.freeze({
    execute, executeBatch,
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); }
  });
}

