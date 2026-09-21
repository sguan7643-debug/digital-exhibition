import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const namesById = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const sharedRows = new Map([
  ['应用索引', [{ record_id: 'app-1', fields: { 应用ID: 'APP-1', 应用名称: '预算看板', 应用类型: 'REPORT', 应用简介: '首屏应用', 使用次数: 1, 状态: 'ONLINE' } }]],
  ['应用类型配置', [{ record_id: 'type-1', fields: { 类型ID: 'REPORT', 类型编码: 'REPORT', 类型名称: '报表' } }]],
  ['业务域字典', [{ record_id: 'domain-1', fields: { 业务域ID: 'DOMAIN-1', 业务域编码: 'DOMAIN-1', 业务域名称: '采购' } }]],
  ['场景字典', [{ record_id: 'scene-1', fields: { 场景ID: 'SCENE-1', 场景名称: '生产运营' } }]],
  ['用户字典', []], ['部门字典', []]
]);

function responseFor(tableId) {
  const items = sharedRows.get(namesById.get(tableId)) || [];
  return { items, total: items.length, hasMore: false, nextPageToken: '' };
}

let retryCalls = 0;
const retryService = createFeishuReadOnlyService({
  identifierContract,
  client: {
    async listRecords(tableId) {
      if (namesById.get(tableId) === '应用类型配置' && retryCalls++ < 2) {
        throw Object.assign(new Error('temporary upstream failure'), { status: 502 });
      }
      return responseFor(tableId);
    }
  }
});
await assert.rejects(
  () => retryService.execute('WB-002', { page: 1, pageSize: 20 }),
  error => error?.status === 502
);
assert.equal(retryCalls, 2, 'retryable read must make one retry only');

let upstreamTimeoutCalls = 0;
const upstreamTimeoutRetryService = createFeishuReadOnlyService({
  identifierContract,
  readSleep: async () => {},
  client: {
    async listRecords(tableId) {
      if (namesById.get(tableId) === '应用类型配置' && upstreamTimeoutCalls++ === 0) {
        throw Object.assign(new Error('upstream deadline'), { status: 504, code: 'FEISHU_UPSTREAM_TIMEOUT' });
      }
      return responseFor(tableId);
    }
  }
});
await upstreamTimeoutRetryService.execute('WB-002', { page: 1, pageSize: 20 });
assert.equal(upstreamTimeoutCalls, 2, 'an upstream 504 receives one retry only');

let paginatedRetryCalls = 0;
const aggregateRetryService = createFeishuReadOnlyService({
  identifierContract,
  readSleep: async () => {},
  client: {
    async listRecords(tableId) {
      if (namesById.get(tableId) !== '应用类型配置') return responseFor(tableId);
      paginatedRetryCalls += 1;
      if (paginatedRetryCalls === 1 || paginatedRetryCalls === 3) {
        throw Object.assign(new Error('temporary upstream failure'), { status: 502 });
      }
      return { ...responseFor(tableId), hasMore: true, nextPageToken: 'type-page-2' };
    }
  }
});
await assert.rejects(
  () => aggregateRetryService.execute('WB-002', { page: 1, pageSize: 20 }),
  error => error?.status === 502
);
assert.equal(paginatedRetryCalls, 3, 'the single retry budget applies across every page in one readAll call');

const budgetService = createFeishuReadOnlyService({
  identifierContract,
  readBudgetMs: 20,
  client: { listRecords: async tableId => new Promise(resolve => setTimeout(() => resolve(responseFor(tableId)), 40)) }
});
await assert.rejects(
  () => budgetService.execute('WB-002', { page: 1, pageSize: 20 }),
  error => error?.status === 504
);

const extendedBudgetService = createFeishuReadOnlyService({
  identifierContract,
  readBudgetMs: 20,
  client: { listRecords: async tableId => new Promise(resolve => setTimeout(() => resolve(responseFor(tableId)), 18)) }
});
await extendedBudgetService.execute('COM-001', {}, { identity: { userId: 'u-test', adAccount: 'u-test' } });

