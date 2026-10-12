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
const context = { identity: { tenantKey: 'tenant-a', userId: 'user-a', adAccount: 'user-a', displayName: '用户甲' } };
const secondContext = { identity: { tenantKey: 'tenant-a', userId: 'user-b', adAccount: 'user-b', displayName: '用户乙' } };

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
assert.equal(tenantMetricsAfterSecondIdentity.freshHits, tenantMetricsBeforeSecondIdentity.freshHits + 1, '已批准的租户级公开投影应在登录校验后被同租户身份复用');
assert.equal(tenantMetricsAfterSecondIdentity.misses, tenantMetricsBeforeSecondIdentity.misses, '租户级公开投影不得因用户身份不同制造重复冷读');
const otherTenantContext = { identity: { tenantKey: 'tenant-b', userId: 'user-b', adAccount: 'user-b', displayName: '用户乙' } };
await service.execute('COM-005', tenantInput, otherTenantContext);
assert.equal(service.getPerformanceSnapshot().cache.misses, tenantMetricsAfterSecondIdentity.misses + 1, '不同租户不得共享 operation 缓存');

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
assert.equal(secondUser.cacheStatus, 'fresh', '普通个人中心读取应立即复用身份隔离缓存');
const consistentUser = await service.executeConsistent('COM-001', {}, context);
assert.deepEqual(consistentUser.data.permissions, [], '权限决策使用的强一致读取不得复用 operation 或底层表缓存');

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
const taskContext = { identity: { tenantKey: 'tenant-a', userId: 'user-task', adAccount: 'user-task', displayName: '任务用户' } };
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
let statusAuthorizationHardFailure = false;
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
        if (statusAuthorizationHardFailure) {
          throw new FeishuProxyError('INVALID_UPSTREAM_RESPONSE', '权限投影响应无效', 502);
        }
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
const temporaryStatusContext = { identity: { tenantKey: 'tenant-a', userId: 'user-status', adAccount: 'user-status', displayName: '状态用户' } };
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
assert.equal(temporaryRunningStatus.state, 'completed', '临时鉴权刷新不得把已完成任务回退为 running');
assert.equal(temporaryRunningStatus.pollAfterMs, undefined);
assert.equal(temporaryRunningStatus.result.code, 'OK', '同一稳定主体必须取得已完成任务结果');
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
assert.equal(temporaryFailedRunningHttp.body.state, 'failed', '临时鉴权刷新不得把失败终态回退为 running');
assert.equal(temporaryFailedRunningHttp.body.error.code, 'INVALID_UPSTREAM_RESPONSE');
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
statusAuthorizationHardFailure = true;
const authorizationFailureHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${temporaryStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(authorizationFailureHttp.status, 200);
assert.equal(
  authorizationFailureHttp.body.state,
  'completed',
  '任务已发布 completed 后，状态鉴权基础设施失败不得把终态改成 failed 或 running'
);
assert.equal(authorizationFailureHttp.body.error, undefined);
statusAuthorizationHardFailure = false;
const authorizationRecoveredHttp = await temporaryStatusDispatcher({
  method: 'GET',
  url: `/api/v1/operations/sync-jobs/${temporaryStatusHandoff.syncId}`,
  headers: {}
});
assert.equal(authorizationRecoveredHttp.status, 200);
assert.equal(authorizationRecoveredHttp.body.state, 'completed');

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
assert.equal(revokedDeferredHttp.body.state, 'completed', '撤权尚未确认前也不得回退已完成任务的终态');
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
    syncTaskTimeoutMs: 200,
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
  { reads: 2, aborts: 1 },
  '最后一个等待者达到硬截止后必须中止鉴权读取；后续调用创建新的受控鉴权任务'
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
    await new Promise(resolve => setTimeout(resolve, 100));
    return { items: [], total: 0, hasMore: false, nextPageToken: '' };
  }
};
const aliasRaceService = createFeishuReadOnlyService({
  identifierContract,
  client: aliasRaceClient,
  coldMissBudgetMs: 20,
  syncTaskTimeoutMs: 500
});
const raceContext = () => ({ identity: { tenantKey: 'tenant-a', userId: 'user-race', adAccount: 'user-race', displayName: '竞态用户' } });
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

