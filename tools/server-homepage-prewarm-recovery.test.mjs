import assert from 'node:assert/strict';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import {
  createHomepageAggregateService,
  HOMEPAGE_OPERATION_IDS
} from '../server/homepage-aggregate-service.mjs';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const tableNames = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const calls = [];
let delayMs = 0;

const readService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 180,
  client: {
    async listRecords(tableId, query = {}) {
      calls.push({ tableName: tableNames.get(tableId), filter: query.filter || '' });
      if (delayMs) await sleep(delayMs);
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});

await readService.prewarm();
const callsAfterPrewarm = calls.length;
assert.ok(callsAfterPrewarm > 0, '服务启动必须建立首页公共缓存种子');

delayMs = 15;
const homepage = createHomepageAggregateService({
  readService,
  responseBudgetMs: 5,
  taskTimeoutMs: 180,
  prewarm: false,
  idFactory: () => 'sync-homepage-prewarm-recovery',
  traceIdFactory: () => 'trace-homepage-prewarm-recovery'
});
const context = {
  identity: {
    tenantKey: 'tenant-live',
    userId: 'user-live',
    adAccount: 'user-live',
    displayName: '真实用户'
  }
};

const cold = await homepage.readHomepage(context);
assert.equal(cold.status, 202, '超过首响应预算时必须只交接一个首页同步任务');
assert.equal(cold.body.syncId, 'sync-homepage-prewarm-recovery');

let status;
for (let attempt = 0; attempt < 50; attempt += 1) {
  status = await homepage.getSyncStatus(cold.body.syncId, context);
  assert.equal(status.code, 'OK', '任务状态查询必须始终使用成功状态合同');
  if (['completed', 'failed', 'expired'].includes(status.state)) break;
  await sleep(5);
}
assert.equal(status?.state, 'completed', `首页后台任务必须在硬截止内完成，实际 ${status?.state}`);
assert.deepEqual(Object.keys(status.result.data).sort(), [...HOMEPAGE_OPERATION_IDS].sort());

const callsAfterColdCompletion = calls.length;
const warmStartedAt = performance.now();
const warm = await homepage.readHomepage(context);
const warmElapsedMs = performance.now() - warmStartedAt;
assert.equal(warm.status, 200, '同租户、身份和输入的第二次首页请求必须直接命中完整聚合缓存');
assert.ok(warmElapsedMs < 50, `热首页应接近即时返回，实际 ${warmElapsedMs.toFixed(2)}ms`);
assert.equal(calls.length, callsAfterColdCompletion, '热首页不得再次读取飞书');

const publicReadsAfterPrewarm = calls.slice(callsAfterPrewarm)
  .filter(call => ['应用类型配置', '业务域字典', '场景字典', '应用索引'].includes(call.tableName));
assert.equal(publicReadsAfterPrewarm.length, 0, '真实用户首页必须复用启动预热的公共投影');

readService.close();

let persistedEntries = [];
const persistentCache = {
  async restore() { return structuredClone(persistedEntries); },
  enqueue() {},
  async flush(provider) {
    persistedEntries = structuredClone(provider());
    return true;
  },
  metrics() { return { enabled: true, healthy: true, lastError: null, writeSuspended: false }; },
  async checkHealth() { return { enabled: true, healthy: true, lastError: null, writeSuspended: false }; }
};
const snapshotWriter = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  persistentCache,
  client: {
    async listRecords() { return { items: [], total: 0, hasMore: false, nextPageToken: '' }; }
  }
});
await snapshotWriter.prewarm();
await snapshotWriter.flushPersistentCache();
snapshotWriter.close();
assert.ok(persistedEntries.some(entry => entry.operationId === 'COM-005'));
assert.ok(persistedEntries.some(entry => entry.operationId === 'WB-002'));

let restoredUpstreamCalls = 0;
const snapshotReader = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  persistentCache,
  client: {
    async listRecords() {
      restoredUpstreamCalls += 1;
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const restoredPrewarm = await snapshotReader.prewarm();
assert.equal(restoredPrewarm.source, 'persistent-snapshot', '重启后必须直接恢复合法启动快照');
const restoredDictionary = await snapshotReader.execute('COM-005', {
  dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false
}, context);
assert.equal(restoredDictionary.cacheStatus, 'fresh');
assert.equal(restoredUpstreamCalls, 0, '恢复后的启动快照绑定真实租户时不得再次读取飞书');
snapshotReader.close();

console.log('startup seed binding, cold homepage completion, and immediate warm homepage hit passed');
