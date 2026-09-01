import { createDataState, reduceDataState } from './data-state.js';
import { getPageIntegrationContract } from './page-integration-matrix.js';
import { getOperation } from './operation-registry.js';

function collectionFromResponse(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.records)) return response.data.records;
  return null;
}

function aggregateReadResults(contract, operationIds, settled) {
  const sections = {};
  const failures = [];
  const traceIds = [];
  const syncedTimes = [];
  let dataStale = false;
  let responseComplete = true;

  settled.forEach((result, index) => {
    const operationId = operationIds[index];
    if (result.status === 'fulfilled') {
      const response = result.value;
      sections[operationId] = response.data;
      if (response.traceId) traceIds.push(response.traceId);
      if (response.sourceUpdatedAt) syncedTimes.push(response.sourceUpdatedAt);
      dataStale ||= response.dataStale === true;
      responseComplete &&= response.isComplete !== false;
      return;
    }
    const error = result.reason || {};
    failures.push({ operationId, error });
    if (error.traceId) traceIds.push(error.traceId);
  });

  const successfulCount = settled.length - failures.length;
  const unavailableSections = failures.map(failure => failure.operationId);
  const retryScope = failures.filter(failure => failure.error.retryable !== false && failure.error.state !== 'cancelled').map(failure => failure.operationId);
  const lastSyncedAt = syncedTimes.sort().at(-1) || null;
  const isComplete = failures.length === 0 && responseComplete;
  const empty = isComplete && contract.emptyOperationIds.length > 0 && contract.emptyOperationIds.every(operationId => {
    const result = settled[operationIds.indexOf(operationId)];
    return result?.status === 'fulfilled' && collectionFromResponse(result.value)?.length === 0;
  });

  if (successfulCount === 0) {
    const error = failures.find(item => item.error.state === 'permission-denied')?.error
      || failures.find(item => item.error.state === 'schema-drift')?.error
      || failures[0]?.error
      || { state: 'error', message: '读取失败' };
    return {
      kind: 'failure', code: error.state || 'error', error: error.message, traceId: error.traceId,
      traceIds, isComplete: false, dataStale, lastSyncedAt, unavailableSections,
      unavailableReasonCode: error.state || 'error', retryScope
    };
  }

  const state = failures.length ? 'partial' : dataStale ? 'data-stale' : empty ? 'empty' : 'normal';
  return {
    kind: 'success', state, data: sections, traceId: traceIds.at(-1) || null, traceIds,
    isComplete, dataStale, lastSyncedAt, unavailableSections,
    unavailableReasonCode: failures.length ? 'partial-read' : dataStale ? 'data-stale' : null,
    retryScope
  };
}

export function describeDataSourceEnvelope(envelope) {
  if (envelope.mode === 'remote' && envelope.state !== 'disabled') return '当前页面使用受控代理数据';
  if (envelope.mode === 'mock') return '当前页面使用本地演示数据，未连接飞书';
  return '当前页面真实数据接入未启用';
}

export function createPageDataSource({ route, runtime, mockLoader, client, operationResolver = getOperation }) {
  const contract = getPageIntegrationContract(route);
  if (!contract) throw new Error(`未登记页面接入合同：${route}`);
  const initialMode = contract.defaultMode === 'disabled' ? 'disabled' : runtime.mode;
  let envelope = createDataState({ mode: initialMode, data: null, state: initialMode === 'disabled' ? 'disabled' : undefined });
  let generation = 0;
  let activeController = null;

  const withContract = value => Object.freeze({
    ...value,
    operationIds: contract.operationIds,
    readOperationIds: contract.readOperationIds,
    actions: contract.actions
  });

  async function load(input = {}, options = {}) {
    const currentGeneration = ++generation;
    activeController?.abort(new DOMException('由更新的页面读取取代', 'AbortError'));
    activeController = new AbortController();
    const abortFromCaller = () => activeController.abort(options.signal?.reason || new DOMException('页面读取已取消', 'AbortError'));
    if (options.signal?.aborted) abortFromCaller();
    else options.signal?.addEventListener?.('abort', abortFromCaller, { once: true });

    try {
      if (contract.defaultMode === 'disabled' || runtime.mode === 'disabled') {
        envelope = reduceDataState({ ...envelope, mode: 'disabled' }, { type: 'disable', reason: contract.defaultMode === 'disabled' ? 'route-contract-disabled' : runtime.reason });
        return withContract(envelope);
      }
      if (runtime.mode === 'mock') {
        const data = await mockLoader?.(input);
        if (currentGeneration !== generation) return withContract(envelope);
        envelope = reduceDataState({ ...envelope, mode: 'mock' }, { type: 'success', data });
        return withContract(envelope);
      }

      const requestedOperationIds = options.operationIds || contract.readOperationIds;
      if (requestedOperationIds.some(operationId => !contract.readOperationIds.includes(operationId))) throw new Error('页面 load 只能执行已登记的只读 operation');
      const operations = requestedOperationIds.map(operationResolver);
      if (!client || operations.some(operation => !operation?.readOnly || operation.remoteEnabled !== true)) {
        envelope = reduceDataState({ ...envelope, mode: 'disabled' }, { type: 'disable', reason: 'read-operation-contract-disabled' });
        return withContract(envelope);
      }

      envelope = reduceDataState({ ...envelope, mode: 'remote' }, { type: 'load' });
      const settled = await Promise.allSettled(requestedOperationIds.map(operationId => client.execute(operationId, input, { signal: activeController.signal })));
      if (currentGeneration !== generation) return withContract(envelope);
      const aggregate = aggregateReadResults(contract, requestedOperationIds, settled);
      envelope = aggregate.kind === 'success'
        ? reduceDataState({ ...envelope, mode: 'remote' }, { type: 'success', ...aggregate })
        : reduceDataState({ ...envelope, mode: 'remote' }, { type: 'fail', ...aggregate });
      return withContract(envelope);
    } finally {
      options.signal?.removeEventListener?.('abort', abortFromCaller);
    }
  }

  async function retry(input = {}) {
    if (!envelope.retryScope.length) return withContract(envelope);
    return load(input, { operationIds: [...envelope.retryScope] });
  }

  async function executeAction(actionId, input = {}, context = {}) {
    const action = contract.actions.find(candidate => candidate.actionId === actionId);
    if (!action) throw new Error(`页面未登记操作：${actionId}`);
    if (runtime.mode !== 'remote' || contract.defaultMode === 'disabled' || context.actionEnabled !== true) throw new Error('操作独立门禁未启用');
    if (!context.permissions?.includes(action.requiredPermission)) throw new Error('缺少操作权限');
    if (action.confirmationRequired && context.confirmed !== true) throw new Error('操作需要明确确认');
    if (action.idempotencyRequired && !context.idempotencyKey) throw new Error('操作需要幂等键');
    const operation = operationResolver(action.operationId);
    if (!operation || operation.access !== 'write' || operation.remoteEnabled !== true) throw new Error('写 operation 未启用');
    return client.execute(action.operationId, { ...input, idempotencyKey: context.idempotencyKey }, { signal: context.signal });
  }

  return Object.freeze({ load, retry, executeAction, snapshot: () => withContract(envelope), contract });
}
