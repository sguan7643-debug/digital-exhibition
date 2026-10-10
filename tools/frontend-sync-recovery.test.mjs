import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPersistentHomepageClient } from '../src/integration/persistent-homepage-client.js';
import { createPageDataSource } from '../src/integration/page-data-source.js';
import { getOperation } from '../src/integration/operation-registry.js';
import { createSafeProxyClient, IntegrationRequestError } from '../src/integration/safe-proxy-client.js';
import { createSyntheticOperationContracts } from '../src/integration/operation-contract-schemas.js';
import { getRequestActivity } from '../src/integration/request-status.js';

function homepageBody() {
  return {
    code: 'OK', aggregateState: 'fresh', data: {}, sections: {},
    dataStale: false, refreshing: false, syncId: null,
    sourceUpdatedAt: '2026-10-09T00:00:00.000Z', traceId: 'trace-homepage-complete'
  };
}

function memoryCache() {
  let record = null;
  return {
    key: () => 'homepage',
    subscribe: () => () => {},
    async read() { return record; },
    async write(key, value) {
      record = { key, value, updatedAt: Date.now() };
      return record;
    },
    async runExclusive(_key, task) { return task(); }
  };
}

{
  let homepageLoads = 0;
  let statusCalls = 0;
  const client = createPersistentHomepageClient({
    cache: memoryCache(),
    pollMinMs: 1,
    pollMaxMs: 5,
    client: {
      async load() {
        homepageLoads += 1;
        return {
          status: 202,
          body: {
            code: 'HOMEPAGE_SYNCING', state: 'running', syncId: 'sync-homepage-recovery',
            pollAfterMs: 1, traceId: 'trace-homepage-recovery'
          }
        };
      },
      async status() {
        statusCalls += 1;
        if (statusCalls === 1) {
          throw new IntegrationRequestError('任务状态暂时不可用', {
            state: 'error', retryable: true, status: 504, code: 'FEISHU_READ_BUDGET_EXCEEDED'
          });
        }
        return {
          code: 'OK', state: 'completed', syncId: 'sync-homepage-recovery',
          result: homepageBody()
        };
      }
    }
  });

  const result = await client.load();
  assert.equal(result.status, 200, '首页状态查询短暂失败后必须继续轮询并取得完整结果');
  assert.equal(homepageLoads, 1, '状态查询恢复时不得重新提交首页原请求');
  assert.equal(statusCalls, 2, '状态查询短暂失败后必须查询同一任务');
  assert.equal(getRequestActivity().isLoading, false, '首页同步完成后 loading 必须清零');
}

{
  const urls = [];
  let statusCalls = 0;
  const client = createSafeProxyClient({
    baseUrl: '/api/v1',
    origin: 'http://127.0.0.1:4173',
    timeoutMs: 1_000,
    syncPollMinMs: 1,
    syncPollMaxMs: 5,
    operationContracts: createSyntheticOperationContracts(['APP-002']),
    fetchImpl: async url => {
      urls.push(url);
      if (url === '/api/v1/operations/APP-002') {
        return {
          ok: false,
          status: 202,
          async json() {
            return {
              code: 'FEISHU_INITIAL_SYNCING', message: '请求处理中', syncId: 'read-job-recovery',
              pollAfterMs: 1, traceId: 'trace-operation-recovery'
            };
          }
        };
      }
      statusCalls += 1;
      if (statusCalls === 1) {
        return {
          ok: false,
          status: 504,
          async json() {
            return { code: 'FEISHU_READ_BUDGET_EXCEEDED', message: '任务状态暂时不可用' };
          }
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            code: 'OK', state: 'completed', syncId: 'read-job-recovery', operationId: 'APP-002',
            result: { code: 'OK', data: { items: [] }, traceId: 'trace-operation-complete' }
          };
        }
      };
    }
  });

  const result = await client.execute('APP-002', {});
  assert.equal(result.code, 'OK', '普通读取状态查询短暂失败后必须继续轮询');
  assert.deepEqual(urls, [
    '/api/v1/operations/APP-002',
    '/api/v1/operations/sync-jobs/read-job-recovery',
    '/api/v1/operations/sync-jobs/read-job-recovery'
  ], '恢复期间只能继续查询同一任务，不能重发原 operation');
  assert.equal(getRequestActivity().isLoading, false, '普通读取同步完成后 loading 必须清零');
}

{
  const source = createPageDataSource({
    route: '/apps',
    runtime: { mode: 'remote', businessWritesEnabled: false },
    client: {
      async executeBatch() {
        throw new IntegrationRequestError('批量读取暂时不可用', {
          state: 'timeout', retryable: true, status: 504, traceId: 'trace-batch-timeout'
        });
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
  assert.equal(result.state, 'timeout', '批量请求整体失败必须收敛为页面状态，不能留下未处理 Promise');
  assert.deepEqual(result.retryScope, ['APP-001', 'APP-002'], '可重试批量失败必须保留自动恢复范围');
}

{
  const files = [
    '../src/App.vue',
    '../src/integration/data-state.js',
    '../src/integration/page-data-source.js',
    '../src/integration/safe-proxy-client.js'
  ];
  const sources = await Promise.all(files.map(file => readFile(new URL(file, import.meta.url), 'utf8')));
  for (let index = 0; index < sources.length; index += 1) {
    assert.doesNotMatch(sources[index], /正式飞书数据正在首次同步/, `${files[index]} 不得保留面向用户的首次同步提示`);
  }
  assert.match(sources[0], /class="request-loading-toast"/, '请求处理中的 loading 气泡必须继续保留');
}

console.log('frontend sync polling recovers without replaying original requests or leaking loading state');
