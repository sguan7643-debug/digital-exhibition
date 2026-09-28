import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  createHomepageAggregateService,
  HOMEPAGE_OPERATION_IDS,
  resolveHomepageResponseBudgetMs
} from '../server/homepage-aggregate-service.mjs';
import { createPageDataSource } from '../src/integration/page-data-source.js';
import { getOperation } from '../src/integration/operation-registry.js';
import { createHomepageAggregateNodeMiddleware } from '../server/homepage-aggregate-middleware.mjs';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const context = { identity: { tenantKey: 'tenant-1', userId: 'user-1', permissions: ['homepage:read'] } };

assert.equal(resolveHomepageResponseBudgetMs(), 25_000);
assert.equal(resolveHomepageResponseBudgetMs(60_000), 29_000, '应用响应预算必须为代理传输预留小于30秒的边界');
assert.equal(resolveHomepageResponseBudgetMs('invalid'), 25_000);

const cache = new Map();
const freshCalls = [];
const readService = {
  peekOperation(operationId) {
    return cache.get(operationId) || null;
  },
  async executeFresh(operationId) {
    freshCalls.push(operationId);
    await sleep(35);
    const value = {
      code: 'OK', data: { operationId }, traceId: `trace-${operationId}`,
      sourceUpdatedAt: '2026-09-24T00:00:00.000Z', dataStale: false, cacheStatus: 'fresh', isComplete: true
    };
    cache.set(operationId, value);
    return value;
  },
  async prewarm() {}
};
let syncSequence = 0;
const service = createHomepageAggregateService({
  readService,
  responseBudgetMs: 5,
  taskRetentionMs: 1000,
  idFactory: () => `sync-homepage-${++syncSequence}`,
  traceIdFactory: () => `trace-homepage-${syncSequence}`,
  prewarm: false
});

const prewarmCalls = [];
let releasePrewarm;
const prewarmGate = new Promise(resolve => { releasePrewarm = resolve; });
const prewarmService = createHomepageAggregateService({
  readService: {
    peekOperation(operationId) {
      return prewarmCalls.some(call => call.operationId === operationId && call.completed)
        ? { code: 'OK', data: { operationId }, dataStale: false, isComplete: true }
        : null;
    },
    async executeFresh(operationId, input) {
      const call = { operationId, input, completed: false };
      prewarmCalls.push(call);
      await prewarmGate;
      call.completed = true;
      return { code: 'OK', data: { operationId }, dataStale: false, isComplete: true };
    }
  }
});
const prewarmPromise = prewarmService.startPrewarm();
await sleep(0);
assert.equal(prewarmService.getReadiness().state, 'warming', '首页公共数据完成前 readiness 必须保持 warming');
assert.deepEqual(prewarmCalls.map(call => call.operationId).sort(), ['COM-005', 'WB-002']);
assert.deepEqual(
  prewarmCalls.find(call => call.operationId === 'COM-005').input,
  { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false },
  '预热必须使用与首页聚合完全相同的字典输入'
);
assert.deepEqual(
  prewarmCalls.find(call => call.operationId === 'WB-002').input,
  { page: 1, pageSize: 20, sort: 'RELEVANCE' },
  '预热必须使用与首页聚合完全相同的搜索输入'
);
releasePrewarm();
await prewarmPromise;
assert.equal(prewarmService.getReadiness().state, 'ready');
assert.equal(prewarmService.getReadiness().ready, true);

await assert.rejects(
  () => service.readHomepage({}),
  error => error.code === 'USER_AUTH_REQUIRED' && error.status === 401,
  '首页聚合必须要求当前飞书用户身份'
);

const coldResponses = await Promise.all(Array.from({ length: 8 }, () => service.readHomepage(context)));
assert.ok(coldResponses.every(result => result.status === 202), '冷态并发请求必须在响应预算内返回同步状态');
assert.equal(new Set(coldResponses.map(result => result.body.syncId)).size, 1, '同一同步范围必须复用一个syncId');
assert.equal(freshCalls.length, HOMEPAGE_OPERATION_IDS.length, '八个并发页面请求只能创建一组五项后台读取');

const syncId = coldResponses[0].body.syncId;
const callsBeforePoll = freshCalls.length;
assert.ok(['queued', 'running'].includes(service.getSyncStatus(syncId, context).state));
assert.equal(freshCalls.length, callsBeforePoll, '状态查询不得触发飞书读取');

