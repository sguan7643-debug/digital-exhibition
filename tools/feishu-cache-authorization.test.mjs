import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { FeishuProxyError } from '../server/feishu-open-api-client.mjs';
import { createFeishuOperationDispatcher } from '../server/feishu-proxy-handler.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const identifierContract = loadFeishuIdentifierContract(join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const tableNameById = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
let permissionEnabled = true;
let permissionScope = 'org-a';
let permissionReads = 0;
let projectReads = 0;

const client = {
  async listRecords(tableId) {
    const tableName = tableNameById.get(tableId);
    if (tableName === '用户权限') {
      permissionReads += 1;
      return {
        items: permissionEnabled ? [{
          record_id: `permission-${permissionScope}`,
          fields: { 'AD账号': 'user-a', '状态': '启用', '权限编码': 'talent.view', '数据范围': [permissionScope], '启用': true }
        }] : [],
        total: permissionEnabled ? 1 : 0,
        hasMore: false,
        nextPageToken: ''
      };
    }
    if (tableName === '人才项目') projectReads += 1;
    return { items: [], total: 0, hasMore: false, nextPageToken: '' };
  }
};

const service = createFeishuReadOnlyService({ identifierContract, client });
const context = { identity: { tenantKey: 'tenant-a', userId: 'user-a', adAccount: 'user-a' } };
const secondContext = { identity: { tenantKey: 'tenant-a', userId: 'user-b', adAccount: 'user-b' } };

await assert.rejects(
  () => service.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, { identity: null }),
  error => error.code === 'USER_AUTH_REQUIRED' && error.status === 401,
  '租户范围缓存也必须先实时校验登录身份'
);

const tenantInput = { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false };
await service.execute('COM-005', tenantInput, context);
const tenantMetricsBeforeSecondIdentity = service.getPerformanceSnapshot().cache;
await service.execute('COM-005', tenantInput, secondContext);
const tenantMetricsAfterSecondIdentity = service.getPerformanceSnapshot().cache;
assert.equal(tenantMetricsAfterSecondIdentity.freshHits, tenantMetricsBeforeSecondIdentity.freshHits, '同租户不同身份不得命中同一 operation 缓存');
assert.equal(tenantMetricsAfterSecondIdentity.misses, tenantMetricsBeforeSecondIdentity.misses + 1, '租户缓存键也必须包含完整身份与授权范围');

await service.execute('TAL-002', { page: 1, pageSize: 10 }, context);
const projectReadsAfterFirst = projectReads;
assert.ok(permissionReads >= 1 && projectReadsAfterFirst >= 1);

permissionScope = 'org-b';
await service.execute('TAL-002', { page: 1, pageSize: 10 }, context);
assert.ok(projectReads > projectReadsAfterFirst, '数据范围变化后不得复用旧范围缓存');
const projectReadsAfterScopeChange = projectReads;

permissionEnabled = false;
await assert.rejects(
  () => service.execute('TAL-002', { page: 1, pageSize: 10 }, context),
  error => error.code === 'PERMISSION_DENIED' && error.status === 403
);
assert.equal(projectReads, projectReadsAfterScopeChange, '权限撤销后必须在返回缓存前拒绝');

await assert.rejects(
  () => service.execute('TAL-002', { page: 1, pageSize: 10 }, { identity: null }),
  error => error.code === 'USER_AUTH_REQUIRED' && error.status === 401
);

permissionEnabled = true;
const firstUser = await service.execute('COM-001', {}, context);
assert.deepEqual(firstUser.data.permissions, ['talent.view']);
permissionEnabled = false;
const secondUser = await service.execute('COM-001', {}, context);
assert.deepEqual(secondUser.data.permissions, [], '强一致用户权限读取不得复用 operation 或底层表缓存');

service.close();

