import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createHomepageAggregateService,
  HOMEPAGE_OPERATION_INPUTS,
  HOMEPAGE_OPERATION_IDS,
  resolveHomepageResponseBudgetMs
} from '../server/homepage-aggregate-service.mjs';
import { createPageDataSource } from '../src/integration/page-data-source.js';
import { getOperation } from '../src/integration/operation-registry.js';
import { createHomepageAggregateNodeMiddleware } from '../server/homepage-aggregate-middleware.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { FeishuProxyError } from '../server/feishu-open-api-client.mjs';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const context = {
  identity: {
    tenantKey: 'tenant-1',
    userId: 'user-1',
    displayName: '用户一',
    permissions: ['homepage:read']
  }
};
const assertTaskEnvelope = (body, expectedStates) => {
  assert.equal(body.code, 'OK');
  assert.ok(expectedStates.includes(body.state), `unexpected task state: ${body.state}`);
  assert.match(body.syncId, /^sync-/);
  assert.equal(body.operationId, 'HOMEPAGE');
  assert.ok(!Number.isNaN(Date.parse(body.createdAt)), 'task createdAt must be ISO time');
  assert.ok(!Number.isNaN(Date.parse(body.updatedAt)), 'task updatedAt must be ISO time');
  assert.match(body.traceId, /^trace-/);
  const stateField = ['queued', 'running'].includes(body.state)
    ? 'pollAfterMs'
    : body.state === 'completed'
      ? 'result'
      : 'error';
  assert.deepEqual(
    Object.keys(body).sort(),
    ['code', 'syncId', 'operationId', 'state', 'createdAt', 'updatedAt', 'traceId', stateField].sort(),
    `${body.state} task envelope must only contain its discriminated state fields`
  );
};
const assertHandoffEnvelope = body => {
  assert.equal(body.code, 'HOMEPAGE_SYNCING');
  assert.ok(['queued', 'running'].includes(body.state));
  assert.match(body.syncId, /^sync-/);
  assert.equal(body.operationId, 'HOMEPAGE');
  assert.ok(!Number.isNaN(Date.parse(body.createdAt)));
  assert.ok(!Number.isNaN(Date.parse(body.updatedAt)));
  assert.match(body.traceId, /^trace-/);
  assert.ok(Number.isInteger(body.pollAfterMs) && body.pollAfterMs > 0);
  assert.deepEqual(
    Object.keys(body).sort(),
    ['code', 'message', 'syncId', 'operationId', 'state', 'createdAt', 'updatedAt', 'traceId', 'pollAfterMs'].sort()
  );
};
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const homepageFixtureContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const homepageFixtureReadService = createFeishuReadOnlyService({
  identifierContract: homepageFixtureContract,
  realtimeAuthorization: false,
  client: {
    async listRecords() { return { items: [], total: 0, hasMore: false, nextPageToken: '' }; }
  }
});
const homepageFixtures = new Map(await Promise.all(HOMEPAGE_OPERATION_IDS.map(async operationId => [
  operationId,
  await homepageFixtureReadService.executeBackground(operationId, HOMEPAGE_OPERATION_INPUTS[operationId], context)
])));
homepageFixtureReadService.close();
const homepageSuccess = (operationId, overrides = {}) => ({
  ...structuredClone(homepageFixtures.get(operationId)),
  ...overrides
});

let directContactUserId = '';
const directContactReadService = createFeishuReadOnlyService({
  identifierContract: homepageFixtureContract,
  realtimeAuthorization: false,
  client: {
    async listRecords() { return { items: [], total: 0, hasMore: false, nextPageToken: '' }; },
    async getContactUser(userId) {
      directContactUserId = userId;
      return { userId, displayName: '飞书用户' };
    }
  }
});
await directContactReadService.executeBackground('COM-001', {}, {
  identity: {
    tenantKey: 'tenant-contact',
    userId: 'feishu-user-id',
    adAccount: 'ad-account',
    displayName: '飞书用户'
  }
});
assert.equal(directContactUserId, '', 'COM-001 正式身份投影不得被可选通讯录调用拖慢或阻塞');
directContactReadService.close();

assert.equal(resolveHomepageResponseBudgetMs(), 4_500);
assert.equal(resolveHomepageResponseBudgetMs(60_000), 4_500, '内部最多等待4.5秒，为五秒浏览器响应预留传输时间');
assert.equal(resolveHomepageResponseBudgetMs('invalid'), 4_500);

const cache = new Map();
const freshCalls = [];
const readService = {
  peekOperation(operationId) {
    return cache.get(operationId) || null;
  },
  async executeFresh(operationId) {
    freshCalls.push(operationId);
    await sleep(35);
    const value = homepageSuccess(operationId, { traceId: `trace-${operationId}`, cacheStatus: 'fresh' });
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
        ? homepageSuccess(operationId)
        : null;
    },
    async executeFresh(operationId, input) {
      const call = { operationId, input, completed: false };
      prewarmCalls.push(call);
      await prewarmGate;
      call.completed = true;
      return homepageSuccess(operationId);
    }
  }
});
const prewarmPromise = prewarmService.startPrewarm();
await sleep(0);
assert.equal((await prewarmService.getReadiness()).state, 'warming', '首页公共数据完成前 readiness 必须保持 warming');
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
assert.equal((await prewarmService.getReadiness()).state, 'ready');
assert.equal((await prewarmService.getReadiness()).ready, true);

