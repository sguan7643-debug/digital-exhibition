import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createHomepageAggregateService,
  HOMEPAGE_OPERATION_IDS,
  HOMEPAGE_OPERATION_INPUTS
} from '../server/homepage-aggregate-service.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const tableNames = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const context = {
  identity: {
    tenantKey: 'tenant-review',
    userId: 'user-review',
    adAccount: 'user-review',
    displayName: '审查用户',
    permissions: ['apps.read'],
    dataScope: 'org-review'
  }
};
const selectedFinding = String(process.argv[2] || 'all');
const runsFinding = number => selectedFinding === 'all' || selectedFinding === String(number);
const dictionaryInput = { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false };

function emptyPage() {
  return { items: [], total: 0, hasMore: false, nextPageToken: '' };
}

function applicationTypePage(label = '旧值') {
  return {
    items: [{
      record_id: `type-${label}`,
      fields: { 类型ID: 'REPORT', 类型编码: 'REPORT', 类型名称: label, 状态: '启用' }
    }],
    total: 1,
    hasMore: false,
    nextPageToken: ''
  };
}

// Finding 1: a staged replacement must never hide the committed LKG.
if (runsFinding(1)) {
let cacheClock = 1_000;
let dictionaryLabel = '旧值';
let snapshotMode = 'pass';
let replacementSnapshotEntries = [];
let releaseReplacementSnapshot;
let replacementSnapshotStarted;
const replacementSnapshotStartedPromise = new Promise(resolve => { replacementSnapshotStarted = resolve; });
const replacementSnapshotGate = new Promise(resolve => { releaseReplacementSnapshot = resolve; });
const lkgService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  tableReadCacheMs: 0,
  appProjectionCacheMs: 0,
  cacheNow: () => cacheClock,
  operationCachePolicies: { 'COM-005': { code: 'T0', scope: 'tenant', freshMs: 10, staleMs: 1_000 } },
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush(provider) {
      const entries = provider();
      if (snapshotMode === 'block-fail') {
        if (!replacementSnapshotEntries.length) replacementSnapshotEntries = structuredClone(entries);
        replacementSnapshotStarted();
        await replacementSnapshotGate;
        throw Object.assign(new Error('snapshot rejected'), { code: 'SNAPSHOT_REJECTED' });
      }
      return { written: true, keys: entries.map(entry => entry.key) };
    },
    metrics() { return { enabled: true, healthy: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords(tableId) {
      return tableNames.get(tableId) === '应用类型配置' ? applicationTypePage(dictionaryLabel) : emptyPage();
    }
  }
});
const firstDictionary = await lkgService.execute('COM-005', dictionaryInput, context);
assert.equal(firstDictionary.data.itemsByType.APPLICATION_TYPE[0].label, '旧值');
cacheClock += 20;
dictionaryLabel = '候选值';
snapshotMode = 'block-fail';
const staleDuringRefresh = await lkgService.execute('COM-005', dictionaryInput, context);
assert.equal(staleDuringRefresh.status, undefined);
assert.equal(staleDuringRefresh.data.itemsByType.APPLICATION_TYPE[0].label, '旧值');
await replacementSnapshotStartedPromise;
assert.equal(
  lkgService.peekOperation('COM-005', dictionaryInput, context)?.data.itemsByType.APPLICATION_TYPE[0].label,
  '旧值',
  'candidate 持久化期间旧 committed LKG 必须持续可见'
);
releaseReplacementSnapshot();
await lkgService.waitForIdle();
assert.equal(
  lkgService.peekOperation('COM-005', dictionaryInput, context)?.data.itemsByType.APPLICATION_TYPE[0].label,
  '旧值',
  'candidate 持久化失败后旧 committed LKG 必须保持不变'
);
const replacementEntriesForKey = replacementSnapshotEntries.filter(entry => entry.operationId === 'COM-005');
assert.ok(
  replacementEntriesForKey.some(entry => entry.committed === true && entry.value.data.itemsByType.APPLICATION_TYPE[0].label === '旧值'),
  '候选快照必须继续携带旧 committed generation'
);
assert.ok(
  replacementEntriesForKey.some(entry => entry.committed === false && entry.value.data.itemsByType.APPLICATION_TYPE[0].label === '候选值'),
  `候选 generation 必须显式标记为未提交：${JSON.stringify(replacementEntriesForKey.map(entry => ({ committed: entry.committed, label: entry.value.data.itemsByType.APPLICATION_TYPE[0].label })))}`
);
lkgService.close();

