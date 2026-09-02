import assert from 'node:assert/strict';

import { OPERATION_REGISTRY, getOperation } from '../src/integration/operation-registry.js';
import { getPageIntegrationContract } from '../src/integration/page-integration-matrix.js';
import { resolveIntegrationRuntime } from '../src/integration/runtime-config.js';
import { createSafeProxyClient } from '../src/integration/safe-proxy-client.js';
import { createSyntheticOperationContracts } from '../src/integration/operation-contract-schemas.js';
import { assertWriteActionContext, createPageDataSource } from '../src/integration/page-data-source.js';
import { createDataState, reduceDataState } from '../src/integration/data-state.js';

const origin = 'http://127.0.0.1:4173';
const operationContracts = createSyntheticOperationContracts(OPERATION_REGISTRY.map(operation => operation.id));

for (const unsafeBase of [
  '/', '/api/..', '/api/%2e%2e', '/api/%252e%252e', '/api/%252f%252fevil', '/api/%255c%255cevil'
]) {
  assert.throws(() => resolveIntegrationRuntime({ proxyBase: unsafeBase, origin }), /安全代理|同源/);
  assert.throws(() => createSafeProxyClient({ baseUrl: unsafeBase, origin, operationContracts, fetchImpl: async () => ({}) }), /安全代理|同源/);
}

let finalFetchUrl = '';
const safeClient = createSafeProxyClient({
  baseUrl: '/api/v1/', origin, timeoutMs: 1000, operationContracts,
  fetchImpl: async url => {
    finalFetchUrl = url;
    return { ok: true, status: 200, json: async () => ({ code: 'OK', data: { items: [] } }) };
  }
});
await safeClient.execute('APP-002', { filters: { category: 'RPA' } });
assert.equal(finalFetchUrl, '/api/v1/operations/APP-002');
assert.equal(new URL(finalFetchUrl, origin).origin, origin, 'final operation URL must remain same-origin');
assert.ok(!finalFetchUrl.startsWith('//'), 'final operation URL must not be protocol-relative');

for (const [key, value] of [
  ['xAppToken', 'request-secret'],
  ['appTokenValue', 'request-secret'],
  ['feishuTenantAccessToken', 'request-secret']
]) {
  await assert.rejects(
    () => safeClient.execute('APP-002', { filters: { [key]: value } }),
    /敏感/
  );
}

for (const responseData of [
  { items: [{ xAppToken: 'response-secret' }] },
  { rows: [{ appTokenValue: 'response-secret' }] },
  [{ nested: { feishuTenantAccessToken: 'response-secret' } }]
]) {
  const leakingClient = createSafeProxyClient({
    baseUrl: '/api/v1', origin, timeoutMs: 1000, operationContracts,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ code: 'OK', data: responseData }) })
  });
  await assert.rejects(() => leakingClient.execute('APP-002', {}), /敏感/);
}

const remoteRuntime = resolveIntegrationRuntime({
  requestedMode: 'remote', remoteEnabled: true, contractEvidenceComplete: true,
  timeoutMs: 1000, origin
});
const enabledOperation = operationId => Object.freeze({ ...getOperation(operationId), remoteEnabled: true });

let writeTransportCalls = 0;
const favoriteSource = createPageDataSource({
  route: '/favorites', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => { writeTransportCalls += 1; return { code: 'OK', data: { operationId } }; } }
});
const favoriteAction = favoriteSource.contract.actions.find(action => action.actionId === 'FAV-003');
assert.equal(favoriteAction.remoteEnabled, false);
assert.equal(favoriteAction.versionConditionRequired, false);
assert.equal(favoriteAction.isolatedTestRecordRequired, true);
assert.equal(favoriteAction.auditContractRequired, true);
assert.equal(favoriteAction.requestHashRequired, true);
await assert.rejects(() => favoriteSource.executeAction('FAV-003', {}, {
  actionEnabled: true,
  permissions: ['operation:FAV-003:execute'],
  confirmed: true,
  idempotencyKey: 'idem-favorite-001',
  isolatedTestRecordId: 'isolated-record-001',
  auditContractId: 'audit-contract-001',
  requestHash: 'sha256:request-001'
}), /操作独立门禁未启用/);
assert.equal(writeTransportCalls, 0, 'caller context must not bypass the immutable action gate');