const cacheFailureReadiness = createHomepageAggregateService({
  readService: {
    peekOperation(operationId) {
      return ['COM-005', 'WB-002'].includes(operationId)
        ? homepageSuccess(operationId)
        : null;
    },
    async executeFresh() { return { code: 'OK', data: {}, dataStale: false, isComplete: true }; },
    async prewarm() {
      throw Object.assign(new Error('cache owner mismatch'), { code: 'CACHE_RUNTIME_UNAVAILABLE' });
    }
  }
});
await cacheFailureReadiness.startPrewarm();
assert.equal((await cacheFailureReadiness.getReadiness()).state, 'failed', '持久缓存不可用不得降级为 ready');
assert.equal((await cacheFailureReadiness.getReadiness()).ready, false);

const disabledPersistenceReadiness = createHomepageAggregateService({
  readService: {
    peekOperation(operationId) { return ['COM-005', 'WB-002'].includes(operationId) ? homepageSuccess(operationId) : null; },
    async executeFresh(operationId) { return homepageSuccess(operationId); },
    async prewarm() {},
    async getStartupCacheState() { return { completed: true, usableEntries: 2 }; },
    async checkPersistentCacheHealth() { return { enabled: false, healthy: true, lastError: null, writeSuspended: false }; }
  },
  requirePersistentCache: true
});
await disabledPersistenceReadiness.startPrewarm();
const disabledPersistenceState = await disabledPersistenceReadiness.getReadiness();
assert.equal(disabledPersistenceState.ready, false, '服务器模式关闭持久快照时 readiness 必须失败');
assert.equal(disabledPersistenceState.errorCode, 'CACHE_PERSISTENCE_REQUIRED');

let runtimePersistentHealth = { enabled: true, healthy: true, lastError: null, writeSuspended: false };
const runtimeCacheReadiness = createHomepageAggregateService({
  readService: {
    peekOperation(operationId) {
      return ['COM-005', 'WB-002'].includes(operationId)
        ? homepageSuccess(operationId)
        : null;
    },
    async executeFresh() { return { code: 'OK', data: {}, dataStale: false, isComplete: true }; },
    async prewarm() {},
    async checkPersistentCacheHealth() { return runtimePersistentHealth; }
  }
});
await runtimeCacheReadiness.startPrewarm();
assert.equal((await runtimeCacheReadiness.getReadiness()).ready, true);
runtimePersistentHealth = {
  enabled: true,
  healthy: false,
  lastError: 'EACCES',
  writeSuspended: false
};
const failedAfterReady = await runtimeCacheReadiness.getReadiness();
assert.equal(failedAfterReady.state, 'failed', 'ready 后的快照权限故障必须立即使 readiness 失败');
assert.equal(failedAfterReady.ready, false);
assert.equal(failedAfterReady.errorCode, 'CACHE_RUNTIME_UNAVAILABLE');
runtimePersistentHealth = {
  enabled: true,
  healthy: false,
  lastError: 'CACHE_CAPACITY_REVIEW_REQUIRED',
  writeSuspended: true
};
assert.equal((await runtimeCacheReadiness.getReadiness()).ready, false, '容量暂停后 readiness 必须保持失败');
runtimePersistentHealth = { enabled: true, healthy: true, lastError: null, writeSuspended: false };
assert.equal((await runtimeCacheReadiness.getReadiness()).ready, true, '受控恢复成功后 readiness 才能恢复');

await assert.rejects(
  () => service.readHomepage({}),
  error => error.code === 'USER_AUTH_REQUIRED' && error.status === 401,
  '首页聚合必须要求当前飞书用户身份'
);

const coldResponses = await Promise.all(Array.from({ length: 8 }, () => service.readHomepage(context)));
assert.ok(coldResponses.every(result => result.status === 202), '冷态并发请求必须在响应预算内返回同步状态');
for (const result of coldResponses) assertHandoffEnvelope(result.body);
assert.equal(new Set(coldResponses.map(result => result.body.syncId)).size, 1, '同一同步范围必须复用一个syncId');
assert.equal(freshCalls.length, HOMEPAGE_OPERATION_IDS.length, '八个并发页面请求只能创建一组五项后台读取');

const syncId = coldResponses[0].body.syncId;
const callsBeforePoll = freshCalls.length;
assert.ok(['queued', 'running'].includes((await service.getSyncStatus(syncId, context)).state));
assert.equal(freshCalls.length, callsBeforePoll, '状态查询不得触发飞书读取');

await sleep(50);
const completedStatus = await service.getSyncStatus(syncId, context);
assertTaskEnvelope(completedStatus, ['completed']);
assert.equal(completedStatus.result.schemaVersion, 'homepage-aggregate.v3');
const warm = await service.readHomepage(context);
assert.equal(warm.status, 200);
assert.equal(warm.body.schemaVersion, 'homepage-aggregate.v3');
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
await assert.rejects(
  () => service.getSyncStatus(syncId, { identity: { tenantKey: 'tenant-1', userId: 'user-2' } }),
  error => error.code === 'SYNC_JOB_FORBIDDEN'
);

const partialWarmOperations = new Set(['COM-005', 'WB-002']);
const partialWarmCalls = [];
const partialWarmService = createHomepageAggregateService({
  readService: {
    peekOperation(operationId) {
      return partialWarmOperations.has(operationId)
        ? homepageSuccess(operationId, { cacheStatus: 'fresh' })
        : null;
    },
    async executeBackground(operationId) {
      partialWarmCalls.push(operationId);
      await sleep(8);
      partialWarmOperations.add(operationId);
      return homepageSuccess(operationId, { cacheStatus: 'fresh' });
    },
    async executeFresh(operationId) { return this.executeBackground(operationId); }
  },
  responseBudgetMs: 40,
  prewarm: false,
  idFactory: () => 'sync-partial-warm-0001'
});
const partialWarmResult = await partialWarmService.readHomepage(context);
assert.equal(partialWarmResult.status, 200, '只有全部五个 section 可用时才能返回首页 HTTP 200');
assert.equal(Object.keys(partialWarmResult.body.data).length, HOMEPAGE_OPERATION_IDS.length);
assert.deepEqual(partialWarmCalls.sort(), [...HOMEPAGE_OPERATION_IDS].sort(), '强一致项与缓存项必须在同一完整聚合任务中收敛');

const realPolicyContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
let realPolicyReads = 0;
const realPolicyReadService = createFeishuReadOnlyService({
  identifierContract: realPolicyContract,
  realtimeAuthorization: false,
  client: {
    async listRecords() {
      realPolicyReads += 1;
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
await realPolicyReadService.prewarm({ identities: [context] });
const readsAfterRealPolicyPrewarm = realPolicyReads;
const realPolicyHomepage = createHomepageAggregateService({
  readService: realPolicyReadService,
  responseBudgetMs: 100,
  prewarm: false,
  idFactory: () => 'sync-real-policy-0001'
});
const realPolicyResult = await realPolicyHomepage.readHomepage(context);
assert.equal(realPolicyResult.status, 200, '真实 54/11 策略组合不得把缺少强一致项的首页作为部分 HTTP 200 返回');
assert.equal(Object.keys(realPolicyResult.body.data).length, HOMEPAGE_OPERATION_IDS.length);
assert.ok(realPolicyReads > readsAfterRealPolicyPrewarm, 'COM-001/COM-002 强一致首页项必须实时回源');
const readsAfterRealPolicyCold = realPolicyReads;
const realPolicyWarm = await realPolicyHomepage.readHomepage(context);
assert.equal(realPolicyWarm.status, 200, '完整首页聚合完成后相同六维键必须直接 HTTP 200 命中');
assert.equal(Object.keys(realPolicyWarm.body.data).length, HOMEPAGE_OPERATION_IDS.length);
assert.equal(realPolicyReads, readsAfterRealPolicyCold, '首页暖读必须命中独立聚合缓存，不得再次执行强一致子 operation');
realPolicyReadService.close();

let realDeadlineDelayMs = 0;
const realDeadlineReads = new Map();
let realDeadlineActiveReads = 0;
let realDeadlinePeakReads = 0;
let realDeadlineSnapshotFlushes = 0;
const realDeadlinePersistedOperations = new Set();
const realDeadlineReadService = createFeishuReadOnlyService({
  identifierContract: realPolicyContract,
  maxSyncConcurrency: 3,
  syncTaskTimeoutMs: 300,
  persistentCommitCoalesceMs: 1,
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush(provider) {
      realDeadlineSnapshotFlushes += 1;
      const entries = typeof provider === 'function' ? provider() : [];
      for (const entry of entries) realDeadlinePersistedOperations.add(entry.operationId);
      return { written: true, keys: entries.map(entry => entry.key) };
    },
    metrics() { return { enabled: true, healthy: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords(tableId) {
      const tableName = [...realPolicyContract.byName.values()].find(table => table.tableId === tableId)?.name || tableId;
      realDeadlineReads.set(tableName, (realDeadlineReads.get(tableName) || 0) + 1);
      realDeadlineActiveReads += 1;
      realDeadlinePeakReads = Math.max(realDeadlinePeakReads, realDeadlineActiveReads);
      try {
        if (realDeadlineDelayMs) await sleep(realDeadlineDelayMs);
        if (tableName === '用户权限') {
          return {
            items: [{
              record_id: 'homepage-cold-permission',
              fields: {
                'AD账号': 'homepage-cold-ad',
                '状态': '启用',
                '权限编码': '*',
                '数据范围': ['org-homepage'],
                '启用': true
              }
            }],
            total: 1,
            hasMore: false,
            nextPageToken: ''
          };
        }
        return { items: [], total: 0, hasMore: false, nextPageToken: '' };
      } finally {
        realDeadlineActiveReads -= 1;
      }
    }
  }
});
await realDeadlineReadService.prewarm();
const realDeadlineContext = {
  identity: {
    tenantKey: 'tenant-homepage-cold',
    userId: 'homepage-cold-feishu-user',
    adAccount: 'homepage-cold-ad',
    displayName: '首页冷读用户'
  }
};
realDeadlineReads.clear();
realDeadlinePeakReads = 0;
realDeadlineSnapshotFlushes = 0;
realDeadlinePersistedOperations.clear();
realDeadlineDelayMs = 60;
const realDeadlineHomepage = createHomepageAggregateService({
  readService: realDeadlineReadService,
  responseBudgetMs: 5,
  taskTimeoutMs: 600,
  prewarm: false,
  idFactory: () => 'sync-real-deadline-recovery-0001'
});
const realDeadlineResponse = await realDeadlineHomepage.readHomepage(realDeadlineContext);
assert.equal(realDeadlineResponse.status, 202, '真实慢上游必须先由五秒任务接管');
await sleep(620);
const realDeadlineBusinessReadsBeforePoll = [...realDeadlineReads.entries()]
  .filter(([tableName]) => tableName !== '用户权限')
  .reduce((total, [, count]) => total + count, 0);
const realDeadlineCompleted = await realDeadlineHomepage.getSyncStatus(realDeadlineResponse.body.syncId, realDeadlineContext);
assertTaskEnvelope(realDeadlineCompleted, ['completed']);
assert.equal(
  realDeadlineCompleted.state,
  'completed',
  `共享强一致用户投影后首页必须在缩短的硬截止前完成：${JSON.stringify({ status: realDeadlineCompleted, reads: [...realDeadlineReads] })}`
);
assert.equal(Object.keys(realDeadlineCompleted.result.data).length, HOMEPAGE_OPERATION_IDS.length);
assert.equal(realDeadlineReads.get('用户字典'), 1, 'COM-001、COM-002 与 WB-001 必须复用同一次有界用户身份投影');
assert.equal(realDeadlineReads.get('消息通知'), undefined, '首页身份段不得为非关键统计扫描消息表');
assert.ok(realDeadlinePersistedOperations.has('WB-001'), '真正冷的 WB-001 必须在任务完成前写入持久快照');
assert.ok(realDeadlineSnapshotFlushes >= 1, '首页冷任务必须等待至少一次持久快照提交');
assert.ok(realDeadlinePeakReads > 1 && realDeadlinePeakReads <= 3, '首页冷任务上游读取峰值必须为 2 至 3 路');
assert.equal(
  [...realDeadlineReads.entries()]
    .filter(([tableName]) => tableName !== '用户权限')
    .reduce((total, [, count]) => total + count, 0),
  realDeadlineBusinessReadsBeforePoll,
  '首页状态轮询不得重复执行任何业务表读取'
);
assert.ok(
  new Date(realDeadlineCompleted.updatedAt).getTime() - new Date(realDeadlineCompleted.createdAt).getTime() < 600,
  '真实慢读取聚合必须在任务硬截止前进入 completed'
);
realDeadlineReadService.close();

let delayedHomepageAuthorizations = 0;
let delayedHomepageSequence = 0;
const delayedHomepageAuthService = createHomepageAggregateService({
  readService: {
    async authorizeRequestContext(requestContext) {
      delayedHomepageAuthorizations += 1;
      await sleep(35);
      return requestContext;
    },
    peekOperation() { return null; },
    async executeBackground(operationId) {
      await sleep(5);
      return homepageSuccess(operationId, { cacheStatus: 'fresh' });
    },
    async executeFresh(operationId) { return this.executeBackground(operationId); }
  },
  responseBudgetMs: 8,
  taskTimeoutMs: 200,
  prewarm: false,
  idFactory: () => `sync-delayed-auth-${++delayedHomepageSequence}`
});
const delayedHomepageStartedAt = Date.now();
const delayedHomepageResponse = await delayedHomepageAuthService.readHomepage(context);
assert.equal(delayedHomepageResponse.status, 202, '首页实时鉴权延迟必须由五秒任务合同接管');
assert.ok(Date.now() - delayedHomepageStartedAt < 30, '首页响应预算必须从服务收到请求起覆盖鉴权');
await sleep(70);
const delayedHomepageStatus = await delayedHomepageAuthService.getSyncStatus(delayedHomepageResponse.body.syncId, context);
assert.equal(delayedHomepageStatus.state, 'completed');
assert.equal(Object.keys(delayedHomepageStatus.result.data).length, HOMEPAGE_OPERATION_IDS.length);
assert.ok(delayedHomepageAuthorizations >= 2, '首页任务查询必须重新实时鉴权');

let sharedAuthorization;
let homepageAliasSequence = 0;
const homepageAliasRaceService = createHomepageAggregateService({
  readService: {
    async authorizeRequestContext(requestContext) {
      sharedAuthorization ||= sleep(35);
      await sharedAuthorization;
      return requestContext;
    },
    peekOperation() { return null; },
    async executeBackground(operationId) {
      await sleep(50);
      return homepageSuccess(operationId, { cacheStatus: 'fresh' });
    },
    async executeFresh(operationId) { return this.executeBackground(operationId); }
  },
  responseBudgetMs: 8,
  taskTimeoutMs: 200,
  prewarm: false,
  idFactory: () => `sync-homepage-alias-${++homepageAliasSequence}`
});
const provisionalHomepageTask = await homepageAliasRaceService.readHomepage({ ...context, identity: { ...context.identity } });
assert.equal(provisionalHomepageTask.status, 202);
await sleep(20);
const canonicalHomepageTask = await homepageAliasRaceService.readHomepage({ ...context, identity: { ...context.identity } });
assert.equal(canonicalHomepageTask.status, 202);
assert.equal(
  canonicalHomepageTask.body.syncId,
  provisionalHomepageTask.body.syncId,
  '首页鉴权边界竞态必须把 canonical 后台任务提升到同一个 provisional syncId'
);
await sleep(80);
assert.equal((await homepageAliasRaceService.getSyncStatus(provisionalHomepageTask.body.syncId, context)).state, 'completed');

const nestedBudgetCache = new Map();
let nestedFreshCalls = 0;
let nestedBackgroundCalls = 0;
const nestedBudgetService = createHomepageAggregateService({
  readService: {
    peekOperation(operationId) { return nestedBudgetCache.get(operationId) || null; },
    async executeFresh() {
      nestedFreshCalls += 1;
      throw Object.assign(new Error('请求处理中'), { code: 'FEISHU_INITIAL_SYNCING', status: 202 });
    },
    async executeBackground(operationId) {
      nestedBackgroundCalls += 1;
      await sleep(15);
      const value = homepageSuccess(operationId);
      nestedBudgetCache.set(operationId, value);
      return value;
    }
  },
  responseBudgetMs: 5,
  idFactory: () => 'sync-nested-budget-0001',
  prewarm: false
});
const nestedResponse = await nestedBudgetService.readHomepage(context);
assert.equal(nestedResponse.status, 202, '超过首页5秒预算必须返回同步任务，不能返回503');
assert.equal(nestedResponse.body.syncId, 'sync-nested-budget-0001');
await sleep(25);
const nestedCompleted = await nestedBudgetService.getSyncStatus(nestedResponse.body.syncId, context);
assertTaskEnvelope(nestedCompleted, ['completed']);
assert.equal(nestedCompleted.state, 'completed');
assert.equal(Object.keys(nestedCompleted.result.data).length, HOMEPAGE_OPERATION_IDS.length);
assert.equal(nestedFreshCalls, 0, '首页后台任务不得调用带5秒响应预算的读取入口');
assert.equal(nestedBackgroundCalls, HOMEPAGE_OPERATION_IDS.length);

let temporaryStatusAuthorizationCalls = 0;
let temporaryStatusBusinessCalls = 0;
const temporaryStatusService = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeBackground(operationId) {
      temporaryStatusBusinessCalls += 1;
      await sleep(15);
      return homepageSuccess(operationId);
    },
    async executeFresh(operationId) { return this.executeBackground(operationId); },
    async authorizeTaskStatus(_operationId, requestContext) {
      temporaryStatusAuthorizationCalls += 1;
      return temporaryStatusAuthorizationCalls === 1
        ? { context: null, deferred: true }
        : { context: requestContext, deferred: false };
    }
  },
  responseBudgetMs: 3,
  taskTimeoutMs: 100,
  prewarm: false,
  idFactory: () => 'sync-temporary-status-auth-0001'
});
const temporaryStatusResponse = await temporaryStatusService.readHomepage(context);
assert.equal(temporaryStatusResponse.status, 202);
await sleep(25);
const temporaryStatusMiddleware = createHomepageAggregateNodeMiddleware({
  service: temporaryStatusService,
  resolveRequestContext: () => context
});
const temporaryStatusHttpServer = createServer((request, response) => (
  temporaryStatusMiddleware(request, response, () => {
    response.statusCode = 404;
    response.end();
  })
));
await new Promise((resolve, reject) => temporaryStatusHttpServer.listen(
  0,
  '127.0.0.1',
  error => error ? reject(error) : resolve()
));
try {
  const origin = `http://127.0.0.1:${temporaryStatusHttpServer.address().port}`;
  const deferredHttp = await fetch(`${origin}/api/v1/sync-jobs/${temporaryStatusResponse.body.syncId}`);
  assert.equal(deferredHttp.status, 200, '临时鉴权超时的首页状态接口必须保持 HTTP 200');
  const deferredStatus = await deferredHttp.json();
  assert.equal(deferredStatus.code, 'OK');
  assert.equal(deferredStatus.state, 'completed', '临时鉴权刷新不得把已完成任务回退为 running');
  assert.equal(deferredStatus.pollAfterMs, undefined);
  assert.equal(Object.keys(deferredStatus.result.data).length, HOMEPAGE_OPERATION_IDS.length);
  assert.equal(deferredStatus.error, undefined);
  assertTaskEnvelope(deferredStatus, ['completed']);
  const completedHttp = await fetch(`${origin}/api/v1/sync-jobs/${temporaryStatusResponse.body.syncId}`);
  assert.equal(completedHttp.status, 200);
  const completedAfterAuthorization = await completedHttp.json();
  assertTaskEnvelope(completedAfterAuthorization, ['completed']);
  assert.equal(completedAfterAuthorization.state, 'completed');
  assert.equal(Object.keys(completedAfterAuthorization.result.data).length, HOMEPAGE_OPERATION_IDS.length);
} finally {
  await new Promise(resolve => temporaryStatusHttpServer.close(resolve));
}
assert.equal(temporaryStatusBusinessCalls, HOMEPAGE_OPERATION_IDS.length, '状态轮询不得重新执行首页业务 operation');

let homepageStatusAuthorizationFailed = true;
const homepageAuthorizationFailureService = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeBackground(operationId) {
      await sleep(8);
      return homepageSuccess(operationId);
    },
    async executeFresh(operationId) { return this.executeBackground(operationId); },
    async authorizeTaskStatus(_operationId, requestContext) {
      if (homepageStatusAuthorizationFailed) {
        return {
          context: null,
          deferred: false,
          error: { code: 'STATUS_AUTHORIZATION_FAILED', message: '权限状态暂时不可用', status: 502 }
        };
      }
      return { context: requestContext, deferred: false };
    }
  },
  responseBudgetMs: 1,
  taskTimeoutMs: 100,
  prewarm: false,
  idFactory: () => 'sync-homepage-auth-failure-0001'
});
const homepageAuthorizationFailureHandoff = await homepageAuthorizationFailureService.readHomepage(context);
assert.equal(homepageAuthorizationFailureHandoff.status, 202);
await sleep(10);
const homepageAuthorizationFailureStatus = await homepageAuthorizationFailureService.getSyncStatus(
  homepageAuthorizationFailureHandoff.body.syncId,
  context
);
assert.equal(
  homepageAuthorizationFailureStatus.state,
  'completed',
  '首页状态鉴权基础设施失败不得把已完成任务回退为 running'
);
assert.equal(Object.keys(homepageAuthorizationFailureStatus.result.data).length, HOMEPAGE_OPERATION_IDS.length);
homepageStatusAuthorizationFailed = false;
const homepageAuthorizationRecoveredStatus = await homepageAuthorizationFailureService.getSyncStatus(
  homepageAuthorizationFailureHandoff.body.syncId,
  context
);
assert.equal(homepageAuthorizationRecoveredStatus.state, 'completed');

