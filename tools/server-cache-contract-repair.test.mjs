import assert from 'node:assert/strict';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuCompositeOperationService } from '../server/feishu-composite-operation-service.mjs';
import { createFeishuOperationDispatcher } from '../server/feishu-proxy-handler.mjs';
import { createReadIsolationKey } from '../server/feishu-read-isolation-key.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { runFeishuStartupPrewarmSequence } from '../server/feishu-vite-plugin.mjs';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const context = { identity: { tenantKey: 'tenant-a', userId: 'user-a', adAccount: 'user-a', permissions: ['apps.read'], dataScope: 'org-a' } };

let releaseHomepagePrewarm;
const homepagePrewarmGate = new Promise(resolve => { releaseHomepagePrewarm = resolve; });
const startupPrewarmEvents = [];
const startupPrewarm = runFeishuStartupPrewarmSequence({
  homepagePrewarm: async () => {
    startupPrewarmEvents.push('homepage:start');
    await homepagePrewarmGate;
    startupPrewarmEvents.push('homepage:done');
  },
  onboardingPrewarm: async () => {
    startupPrewarmEvents.push('onboarding:start');
    startupPrewarmEvents.push('onboarding:done');
  }
});
await Promise.resolve();
assert.deepEqual(
  startupPrewarmEvents,
  ['homepage:start'],
  '启动期间入职 Schema 预热不得与首页缓存预热并发争抢飞书接口'
);
releaseHomepagePrewarm();
await startupPrewarm;
assert.deepEqual(
  startupPrewarmEvents,
  ['homepage:start', 'homepage:done', 'onboarding:start', 'onboarding:done'],
  '首页缓存预热结束后才能启动入职 Schema 预热'
);
const failedStartupPrewarmEvents = [];
await assert.rejects(
  runFeishuStartupPrewarmSequence({
    homepagePrewarm: async () => {
      failedStartupPrewarmEvents.push('homepage:failed');
      throw new Error('homepage prewarm failed');
    },
    onboardingPrewarm: async () => {
      failedStartupPrewarmEvents.push('onboarding:started');
    }
  }),
  /homepage prewarm failed/,
  '首页预热异常应保留给调用方处理'
);
assert.deepEqual(
  failedStartupPrewarmEvents,
  ['homepage:failed', 'onboarding:started'],
  '首页预热异常后仍应安全启动独立的入职 Schema 预热'
);

const normalizedKeyA = createReadIsolationKey(
  'COM-005',
  { dictTypes: ['SCENE', 'APPLICATION_TYPE'], includeDisabled: false },
  context
);
const normalizedKeyB = createReadIsolationKey(
  'COM-005',
  { parentValues: {}, dictTypes: ['APPLICATION_TYPE', 'SCENE'] },
  { identity: { ...context.identity, permissions: ['apps.read'], dataScope: ['org-a'] } }
);
assert.equal(normalizedKeyA, normalizedKeyB, '规范化参数、权限集合与数据范围必须生成同一六维键');
assert.notEqual(
  normalizedKeyA,
  createReadIsolationKey('COM-005', { dictTypes: ['APPLICATION_TYPE', 'SCENE'] }, { identity: { ...context.identity, dataScope: 'org-b' } }),
  '任一隔离维度变化都必须生成不同键'
);
assert.equal(
  createReadIsolationKey('APP-002', { query: 'ABC' }, context),
  createReadIsolationKey('APP-002', { query: 'abc' }, context),
  'APP-002 查询大小写等价时必须复用同一规范化键'
);
assert.equal(
  createReadIsolationKey('WB-002', { keyword: ' X ' }, context),
  createReadIsolationKey('WB-002', { keyword: 'x' }, context),
  'WB-002 查询 trim/大小写等价时必须复用同一规范化键'
);
assert.equal(
  createReadIsolationKey('ADM-003', {}, context),
  createReadIsolationKey('ADM-003', {
    keyword: '', operatorId: '', operatorOrgId: '', moduleCode: '', resourceType: '',
    resourceId: '', actionCode: '', resultCode: '', requestId: '', ip: '', startAt: '',
    endAt: '', page: 1, pageSize: 10, sort: ''
  }, context),
  'ADM-003 缺省输入与浏览器显式默认输入必须复用同一六维键'
);
assert.equal(
  createReadIsolationKey('MAT-001', {}, context),
  createReadIsolationKey('MAT-001', {
    query: '', keyword: '', materialType: '', appTypeCode: '', domainId: '', categoryId: ''
  }, context),
  'MAT-001 缺省输入与浏览器空筛选输入必须复用同一六维键'
);