await sleep(50);
assert.equal(service.getSyncStatus(syncId, context).state, 'completed');
const warm = await service.readHomepage(context);
assert.equal(warm.status, 200);
assert.equal(warm.body.aggregateState, 'fresh');
assert.equal(Object.keys(warm.body.data).length, HOMEPAGE_OPERATION_IDS.length);
assert.equal(freshCalls.length, HOMEPAGE_OPERATION_IDS.length, '热态聚合不得重新回源');
const warmDurations = [];
for (let index = 0; index < 100; index += 1) {
  const startedAt = performance.now();
  const response = await service.readHomepage(context);
  warmDurations.push(performance.now() - startedAt);
  assert.equal(response.status, 200);
}
warmDurations.sort((left, right) => left - right);
const warmP95 = warmDurations[Math.floor((warmDurations.length - 1) * 0.95)];
assert.ok(warmP95 < 2_000, `热态聚合 p95 必须小于2秒，实际 ${warmP95.toFixed(2)}ms`);
assert.equal(freshCalls.length, HOMEPAGE_OPERATION_IDS.length, '100次热态读取不得产生额外飞书调用');
assert.throws(
  () => service.getSyncStatus(syncId, { identity: { tenantKey: 'tenant-1', userId: 'user-2' } }),
  error => error.code === 'SYNC_JOB_FORBIDDEN'
);

for (const value of cache.values()) {
  value.dataStale = true;
  value.cacheStatus = 'stale';
}
const staleAfterCompleted = await service.readHomepage(context);
assert.equal(staleAfterCompleted.status, 200);
assert.equal(staleAfterCompleted.body.aggregateState, 'stale');
assert.equal(staleAfterCompleted.body.refreshing, true, '成功快照变陈旧后必须启动新的后台刷新');
await sleep(50);
assert.equal(freshCalls.length, HOMEPAGE_OPERATION_IDS.length * 2, '新一轮陈旧刷新仍必须只执行一组五项读取');

let lifecycleNow = 1_000;
const lifecycleCache = new Map();
const lifecycleService = createHomepageAggregateService({
  readService: {
    peekOperation(operationId) { return lifecycleCache.get(operationId) || null; },
    async executeFresh(operationId) {
      const value = { code: 'OK', data: { operationId }, dataStale: false, isComplete: true };
      lifecycleCache.set(operationId, value);
      return value;
    }
  },
  now: () => lifecycleNow,
  taskRetentionMs: 10,
  idFactory: () => 'sync-expiry-0001',
  prewarm: false
});
const lifecycleResponse = await lifecycleService.readHomepage(context);
assert.equal(lifecycleResponse.status, 200);
lifecycleNow += 11;
assert.equal(lifecycleService.getSyncStatus('sync-expiry-0001', context).state, 'expired', '保留期结束后必须返回 expired 状态');

const staleCalls = [];
const staleReadService = {
  peekOperation(operationId) {
    return {
      code: 'OK', data: { operationId, retained: true }, traceId: `old-${operationId}`,
      sourceUpdatedAt: '2026-09-23T23:59:00.000Z', dataStale: true, cacheStatus: 'stale', isComplete: true
    };
  },
  async executeFresh(operationId) {
    staleCalls.push(operationId);
    await sleep(10);
    throw Object.assign(new Error('temporary upstream failure'), { code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504 });
  },
  async prewarm() {}
};
const staleService = createHomepageAggregateService({
  readService: staleReadService,
  responseBudgetMs: 5,
  taskRetentionMs: 1000,
  idFactory: () => 'sync-stale-0001',
  prewarm: false
});
const stale = await staleService.readHomepage(context);
assert.equal(stale.status, 200);
assert.equal(stale.body.aggregateState, 'stale');
assert.equal(stale.body.refreshing, true);
assert.ok(Object.values(stale.body.data).every(item => item.retained === true), '刷新失败前必须先返回旧快照');
await sleep(20);
assert.equal(staleService.getSyncStatus(stale.body.syncId, context).state, 'failed');
const staleAfterFailure = await staleService.readHomepage(context);
assert.equal(staleAfterFailure.status, 200);
assert.equal(staleAfterFailure.body.aggregateState, 'stale');
assert.equal(staleAfterFailure.body.refreshing, false);
assert.equal(staleCalls.length, HOMEPAGE_OPERATION_IDS.length, '失败后的普通读取不得立即制造新的回源风暴');