let childFailureSequence = 0;
const childFailureService = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeFresh(operationId) {
      if (operationId === 'COM-005') {
        throw new FeishuProxyError('FEISHU_READ_BUDGET_EXCEEDED', '飞书读取响应超时', 504, { traceId: 'trace-child-failure' });
      }
      return homepageSuccess(operationId, { traceId: `trace-${operationId}` });
    }
  },
  responseBudgetMs: 40,
  taskTimeoutMs: 200,
  idFactory: () => `sync-child-failure-${++childFailureSequence}`,
  prewarm: false
});
const childFailureResponse = await childFailureService.readHomepage(context);
assert.notEqual(childFailureResponse.status, 202, '快速失败任务不得伪装成 HTTP 202 运行态');
assert.equal(childFailureResponse.body.code, 'FEISHU_READ_BUDGET_EXCEEDED');
assert.equal(childFailureResponse.body.retryable, false);
assert.equal(childFailureResponse.body.traceId, 'trace-child-failure');
const childFailureRetry = await childFailureService.readHomepage(context);
assert.notEqual(childFailureRetry.status, 202, '重复的快速失败也不得伪装为运行中的 202');
assert.equal(childFailureRetry.body.code, 'FEISHU_READ_BUDGET_EXCEEDED');

const malformedStrongSectionService = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeFresh(operationId) {
      if (operationId === 'COM-001') {
        return { code: 'OK', data: {}, traceId: 'trace-malformed-strong', sourceUpdatedAt: '2026-10-09T00:00:00.000Z', dataStale: false, isComplete: true };
      }
      return homepageSuccess(operationId);
    }
  },
  responseBudgetMs: 40,
  taskTimeoutMs: 200,
  idFactory: () => 'sync-malformed-strong-0001',
  prewarm: false
});
const malformedStrongResponse = await malformedStrongSectionService.readHomepage(context);
assert.notEqual(malformedStrongResponse.status, 202);
assert.equal(malformedStrongResponse.body.code, 'READ_SUCCESS_SCHEMA_INVALID');
assert.equal(malformedStrongResponse.body.retryable, false);

