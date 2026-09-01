import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { OPERATION_REGISTRY, getOperation } from '../src/integration/operation-registry.js';
import { PAGE_INTEGRATION_MATRIX } from '../src/integration/page-integration-matrix.js';
import { resolveIntegrationRuntime } from '../src/integration/runtime-config.js';
import { createSafeProxyClient } from '../src/integration/safe-proxy-client.js';
import { createPageDataSource, describeDataSourceEnvelope } from '../src/integration/page-data-source.js';

const origin = 'http://127.0.0.1:4173';
for (const unsafeBase of [
  '//attacker.example/proxy',
  '/%2f%2fattacker.example/proxy',
  '/%5c%5cattacker.example/proxy',
  '/api\\attacker.example'
]) {
  assert.throws(() => resolveIntegrationRuntime({ proxyBase: unsafeBase, origin }), /安全代理|同源/);
  assert.throws(() => createSafeProxyClient({ baseUrl: unsafeBase, origin, fetchImpl: async () => ({}) }), /安全代理|同源/);
}

const operationContracts = Object.fromEntries(OPERATION_REGISTRY.map(operation => [operation.id, {
  requestKeys: ['filters', 'pageSize', 'query', 'idempotencyKey'],
  responseKeys: ['code', 'data', 'traceId', 'schemaVersion', 'sourceUpdatedAt', 'dataStale', 'isComplete', 'unavailableReasonCode', 'hasMore', 'nextPageToken']
}]));

let transportCalls = 0;
const transport = createSafeProxyClient({
  baseUrl: '/api/v1', origin, timeoutMs: 1000, operationContracts,
  traceIdFactory: () => `trace-${transportCalls + 1}`,
  fetchImpl: async (_url, init) => {
    transportCalls += 1;
    return { ok: true, status: 200, json: async () => ({ code: 'OK', data: { items: [] }, traceId: init.headers['X-Trace-Id'] }) };
  }
});
for (const operation of OPERATION_REGISTRY) await transport.execute(operation.id, {});
assert.equal(transportCalls, 101, 'transport must accept all governed operation IDs, including WB-*');
await assert.rejects(() => transport.execute('BAD-999', {}), /未知|无效/);

for (const key of ['appToken', 'AppToken', 'tenantAccessToken', 'TableId', 'viewID']) {
  await assert.rejects(() => transport.execute('APP-002', { filters: [{ nested: { [key]: 'sensitive' } }] }), /敏感/);
}
await assert.rejects(() => transport.execute('APP-002', { unexpected: true }), /allowlist|白名单/);

const leakingTransport = createSafeProxyClient({
  baseUrl: '/api/v1', origin, timeoutMs: 1000, operationContracts,
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ code: 'OK', data: { accessToken: 'must-not-reach-browser' } }) })
});
await assert.rejects(() => leakingTransport.execute('APP-002', {}), /敏感/);

for (const page of PAGE_INTEGRATION_MATRIX) {
  assert.ok(page.readOperationIds.every(id => getOperation(id).readOnly), `${page.route} load contract contains a write`);
  assert.ok(page.actions.every(action => getOperation(action.operationId).access === 'write'), `${page.route} action contract must contain writes only`);
  assert.deepEqual(new Set([...page.readOperationIds, ...page.actions.map(action => action.operationId)]), new Set(page.operationIds));
}

const remoteRuntime = resolveIntegrationRuntime({
  requestedMode: 'remote', remoteEnabled: true, contractEvidenceComplete: true,
  timeoutMs: 1000, origin
});
const loadCalls = [];
const enabledOperation = operationId => ({ ...getOperation(operationId), remoteEnabled: true });
for (const page of PAGE_INTEGRATION_MATRIX) {
  const source = createPageDataSource({
    route: page.route, runtime: remoteRuntime, operationResolver: enabledOperation,
    client: { execute: async operationId => { loadCalls.push(operationId); return { code: 'OK', data: { items: [{ id: operationId }] }, traceId: `trace-${operationId}` }; } }
  });
  await source.load();
}
assert.ok(loadCalls.length > 0);
assert.ok(loadCalls.every(operationId => getOperation(operationId).readOnly), 'mount/load must execute zero write operations across all 30 routes');

const favoriteSource = createPageDataSource({
  route: '/favorites', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => ({ code: 'OK', data: { operationId } }) }
});
await assert.rejects(() => favoriteSource.executeAction('FAV-003', {}, { actionEnabled: true }), /权限/);
await assert.rejects(() => favoriteSource.executeAction('FAV-003', {}, { actionEnabled: true, permissions: ['operation:FAV-003:execute'] }), /确认/);
await assert.rejects(() => favoriteSource.executeAction('FAV-003', {}, { actionEnabled: true, permissions: ['operation:FAV-003:execute'], confirmed: true }), /幂等/);
assert.equal((await favoriteSource.executeAction('FAV-003', {}, {
  permissions: ['operation:FAV-003:execute'], confirmed: true, idempotencyKey: 'idem-favorite-001', actionEnabled: true
})).data.operationId, 'FAV-003');

