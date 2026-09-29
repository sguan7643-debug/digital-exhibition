const DB_VERSION = 1;
const STORE_NAME = 'responses';

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function shortHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function createIndexedDbStorage(indexedDb, dbName) {
  let databasePromise;
  function open() {
    if (!indexedDb) return Promise.resolve(null);
    if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
      const request = indexedDb.open(dbName, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(() => null);
    return databasePromise;
  }
  async function transact(mode, action) {
    const database = await open();
    if (!database) return null;
    return new Promise(resolve => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  }
  return {
    get: key => transact('readonly', store => store.get(key)),
    put: record => transact('readwrite', store => store.put(record)),
    delete: key => transact('readwrite', store => store.delete(key))
  };
}

export function createBrowserDataCache(options = {}) {
  const namespace = String(options.namespace || 'anonymous');
  const memory = new Map();
  const listeners = new Set();
  const storage = options.storage || createIndexedDbStorage(options.indexedDB ?? globalThis.indexedDB, options.dbName || 'digital-exhibition-cache-v1');
  const Channel = options.BroadcastChannel ?? globalThis.BroadcastChannel;
  const channel = typeof Channel === 'function' ? new Channel(options.channelName || 'digital-exhibition-cache-v1') : null;
  const locks = options.locks ?? globalThis.navigator?.locks;

  const key = (kind, value) => `${namespace}|${kind}|${stableStringify(value)}`;
  const notify = event => listeners.forEach(listener => { try { listener(event); } catch { /* cache listeners are isolated */ } });

  if (channel) channel.onmessage = async event => {
    if (event?.data?.type !== 'cache-updated' || event.data.namespace !== namespace) return;
    const record = await storage.get(event.data.key);
    if (!record) return;
    memory.set(record.key, record);
    notify({ origin: 'broadcast', record });
  };

  async function read(cacheKey) {
    if (memory.has(cacheKey)) return memory.get(cacheKey);
    const record = await storage.get(cacheKey);
    if (record) memory.set(cacheKey, record);
    return record || null;
  }

  async function write(cacheKey, value, meta = {}) {
    const record = { key: cacheKey, value, updatedAt: Date.now(), meta, version: DB_VERSION };
    memory.set(cacheKey, record);
    await storage.put(record);
    channel?.postMessage({ type: 'cache-updated', namespace, key: cacheKey, updatedAt: record.updatedAt });
    return record;
  }

  async function runExclusive(cacheKey, task) {
    if (!locks?.request) return task();
    return locks.request(`xlt-read-${shortHash(cacheKey)}`, async () => task());
  }

  return Object.freeze({
    key, read, write, runExclusive,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    close() { listeners.clear(); channel?.close?.(); }
  });
}