let releaseSnapshot;
let snapshotStarted;
const snapshotGate = new Promise(resolve => { releaseSnapshot = resolve; });
const snapshotStartedPromise = new Promise(resolve => { snapshotStarted = resolve; });
let snapshotFlushes = 0;
let persistenceReads = 0;
const persistenceService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush(provider) {
      snapshotFlushes += 1;
      assert.ok(provider().some(entry => entry.operationId === 'COM-005'), '快照提交必须包含已校验的完整 operation');
      snapshotStarted();
      await snapshotGate;
      return true;
    },
    metrics() { return { enabled: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords() {
      persistenceReads += 1;
      await sleep(15);
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});

const persistenceInput = { dictTypes: ['SCENE', 'APPLICATION_TYPE'], includeDisabled: false };
const persistenceHandoff = await persistenceService.execute('COM-005', persistenceInput, context).catch(error => error);
assert.equal(persistenceHandoff.status, 202);
await snapshotStartedPromise;
const beforeSnapshotCommit = await persistenceService.getReadSyncStatus(persistenceHandoff.syncId, context);
assert.equal(beforeSnapshotCommit.state, 'running', '快照尚未原子提交时任务不得提前 completed');
assert.equal(
  persistenceService.peekOperation('COM-005', persistenceInput, context),
  null,
  '持久快照提交完成前不得提前发布新的内存缓存'
);
releaseSnapshot();
await persistenceService.waitForIdle();
await sleep(0);
const afterSnapshotCommit = await persistenceService.getReadSyncStatus(persistenceHandoff.syncId, context);
assert.equal(afterSnapshotCommit.state, 'completed');
assert.equal(afterSnapshotCommit.result.code, 'OK');
const readsAfterCommit = persistenceReads;
const normalizedHit = await persistenceService.execute(
  'COM-005',
  { parentValues: {}, dictTypes: ['APPLICATION_TYPE', 'SCENE'] },
  context
);
assert.equal(normalizedHit.cacheStatus, 'fresh');
assert.equal(persistenceReads, readsAfterCommit, '任务完成后规范化相同请求必须直接命中内存缓存');
assert.equal(snapshotFlushes, 1, '同一完成任务只提交一次持久快照');
persistenceService.close();

let invalidSchemaFlushes = 0;
const invalidSchemaService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  traceIdFactory: () => '',
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush() { invalidSchemaFlushes += 1; return true; },
    metrics() { return { enabled: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords() {
      await sleep(15);
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const invalidHandoff = await invalidSchemaService.execute(
  'COM-005',
  { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false },
  context
).catch(error => error);
assert.equal(invalidHandoff.status, 202);
await invalidSchemaService.waitForIdle();
await sleep(0);
const invalidDispatcher = createFeishuOperationDispatcher({
  service: invalidSchemaService,
  resolveRequestContext: () => context,
  traceIdFactory: () => 'trace-status-contract'
});
const invalidStatus = await invalidDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${invalidHandoff.syncId}`,
  headers: {}
});
assert.equal(invalidStatus.status, 200, '任务自身失败必须由 HTTP 200 状态合同表达');
assert.equal(invalidStatus.body.state, 'failed');
assert.equal(invalidStatus.body.operationId, 'COM-005');
assert.deepEqual(invalidStatus.body.error, {
  code: 'READ_SUCCESS_SCHEMA_INVALID',
  message: '读取结果未通过成功数据合同校验',
  status: 502,
  retryable: false
});
assert.equal(invalidSchemaFlushes, 0, '未通过 success schema 的结果禁止写入持久快照');
invalidSchemaService.close();

const capacityService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  operationCacheMaxBytes: 1_024,
  client: {
    async listRecords(tableId) {
      await sleep(15);
      const items = tableId === identifierContract.byName.get('应用类型配置').tableId
        ? Array.from({ length: 20 }, (_, index) => ({
            record_id: `type-${index}`,
            fields: {
              '类型编码': `TYPE_${index}`,
              '类型名称': `${index}-${'容量测试'.repeat(30)}`,
              '状态': '启用'
            }
          }))
        : [];
      return { items, total: items.length, hasMore: false, nextPageToken: '' };
    }
  }
});
const capacityHandoff = await capacityService.execute(
  'COM-005',
  { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false },
  context
).catch(error => error);
assert.equal(capacityHandoff.status, 202);
await capacityService.waitForIdle();
await sleep(0);
const capacityStatus = await capacityService.getReadSyncStatus(capacityHandoff.syncId, context);
assert.equal(capacityStatus.state, 'failed', '内存缓存无法保留结果时任务不得标记 completed');
assert.equal(capacityStatus.error.code, 'CACHE_RUNTIME_UNAVAILABLE');
assert.equal(capacityService.peekOperation(
  'COM-005',
  { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false },
  context
), null, '内存容量提交失败后不得留下不可命中的伪完成条目');
capacityService.close();

let prunedSnapshotFlushes = 0;
const prunedSnapshotService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush() {
      prunedSnapshotFlushes += 1;
      return { written: true, keys: [] };
    },
    metrics() { return { enabled: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords() {
      await sleep(15);
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const prunedSnapshotHandoff = await prunedSnapshotService.execute(
  'COM-005',
  { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false },
  context
).catch(error => error);
assert.equal(prunedSnapshotHandoff.status, 202);
await prunedSnapshotService.waitForIdle();
await sleep(0);
const prunedSnapshotStatus = await prunedSnapshotService.getReadSyncStatus(prunedSnapshotHandoff.syncId, context);
assert.equal(prunedSnapshotStatus.state, 'failed', '持久层裁剪当前键时任务必须确定性失败');
assert.equal(prunedSnapshotStatus.error.code, 'CACHE_RUNTIME_UNAVAILABLE');
assert.equal(prunedSnapshotFlushes, 1, '持久层已确认裁剪当前键后不得无限重复提交快照');
prunedSnapshotService.close();

const representativeMemoryService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 0,
  operationCacheMaxEntries: 1,
  client: {
    async listRecords() { return { items: [], total: 0, hasMore: false, nextPageToken: '' }; }
  }
});
await representativeMemoryService.execute('WB-002', {}, context);
assert.ok(representativeMemoryService.peekOperation('WB-002', {}, context), '代表项必须先进入内存缓存');
await assert.rejects(
  () => representativeMemoryService.execute('ANN-002', {}, context),
  error => error.code === 'CACHE_RUNTIME_UNAVAILABLE',
  '内存只剩代表项时应拒绝较低优先级条目，而不是淘汰代表项'
);
assert.ok(representativeMemoryService.peekOperation('WB-002', {}, context), '非代表项不得淘汰 WB-002 代表缓存');
assert.equal(representativeMemoryService.peekOperation('ANN-002', {}, context), null);
representativeMemoryService.close();

let coalescedSnapshotFlushes = 0;
const coalescedSnapshotService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 0,
  persistentCommitCoalesceMs: 25,
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush(provider) {
      coalescedSnapshotFlushes += 1;
      const entries = provider();
      return { written: true, keys: entries.map(entry => entry.key) };
    },
    metrics() { return { enabled: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords() { return { items: [], total: 0, hasMore: false, nextPageToken: '' }; }
  }
});
await Promise.all([
  coalescedSnapshotService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, context),
  coalescedSnapshotService.execute('APP-002', {}, context),
  coalescedSnapshotService.execute('WB-002', {}, context)
]);
assert.equal(coalescedSnapshotFlushes, 1, '并发完成的缓存 operation 必须合并为一次完整快照提交');
coalescedSnapshotService.close();

let batchUpstreamCalls = 0;
const batchService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 20,
  syncTaskTimeoutMs: 1_000,
  client: {
    async listRecords() {
      batchUpstreamCalls += 1;
      await sleep(80);
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const batchCompositeService = createFeishuCompositeOperationService({
  readService: batchService,
  writeService: { async execute() { throw new Error('write not expected'); } }
});
const batchDispatcher = createFeishuOperationDispatcher({ service: batchCompositeService, resolveRequestContext: () => context });
const batchRequest = {
  method: 'POST',
  url: '/api/v1/operations/batch',
  headers: { 'content-type': 'application/json' },
  body: { requests: [
    { operationId: 'COM-005', input: { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false } },
    { operationId: 'APP-002', input: {} }
  ] }
};
const batchStartedAt = performance.now();
const coldBatch = await batchDispatcher(batchRequest);
const coldBatchElapsed = performance.now() - batchStartedAt;
assert.equal(coldBatch.status, 200);
assert.ok(coldBatchElapsed < 100, `缩短预算下批量接口必须及时交接，实际 ${coldBatchElapsed.toFixed(2)}ms`);
assert.ok(coldBatch.body.results.every(item => item.status === 202));
assert.ok(coldBatch.body.results.every(item => item.body.syncId && item.body.pollAfterMs > 0));
await batchService.waitForIdle();
await sleep(0);
for (const item of coldBatch.body.results) {
  const status = await batchDispatcher({ method: 'GET', url: `/api/v1/operations/sync-jobs/${item.body.syncId}`, headers: {} });
  assert.equal(status.status, 200);
  assert.equal(status.body.state, 'completed');
  assert.equal(status.body.operationId, item.operationId);
  assert.equal(status.body.result.code, 'OK');
}
const callsAfterColdBatch = batchUpstreamCalls;
const warmBatch = await batchDispatcher(batchRequest);
assert.ok(warmBatch.body.results.every(item => item.status === 200 && item.body.cacheStatus === 'fresh'));
const singleHit = await batchDispatcher({
  method: 'POST',
  url: '/api/v1/operations/APP-002',
  headers: { 'content-type': 'application/json' },
  body: { operationId: 'APP-002', input: { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' } }
});
assert.equal(singleHit.status, 200);
assert.equal(singleHit.body.cacheStatus, 'fresh');
assert.equal(batchUpstreamCalls, callsAfterColdBatch, '单接口与批量接口必须命中同一套六维缓存');

for (const request of [
  {
    method: 'POST',
    url: '/api/v1/operations/batch',
    headers: { 'content-type': 'application/json' },
    body: { requests: [{ operationId: 'COM-001', input: {} }] }
  },
  {
    method: 'POST',
    url: '/api/v1/operations/batch',
    headers: { 'content-type': 'application/json', 'x-read-consistency': 'fresh' },
    body: { requests: [{ operationId: 'APP-002', input: {} }] }
  }
]) {
  const startedAt = performance.now();
  const response = await batchDispatcher(request);
  assert.equal(response.status, 200);
  assert.ok(performance.now() - startedAt < 100, '强一致和 fresh 批量子项也必须在响应预算内交接');
  assert.equal(response.body.results[0].status, 202);
  assert.ok(response.body.results[0].body.syncId);
}

await batchService.waitForIdle();
const callsBeforeHotRequests = batchUpstreamCalls;
let hotWithinFiveSeconds = 0;
for (let index = 0; index < 30; index += 1) {
  const startedAt = performance.now();
  const response = await batchDispatcher({
    method: 'POST',
    url: '/api/v1/operations/COM-005',
    headers: { 'content-type': 'application/json' },
    body: { operationId: 'COM-005', input: { dictTypes: ['APPLICATION_TYPE'] } }
  });
  if (response.status === 200 && performance.now() - startedAt < 5_000) hotWithinFiveSeconds += 1;
}
assert.ok(hotWithinFiveSeconds >= 27, `30次热请求至少90%须在5秒内完整返回，实际 ${hotWithinFiveSeconds}/30`);
assert.equal(batchUpstreamCalls, callsBeforeHotRequests);
await batchService.waitForIdle();
batchService.close();

console.log('server cache completion, schema gate, startup prewarm ordering, task status, batch handoff, shared key, and 30-request warm-hit contracts passed');
