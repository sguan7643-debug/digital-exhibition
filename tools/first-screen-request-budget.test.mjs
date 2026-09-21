import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSafeProxyClient } from '../src/integration/safe-proxy-client.js';
import { createSyntheticOperationContracts } from '../src/integration/operation-contract-schemas.js';
import { createPageDataSource } from '../src/integration/page-data-source.js';
import { getOperation } from '../src/integration/operation-registry.js';
import { getRequestActivity } from '../src/integration/request-status.js';
import { resolveIntegrationRuntime } from '../src/integration/runtime-config.js';

const oversizedRemoteRuntime = resolveIntegrationRuntime({
  requestedMode: 'remote',
  remoteEnabled: true,
  contractEvidenceComplete: true,
  timeoutMs: 30_000,
  origin: 'http://127.0.0.1:4173'
});
assert.equal(
  oversizedRemoteRuntime.timeoutMs,
  12_000,
  'a configured browser timeout must not exceed the approved 12-second first-screen outcome'
);

const workbenchOperationIds = ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002', 'COM-011'];
const operationContracts = createSyntheticOperationContracts(workbenchOperationIds);
const delayedProxy = createSafeProxyClient({
  baseUrl: '/api/v1',
  origin: 'http://127.0.0.1:5173',
  timeoutMs: 12,
  operationContracts,
  fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => _resolve({ ok: true, status: 200, json: async () => ({ code: 'OK', data: {} }) }), 13);
    init.signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(init.signal.reason);
    }, { once: true });
  })
});
const source = createPageDataSource({
  route: '/workbench',
  runtime: { mode: 'remote', testWritesEnabled: false },
  client: delayedProxy,
  operationResolver: operationId => ({ ...getOperation(operationId), remoteEnabled: true })
});
const result = await source.load();
assert.equal(result.state, 'timeout');
assert.ok(result.retryScope.length > 0);
assert.ok(Object.values(result.sectionRecords).every(record => record.errorState === 'timeout' && record.retryable === true));
assert.equal(getRequestActivity().isLoading, false, 'all timed-out requests must clear activity in finally');

const renderedSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
assert.match(renderedSource, /integration-recovery/, 'affected first-screen data must render a local recovery region');
assert.match(renderedSource, /retryIntegration/, 'local recovery region must expose a retry action');
assert.match(renderedSource, /重试受影响数据/, 'local recovery action must have visible retry text');
assert.match(renderedSource, /request-activity-banner/, 'authenticated first-screen progress must remain visibly announced');
assert.doesNotMatch(renderedSource, /global-request-loading/, 'authenticated first-screen progress must not cover and disable unaffected regions');

let cancelledOperationCount = 0;
const cancellableOperationIds = ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002'];
const cancellableClient = createSafeProxyClient({
  baseUrl: '/api/v1',
  origin: 'http://127.0.0.1:5173',
  timeoutMs: 1000,
  operationContracts: createSyntheticOperationContracts(cancellableOperationIds),
  fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => {
      cancelledOperationCount += 1;
      reject(init.signal.reason);
    }, { once: true });
  })
});
const cancellableSource = createPageDataSource({
  route: '/workbench',
  runtime: { mode: 'remote', testWritesEnabled: false },
  client: cancellableClient,
  operationResolver: operationId => ({ ...getOperation(operationId), remoteEnabled: true })
});
const abandonedLoad = cancellableSource.load();
await new Promise(resolve => setTimeout(resolve, 0));
cancellableSource.cancel('页面已切换');
const abandonedResult = await abandonedLoad;
assert.equal(cancelledOperationCount, cancellableSource.contract.readOperationIds.length, '离开页面必须取消全部仍在执行的旧页面读取');
assert.equal(abandonedResult.state, 'cancelled', '旧页面读取被取消后不得继续作为超时或错误结束');

console.log('first-screen requests time out, clear loading activity, and expose local recovery');
