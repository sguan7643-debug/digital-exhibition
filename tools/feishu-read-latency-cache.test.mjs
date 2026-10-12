import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import {
  createFeishuReadOnlyService,
  resolveFeishuReadBudgetMs,
  resolveFeishuReadHandoffBudgetMs
} from '../server/feishu-read-only-service.mjs';
import { createFeishuOperationDispatcher } from '../server/feishu-proxy-handler.mjs';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

assert.equal(resolveFeishuReadBudgetMs(undefined), 35_000, '整表读取预算默认应为35秒');
assert.equal(resolveFeishuReadBudgetMs(50_000), 50_000, '整表读取预算不得再被15秒硬上限截断');
assert.equal(resolveFeishuReadHandoffBudgetMs(5_000), 4_500, '五秒合同必须预留500ms序列化与网络传输时间');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const tableNameById = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const calls = [];
let clock = 1_000_000;

const service = createFeishuReadOnlyService({
  identifierContract,
  readNow: () => clock,
  cacheNow: () => clock,
  now: () => new Date(clock),
  tableReadCacheMs: 60_000,
  realtimeAuthorization: false,
  operationCachePolicies: {
    'COM-001': { freshMs: 30_000, staleMs: 300_000, scope: 'user' },
    'COM-002': { freshMs: 30_000, staleMs: 300_000, scope: 'user' },
    'COM-005': { freshMs: 60_000, staleMs: 900_000, scope: 'tenant' },
    'WB-001': { freshMs: 30_000, staleMs: 300_000, scope: 'user' },
    'WB-002': { freshMs: 60_000, staleMs: 900_000, scope: 'tenant' }
  },
  client: {
    async listRecords(tableId, query = {}) {
      calls.push({ tableName: tableNameById.get(tableId), fieldNames: query.fieldNames || [], filter: query.filter || '' });
      await new Promise(resolve => setTimeout(resolve, 2));
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});

const userA = { identity: { userId: 'user-a', adAccount: 'user-a', displayName: '用户甲', tenantKey: 'tenant-1' } };
const userB = { identity: { userId: 'user-b', adAccount: 'user-b', displayName: '用户乙', tenantKey: 'tenant-1' } };

await service.prewarm({ identities: [userA] });
const callsAfterWarmup = calls.length;
assert.ok(callsAfterWarmup > 0, '预热必须真实建立飞书表快照');

const inputs = [
  ['COM-001', {}, userA],
  ['COM-002', { platform: 'WEB' }, userA],
  ['COM-005', { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false }, userA],
  ['WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, userA],
  ['WB-002', { page: 1, pageSize: 20 }, userA]
];
const warmed = await Promise.all(inputs.map(([operationId, input, context]) => service.execute(operationId, input, context)));
assert.equal(calls.length, callsAfterWarmup, 'P0 热态读取不得再次访问飞书');
assert.ok(warmed.every(result => result.cacheStatus === 'fresh' && result.dataStale === false));

const userBResult = await service.execute('COM-001', {}, userB);
assert.equal(userBResult.data.displayName, '用户乙', '用户缓存必须按身份隔离');
assert.equal(calls.length, callsAfterWarmup + 2, '新用户身份投影只应读取用户与权限两张有界表');

const userDictionaryCalls = calls.filter(call => call.tableName === '用户字典');
assert.equal(userDictionaryCalls.length, 3, '公共应用投影与两个用户的有界身份投影必须保持隔离键');
assert.ok(userDictionaryCalls.some(call => call.filter.includes('CurrentValue.[AD账号]') && call.filter.includes('user-b')), 'COM-001 不得全表扫描用户字典');

clock += 61_000;
const stale = await service.execute('WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, userA);
assert.equal(stale.dataStale, true, '过期但仍在窗口内的快照应立即降级返回');
assert.equal(stale.refreshing, true, '陈旧快照必须标记后台刷新中');
await service.waitForIdle();
assert.ok(calls.length > callsAfterWarmup, '后台刷新必须真实回源');

const refreshed = await service.execute('WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, userA);
assert.equal(refreshed.cacheStatus, 'fresh');
assert.equal(refreshed.dataStale, false);

const coldCalls = [];
const coldService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 20,
  client: {
    async listRecords(tableId) {
      coldCalls.push(tableNameById.get(tableId));
      await new Promise(resolve => setTimeout(resolve, 80));
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const coldStartedAt = Date.now();
let coldSyncError;
try {
  await coldService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
} catch (error) {
  coldSyncError = error;
}
assert.equal(coldSyncError?.code, 'FEISHU_INITIAL_SYNCING');
assert.equal(coldSyncError?.status, 202);
assert.equal(coldSyncError?.message, '请求处理中');
assert.doesNotMatch(coldSyncError?.message || '', /正式飞书数据|首次同步/);
assert.equal(coldSyncError?.retryAfterSeconds, 2);
assert.match(coldSyncError?.syncId || '', /^read-/);
assert.ok(Date.now() - coldStartedAt < 100, '真正冷启动必须快速返回首次同步状态');
const runningSync = await coldService.getReadSyncStatus(coldSyncError.syncId, userA);
assert.equal(runningSync.state, 'running');
assert.equal(runningSync.operationId, 'COM-005');
assert.ok(Number.isInteger(runningSync.pollAfterMs) && runningSync.pollAfterMs > 0);
await assert.rejects(() => coldService.getReadSyncStatus(coldSyncError.syncId, userB), error => error.code === 'SYNC_JOB_FORBIDDEN');
const backgroundResult = await coldService.executeBackground('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
assert.equal(backgroundResult.code, 'OK', '聚合后台读取必须等待共享回源完成，不能再次触发5秒同步响应');
await sleep(0);
const completedSync = await coldService.getReadSyncStatus(coldSyncError.syncId, userA);
assert.equal(completedSync.state, 'completed');
assert.equal(completedSync.result.code, 'OK', '同步任务完成后必须直接携带结果，前端无需重发原 operation');
const afterColdSync = await coldService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
assert.equal(afterColdSync.cacheStatus, 'fresh', '后台同步完成后必须转为新鲜缓存');
assert.equal(coldCalls.length, 1, '首次同步必须在后台完成实际飞书读取且不重复回源');

let restoreCompleted = false;
const delayedRestoreService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 15,
  persistentCache: {
    async restore() { await sleep(60); restoreCompleted = true; return []; },
    enqueue() {},
    async flush() {},
    metrics() { return { enabled: true, lastError: null }; }
  },
  client: {
    async listRecords() { return { items: [], total: 0, hasMore: false, nextPageToken: '' }; }
  }
});
const delayedRestoreStartedAt = Date.now();
let delayedRestoreHandoff;
try {
  await delayedRestoreService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
} catch (error) {
  delayedRestoreHandoff = error;
}
assert.equal(delayedRestoreHandoff?.code, 'FEISHU_INITIAL_SYNCING');
assert.equal(restoreCompleted, false, '五秒接管不得等待持久快照恢复结束后才开始计时');
assert.ok(Date.now() - delayedRestoreStartedAt < 50, '持久恢复延迟必须计入首响应预算');
await sleep(80);
await delayedRestoreService.waitForIdle();
assert.equal((await delayedRestoreService.getReadSyncStatus(delayedRestoreHandoff.syncId, userA)).state, 'completed');
delayedRestoreService.close();

let authorizationReads = 0;
const delayedAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 15,
  client: {
    async listRecords(tableId) {
      if (tableNameById.get(tableId) === '用户权限') {
        authorizationReads += 1;
        await sleep(60);
        return {
          items: [{
            record_id: 'delayed-authorization',
            fields: { 'AD账号': 'user-a', '状态': '启用', '权限编码': 'talent.view', '数据范围': ['org-a'], '启用': true }
          }],
          total: 1,
          hasMore: false,
          nextPageToken: ''
        };
      }
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const delayedAuthorizationStartedAt = Date.now();
let delayedAuthorizationHandoff;
try {
  await delayedAuthorizationService.execute('TAL-002', { page: 1, pageSize: 10 }, userA);
} catch (error) {
  delayedAuthorizationHandoff = error;
}
assert.equal(delayedAuthorizationHandoff?.code, 'FEISHU_INITIAL_SYNCING');
assert.ok(Date.now() - delayedAuthorizationStartedAt < 50, '实时鉴权延迟必须计入首响应预算');
await sleep(80);
await delayedAuthorizationService.waitForIdle();
assert.equal((await delayedAuthorizationService.getReadSyncStatus(delayedAuthorizationHandoff.syncId, userA)).state, 'completed');
assert.ok(authorizationReads >= 2, '初始请求与任务查询都必须实时读取权限');
delayedAuthorizationService.close();

let activePrewarmReads = 0;
let peakPrewarmReads = 0;
const parallelPrewarmService = createFeishuReadOnlyService({
  identifierContract,
  client: {
    async listRecords() {
      activePrewarmReads += 1;
      peakPrewarmReads = Math.max(peakPrewarmReads, activePrewarmReads);
      await new Promise(resolve => setTimeout(resolve, 4));
      activePrewarmReads -= 1;
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
await parallelPrewarmService.prewarm();
assert.ok(peakPrewarmReads > 1 && peakPrewarmReads <= 3, '预热和后台同步必须采用最多三路受控并发');

let tenantPrewarmCalls = 0;
const tenantPrewarmService = createFeishuReadOnlyService({
  identifierContract,
  tableReadCacheMs: 0,
  client: {
    async listRecords() {
      tenantPrewarmCalls += 1;
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
await tenantPrewarmService.prewarm();
const callsAfterTenantPrewarm = tenantPrewarmCalls;
const tenantDictionaryInput = {
  dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'],
  includeDisabled: false
};
const tenantSearchInput = { page: 1, pageSize: 20, sort: 'RELEVANCE' };
assert.equal((await tenantPrewarmService.execute('COM-005', tenantDictionaryInput, userA)).cacheStatus, 'fresh');
assert.equal((await tenantPrewarmService.execute('WB-002', tenantSearchInput, userB)).cacheStatus, 'fresh');
assert.equal(
  tenantPrewarmCalls,
  callsAfterTenantPrewarm,
  '启动预热与同租户真实用户必须共享租户级 operation 缓存键，不能依赖底层表缓存碰巧兜底'
);
tenantPrewarmService.close();

const sharedProjectionCalls = new Map();
const sharedProjectionService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  client: {
    async listRecords(tableId) {
      const tableName = tableNameById.get(tableId);
      const count = (sharedProjectionCalls.get(tableName) || 0) + 1;
      sharedProjectionCalls.set(tableName, count);
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const sharedUserResult = await sharedProjectionService.runWithSharedReadBatch(
  () => sharedProjectionService.executeBackground('COM-001', {}, userA)
);
assert.equal(sharedUserResult.code, 'OK');
const sharedWorkbenchResult = await sharedProjectionService.runWithSharedReadBatch(
  () => sharedProjectionService.executeBackground('WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, userA)
);
assert.equal(sharedWorkbenchResult.code, 'OK');
assert.equal(sharedProjectionCalls.get('应用收藏'), undefined, '身份首屏不得扫描收藏表');
assert.equal(sharedProjectionCalls.get('消息通知'), undefined, '身份首屏不得扫描消息表');
assert.equal(sharedProjectionCalls.get('积分余额'), undefined, '身份首屏不得扫描积分表');
assert.equal(sharedProjectionCalls.get('用户字典'), 2, '当前用户有界读取与应用目录公共投影不得共用无过滤快照');
sharedProjectionService.close();

let retryClock = 10_000;
let retryCalls = 0;
const retryService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  readNow: () => retryClock,
  readSleep: async () => {},
  client: {
    async listRecords() {
      retryCalls += 1;
      if (retryCalls === 1) {
        retryClock += 11_000;
        throw Object.assign(new Error('transient upstream timeout'), { code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504 });
      }
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const retryResult = await retryService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
assert.equal(retryResult.code, 'OK', '一次上游超时后必须获得完整的独立重试预算');
assert.equal(retryCalls, 2);

let insufficientRunwayClock = 20_000;
let insufficientRunwayCalls = 0;
const insufficientRunwayService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  readNow: () => insufficientRunwayClock,
  readSleep: async () => {},
  client: {
    async listRecords() {
      insufficientRunwayCalls += 1;
      insufficientRunwayClock += 16_000;
      throw Object.assign(new Error('slow upstream timeout'), { code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504 });
    }
  }
});
await assert.rejects(
  () => insufficientRunwayService.executeBackground('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA),
  error => error.code === 'FEISHU_UPSTREAM_TIMEOUT'
);
assert.equal(insufficientRunwayCalls, 1, '剩余不足一次有效读取窗口时不得启动注定失败的第二、三次尝试');
insufficientRunwayService.close();

let taskRetryCalls = 0;
const taskRetryDelays = [];
const taskRetryService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  readSleep: async milliseconds => { taskRetryDelays.push(milliseconds); },
  client: {
    async listRecords() {
      taskRetryCalls += 1;
      if (taskRetryCalls < 3) throw Object.assign(new Error('temporary server failure'), { code: 'UPSTREAM_DOWN', status: 500 });
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const taskRetryResult = await taskRetryService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
assert.equal(taskRetryResult.code, 'OK');
assert.equal(taskRetryCalls, 3, '后台同步任务最多采用三次受控尝试');
assert.deepEqual(taskRetryDelays, [500, 1000], '任务退避必须固定为 500ms、1000ms 且上限 1000ms');

let retentionClock = 50_000;
const retentionService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  cacheNow: () => retentionClock,
  coldMissBudgetMs: 5,
  client: {
    async listRecords() {
      await new Promise(resolve => setTimeout(resolve, 20));
      throw Object.assign(new Error('non-retryable failure'), { code: 'INVALID_UPSTREAM_RESPONSE', status: 400 });
    }
  }
});
let retainedJobError;
try {
  await retentionService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
} catch (error) {
  retainedJobError = error;
}
assert.equal(retainedJobError?.code, 'FEISHU_INITIAL_SYNCING');
await retentionService.waitForIdle();
await sleep(0);
const retainedFailure = await retentionService.getReadSyncStatus(retainedJobError.syncId, userA);
assert.equal(retainedFailure.state, 'failed');
assert.deepEqual(retainedFailure.error, {
  code: 'INVALID_UPSTREAM_RESPONSE',
  message: '数据同步失败',
  status: 400,
  retryable: false
});
retentionClock += 600_000;
assert.equal((await retentionService.getReadSyncStatus(retainedJobError.syncId, userA)).state, 'failed', '终态必须至少保留十分钟');
retentionClock += 1;
const retentionDispatcher = createFeishuOperationDispatcher({ service: retentionService, resolveRequestContext: () => userA });
const expiredResponse = await retentionDispatcher({ method: 'GET', url: `/api/v1/operations/sync-jobs/${retainedJobError.syncId}`, headers: {} });
assert.equal(expiredResponse.status, 200);
assert.equal(expiredResponse.body.state, 'expired', '终态保留期后必须先以 HTTP 200 合同返回 expired');
retentionClock += 600_001;
await assert.rejects(() => retentionService.getReadSyncStatus(retainedJobError.syncId, userA), error => error.code === 'SYNC_JOB_NOT_FOUND');

let deadlineCalls = 0;
let deadlineAborts = 0;
const deadlineService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 30,
  client: {
    async listRecords(_tableId, _query, { signal } = {}) {
      deadlineCalls += 1;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 80);
        const abort = () => {
          deadlineAborts += 1;
          clearTimeout(timer);
          reject(signal.reason || new Error('aborted'));
        };
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
let deadlineHandoff;
try {
  await deadlineService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
} catch (error) {
  deadlineHandoff = error;
}
assert.equal(deadlineHandoff?.status, 202, '五秒接管的缩短测试预算必须先返回兼容任务合同');
await deadlineService.waitForIdle();
await sleep(0);
const deadlineStatus = await deadlineService.getReadSyncStatus(deadlineHandoff.syncId, userA);
assert.equal(deadlineStatus.state, 'failed', '同步任务必须在硬截止前进入终态');
assert.equal(deadlineStatus.error.code, 'READ_SYNC_DEADLINE_EXCEEDED');
assert.equal(deadlineStatus.error.status, 504);
const callsAtDeadline = deadlineCalls;
await sleep(80);
assert.equal(deadlineCalls, callsAtDeadline, '硬截止后不得再启动分页或重试调用');
assert.ok(deadlineAborts >= 1, '硬截止必须中止正在进行的上游读取');
assert.equal(deadlineService.getPerformanceSnapshot().cache.entries, 0, '硬截止后的迟到结果不得写入 operation 缓存');
assert.equal(deadlineService.getPerformanceSnapshot().cache.tableEntries, 0, '硬截止后的迟到结果不得写入底层表缓存');
deadlineService.close();

let queuedStartedCalls = 0;
let queuedStartedAborts = 0;
const queuedDeadlineService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 35,
  maxSyncConcurrency: 1,
  client: {
    async listRecords(_tableId, _query, { signal } = {}) {
      queuedStartedCalls += 1;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 100);
        const abort = () => {
          queuedStartedAborts += 1;
          clearTimeout(timer);
          reject(signal.reason || new Error('aborted'));
        };
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const queuedHandoffs = await Promise.all([
  queuedDeadlineService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA).catch(error => error),
  queuedDeadlineService.execute('COM-005', { dictTypes: ['BUSINESS_DOMAIN'], includeDisabled: false }, userA).catch(error => error)
]);
assert.ok(queuedHandoffs.every(error => error?.status === 202), '排队中的冷请求也必须先返回同步任务合同');
await queuedDeadlineService.waitForIdle();
await sleep(0);
assert.equal(queuedStartedCalls, 1, '截止前未获得同步槽的队列项必须被移除且不得启动');
assert.equal(queuedStartedAborts, 1, '占用同步槽的请求必须在硬截止时中止');
assert.equal(queuedDeadlineService.getPerformanceSnapshot().inflight.feishuSyncs, 0, '中止后活动同步槽必须归零');
assert.equal(queuedDeadlineService.getPerformanceSnapshot().inflight.queuedFeishuSyncs, 0, '中止后等待队列必须归零');
queuedDeadlineService.close();

let contactDeadlineCalls = 0;
let contactDeadlineAborts = 0;
const contactDeadlineService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 30,
  maxSyncConcurrency: 1,
  client: {
    async listDepartmentChildren(_departmentId, _query, { signal } = {}) {
      contactDeadlineCalls += 1;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 80);
        const abort = () => {
          contactDeadlineAborts += 1;
          clearTimeout(timer);
          reject(signal.reason || new Error('aborted'));
        };
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
      return { items: [], hasMore: false, nextPageToken: '' };
    },
    async listUsersByDepartment() {
      throw new Error('硬截止后不得开始通讯录用户分页');
    }
  }
});
const contactHandoff = await contactDeadlineService.execute(
  'COM-003',
  { rootId: '0', includeUsers: false, maxDepth: 5 },
  userA
).catch(error => error);
assert.equal(contactHandoff?.status, 202);
await contactDeadlineService.waitForIdle();
await sleep(0);
assert.equal(contactDeadlineCalls, 1);
assert.equal(contactDeadlineAborts, 1, '通讯录分页必须接收并响应任务硬截止 signal');
assert.equal(contactDeadlineService.getPerformanceSnapshot().inflight.feishuSyncs, 0);
assert.equal(contactDeadlineService.getPerformanceSnapshot().inflight.queuedFeishuSyncs, 0);
contactDeadlineService.close();

console.log('Feishu P0 warm cache, cold syncing, identity isolation, table merge, and stale refresh passed');