let taskPermissionEnabled = true;
let taskPermissionScope = 'org-a';
const taskClient = {
  async listRecords(tableId) {
    const tableName = tableNameById.get(tableId);
    if (tableName === '用户权限') {
      return {
        items: taskPermissionEnabled ? [{
          record_id: `task-permission-${taskPermissionScope}`,
          fields: { 'AD账号': 'user-task', '状态': '启用', '权限编码': 'talent.view', '数据范围': [taskPermissionScope], '启用': true }
        }] : [],
        total: taskPermissionEnabled ? 1 : 0,
        hasMore: false,
        nextPageToken: ''
      };
    }
    if (tableName === '人才项目') await new Promise(resolve => setTimeout(resolve, 80));
    return { items: [], total: 0, hasMore: false, nextPageToken: '' };
  }
};
const taskService = createFeishuReadOnlyService({
  identifierContract,
  client: taskClient,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500
});
const taskContext = { identity: { tenantKey: 'tenant-a', userId: 'user-task', adAccount: 'user-task' } };
const coldRequest = async () => {
  try {
    await taskService.execute('TAL-002', { page: 1, pageSize: 10 }, taskContext);
    assert.fail('冷请求应由同步任务接管');
  } catch (error) {
    assert.equal(error.code, 'FEISHU_INITIAL_SYNCING');
    return error;
  }
};
const [sameTaskA, sameTaskB] = await Promise.all([coldRequest(), coldRequest()]);
assert.equal(sameTaskA.syncId, sameTaskB.syncId, '六个隔离维度完全相同的冷请求必须复用同一同步任务');

taskPermissionScope = 'org-b';
const changedScopeTask = await coldRequest();
assert.notEqual(changedScopeTask.syncId, sameTaskA.syncId, '数据范围变化后不得合并或复用旧同步任务');
await assert.rejects(
  () => taskService.getReadSyncStatus(sameTaskA.syncId, taskContext),
  error => error.code === 'SYNC_JOB_FORBIDDEN' && error.status === 403,
  '数据范围变化后不得查询旧任务'
);

taskPermissionEnabled = false;
await assert.rejects(
  () => taskService.getReadSyncStatus(changedScopeTask.syncId, taskContext),
  error => error.code === 'PERMISSION_DENIED' && error.status === 403,
  '任务轮询也必须在权限撤销后实时拒绝'
);
await taskService.waitForIdle();
taskService.close();