let transientAuthorizationCalls = 0;
const authorizationFailureService = createHomepageAggregateService({
  readService: {
    async authorizeRequestContext(requestContext) {
      transientAuthorizationCalls += 1;
      if (transientAuthorizationCalls === 1) {
        await sleep(15);
        throw Object.assign(new TypeError('fetch failed'), {
          cause: Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })
        });
      }
      return requestContext;
    },
    peekOperation() { return null; },
    async executeFresh(operationId) { return homepageSuccess(operationId); }
  },
  responseBudgetMs: 3,
  taskTimeoutMs: 100,
  idFactory: () => 'sync-authorization-failure-0001',
  traceIdFactory: () => 'trace-authorization-failure',
  prewarm: false
});
const authorizationFailureResponse = await authorizationFailureService.readHomepage(context);
assert.equal(authorizationFailureResponse.status, 202, '超出响应预算的实时鉴权必须先交接后台任务');
await sleep(25);
const authorizationFailureStatus = await authorizationFailureService.getSyncStatus(
  authorizationFailureResponse.body.syncId,
  context
);
assert.equal(authorizationFailureStatus.state, 'failed');
assertTaskEnvelope(authorizationFailureStatus, ['failed']);
assert.equal(authorizationFailureStatus.error.code, 'HOMEPAGE_AUTHORIZATION_FAILED');
assert.equal(authorizationFailureStatus.error.stage, 'authorization');
assert.equal(authorizationFailureStatus.error.status, 502);
assert.equal(authorizationFailureStatus.error.traceId, 'trace-authorization-failure');