const aggregateResponses = [
  {
    status: 202,
    body: { code: 'HOMEPAGE_SYNCING', state: 'running', syncId: 'sync-client-0001', pollAfterMs: 2000, traceId: 'trace-cold' }
  },
  {
    status: 200,
    body: {
      code: 'OK', aggregateState: 'fresh', data: Object.fromEntries(HOMEPAGE_OPERATION_IDS.map(id => [id, { id }])),
      sections: Object.fromEntries(HOMEPAGE_OPERATION_IDS.map(id => [id, {
        state: 'fresh', available: true, data: { id }, traceId: `trace-${id}`,
        sourceUpdatedAt: '2026-09-24T00:00:00.000Z', dataStale: false, isComplete: true, retryable: false
      }])),
      dataStale: false, refreshing: false, syncId: null,
      sourceUpdatedAt: '2026-09-24T00:00:00.000Z', traceId: 'trace-fresh'
    }
  }
];
let aggregateLoads = 0;
let aggregatePolls = 0;
let individualCalls = 0;
const source = createPageDataSource({
  route: '/workbench',
  runtime: { mode: 'remote', testWritesEnabled: false },
  client: { async execute() { individualCalls += 1; throw new Error('must not execute'); } },
  homepageClient: {
    async load() { return aggregateResponses[aggregateLoads++]; },
    async status() { aggregatePolls += 1; return { code: 'OK', syncId: 'sync-client-0001', state: 'completed', traceId: 'trace-complete' }; }
  },
  operationResolver: operationId => ({ ...getOperation(operationId), remoteEnabled: true })
});
const first = await source.load();
assert.equal(first.state, 'initial-syncing');
assert.equal(first.syncId, 'sync-client-0001');
const completed = await source.pollSync();
assert.equal(completed.state, 'normal');
assert.equal(aggregateLoads, 2, '同步完成后只允许重新获取一次聚合结果');
assert.equal(aggregatePolls, 1);
assert.equal(individualCalls, 0, '首页聚合流程不得调用五个独立接口');

let middlewareReads = 0;
let middlewareStatusReads = 0;
const middleware = createHomepageAggregateNodeMiddleware({
  service: {
    async readHomepage() {
      middlewareReads += 1;
      return { status: 202, body: { code: 'HOMEPAGE_SYNCING', state: 'running', syncId: 'sync-http-0001', pollAfterMs: 2000, traceId: 'trace-http' } };
    },
    getSyncStatus(syncJobId) {
      middlewareStatusReads += 1;
      return { code: 'OK', syncId: syncJobId, state: 'running', aggregateState: 'syncing', retryable: false, errorCode: null, traceId: 'trace-http' };
    },
    getReadiness() { return { ready: true, state: 'ready' }; }
  },
  resolveRequestContext: () => context,
  traceIdFactory: () => 'trace-middleware'
});
const httpServer = createServer((request, response) => middleware(request, response, () => {
  response.statusCode = 404;
  response.end();
}));
await new Promise((resolve, reject) => httpServer.listen(0, '127.0.0.1', error => error ? reject(error) : resolve()));
const httpOrigin = `http://127.0.0.1:${httpServer.address().port}`;
try {
  const aggregateHttp = await fetch(`${httpOrigin}/api/v1/homepage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  });
  assert.equal(aggregateHttp.status, 202);
  assert.equal(aggregateHttp.headers.get('retry-after'), '2');
  assert.equal((await aggregateHttp.json()).syncId, 'sync-http-0001');
  const statusHttp = await fetch(`${httpOrigin}/api/v1/sync-jobs/sync-http-0001`);
  assert.equal(statusHttp.status, 200);
  assert.equal((await statusHttp.json()).state, 'running');
  const badMethod = await fetch(`${httpOrigin}/api/v1/homepage`);
  assert.equal(badMethod.status, 405);
  assert.equal(middlewareReads, 1);
  assert.equal(middlewareStatusReads, 1, '状态路由只能查询任务状态');
} finally {
  await new Promise(resolve => httpServer.close(resolve));
}

console.log(`homepage aggregate single-flight, lightweight polling, stale fallback, and client flow passed; warm p95=${warmP95.toFixed(2)}ms`);