const restartedFromCandidateSnapshot = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  cacheNow: () => cacheClock,
  operationCachePolicies: { 'COM-005': { code: 'T0', scope: 'tenant', freshMs: 10, staleMs: 1_000 } },
  persistentCache: {
    async restore() { return structuredClone(replacementSnapshotEntries); },
    enqueue() {},
    async flush(provider) { return { written: true, keys: provider().map(entry => entry.key) }; },
    metrics() { return { enabled: true, healthy: true, lastError: null, writeSuspended: false }; }
  },
  client: { async listRecords() { return applicationTypePage('不应读取'); } }
});
const restartedValue = await restartedFromCandidateSnapshot.execute('COM-005', dictionaryInput, context);
assert.equal(
  restartedValue.data.itemsByType.APPLICATION_TYPE[0].label,
  '旧值',
  '重启恢复必须忽略未提交 candidate 并继续使用旧 LKG'
);
restartedFromCandidateSnapshot.close();

let secondPhaseClock = 5_000;
let secondPhaseLabel = '旧二阶段值';
let secondPhaseFlushes = 0;
let releaseSecondPhase;
let markSecondPhaseStarted;
const secondPhaseStarted = new Promise(resolve => { markSecondPhaseStarted = resolve; });
const secondPhaseGate = new Promise(resolve => { releaseSecondPhase = resolve; });
const secondPhaseService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  tableReadCacheMs: 0,
  appProjectionCacheMs: 0,
  cacheNow: () => secondPhaseClock,
  operationCachePolicies: { 'COM-005': { code: 'T0', scope: 'tenant', freshMs: 10, staleMs: 1_000 } },
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush(provider) {
      secondPhaseFlushes += 1;
      const entries = provider();
      if (secondPhaseFlushes === 4) {
        markSecondPhaseStarted();
        await secondPhaseGate;
        throw Object.assign(new Error('committed snapshot rejected'), { code: 'SNAPSHOT_REJECTED' });
      }
      return { written: true, keys: entries.map(entry => entry.key) };
    },
    metrics() { return { enabled: true, healthy: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords(tableId) {
      return tableNames.get(tableId) === '应用类型配置' ? applicationTypePage(secondPhaseLabel) : emptyPage();
    }
  }
});
await secondPhaseService.execute('COM-005', dictionaryInput, context);
secondPhaseClock += 20;
secondPhaseLabel = '新二阶段值';
assert.equal((await secondPhaseService.execute('COM-005', dictionaryInput, context)).cacheStatus, 'stale');
await secondPhaseStarted;
assert.equal(
  secondPhaseService.peekOperation('COM-005', dictionaryInput, context)?.data.itemsByType.APPLICATION_TYPE[0].label,
  '旧二阶段值',
  '第二阶段 committed 快照完成前不得发布 candidate 到内存'
);
releaseSecondPhase();
await secondPhaseService.waitForIdle();
assert.equal(
  secondPhaseService.peekOperation('COM-005', dictionaryInput, context)?.data.itemsByType.APPLICATION_TYPE[0].label,
  '旧二阶段值',
  '第二阶段提交失败后必须继续服务旧 LKG'
);
secondPhaseService.close();
}

// Build schema-valid homepage fixtures once for the aggregate deadline test.
if (runsFinding(2)) {
const fixtureReadService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  client: { async listRecords() { return emptyPage(); } }
});
const homepageFixtures = new Map(await Promise.all(HOMEPAGE_OPERATION_IDS.map(async operationId => [
  operationId,
  await fixtureReadService.executeBackground(operationId, HOMEPAGE_OPERATION_INPUTS[operationId], context)
])));
fixtureReadService.close();