const rawChildFailureService = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeFresh(operationId) {
      if (operationId === 'WB-001') throw new TypeError('unexpected internal implementation detail');
      return homepageSuccess(operationId);
    }
  },
  responseBudgetMs: 40,
  taskTimeoutMs: 100,
  idFactory: () => 'sync-raw-child-failure-0001',
  prewarm: false
});
const rawChildFailureResponse = await rawChildFailureService.readHomepage(context);
assert.notEqual(rawChildFailureResponse.status, 202);
assert.equal(rawChildFailureResponse.body.code, 'HOMEPAGE_SECTION_FAILED');
assert.equal(rawChildFailureResponse.body.retryable, false);

let deadlineActive = 0;
const deadlineAggregate = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeFresh(operationId, input, requestContext) {
      deadlineActive += 1;
      return new Promise((resolve, reject) => {
        const finish = () => { deadlineActive -= 1; };
        const timer = setTimeout(() => {
          finish();
          resolve(homepageSuccess(operationId));
        }, 80);
        requestContext.syncAbortSignal.addEventListener('abort', () => {
          clearTimeout(timer);
          setTimeout(() => {
            finish();
            reject(requestContext.syncAbortSignal.reason);
          }, 8);
        }, { once: true });
      });
    }
  },
  responseBudgetMs: 5,
  taskTimeoutMs: 30,
  idFactory: () => 'sync-deadline-0001',
  prewarm: false
});
const deadlineAggregateResponse = await deadlineAggregate.readHomepage(context);
assert.equal(deadlineAggregateResponse.status, 202);
await sleep(40);
const deadlineAggregateStatus = await deadlineAggregate.getSyncStatus(deadlineAggregateResponse.body.syncId, context);
assert.equal(deadlineAggregateStatus.state, 'failed', '首页任务必须在 25 秒生产硬截止的缩短测试值内进入终态');
assertTaskEnvelope(deadlineAggregateStatus, ['failed']);
assert.equal(deadlineAggregateStatus.error.code, 'READ_SYNC_DEADLINE_EXCEEDED');
assert.equal(deadlineActive, 0, 'deadline 任务进入 failed 前必须 drain 全部五个子操作');