const enabledAction = Object.freeze({
  ...favoriteAction,
  remoteEnabled: true
});
const enabledWriteOperation = Object.freeze({ ...getOperation('FAV-003'), remoteEnabled: true });
const completeWriteContext = {
  permissions: ['operation:FAV-003:execute'],
  confirmed: true,
  idempotencyKey: 'idem-favorite-001',
  ifMatch: 'version-1',
  isolatedTestRecordId: 'isolated-record-001',
  auditContractId: 'audit-contract-001',
  requestHash: 'sha256:request-001'
};
assert.throws(() => assertWriteActionContext({ ...enabledAction, remoteEnabled: false }, enabledWriteOperation, completeWriteContext), /操作独立门禁/);
assert.throws(() => assertWriteActionContext(enabledAction, { ...enabledWriteOperation, remoteEnabled: false }, completeWriteContext), /写 operation 未启用/);
for (const [field, expected] of [
  ['permissions', /权限/],
  ['confirmed', /确认/],
  ['idempotencyKey', /幂等/],
  ['isolatedTestRecordId', /隔离测试记录/],
  ['auditContractId', /审计合同/],
  ['requestHash', /请求哈希/]
]) {
  const incomplete = { ...completeWriteContext };
  delete incomplete[field];
  assert.throws(() => assertWriteActionContext(enabledAction, enabledWriteOperation, incomplete), expected);
}
assert.equal(assertWriteActionContext(enabledAction, enabledWriteOperation, completeWriteContext), true);
const deleteAction = favoriteSource.contract.actions.find(action => action.actionId === 'FAV-004');
assert.equal(deleteAction.versionConditionRequired, true);
const enabledDeleteAction = Object.freeze({ ...deleteAction, remoteEnabled: true });
const incompleteDeleteContext = { ...completeWriteContext, permissions: ['operation:FAV-004:execute'] };
delete incompleteDeleteContext.ifMatch;
assert.throws(() => assertWriteActionContext(enabledDeleteAction, Object.freeze({ ...getOperation('FAV-004'), remoteEnabled: true }), incompleteDeleteContext), /版本|ETag/);

const makeError = (state, traceId, retryable) => Object.assign(new Error(state), { state, traceId, retryable });

let retryAttempt = 0;
const retrySource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => {
    if (operationId === 'APP-001') {
      return {
        code: 'OK', data: { items: [{ id: 'filter-1' }] }, traceId: 'trace-filter',
        sourceUpdatedAt: '2026-09-02T08:00:00Z', isComplete: true
      };
    }
    retryAttempt += 1;
    if (retryAttempt === 1) throw makeError('error', 'trace-list-failed-1', true);
    return {
      code: 'OK', data: { items: [] }, traceId: 'trace-list-recovered',
      sourceUpdatedAt: '2026-09-01T08:00:00Z', isComplete: true
    };
  } }
});
const firstPartial = await retrySource.load();
assert.equal(firstPartial.state, 'partial');
assert.deepEqual(firstPartial.data['APP-001'].items, [{ id: 'filter-1' }]);
const recovered = await retrySource.retry();
assert.equal(recovered.state, 'empty');
assert.deepEqual(recovered.data['APP-001'].items, [{ id: 'filter-1' }], 'retry must preserve stable successful sections');
assert.deepEqual(recovered.data['APP-002'].items, []);
assert.equal(recovered.isComplete, true);
assert.equal(recovered.lastSyncedAt, '2026-09-02T08:00:00Z', 'retry must preserve freshness metadata from untouched sections');
assert.ok(recovered.traceIds.includes('trace-filter'));
assert.ok(recovered.traceIds.includes('trace-list-recovered'));

let repeatedAttempt = 0;
const repeatedPartialSource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => {
    if (operationId === 'APP-001') return { code: 'OK', data: { items: [{ id: 'filter-1' }] }, traceId: 'trace-stable' };
    repeatedAttempt += 1;
    throw makeError('error', `trace-list-failed-${repeatedAttempt}`, true);
  } }
});
await repeatedPartialSource.load();
const repeatedPartial = await repeatedPartialSource.retry();
assert.equal(repeatedPartial.state, 'partial');
assert.deepEqual(repeatedPartial.data['APP-001'].items, [{ id: 'filter-1' }]);
assert.deepEqual(repeatedPartial.retryScope, ['APP-002']);
assert.ok(repeatedPartial.traceIds.includes('trace-stable'));
assert.ok(repeatedPartial.traceIds.includes('trace-list-failed-2'));