// Finding 2: the one homepage deadline includes HOM-001 persistence/publication/readback.
let releaseHomepageCommit;
let homepageCommitAborted = false;
const homepageCommitGate = new Promise(resolve => { releaseHomepageCommit = resolve; });
const homepageDeadlineService = createHomepageAggregateService({
  responseBudgetMs: 1,
  taskTimeoutMs: 35,
  prewarm: false,
  idFactory: () => 'sync-homepage-commit-deadline',
  traceIdFactory: () => 'trace-homepage-commit-deadline',
  readService: {
    peekOperation() { return null; },
    async executeFresh(operationId) { return structuredClone(homepageFixtures.get(operationId)); },
    async commitCompositeCache(operationId, input, requestContext) {
      requestContext.syncAbortSignal?.addEventListener('abort', () => { homepageCommitAborted = true; }, { once: true });
      await homepageCommitGate;
      return { code: 'OK', operationId, isComplete: true };
    }
  }
});
const homepageHandoff = await homepageDeadlineService.readHomepage(context);
assert.equal(homepageHandoff.status, 202);
await sleep(70);
const homepageDeadlineStatus = await homepageDeadlineService.getSyncStatus(homepageHandoff.body.syncId, context);
assert.equal(homepageDeadlineStatus.state, 'failed', '首页持久提交超时也必须在统一硬截止内进入 failed');
assert.equal(homepageDeadlineStatus.error.code, 'READ_SYNC_DEADLINE_EXCEEDED');
assert.equal(homepageCommitAborted, true, '首页统一 deadline 必须中止仍在提交阶段的工作');
releaseHomepageCommit();
}

// Finding 3: shared real-time authorization inherits a hard deadline and cannot outlive its task.
if (runsFinding(3)) {
let activeAuthorizationReads = 0;
let abortedAuthorizationReads = 0;
let totalAuthorizationReads = 0;
const orphanEvents = [];
const orphanAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 1,
  syncTaskTimeoutMs: 35,
  eventLogger: event => orphanEvents.push({ at: Date.now(), ...event }),
  client: {
    async listRecords(tableId, query, options = {}) {
      if (tableNames.get(tableId) !== '用户权限') return emptyPage();
      totalAuthorizationReads += 1;
      activeAuthorizationReads += 1;
      return new Promise(resolve => {
        const timer = setTimeout(() => {
          activeAuthorizationReads -= 1;
          resolve(emptyPage());
        }, 150);
        options.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          activeAuthorizationReads -= 1;
          abortedAuthorizationReads += 1;
          resolve(emptyPage());
        }, { once: true });
      });
    }
  }
});
const orphanHandoff = await orphanAuthorizationService.execute('TAL-002', { page: 1, pageSize: 10 }, context).catch(error => error);
assert.equal(orphanHandoff.status, 202);
const authorizationAbortDeadline = Date.now() + 120;
while (activeAuthorizationReads > 0 && Date.now() < authorizationAbortDeadline) await sleep(5);
assert.equal(
  activeAuthorizationReads,
  0,
  `调用任务超时后不得遗留继续占用飞书配额的鉴权读取（total=${totalAuthorizationReads}, aborted=${abortedAuthorizationReads}, events=${JSON.stringify(orphanEvents)}）`
);
assert.equal(abortedAuthorizationReads, 1, '任务硬截止必须传播到共享鉴权请求');
orphanAuthorizationService.close();

// Authorization retries and business retries share one maximum-three attempt budget.
let authorizationAttempts = 0;
let businessAttempts = 0;
const combinedAttemptService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 0,
  syncTaskTimeoutMs: 500,
  readSleep: async () => {},
  client: {
    async listRecords(tableId) {
      const tableName = tableNames.get(tableId);
      if (tableName === '用户权限') {
        authorizationAttempts += 1;
        if (authorizationAttempts === 1) {
          throw Object.assign(new Error('temporary auth timeout'), { code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504 });
        }
        return {
          items: [{
            record_id: 'combined-attempt-permission',
            fields: { 'AD账号': 'user-review', '状态': '启用', '权限编码': 'talent.view', '数据范围': ['org-review'], '启用': true }
          }],
          total: 1,
          hasMore: false,
          nextPageToken: ''
        };
      }
      if (tableName === '人才项目') {
        businessAttempts += 1;
        throw Object.assign(new Error('temporary business timeout'), { code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504 });
      }
      return emptyPage();
    }
  }
});
await assert.rejects(
  () => combinedAttemptService.execute('TAL-002', { page: 1, pageSize: 10 }, context),
  error => ['FEISHU_UPSTREAM_TIMEOUT', 'READ_SYNC_ATTEMPTS_EXHAUSTED'].includes(error?.code)
);
assert.ok(
  authorizationAttempts + businessAttempts <= 3,
  `鉴权和业务访问合计最多三次，实际 auth=${authorizationAttempts}, business=${businessAttempts}`
);
combinedAttemptService.close();
}