let drainActive = 0;
const drainSettled = new Set();
let drainSiblingAborted = false;
const drainService = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeFresh(operationId, input, requestContext) {
      drainActive += 1;
      if (operationId === 'COM-001') {
        drainActive -= 1;
        drainSettled.add(operationId);
        throw new FeishuProxyError('HOMEPAGE_CHILD_FAILED', '首页子操作失败', 502, { operationId });
      }
      return new Promise((resolve, reject) => {
        const finish = () => {
          drainActive -= 1;
          drainSettled.add(operationId);
        };
        const timer = setTimeout(() => {
          finish();
          resolve(homepageSuccess(operationId));
        }, 150);
        requestContext.syncAbortSignal.addEventListener('abort', () => {
          drainSiblingAborted = true;
          clearTimeout(timer);
          setTimeout(() => {
            finish();
            reject(requestContext.syncAbortSignal.reason);
          }, 8);
        }, { once: true });
      });
    }
  },
  responseBudgetMs: 3,
  taskTimeoutMs: 200,
  idFactory: () => 'sync-homepage-drain-0001',
  traceIdFactory: () => 'trace-homepage-drain-0001',
  prewarm: false
});
const drainResponse = await drainService.readHomepage(context);
assert.equal(drainResponse.status, 202);
assertHandoffEnvelope(drainResponse.body);
await sleep(180);
const drainedFailure = await drainService.getSyncStatus(drainResponse.body.syncId, context);
assert.equal(drainedFailure.state, 'failed', '子操作失败后首页任务应在其余子操作完成后进入稳定终态');
assert.equal(drainActive, 0, '任务进入 failed 前必须没有仍活动的首页子操作');
assert.deepEqual([...drainSettled].sort(), [...HOMEPAGE_OPERATION_IDS].sort());
assert.equal(drainSiblingAborted, false, '普通子操作失败不得取消其他子操作并回滚其独立缓存');

let slowCompositeCommitFinished = false;
const slowCompositeCommitAggregate = createHomepageAggregateService({
  readService: {
    peekOperation() { return null; },
    async executeFresh(operationId) { return homepageSuccess(operationId); },
    async commitCompositeCache(operationId, input, requestContext, value) {
      await sleep(80);
      slowCompositeCommitFinished = true;
      return value;
    },
    async authorizeTaskStatus(operationId, requestContext) { return { context: requestContext, deferred: false }; }
  },
  responseBudgetMs: 5,
  taskTimeoutMs: 30,
  idFactory: () => 'sync-slow-composite-commit-0001',
  prewarm: false
});
const slowCompositeCommitResponse = await slowCompositeCommitAggregate.readHomepage(context);
assert.equal(slowCompositeCommitResponse.status, 202);
await sleep(40);
const slowCompositeCommitStatus = await slowCompositeCommitAggregate.getSyncStatus(
  slowCompositeCommitResponse.body.syncId,
  context
);
assert.equal(slowCompositeCommitStatus.state, 'failed', '首页 25 秒硬截止必须覆盖 HOM-001 持久提交与 readback');
assert.equal(slowCompositeCommitStatus.error.code, 'READ_SYNC_DEADLINE_EXCEEDED');
await sleep(60);
assert.equal(slowCompositeCommitFinished, true);
assert.equal(
  (await slowCompositeCommitAggregate.getSyncStatus(slowCompositeCommitResponse.body.syncId, context)).state,
  'failed',
  '截止后的迟到 commit 不得把 failed 任务重新改成 completed'
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
      const value = homepageSuccess(operationId);
      lifecycleCache.set(operationId, value);
      return value;
    }
  },
  now: () => lifecycleNow,
  taskRetentionMs: 600_000,
  idFactory: () => 'sync-expiry-0001',
  prewarm: false
});
const lifecycleResponse = await lifecycleService.readHomepage(context);
assert.equal(lifecycleResponse.status, 200);
lifecycleNow += 600_001;
assert.equal((await lifecycleService.getSyncStatus('sync-expiry-0001', context)).state, 'expired', '终态至少保留十分钟，之后进入 expired 状态');
const expiredStatus = await lifecycleService.getSyncStatus('sync-expiry-0001', context);
assertTaskEnvelope(expiredStatus, ['expired']);
assert.equal(expiredStatus.error.code, 'SYNC_JOB_EXPIRED');
assert.equal(expiredStatus.error.retryable, false);

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
assert.equal((await staleService.getSyncStatus(stale.body.syncId, context)).state, 'failed');
const staleAfterFailure = await staleService.readHomepage(context);
assert.equal(staleAfterFailure.status, 200);
assert.equal(staleAfterFailure.body.aggregateState, 'stale');
assert.equal(staleAfterFailure.body.refreshing, true, 'LKG 必须先返回，并启动新的静默受控刷新');
await sleep(20);
assert.equal(staleCalls.length, HOMEPAGE_OPERATION_IDS.length * 2, '失败任务退出 active 后，LKG 后台刷新必须创建新任务');

const finalAggregateBody = {
  code: 'OK', schemaVersion: 'homepage-aggregate.v3', aggregateState: 'fresh', data: Object.fromEntries(HOMEPAGE_OPERATION_IDS.map(id => [id, { id }])),
  sections: Object.fromEntries(HOMEPAGE_OPERATION_IDS.map(id => [id, {
    state: 'fresh', available: true, data: { id }, traceId: `trace-${id}`,
    sourceUpdatedAt: '2026-09-24T00:00:00.000Z', dataStale: false, isComplete: true, retryable: false
  }])),
  dataStale: false, refreshing: false, syncId: null,
  sourceUpdatedAt: '2026-09-24T00:00:00.000Z', traceId: 'trace-fresh'
};
const aggregateResponses = [{
  status: 202,
  body: { code: 'HOMEPAGE_SYNCING', state: 'running', syncId: 'sync-client-0001', pollAfterMs: 2000, traceId: 'trace-cold' }
}];
let aggregateLoads = 0;
let aggregatePolls = 0;
let individualCalls = 0;
const source = createPageDataSource({
  route: '/workbench',
  runtime: { mode: 'remote', testWritesEnabled: false },
  client: { async execute() { individualCalls += 1; throw new Error('must not execute'); } },
  homepageClient: {
    async load() { return aggregateResponses[aggregateLoads++]; },
    async status() { aggregatePolls += 1; return { code: 'OK', syncId: 'sync-client-0001', state: 'completed', traceId: 'trace-complete', result: finalAggregateBody }; }
  },
  operationResolver: operationId => ({ ...getOperation(operationId), remoteEnabled: true })
});
const first = await source.load();
assert.equal(first.state, 'initial-syncing');
assert.equal(first.syncId, 'sync-client-0001');
const completed = await source.pollSync();
assert.equal(completed.state, 'normal');
assert.equal(aggregateLoads, 1, '同步完成后必须直接使用状态接口结果，不得重发首页聚合接口');
assert.equal(aggregatePolls, 1);
assert.equal(individualCalls, 0, '首页聚合流程不得调用五个独立接口');

