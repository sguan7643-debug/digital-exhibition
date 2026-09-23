import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

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
  ['COM-005', { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE', 'MATERIAL_CATEGORY'], includeDisabled: false }, userA],
  ['WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, userA],
  ['WB-002', { page: 1, pageSize: 20 }, userA]
];
const warmed = await Promise.all(inputs.map(([operationId, input, context]) => service.execute(operationId, input, context)));
assert.equal(calls.length, callsAfterWarmup, 'P0 热态读取不得再次访问飞书');
assert.ok(warmed.every(result => result.cacheStatus === 'fresh' && result.dataStale === false));

const userBResult = await service.execute('COM-001', {}, userB);
assert.equal(userBResult.data.displayName, '用户乙', '用户缓存必须按身份隔离');
assert.equal(calls.length, callsAfterWarmup + 4, '新用户只应读取四张按身份过滤的用户表');
assert.ok(calls.filter(call => call.tableName === '应用收藏').every(call => call.filter.includes('CurrentValue.[用户ID]')), '大用户表必须在飞书侧按身份过滤');

const userDictionaryCalls = calls.filter(call => call.tableName === '用户字典');
assert.equal(userDictionaryCalls.length, 1, '同表不同字段投影必须合并为一次原始表读取');

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
await assert.rejects(
  coldService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA),
  error => error.code === 'FEISHU_INITIAL_SYNCING' && error.status === 202 && error.retryAfterSeconds === 2
);
assert.ok(Date.now() - coldStartedAt < 100, '真正冷启动必须快速返回首次同步状态');
await coldService.waitForIdle();
const afterColdSync = await coldService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, userA);
assert.equal(afterColdSync.cacheStatus, 'fresh', '后台同步完成后必须转为新鲜缓存');
assert.equal(coldCalls.length, 1, '首次同步必须在后台完成实际飞书读取且不重复回源');

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
assert.ok(peakPrewarmReads > 1 && peakPrewarmReads <= 4, '预热应采用最多四路受控并发，不得逐表串行');

let retryClock = 10_000;
let retryCalls = 0;
const retryService = createFeishuReadOnlyService({
  identifierContract,
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

console.log('Feishu P0 warm cache, cold syncing, identity isolation, table merge, and stale refresh passed');
