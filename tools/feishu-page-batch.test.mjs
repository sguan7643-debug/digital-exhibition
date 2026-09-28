import assert from 'node:assert/strict';
import { createFeishuOperationDispatcher } from '../server/feishu-proxy-handler.mjs';
import { createPageDataSource } from '../src/integration/page-data-source.js';
import { getOperation } from '../src/integration/operation-registry.js';
import { createSafeProxyClient } from '../src/integration/safe-proxy-client.js';
import { createSyntheticOperationContracts } from '../src/integration/operation-contract-schemas.js';

const executed = [];
const dispatch = createFeishuOperationDispatcher({
  service: {
    async execute(operationId, input) {
      executed.push({ operationId, input });
      return {
        code: 'OK', data: { operationId }, traceId: `trace-${operationId}`,
        sourceUpdatedAt: '2026-09-28T00:00:00.000Z', dataStale: false, isComplete: true
      };
    }
  }
});

const batch = await dispatch({
  method: 'POST',
  url: '/api/v1/operations/batch',
  headers: { 'content-type': 'application/json' },
  body: {
    requests: [
      { operationId: 'APP-001', input: {} },
      { operationId: 'APP-002', input: { page: 1, pageSize: 20 } }
    ]
  }
});

assert.equal(batch.status, 200);
assert.equal(batch.body.code, 'OK');
assert.equal(batch.body.results.length, 2);
assert.deepEqual(executed.map(item => item.operationId), ['APP-001', 'APP-002']);

let batchCalls = 0;
let individualCalls = 0;
const source = createPageDataSource({
  route: '/apps',
  runtime: { mode: 'remote', testWritesEnabled: false },
  client: {
    async execute() {
      individualCalls += 1;
      throw new Error('页面聚合启用后不得发送独立请求');
    },
    async executeBatch(requests) {
      batchCalls += 1;
      return requests.map(({ operationId }) => ({
        status: 'fulfilled',
        value: {
          code: 'OK', data: { operationId }, traceId: `trace-${operationId}`,
          sourceUpdatedAt: '2026-09-28T00:00:00.000Z', dataStale: false, isComplete: true
        }
      }));
    }
  },
  operationResolver: operationId => ({ ...getOperation(operationId), remoteEnabled: true })
});

const result = await source.load({}, {
  inputByOperation: {
    'APP-001': {},
    'APP-002': { page: 1, pageSize: 20 }
  }
});
assert.equal(result.state, 'normal');
assert.equal(batchCalls, 1, '同一页面的多个读取必须聚合为一个 HTTP 请求');
assert.equal(individualCalls, 0);

let browserFetches = 0;
const browserClient = createSafeProxyClient({
  baseUrl: '/api/v1',
  origin: 'http://127.0.0.1:4173',
  operationContracts: createSyntheticOperationContracts(['APP-002', 'ANN-002']),
  traceIdFactory: () => 'trace-browser-batch',
  fetchImpl: async (url, init) => {
    browserFetches += 1;
    assert.equal(url, '/api/v1/operations/batch');
    const body = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          code: 'OK',
          traceId: 'trace-browser-batch',
          results: body.requests.map(request => ({
            operationId: request.operationId,
            status: 200,
            body: { code: 'OK', data: { items: [] }, traceId: `trace-${request.operationId}` }
          }))
        };
      }
    };
  }
});
const browserBatch = await browserClient.executeBatch([
  { operationId: 'APP-002', input: {} },
  { operationId: 'ANN-002', input: {} }
]);
assert.equal(browserFetches, 1);
assert.ok(browserBatch.every(item => item.status === 'fulfilled'));

const syncingClient = createSafeProxyClient({
  baseUrl: '/api/v1',
  origin: 'http://127.0.0.1:4173',
  operationContracts: createSyntheticOperationContracts(['APP-002', 'ANN-002']),
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        code: 'OK',
        results: [
          { operationId: 'APP-002', status: 202, body: { code: 'FEISHU_INITIAL_SYNCING', message: '正式飞书数据正在首次同步，请稍后重试', traceId: 'trace-syncing', retryAfterSeconds: 2 } },
          { operationId: 'ANN-002', status: 200, body: { code: 'OK', data: { items: [] }, traceId: 'trace-ann' } }
        ]
      };
    }
  })
});
const syncingBatch = await syncingClient.executeBatch([
  { operationId: 'APP-002', input: {} },
  { operationId: 'ANN-002', input: {} }
]);
assert.equal(syncingBatch[0].status, 'rejected');
assert.equal(syncingBatch[0].reason.state, 'initial-syncing');
assert.equal(syncingBatch[1].status, 'fulfilled');

console.log('Page read batch dispatch and single-request data-source flow passed');