// Finding 4: only explicit transient failures may be represented as deferred HTTP-200 polling.
if (runsFinding(4)) {
const deterministicAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  client: { async listRecords() { throw new Error('programming defect'); } }
});
const deterministicAuthorization = await deterministicAuthorizationService.authorizeTaskStatus('', context);
assert.equal(deterministicAuthorization.deferred, false);
assert.equal(deterministicAuthorization.error?.code, 'STATUS_AUTHORIZATION_FAILED');
assert.equal(deterministicAuthorization.error?.retryable, false);
assert.equal(
  deterministicAuthorization.error?.causeCode,
  'AUTHORIZATION_CHECK_FAILED',
  '无 status/无显式 transient code 的异常必须成为确定性 failed，不能无限伪装为 running'
);
deterministicAuthorizationService.close();

const deterministicTenantTokenService = createFeishuReadOnlyService({
  identifierContract,
  readSleep: async () => {},
  client: {
    async listRecords() {
      throw Object.assign(new Error('invalid app credential'), { code: 'TENANT_TOKEN_FAILED', status: 502 });
    }
  }
});
for (let poll = 0; poll < 2; poll += 1) {
  const tokenFailure = await deterministicTenantTokenService.authorizeTaskStatus('', context);
  assert.equal(tokenFailure.deferred, false, '确定性 tenant token 配置失败不能持续伪装为 running');
  assert.equal(tokenFailure.error?.code, 'STATUS_AUTHORIZATION_FAILED');
  assert.equal(tokenFailure.error?.causeCode, 'TENANT_TOKEN_FAILED');
}
deterministicTenantTokenService.close();

const explicitTransientAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  client: {
    async listRecords() {
      throw Object.assign(new Error('temporary upstream timeout'), { code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504 });
    }
  }
});
assert.equal(
  (await explicitTransientAuthorizationService.authorizeTaskStatus('', context)).deferred,
  true,
  '显式 allow-list 中的临时上游慢仍应保持 HTTP 200 轮询语义'
);
explicitTransientAuthorizationService.close();

const forbiddenAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  client: {
    async listRecords() {
      throw Object.assign(new Error('forbidden'), { code: 'PERMISSION_DENIED', status: 403 });
    }
  }
});
await assert.rejects(
  () => forbiddenAuthorizationService.authorizeTaskStatus('', context),
  error => error?.status === 403,
  '401/403 不能被 transient 分类吞掉'
);
forbiddenAuthorizationService.close();
}

// Finding 5: operation/page/commit/transition events share one non-empty correlation pair.
if (runsFinding(5)) {
const correlationEvents = [];
const correlationService = createFeishuReadOnlyService({
  identifierContract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 1,
  syncTaskTimeoutMs: 500,
  traceIdFactory: () => 'trace-review-correlation',
  eventLogger: event => correlationEvents.push(event),
  persistentCache: {
    async restore() { return []; },
    enqueue() {},
    async flush(provider) {
      const entries = provider();
      return { written: true, keys: entries.map(entry => entry.key) };
    },
    metrics() { return { enabled: true, healthy: true, lastError: null, writeSuspended: false }; }
  },
  client: {
    async listRecords(tableId) {
      await sleep(10);
      return tableNames.get(tableId) === '应用类型配置' ? applicationTypePage('关联值') : emptyPage();
    }
  }
});
const correlationHandoff = await correlationService.execute('COM-005', dictionaryInput, context).catch(error => error);
assert.equal(correlationHandoff.status, 202);
await correlationService.waitForIdle();
await sleep(0);
const correlated = correlationEvents.filter(event => (
  event.operationId === 'COM-005'
  && ['sync-attempt', 'feishu-read-page', 'cache-commit', 'sync-transition'].includes(event.event)
));
for (const event of correlated) {
  assert.ok(event.traceId, `${event.event} 必须携带非空 traceId`);
  assert.ok(event.syncId, `${event.event} 必须携带非空 syncId`);
}
assert.equal(new Set(correlated.map(event => event.traceId)).size, 1, '全链路必须传播同一个 traceId');
assert.equal(new Set(correlated.map(event => event.syncId)).size, 1, '全链路必须传播同一个 syncId');
correlationService.close();
}

console.log('server cache code-review finding coverage passed');