let middlewareReads = 0;
let middlewareStatusReads = 0;
const middleware = createHomepageAggregateNodeMiddleware({
  service: {
    async readHomepage(requestContext) {
      middlewareReads += 1;
      assert.ok(Number.isFinite(requestContext.requestReceivedAtMs), 'Node 中间件必须传递服务收件时间');
      return {
        status: 202,
        body: {
          code: 'HOMEPAGE_SYNCING', message: '请求处理中', state: 'running', syncId: 'sync-http-0001', pollAfterMs: 2000,
          operationId: 'HOMEPAGE', createdAt: '2026-10-10T00:00:00.000Z',
          updatedAt: '2026-10-10T00:00:00.000Z', traceId: 'trace-http'
        }
      };
    },
    getSyncStatus(syncJobId) {
      middlewareStatusReads += 1;
      if (syncJobId === 'sync-http-forbidden') {
        throw new FeishuProxyError('SYNC_JOB_ACCESS_DENIED', '无权查看该同步任务', 403);
      }
      if (syncJobId === 'sync-http-queued') {
        return {
          code: 'OK', syncId: syncJobId, operationId: 'HOMEPAGE', state: 'queued', pollAfterMs: 2_000,
          createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z', traceId: 'trace-http-queued'
        };
      }
      if (syncJobId === 'sync-http-expired') {
        return {
          code: 'OK', syncId: syncJobId, operationId: 'HOMEPAGE', state: 'expired',
          createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:10:01.000Z', traceId: 'trace-http-expired',
          error: { code: 'SYNC_JOB_EXPIRED', message: '同步任务状态已过期', status: 410, retryable: false, traceId: 'trace-http-expired' }
        };
      }
      if (syncJobId === 'sync-http-failed') {
        return {
          code: 'OK', syncId: syncJobId, operationId: 'HOMEPAGE', state: 'failed',
          createdAt: '2026-10-10T00:00:00.000Z',
          updatedAt: '2026-10-10T00:00:01.000Z', traceId: 'trace-http-failed',
          error: { code: 'UPSTREAM_DOWN', message: '首页数据同步失败', status: 503, retryable: false, operationId: 'COM-005' }
        };
      }
      return {
        code: 'OK', syncId: syncJobId, operationId: 'HOMEPAGE', state: 'running',
        pollAfterMs: 2_000, createdAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-10T00:00:00.000Z', traceId: 'trace-http'
      };
    },
    getReadiness() { return runtimeCacheReadiness.getReadiness(); }
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
  assertHandoffEnvelope(await aggregateHttp.json());
  const statusHttp = await fetch(`${httpOrigin}/api/v1/sync-jobs/sync-http-0001`);
  assert.equal(statusHttp.status, 200);
  assertTaskEnvelope(await statusHttp.json(), ['running']);
  const queuedStatusHttp = await fetch(`${httpOrigin}/api/v1/sync-jobs/sync-http-queued`);
  assert.equal(queuedStatusHttp.status, 200);
  assertTaskEnvelope(await queuedStatusHttp.json(), ['queued']);
  const failedStatusHttp = await fetch(`${httpOrigin}/api/v1/sync-jobs/sync-http-failed`);
  assert.equal(failedStatusHttp.status, 200, '首页任务执行失败不得映射为 HTTP 500/504');
  const failedStatusBody = await failedStatusHttp.json();
  assert.equal(failedStatusBody.state, 'failed');
  assert.equal(failedStatusBody.error.retryable, false);
  assertTaskEnvelope(failedStatusBody, ['failed']);
  const forbiddenStatusHttp = await fetch(`${httpOrigin}/api/v1/sync-jobs/sync-http-forbidden`);
  assert.equal(forbiddenStatusHttp.status, 403);
  const forbiddenStatusBody = await forbiddenStatusHttp.json();
  assert.equal(forbiddenStatusBody.code, 'SYNC_JOB_ACCESS_DENIED');
  assert.equal(forbiddenStatusBody.retryable, false);
  const expiredStatusHttp = await fetch(`${httpOrigin}/api/v1/sync-jobs/sync-http-expired`);
  assert.equal(expiredStatusHttp.status, 200);
  assertTaskEnvelope(await expiredStatusHttp.json(), ['expired']);
  const badMethod = await fetch(`${httpOrigin}/api/v1/homepage`);
  assert.equal(badMethod.status, 405);
  const readyHttp = await fetch(`${httpOrigin}/api/v1/health/ready`);
  assert.equal(readyHttp.status, 200);
  runtimePersistentHealth = { enabled: true, healthy: false, lastError: 'ENOSPC', writeSuspended: true };
  const failedReadyHttp = await fetch(`${httpOrigin}/api/v1/health/ready`);
  assert.equal(failedReadyHttp.status, 503, 'ready 后持久缓存故障必须让健康端点返回 503');
  assert.equal((await failedReadyHttp.json()).errorCode, 'CACHE_RUNTIME_UNAVAILABLE');
  runtimePersistentHealth = { enabled: true, healthy: true, lastError: null, writeSuspended: false };
  assert.equal(middlewareReads, 1);
  assert.equal(middlewareStatusReads, 5, '状态路由只能查询任务状态');
} finally {
  await new Promise(resolve => httpServer.close(resolve));
}

console.log(`homepage aggregate single-flight, lightweight polling, stale fallback, and client flow passed; warm p95=${warmP95.toFixed(2)}ms`);
