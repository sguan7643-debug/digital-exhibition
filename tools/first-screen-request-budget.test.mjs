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
  30_000,
  'the approved 30-second browser boundary must not be truncated by the former 12-second cap'
);

const workbenchOperationIds = ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002', 'COM-011'];
const operationContracts = createSyntheticOperationContracts(workbenchOperationIds);
const delayedProxy = createSafeProxyClient({
  baseUrl: '/api/v1',
  origin: 'http://127.0.0.1:5173',
  timeoutMs: 12,
  operationContracts,
  fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => {
      reject(init.signal.reason);
    }, { once: true });
  })
});
await assert.rejects(
  () => delayedProxy.executeBatch(workbenchOperationIds.map(operationId => ({ operationId, input: {} }))),
  error => error?.state === 'timeout' && error?.retryable === true,
  '批量代理必须把超时稳定归类为可重试 timeout'
);
assert.equal(getRequestActivity().isLoading, false, 'all timed-out requests must clear activity in finally');

const timeoutReason = Object.assign(new Error('请求超时'), { state: 'timeout', retryable: true });
const source = createPageDataSource({
  route: '/workbench',
  runtime: { mode: 'remote', testWritesEnabled: false },
  client: { executeBatch: async requests => requests.map(() => ({ status: 'rejected', reason: timeoutReason })) },
  operationResolver: operationId => ({ ...getOperation(operationId), remoteEnabled: true })
});
const result = await source.load();
assert.equal(result.state, 'timeout');
assert.ok(result.retryScope.length > 0);
assert.ok(Object.values(result.sectionRecords).every(record => record.errorState === 'timeout' && record.retryable === true));

const syncingOperationIds = ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002'];
const syncingReason = Object.assign(new Error('请求处理中'), {
  state: 'initial-syncing', retryable: true, traceId: 'trace-syncing', retryAfterSeconds: 2
});
const syncingClient = {
  executeBatch: async requests => requests.map(() => ({ status: 'rejected', reason: syncingReason }))
};
const syncingSource = createPageDataSource({
  route: '/workbench',
  runtime: { mode: 'remote', testWritesEnabled: false },
  client: syncingClient,
  operationResolver: operationId => ({ ...getOperation(operationId), remoteEnabled: true })
});
const syncingResult = await syncingSource.load();
assert.equal(syncingResult.state, 'initial-syncing');
assert.ok(Object.values(syncingResult.sectionRecords).every(record => record.retryAfterSeconds === 2));

const renderedSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
assert.doesNotMatch(renderedSource, /class="integration-recovery"/, 'background recovery must not render a blocking or distracting retry bubble');
assert.match(renderedSource, /retryIntegration/, 'background recovery must retain its internal retry action');
assert.doesNotMatch(renderedSource, /request-activity-banner|integration-toast-stack/, 'background progress must not render a reference-external floating bubble');
assert.match(renderedSource, /scheduleInitialSyncRetry/, '首次同步必须按服务端重试提示自动恢复，不得要求用户连续手动点击');
assert.doesNotMatch(renderedSource, /global-request-loading/, 'authenticated first-screen progress must not cover and disable unaffected regions');

let cancelledOperationCount = 0;
const cancellableOperationIds = ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002'];
const cancellableClient = {
  execute: async (_operationId, _input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => {
      cancelledOperationCount += 1;
      reject(Object.assign(new Error(init.signal.reason?.message || '页面已切换'), {
        state: 'cancelled', retryable: false
      }));
    }, { once: true });
  })
};
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