let defaultBudgetClockReads = 0;
const defaultBudgetService = createFeishuReadOnlyService({
  identifierContract,
  readNow: () => ++defaultBudgetClockReads <= 2 ? 0 : 10_001,
  client: { listRecords: async tableId => responseFor(tableId) }
});
await assert.rejects(
  () => defaultBudgetService.execute('WB-002', { page: 1, pageSize: 20 }),
  error => error?.code === 'FEISHU_READ_BUDGET_EXCEEDED',
  'the default aggregate table-read budget must stop after the approved 10 seconds'
);

const profileReadQueries = new Map();
const profileFieldService = createFeishuReadOnlyService({
  identifierContract,
  client: {
    async listRecords(tableId, query = {}) {
      profileReadQueries.set(namesById.get(tableId), query);
      return responseFor(tableId);
    }
  }
});
await profileFieldService.execute('COM-001', {}, { identity: { userId: 'u-test', adAccount: 'u-test' } });
const profileUserFields = profileReadQueries.get('用户字典').fieldNames;
assert.ok(profileUserFields.includes('AD账号'));
assert.ok(profileUserFields.includes('所属部门名称'));
assert.ok(profileUserFields.length < identifierContract.byName.get('用户字典').fields.length, 'profile reads must request only the fields they render');
assert.deepEqual(profileReadQueries.get('积分余额').fieldNames, ['用户ID', '当前总积分']);
assert.ok(!profileReadQueries.get('用户权限').fieldNames.includes('用户ID'), 'the permissions table must not request its legacy, non-existent user field');

const driftQueries = [];
const driftTolerantService = createFeishuReadOnlyService({
  identifierContract,
  client: {
    async listRecords(tableId, query = {}) {
      driftQueries.push({ tableName: namesById.get(tableId), fieldNames: query.fieldNames || [] });
      if (namesById.get(tableId) === '应用索引' && query.fieldNames?.length) {
        throw Object.assign(new Error('field contract drift'), {
          code: 'FEISHU_RECORDS_FAILED', status: 502, upstreamCode: 1254045, upstreamMessage: 'FieldNameNotFound'
        });
      }
      return responseFor(tableId);
    }
  }
});
await driftTolerantService.execute('APP-002', { query: '', filters: {}, page: 1, pageSize: 20, sort: 'default' });
const appDriftQueries = driftQueries.filter(query => query.tableName === '应用索引');
assert.equal(appDriftQueries.length, 2, '字段不存在时仅重读一次同一张表');
assert.ok(appDriftQueries[0].fieldNames.length > 0, '先按最小字段投影读取');
assert.deepEqual(appDriftQueries[1].fieldNames, [], '仅在明确字段漂移时降级为整行读取');

let typeReads = 0;
const sharedProjectionService = createFeishuReadOnlyService({
  identifierContract,
  appProjectionCacheMs: 1_000,
  client: {
    async listRecords(tableId) {
      if (namesById.get(tableId) === '应用类型配置') {
        typeReads += 1;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return responseFor(tableId);
    }
  }
});
await Promise.all([
  sharedProjectionService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false }),
  sharedProjectionService.execute('WB-002', { page: 1, pageSize: 20 })
]);
assert.equal(typeReads, 1, 'concurrent COM-005 and WB-002 reads must share application-type projection work');

let firstScreenUserDictionaryReads = 0;
const sharedFirstScreenService = createFeishuReadOnlyService({
  identifierContract,
  appProjectionCacheMs: 1_000,
  client: {
    async listRecords(tableId) {
      if (namesById.get(tableId) === '用户字典') firstScreenUserDictionaryReads += 1;
      return responseFor(tableId);
    }
  }
});
const firstScreenContext = { identity: { userId: 'u-test', adAccount: 'u-test', openId: 'u-test' } };
await Promise.all([
  sharedFirstScreenService.execute('COM-001', {}, firstScreenContext),
  sharedFirstScreenService.execute('COM-002', { platform: 'WEB' }, firstScreenContext),
  sharedFirstScreenService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false }, firstScreenContext),
  sharedFirstScreenService.execute('WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, firstScreenContext),
  sharedFirstScreenService.execute('WB-002', { page: 1, pageSize: 20 }, firstScreenContext)
]);
assert.equal(firstScreenUserDictionaryReads, 1, 'concurrent first-screen projections must share one user-dictionary read');

console.log('Feishu read budget, one-retry policy, and shared dictionary projection passed');