const permissionSource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => {
    if (operationId === 'APP-001') return { code: 'OK', data: { items: [{ id: 'filter-1' }] }, traceId: 'trace-filter' };
    throw makeError('permission-denied', 'trace-permission', false);
  } }
});
const permissionPartial = await permissionSource.load();
assert.equal(permissionPartial.state, 'partial');
assert.deepEqual(permissionPartial.retryScope, [], 'permission-denied sections must be excluded from retry');

let cancelAttempt = 0;
const cancelledRetrySource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: async operationId => {
    if (operationId === 'APP-001') return { code: 'OK', data: { items: [{ id: 'filter-1' }] }, traceId: 'trace-filter' };
    cancelAttempt += 1;
    if (cancelAttempt === 1) throw makeError('timeout', 'trace-timeout', true);
    if (cancelAttempt === 2) throw makeError('cancelled', 'trace-cancelled', false);
    return { code: 'OK', data: { items: [] }, traceId: 'trace-recovered', isComplete: true };
  } }
});
await cancelledRetrySource.load();
const cancelledRetry = await cancelledRetrySource.retry();
assert.equal(cancelledRetry.state, 'cancelled');
assert.deepEqual(cancelledRetry.data['APP-001'].items, [{ id: 'filter-1' }]);
assert.deepEqual(cancelledRetry.retryScope, ['APP-002'], 'cancelled retry must remain recoverable from the prior retry scope');
assert.equal(cancelledRetry.announcement, '数据更新已取消');
const recoveredAfterCancel = await cancelledRetrySource.retry();
assert.equal(recoveredAfterCancel.state, 'empty');
assert.deepEqual(recoveredAfterCancel.data['APP-001'].items, [{ id: 'filter-1' }]);

const deferred = [];
const oldCaller = new AbortController();
const concurrentSource = createPageDataSource({
  route: '/apps', runtime: remoteRuntime, operationResolver: enabledOperation,
  client: { execute: (operationId, input, options) => new Promise(resolve => deferred.push({ operationId, input, options, resolve })) }
});
const oldLoad = concurrentSource.load({ query: 'old' }, { signal: oldCaller.signal });
await Promise.resolve();
const newLoad = concurrentSource.load({ query: 'new' });
await Promise.resolve();
oldCaller.abort(new DOMException('old caller left', 'AbortError'));
const newRequests = deferred.filter(item => item.input.query === 'new');
assert.equal(newRequests.length, 2);
assert.ok(newRequests.every(item => item.options.signal.aborted === false), 'old caller abort must not cancel the newer load');
for (const item of newRequests) item.resolve({ code: 'OK', data: { items: [{ id: 'new' }] }, traceId: `new-${item.operationId}` });
await newLoad;
for (const item of deferred.filter(entry => entry.input.query === 'old')) item.resolve({ code: 'OK', data: { items: [{ id: 'old' }] }, traceId: `old-${item.operationId}` });
await oldLoad;
assert.deepEqual(concurrentSource.snapshot().data['APP-002'].items, [{ id: 'new' }]);

const announcementCases = [
  [{ type: 'success', state: 'normal', data: { section: { items: [1] } } }, '数据已更新'],
  [{ type: 'success', state: 'empty', data: { section: { items: [] } } }, '没有符合条件的数据'],
  [{ type: 'success', state: 'partial', data: { section: { items: [1] } } }, '部分数据暂不可用，已保留可用内容'],
  [{ type: 'success', state: 'data-stale', data: { section: { items: [1] } } }, '正在显示缓存数据'],
  [{ type: 'fail', code: 'permission-denied' }, '无权访问当前数据'],
  [{ type: 'fail', code: 'timeout' }, '数据请求超时，可稍后重试'],
  [{ type: 'fail', code: 'cancelled' }, '数据更新已取消']
];
for (const [event, expectedAnnouncement] of announcementCases) {
  assert.equal(reduceDataState(createDataState(), event).announcement, expectedAnnouncement);
}

assert.ok(getPageIntegrationContract('/favorites').actions.every(action => Object.isFrozen(action)));
console.log('Round 2：最终同源 URL、嵌套敏感字段、双层写门禁、稳定重试合并、独立取消与状态播报合同通过');
