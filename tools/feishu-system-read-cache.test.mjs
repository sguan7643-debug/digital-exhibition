import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import {
  CACHEABLE_READ_OPERATION_IDS,
  READ_OPERATION_CACHE_POLICIES,
  STRONG_CONSISTENCY_OPERATION_IDS
} from '../server/feishu-read-cache-policies.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';

const readOperationIds = OPERATION_REGISTRY.filter(operation => operation.readOnly).map(operation => operation.id).sort();
const classifiedIds = [...CACHEABLE_READ_OPERATION_IDS, ...STRONG_CONSISTENCY_OPERATION_IDS].sort();

assert.equal(readOperationIds.length, 65);
assert.deepEqual(classifiedIds, readOperationIds, '65 个只读 operation 必须全部进入缓存或强一致策略');
assert.equal(CACHEABLE_READ_OPERATION_IDS.length, 56);
assert.equal(STRONG_CONSISTENCY_OPERATION_IDS.length, 9);
assert.equal(Object.keys(READ_OPERATION_CACHE_POLICIES).length, 56);
assert.ok(STRONG_CONSISTENCY_OPERATION_IDS.every(operationId => !READ_OPERATION_CACHE_POLICIES[operationId]));

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
let clock = 1_000;
let failReads = false;
let upstreamCalls = 0;
const service = createFeishuReadOnlyService({
  identifierContract,
  readNow: () => clock,
  cacheNow: () => clock,
  now: () => new Date(clock),
  appProjectionCacheMs: 0,
  operationCacheMaxEntries: 2,
  client: {
    async listRecords() {
      upstreamCalls += 1;
      if (failReads) throw Object.assign(new Error('temporary upstream failure'), { code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504 });
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});

const input = { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false };
const first = await service.execute('COM-005', input, {});
assert.equal(first.cacheStatus, 'fresh');
assert.ok(upstreamCalls > 0);

clock += 61_000;
failReads = true;
const fallback = await service.executeFresh('COM-005', input, {});
assert.equal(fallback.cacheStatus, 'stale', '刷新失败但仍在陈旧窗口内时必须继续返回旧数据');
assert.equal(fallback.dataStale, true);
assert.equal(fallback.refreshing, false);

const metrics = service.getPerformanceSnapshot();
assert.ok(metrics.cache.freshHits >= 0);
assert.ok(metrics.cache.staleFallbacks >= 1);
assert.ok(metrics.cache.entries <= 2, 'operation LRU 不得超过配置上限');

console.log('All 65 read operations are classified and stale fallback/LRU metrics are enforced');