const emptySource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => ({ code: 'OK', data: { items: [] }, traceId: `trace-${operationId}`, sourceUpdatedAt: '2026-09-02T00:00:00Z', isComplete: true }) }
});
const emptyEnvelope = await emptySource.load();
assert.equal(emptyEnvelope.state, 'empty');
assert.equal(emptyEnvelope.isComplete, true);

const partialSource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => {
    if (operationId === 'APP-002') throw Object.assign(new Error('list unavailable'), { state: 'error', traceId: 'trace-list-failed' });
    return { code: 'OK', data: { items: [{ id: 'filter-1' }] }, traceId: 'trace-filter', sourceUpdatedAt: '2026-09-02T00:00:00Z' };
  } }
});
const partialEnvelope = await partialSource.load();
assert.equal(partialEnvelope.state, 'partial');
assert.equal(partialEnvelope.isComplete, false);
assert.deepEqual(partialEnvelope.unavailableSections, ['APP-002']);
assert.deepEqual(partialEnvelope.retryScope, ['APP-002']);
assert.deepEqual(partialEnvelope.traceIds.sort(), ['trace-filter', 'trace-list-failed'].sort());

const staleSource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => ({ code: 'OK', data: { items: [{ id: operationId }] }, traceId: `trace-${operationId}`, dataStale: true, sourceUpdatedAt: '2026-09-01T00:00:00Z' }) }
});
const staleEnvelope = await staleSource.load();
assert.equal(staleEnvelope.state, 'data-stale');
assert.equal(staleEnvelope.dataStale, true);
assert.equal(staleEnvelope.lastSyncedAt, '2026-09-01T00:00:00Z');

const disabledSource = createPageDataSource({
  route: '/admin', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async () => { throw new Error('disabled route must not call transport'); } }
});
const disabledEnvelope = await disabledSource.load();
assert.equal(disabledEnvelope.mode, 'disabled');
assert.equal(disabledEnvelope.state, 'disabled');
assert.doesNotMatch(describeDataSourceEnvelope(disabledEnvelope), /使用受控代理数据/);

let preAbortFetches = 0;
const preAborted = new AbortController();
preAborted.abort(new DOMException('navigation', 'AbortError'));
await assert.rejects(() => createSafeProxyClient({
  baseUrl: '/api/v1', origin, timeoutMs: 1000, operationContracts,
  fetchImpl: async () => { preAbortFetches += 1; return { ok: true, status: 200, json: async () => ({ code: 'OK', data: {} }) }; }
}).execute('APP-002', {}, { signal: preAborted.signal }), error => error.state === 'cancelled' && error.retryable === false);
assert.equal(preAbortFetches, 0);

const midAbortController = new AbortController();
const midAbortClient = createSafeProxyClient({
  baseUrl: '/api/v1', origin, timeoutMs: 1000, operationContracts,
  fetchImpl: async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }))
});
const midAbortRequest = midAbortClient.execute('APP-002', {}, { signal: midAbortController.signal });
midAbortController.abort(new DOMException('route changed', 'AbortError'));
await assert.rejects(() => midAbortRequest, error => error.state === 'cancelled' && error.retryable === false);

const timeoutClient = createSafeProxyClient({
  baseUrl: '/api/v1', origin, timeoutMs: 5, operationContracts,
  fetchImpl: async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }))
});
await assert.rejects(() => timeoutClient.execute('APP-002', {}), error => error.state === 'timeout' && error.retryable === true);

const deferred = [];
const lateSource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: (operationId, input) => new Promise(resolve => deferred.push({ operationId, input, resolve })) }
});
const firstLoad = lateSource.load({ query: 'old' });
await Promise.resolve();
const secondLoad = lateSource.load({ query: 'new' });
await Promise.resolve();
for (const pending of deferred.filter(item => item.input.query === 'new')) pending.resolve({ code: 'OK', data: { items: [{ id: 'new' }] }, traceId: `new-${pending.operationId}` });
await secondLoad;
for (const pending of deferred.filter(item => item.input.query === 'old')) pending.resolve({ code: 'OK', data: { items: [{ id: 'old' }] }, traceId: `old-${pending.operationId}` });
await firstLoad;
assert.deepEqual(lateSource.snapshot().data['APP-002'].items, [{ id: 'new' }], 'late response must not replace the newer envelope');

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
assert.match(appSource, /createPageDataSource/);
assert.match(appSource, /integrationEnvelope/);
assert.match(appSource, /describeDataSourceEnvelope/);
assert.doesNotMatch(appSource, /integrationRuntime\.mode\s*===\s*'remote'/);

console.log('009 F01-F07：代理边界、零自动写、101 IDs、真实状态、来源标识与取消竞态回归通过');
