import assert from 'node:assert/strict';
import { createPersistentReadClient } from '../src/integration/persistent-read-client.js';

const records = new Map();
const listeners = new Set();
const cache = {
  key(kind, value) { return `${kind}:${JSON.stringify(value)}`; },
  async read(key) { return records.get(key) || null; },
  async write(key, value, meta = {}) {
    const record = { key, value, updatedAt: Date.now(), meta };
    records.set(key, record);
    return record;
  },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  async runExclusive(_key, task) { return task(); }
};

let calls = 0;
let release;
const baseClient = {
  execute: async operationId => {
    calls += 1;
    await new Promise(resolve => { release = resolve; });
    return { code: 'OK', data: { operationId, version: calls }, sourceUpdatedAt: '2026-09-28T00:00:00.000Z' };
  },
  executeBatch: async requests => Promise.all(requests.map(async request => ({
    status: 'fulfilled', value: await baseClient.execute(request.operationId, request.input)
  })))
};

const client = createPersistentReadClient({
  client: baseClient,
  cache,
  isCacheableOperation: () => true,
  freshMs: 30_000,
  maxStaleMs: 86_400_000
});

const first = client.execute('COM-001', {});
const second = client.execute('COM-001', {});
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(calls, 1, '相同接口与参数必须共享一个在途请求');
release();
const [firstValue, secondValue] = await Promise.all([first, second]);
assert.deepEqual(firstValue.data, secondValue.data);

const cached = await client.execute('COM-001', {});
assert.equal(calls, 1, '路由切换后必须复用已加载数据');
assert.equal(cached.browserCache.status, 'fresh');
assert.ok(cached.browserCache.updatedAt);

console.log('browser persistent read cache shares in-flight work and reuses successful data');