// Tenant-scoped reads may hand off before a live permission projection is
// attached to the job. The first authorized status poll binds the canonical
// fingerprint; stable sorted permission/scope sets must not cause a later 403.
let stableFingerprintPermissionRead = 0;
const stableFingerprintService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  client: {
    async listRecords(tableId) {
      const tableName = tableNameById.get(tableId);
      if (tableName === '用户权限') {
        stableFingerprintPermissionRead += 1;
        const rows = [
          { record_id: 'stable-b', fields: { 'AD账号': 'user-stable', '状态': '启用', '权限编码': 'app.view', '数据范围': ['dept-b'], '启用': true } },
          { record_id: 'stable-a', fields: { 'AD账号': 'user-stable', '状态': '启用', '权限编码': 'catalog.view', '数据范围': ['dept-a'], '启用': true } }
        ];
        return { items: stableFingerprintPermissionRead % 2 ? rows : [...rows].reverse(), total: 2, hasMore: false, nextPageToken: '' };
      }
      if (tableName === '应用索引') {
        await new Promise(resolve => setTimeout(resolve, 80));
        return { items: [{ record_id: 'stable-app', fields: {
          '应用ID': 'APP-STABLE', '应用名称': '稳定指纹应用', '应用类型': 'REPORT', '状态': 'ONLINE',
          '负责人ID': 'user-stable', '开发者ID': 'user-stable', '所属部门ID': 'dept-a', '开发部门ID': 'dept-a'
        } }], total: 1, hasMore: false, nextPageToken: '' };
      }
      if (tableName === '用户字典') return { items: [{ record_id: 'stable-user', fields: {
        'AD账号': 'user-stable', '姓名': '稳定用户', '所属部门ID': 'dept-a', '所属部门名称': '稳定部门'
      } }], total: 1, hasMore: false, nextPageToken: '' };
      if (tableName === '部门字典') return { items: [{ record_id: 'stable-dept', fields: {
        '部门ID': 'dept-a', '部门名称': '稳定部门'
      } }], total: 1, hasMore: false, nextPageToken: '' };
      if (tableName === '应用类型配置') return { items: [{ record_id: 'stable-type', fields: {
        '类型编码': 'REPORT', '类型名称': '报表', '状态': '启用'
      } }], total: 1, hasMore: false, nextPageToken: '' };
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const stableFingerprintContext = { identity: {
  tenantKey: 'tenant-stable', userId: 'user-stable', adAccount: 'user-stable', displayName: '稳定用户'
} };
const stableFingerprintHandoff = await stableFingerprintService.execute(
  'APP-002',
  { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' },
  stableFingerprintContext
).catch(error => error);
assert.equal(stableFingerprintHandoff.code, 'FEISHU_INITIAL_SYNCING');
const stableFingerprintFirstStatus = await stableFingerprintService.getReadSyncStatus(stableFingerprintHandoff.syncId, stableFingerprintContext);
assert.ok(['running', 'completed'].includes(stableFingerprintFirstStatus.state));
const stableFingerprintSecondStatus = await stableFingerprintService.getReadSyncStatus(stableFingerprintHandoff.syncId, {
  identity: { ...stableFingerprintContext.identity }
});
assert.ok(['running', 'completed'].includes(stableFingerprintSecondStatus.state), '同一授权集合不同顺序的连续轮询不得误报 403');
await stableFingerprintService.waitForIdle();
const stableFingerprintCompleted = await stableFingerprintService.getReadSyncStatus(stableFingerprintHandoff.syncId, {
  identity: { ...stableFingerprintContext.identity }
});
assert.equal(stableFingerprintCompleted.state, 'completed');
assert.equal(stableFingerprintCompleted.result.data.items[0].appId, 'APP-STABLE');
stableFingerprintService.close();

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
  assert.equal(leftTask.code, 'FEISHU_INITIAL_SYNCING', `${operationId} 左侧冷请求应交接后台任务`);
  assert.equal(rightTask.code, 'FEISHU_INITIAL_SYNCING', `${operationId} 右侧冷请求应交接后台任务`);
  assert.equal(
    leftTask.syncId,
    rightTask.syncId,
    `${operationId} 规范化等价参数必须复用同一任务`
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
  identity: { tenantKey: 'tenant-retry', userId: 'user-retry', adAccount: 'user-retry', displayName: '重试用户' }
});
assert.equal(authorizationRetryReads, 2, '实时鉴权遇到受控瞬时网络错误必须自动重试');
assert.deepEqual(retriedAuthorization.verifiedAuthorization.permissions, ['talent.view']);
authorizationRetryService.close();

// Ordinary authenticated reads must inspect an existing operation cache before
// any slow permission-table read. Permission-gated operations and task-status
// access retain their real-time authorization path.
let ordinaryPermissionReads = 0;
let ordinaryDictionaryReads = 0;
const ordinaryHotCacheService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 20,
  syncTaskTimeoutMs: 250,
  client: {
    async listRecords(tableId) {
      const tableName = tableNameById.get(tableId);
      if (tableName === '用户权限') {
        ordinaryPermissionReads += 1;
        await new Promise(resolve => setTimeout(resolve, 60));
        return { items: [], total: 0, hasMore: false, nextPageToken: '' };
      }
      if (tableName === '应用类型配置') ordinaryDictionaryReads += 1;
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const ordinaryContext = {
  identity: { tenantKey: 'tenant-hot', userId: 'user-hot', adAccount: 'user-hot', displayName: '热读用户' }
};
const ordinaryInput = { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false };
const ordinaryCold = await ordinaryHotCacheService.execute('COM-005', ordinaryInput, ordinaryContext);
assert.equal(ordinaryCold.code, 'OK');
assert.equal(ordinaryPermissionReads, 0, '普通字典读取不得被权限表读取阻塞');
assert.equal(ordinaryDictionaryReads, 1);
const ordinaryWarmStartedAt = Date.now();
const ordinaryWarm = await ordinaryHotCacheService.execute('COM-005', ordinaryInput, {
  identity: { ...ordinaryContext.identity }
});
assert.equal(ordinaryWarm.code, 'OK');
assert.equal(ordinaryWarm.cacheStatus, 'fresh');
assert.ok(Date.now() - ordinaryWarmStartedAt < 20, '热缓存读取必须绕过慢权限表并接近即时返回');
assert.equal(ordinaryPermissionReads, 0);
assert.equal(ordinaryDictionaryReads, 1);
ordinaryHotCacheService.close();

// COM-001 must read authorization and the remaining profile sources in one
// parallel business projection. A separate pre-cache authorization pass would
// make this deterministic fixture exceed its task deadline.
let profilePermissionReads = 0;
const profileDeadlineService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 120,
  client: {
    async listRecords(tableId) {
      const tableName = tableNameById.get(tableId);
      await new Promise(resolve => setTimeout(resolve, tableName === '用户权限' ? 60 : 40));
      if (tableName === '用户权限') {
        profilePermissionReads += 1;
        return {
          items: [{
            record_id: 'profile-permission',
            fields: { 'AD账号': 'profile-user', '状态': '启用', '权限编码': 'app.view', '数据范围': ['D001'], '启用': true }
          }],
          total: 1,
          hasMore: false,
          nextPageToken: ''
        };
      }
      if (tableName === '用户字典') {
        return {
          items: [{
            record_id: 'profile-user',
            fields: { 'AD账号': 'profile-user', '用户ID': 'profile-user', '姓名': '正式用户', '所属部门ID': 'D001', '所属部门名称': '正式部门', '启用': true }
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
const profileContext = {
  identity: { tenantKey: 'tenant-profile', userId: 'profile-user', adAccount: 'profile-user', displayName: '正式用户' }
};
const profileHandoff = await profileDeadlineService.execute('COM-001', {}, profileContext).catch(error => error);
assert.equal(profileHandoff.code, 'FEISHU_INITIAL_SYNCING');
await profileDeadlineService.waitForIdle();
assert.equal(profilePermissionReads, 1, 'COM-001 冷同步不得先鉴权再重复读取用户权限');
const profileWarmStartedAt = Date.now();
const profileWarm = await profileDeadlineService.execute('COM-001', {}, { identity: { ...profileContext.identity } });
assert.equal(profileWarm.code, 'OK');
assert.equal(profileWarm.cacheStatus, 'fresh');
assert.equal(profileWarm.data.displayName, '正式用户');
assert.ok(Date.now() - profileWarmStartedAt < 20, 'COM-001 完成后同键读取必须立即命中');
assert.equal(profilePermissionReads, 1);
profileDeadlineService.close();

// Ordinary/prewarm reads may consume at most two of the approved three Feishu
// slots. A live authorization check must always be able to start immediately.
let releaseOrdinaryReads;
const ordinaryReadGate = new Promise(resolve => { releaseOrdinaryReads = resolve; });
let authorizationStarted = false;
const reservedAuthorizationService = createFeishuReadOnlyService({
  identifierContract,
  maxSyncConcurrency: 3,
  syncTaskTimeoutMs: 500,
  client: {
    async listRecords(tableId) {
      const tableName = tableNameById.get(tableId);
      if (tableName === '用户权限') {
        authorizationStarted = true;
        return {
          items: [{ record_id: 'reserved-auth', fields: { 'AD账号': 'reserved-user', '状态': '启用', '权限编码': 'apps.view', '数据范围': ['D001'], '启用': true } }],
          total: 1, hasMore: false, nextPageToken: ''
        };
      }
      await ordinaryReadGate;
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const reservedContext = { identity: { tenantKey: 'tenant-reserved', userId: 'reserved-user', adAccount: 'reserved-user' } };
const ordinaryReads = [
  reservedAuthorizationService.executeConsistent('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, reservedContext),
  reservedAuthorizationService.executeConsistent('COM-005', { dictTypes: ['BUSINESS_DOMAIN'], includeDisabled: false }, reservedContext),
  reservedAuthorizationService.executeConsistent('COM-005', { dictTypes: ['SCENE'], includeDisabled: false }, reservedContext)
];
await new Promise(resolve => setTimeout(resolve, 10));
const liveAuthorization = reservedAuthorizationService.authorizeRequestContext({ identity: { ...reservedContext.identity } });
await new Promise(resolve => setTimeout(resolve, 20));
assert.equal(authorizationStarted, true, '普通读取不得占满全部飞书槽并阻塞实时授权');
releaseOrdinaryReads();
await Promise.all([...ordinaryReads, liveAuthorization]);
reservedAuthorizationService.close();

// A terminal failed task must leave the active merge index. The next ordinary
// request gets a new controlled task and can commit a reusable cache entry.
let recoveryDictionaryReads = 0;
const failedTaskRecoveryService = createFeishuReadOnlyService({
  identifierContract,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 150,
  syncRetryAttempts: 1,
  client: {
    async listRecords(tableId) {
      const tableName = tableNameById.get(tableId);
      if (tableName === '用户权限') return { items: [], total: 0, hasMore: false, nextPageToken: '' };
      if (tableName === '应用类型配置') {
        recoveryDictionaryReads += 1;
        await new Promise(resolve => setTimeout(resolve, 20));
        if (recoveryDictionaryReads === 1) {
          throw new FeishuProxyError('INVALID_UPSTREAM_RESPONSE', 'first task fails', 502);
        }
      }
      return { items: [], total: 0, hasMore: false, nextPageToken: '' };
    }
  }
});
const recoveryContext = {
  identity: { tenantKey: 'tenant-recovery', userId: 'user-recovery', adAccount: 'user-recovery', displayName: '恢复用户' }
};
const recoveryInput = { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false };
const failedTask = await failedTaskRecoveryService.execute('COM-005', recoveryInput, recoveryContext).catch(error => error);
assert.equal(failedTask.code, 'FEISHU_INITIAL_SYNCING');
await failedTaskRecoveryService.waitForIdle();
const failedTaskStatus = await failedTaskRecoveryService.getReadSyncStatus(failedTask.syncId, recoveryContext);
assert.equal(failedTaskStatus.state, 'failed');
const retryTask = await failedTaskRecoveryService.execute('COM-005', recoveryInput, { identity: { ...recoveryContext.identity } }).catch(error => error);
assert.equal(retryTask.code, 'FEISHU_INITIAL_SYNCING');
assert.notEqual(retryTask.syncId, failedTask.syncId, '失败任务不得被新请求继续复用');
await failedTaskRecoveryService.waitForIdle();
const recoveredWarm = await failedTaskRecoveryService.execute('COM-005', recoveryInput, { identity: { ...recoveryContext.identity } });
assert.equal(recoveredWarm.cacheStatus, 'fresh');
assert.equal(recoveryDictionaryReads, 2);
failedTaskRecoveryService.close();

console.log('cache hits bypass unrelated authorization latency while permission-gated reads and task status remain live');