let statusAuthorizationDelayMs = 0;
let statusPermissionEnabled = true;
let statusBusinessFailure = false;
let statusPermissionReads = 0;
let statusBusinessReads = 0;
const temporaryStatusAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  statusAuthorizationBudgetMs: 5,
  client: {
    async listRecords(tableId) {
      const tableName = tableNameById.get(tableId);
      if (tableName === '用户权限') {
        statusPermissionReads += 1;
        if (statusAuthorizationDelayMs) await new Promise(resolve => setTimeout(resolve, statusAuthorizationDelayMs));
        return {
          items: statusPermissionEnabled ? [{
            record_id: 'temporary-status-permission',
            fields: { 'AD账号': 'user-status', '状态': '启用', '权限编码': 'talent.view', '数据范围': ['org-status'], '启用': true }
          }] : [],
          total: statusPermissionEnabled ? 1 : 0,
          hasMore: false,
          nextPageToken: ''
        };
      }
      if (tableName === '人才项目') {
        statusBusinessReads += 1;
        await new Promise(resolve => setTimeout(resolve, 30));
        if (statusBusinessFailure) {
          throw new FeishuProxyError('INVALID_UPSTREAM_RESPONSE', '人才项目响应无效', 400);
        }
      }
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const temporaryStatusContext = { identity: { tenantKey: 'tenant-a', userId: 'user-status', adAccount: 'user-status' } };
const temporaryStatusHandoff = await temporaryStatusAuthorizationService
  .execute('TAL-002', { page: 1, pageSize: 10 }, temporaryStatusContext)
  .catch(error => error);
assert.equal(temporaryStatusHandoff.code, 'FEISHU_INITIAL_SYNCING');
await temporaryStatusAuthorizationService.waitForIdle();
const businessReadsBeforeStatus = statusBusinessReads;
statusAuthorizationDelayMs = 30;
const temporaryStatusDispatcher = createFeishuOperationDispatcher({
  service: temporaryStatusAuthorizationService,
  resolveRequestContext: () => temporaryStatusContext
});
const temporaryRunningHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${temporaryStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(temporaryRunningHttp.status, 200, '临时鉴权超时的 operation task status 必须保持 HTTP 200');
const temporaryRunningStatus = temporaryRunningHttp.body;
assert.equal(temporaryRunningStatus.code, 'OK');
assert.equal(temporaryRunningStatus.state, 'running', '临时鉴权超时不得从任务状态接口暴露 HTTP 504 语义');
assert.equal(temporaryRunningStatus.pollAfterMs, 2_000);
assert.equal(temporaryRunningStatus.result, undefined, '实时鉴权完成前不得释放任务终态结果');
await new Promise(resolve => setTimeout(resolve, 35));
const permissionReadsAfterCompletedCheck = statusPermissionReads;
const temporaryCompletedHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${temporaryStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(temporaryCompletedHttp.status, 200);
const temporaryCompletedStatus = temporaryCompletedHttp.body;
assert.equal(temporaryCompletedStatus.state, 'completed');
assert.equal(temporaryCompletedStatus.operationId, 'TAL-002');
assert.equal(statusBusinessReads, businessReadsBeforeStatus, '状态查询不得重新执行原业务 operation');
assert.equal(
  statusPermissionReads,
  permissionReadsAfterCompletedCheck,
  '下一次轮询必须一次性消费刚完成的实时鉴权，不能在预算与轮询间隙反复重新发起慢鉴权'
);

statusAuthorizationDelayMs = 0;
statusBusinessFailure = true;
const failedStatusHandoff = await temporaryStatusAuthorizationService
  .execute('TAL-002', { page: 2, pageSize: 10 }, temporaryStatusContext)
  .catch(error => error);
assert.equal(failedStatusHandoff.code, 'FEISHU_INITIAL_SYNCING');
await temporaryStatusAuthorizationService.waitForIdle();
statusBusinessFailure = false;
const businessReadsBeforeFailedStatus = statusBusinessReads;
statusAuthorizationDelayMs = 30;
const temporaryFailedRunningHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${failedStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(temporaryFailedRunningHttp.status, 200);
assert.equal(temporaryFailedRunningHttp.body.state, 'running');
await new Promise(resolve => setTimeout(resolve, 35));
const temporaryFailedHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${failedStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(temporaryFailedHttp.status, 200);
assert.equal(temporaryFailedHttp.body.state, 'failed');
assert.equal(temporaryFailedHttp.body.error.code, 'INVALID_UPSTREAM_RESPONSE');
assert.equal(statusBusinessReads, businessReadsBeforeFailedStatus, '失败任务状态轮询不得重跑业务 operation');

statusAuthorizationDelayMs = 0;
const revokedStatusHandoff = await temporaryStatusAuthorizationService
  .execute('TAL-002', { page: 3, pageSize: 10 }, temporaryStatusContext)
  .catch(error => error);
assert.equal(revokedStatusHandoff.code, 'FEISHU_INITIAL_SYNCING');
await temporaryStatusAuthorizationService.waitForIdle();
statusPermissionEnabled = false;
statusAuthorizationDelayMs = 30;
const revokedDeferredHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${revokedStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(revokedDeferredHttp.status, 200);
assert.equal(revokedDeferredHttp.body.state, 'running');
await new Promise(resolve => setTimeout(resolve, 35));
const revokedHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${revokedStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(revokedHttp.status, 403, '慢鉴权最终确认撤权后仍必须返回 403');
assert.equal(revokedHttp.body.code, 'PERMISSION_DENIED');
temporaryStatusAuthorizationService.close();

let detachedAuthorizationReads = 0;
let detachedAuthorizationAborts = 0;
const detachedAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 100,
  client: {
    async listRecords(tableId, _query, { signal } = {}) {
      const tableName = tableNameById.get(tableId);
      if (tableName !== '用户权限') {
        return { items: [], total: 0, hasMore: false, nextPageToken: '' };
      }
      detachedAuthorizationReads += 1;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 100);
        const abort = () => {
          detachedAuthorizationAborts += 1;
          clearTimeout(timer);
          reject(signal.reason || new Error('aborted'));
        };
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
      return {
        items: [{
          record_id: 'detached-permission',
          fields: { 'AD账号': 'user-detached', '状态': '启用', '权限编码': 'talent.view', '数据范围': ['org-detached'], '启用': true }
        }],
        total: 1,
        hasMore: false,
        nextPageToken: ''
      };
    }
  }
});
const detachedIdentity = { tenantKey: 'tenant-a', userId: 'user-detached', adAccount: 'user-detached' };
const shortDeadlineContext = {
  identity: { ...detachedIdentity },
  syncDeadlineAtMs: Date.now() + 20
};
const detachedHandoff = await detachedAuthorizationService
  .execute('TAL-002', { page: 1, pageSize: 10 }, shortDeadlineContext)
  .catch(error => error);
assert.equal(detachedHandoff.code, 'FEISHU_INITIAL_SYNCING');
await new Promise(resolve => setTimeout(resolve, 25));
const laterAuthorizedContext = await detachedAuthorizationService.authorizeRequestContext({
  identity: { ...detachedIdentity }
});
assert.deepEqual(laterAuthorizedContext.verifiedAuthorization.permissions, ['talent.view']);
assert.deepEqual(
  { reads: detachedAuthorizationReads, aborts: detachedAuthorizationAborts },
  { reads: 1, aborts: 0 },
  '第二个同身份调用方必须复用未继承首个 AsyncLocalStorage 截止 signal 的鉴权读取'
);
await detachedAuthorizationService.waitForIdle();
detachedAuthorizationService.close();

const aliasRaceClient = {
  async listRecords(tableId) {
    const tableName = tableNameById.get(tableId);
    if (tableName === '用户权限') {
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        items: [{
          record_id: 'race-permission',
          fields: { 'AD账号': 'user-race', '状态': '启用', '权限编码': 'talent.view', '数据范围': ['org-race'], '启用': true }
        }],
        total: 1,
        hasMore: false,
        nextPageToken: ''
      };
    }
    if (tableName === '人才项目') await new Promise(resolve => setTimeout(resolve, 100));
    return { items: [], total: 0, hasMore: false, nextPageToken: '' };
  }
};
const aliasRaceService = createFeishuReadOnlyService({
  identifierContract,
  client: aliasRaceClient,
  coldMissBudgetMs: 20,
  syncTaskTimeoutMs: 500
});
const raceContext = () => ({ identity: { tenantKey: 'tenant-a', userId: 'user-race', adAccount: 'user-race' } });
const raceRequest = () => aliasRaceService.execute('TAL-002', { page: 1, pageSize: 10 }, raceContext()).catch(error => error);
const provisionalRaceTask = await raceRequest();
assert.equal(provisionalRaceTask.code, 'FEISHU_INITIAL_SYNCING');
await new Promise(resolve => setTimeout(resolve, 25));
const canonicalRaceTask = await raceRequest();
assert.equal(canonicalRaceTask.code, 'FEISHU_INITIAL_SYNCING');
assert.equal(
  canonicalRaceTask.syncId,
  provisionalRaceTask.syncId,
  '鉴权刚完成的边界竞态必须把六维 canonical 键合并到既有 provisional 任务'
);
await aliasRaceService.waitForIdle();
aliasRaceService.close();

for (const [operationId, leftInput, rightInput] of [
  ['APP-002', { query: 'ABC' }, { query: 'abc' }],
  ['WB-002', { keyword: ' X ' }, { keyword: 'x' }]
]) {
  const normalizedRaceService = createFeishuReadOnlyService({
    identifierContract,
    client: aliasRaceClient,
    coldMissBudgetMs: 20,
    syncTaskTimeoutMs: 500
  });
  const [leftTask, rightTask] = await Promise.all([
    normalizedRaceService.execute(operationId, leftInput, raceContext()).catch(error => error),
    normalizedRaceService.execute(operationId, rightInput, raceContext()).catch(error => error)
  ]);
  assert.equal(leftTask.code, 'FEISHU_INITIAL_SYNCING', `${operationId} 左侧请求应在鉴权期间交接`);
  assert.equal(rightTask.code, 'FEISHU_INITIAL_SYNCING', `${operationId} 右侧请求应在鉴权期间交接`);
  assert.equal(
    leftTask.syncId,
    rightTask.syncId,
    `${operationId} 规范化等价参数必须在实时鉴权完成前就复用同一任务`
  );
  await normalizedRaceService.waitForIdle();
  normalizedRaceService.close();
}

let authorizationRetryReads = 0;
const authorizationRetryService = createFeishuReadOnlyService({
  identifierContract,
  readSleep: async () => {},
  client: {
    async listRecords(tableId) {
      if (tableNameById.get(tableId) === '用户权限') {
        authorizationRetryReads += 1;
        if (authorizationRetryReads === 1) {
          throw new FeishuProxyError('FEISHU_UPSTREAM_UNAVAILABLE', '飞书服务暂不可用', 502, {
            causeCode: 'ECONNRESET'
          });
        }
        return {
          items: [{
            record_id: 'permission-after-retry',
            fields: { 'AD账号': 'user-retry', '状态': '启用', '权限编码': 'talent.view', '数据范围': ['org-retry'], '启用': true }
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
const retriedAuthorization = await authorizationRetryService.authorizeRequestContext({
  identity: { tenantKey: 'tenant-retry', userId: 'user-retry', adAccount: 'user-retry' }
});
assert.equal(authorizationRetryReads, 2, '实时鉴权遇到受控瞬时网络错误必须自动重试');
assert.deepEqual(retriedAuthorization.verifiedAuthorization.permissions, ['talent.view']);
authorizationRetryService.close();

console.log('cache and sync jobs revalidate identity, permissions and data scope; strong reads bypass all cache layers');
