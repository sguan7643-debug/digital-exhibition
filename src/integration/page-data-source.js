import { createDataState, reduceDataState } from './data-state.js';
import { getPageIntegrationContract } from './page-integration-matrix.js';
import { getOperation } from './operation-registry.js';

function collectionFromResponse(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.records)) return response.data.records;
  return null;
}

export function resolveActiveRetryScope(envelope = {}) {
  const records = envelope.sectionRecords || {};
  return [...new Set(Array.isArray(envelope.retryScope) ? envelope.retryScope : [])]
    .filter(operationId => records[operationId]?.available === false && records[operationId]?.retryable === true);
}

function aggregateReadResults(contract, operationIds, settled, previousEnvelope = null) {
  const sectionRecords = { ...(previousEnvelope?.sectionRecords || {}) };
  const currentFailures = [];

  settled.forEach((result, index) => {
    const operationId = operationIds[index];
    if (result.status === 'fulfilled') {
      const response = result.value;
      sectionRecords[operationId] = {
        available: true,
        data: response.data,
        traceId: response.traceId || null,
        sourceUpdatedAt: response.sourceUpdatedAt || null,
        dataStale: response.dataStale === true,
        isComplete: response.isComplete !== false,
        errorState: null,
        retryable: false
      };
      return;
    }
    const error = result.reason || {};
    currentFailures.push({ operationId, error });
    sectionRecords[operationId] = {
      ...(sectionRecords[operationId] || {}),
      available: false,
      traceId: error.traceId || sectionRecords[operationId]?.traceId || null,
      errorState: error.state || 'error',
      retryable: error.retryable !== false && error.state !== 'cancelled',
      retryAfterSeconds: Number.isInteger(error.retryAfterSeconds) ? error.retryAfterSeconds : null
    };
  });

  const sections = Object.fromEntries(Object.entries(sectionRecords)
    .filter(([, record]) => Object.hasOwn(record, 'data'))
    .map(([operationId, record]) => [operationId, record.data]));
  const contractRecords = contract.readOperationIds.map(operationId => [operationId, sectionRecords[operationId]]);
  const unavailableSections = contractRecords.filter(([, record]) => !record?.available).map(([operationId]) => operationId);
  const retryScope = contractRecords
    .filter(([, record]) => !record?.available && record?.retryable === true)
    .map(([operationId]) => operationId);
  const traceIds = contractRecords.map(([, record]) => record?.traceId).filter(Boolean);
  const syncedTimes = contractRecords.map(([, record]) => record?.sourceUpdatedAt).filter(Boolean).sort();
  const dataStale = contractRecords.some(([, record]) => record?.available && record.dataStale === true);
  const lastSyncedAt = syncedTimes.at(-1) || null;
  const isComplete = contractRecords.every(([, record]) => record?.available && record.isComplete !== false);
  const empty = isComplete && contract.emptyOperationIds.length > 0 && contract.emptyOperationIds.every(operationId => {
    const record = sectionRecords[operationId];
    return record?.available && collectionFromResponse({ data: record.data })?.length === 0;
  });
  const allCurrentCancelled = currentFailures.length === settled.length
    && currentFailures.length > 0
    && currentFailures.every(item => item.error.state === 'cancelled');

  if (allCurrentCancelled && previousEnvelope) {
    const error = currentFailures[0].error;
    return {
      kind: 'failure', code: 'cancelled', error: error.message, traceId: error.traceId,
      traceIds, isComplete: false, dataStale, lastSyncedAt, unavailableSections,
      unavailableReasonCode: 'cancelled', retryScope: previousEnvelope.retryScope,
      sectionRecords
    };
  }

  if (Object.keys(sections).length === 0) {
    const error = currentFailures.find(item => item.error.state === 'permission-denied')?.error
      || currentFailures.find(item => item.error.state === 'schema-drift')?.error
      || currentFailures[0]?.error
      || { state: 'error', message: '读取失败' };
    return {
      kind: 'failure', code: error.state || 'error', error: error.message, traceId: error.traceId,
      traceIds, isComplete: false, dataStale, lastSyncedAt, unavailableSections,
      unavailableReasonCode: error.state || 'error', retryScope, sectionRecords
    };
  }

  const state = unavailableSections.length ? 'partial' : dataStale ? 'data-stale' : empty ? 'empty' : 'normal';
  return {
    kind: 'success', state, data: sections, traceId: traceIds.at(-1) || null, traceIds,
    isComplete, dataStale, lastSyncedAt, unavailableSections,
    unavailableReasonCode: unavailableSections.length ? 'partial-read' : dataStale ? 'data-stale' : null,
    retryScope, sectionRecords
  };
}

export function describeDataSourceEnvelope(envelope) {
  if (envelope.mode === 'remote' && envelope.state !== 'disabled') return '当前页面使用受控代理数据';
  return '当前页面真实数据接入未启用';
}

function homepageAggregateEvent(contract, result) {
  const { status, body } = result;
  if (status === 202) {
    const sectionRecords = Object.fromEntries(contract.readOperationIds.map(operationId => [operationId, {
      available: false,
      traceId: body.traceId || null,
      sourceUpdatedAt: null,
      dataStale: false,
      isComplete: false,
      errorState: 'initial-syncing',
      retryable: true,
      retryAfterSeconds: Math.max(1, Math.round(Number(body.pollAfterMs || 2000) / 1000))
    }]));
    return {
      type: 'fail', code: 'initial-syncing', error: '正式飞书数据正在首次同步',
      traceId: body.traceId || null, traceIds: body.traceId ? [body.traceId] : [],
      isComplete: false, dataStale: false, lastSyncedAt: null,
      unavailableSections: [...contract.readOperationIds], unavailableReasonCode: 'initial-syncing',
      retryScope: [...contract.readOperationIds], sectionRecords,
      refreshing: true, syncId: body.syncId, syncState: body.state, syncError: null
    };
  }
  const sectionRecords = Object.fromEntries(contract.readOperationIds.map(operationId => {
    const section = body.sections?.[operationId] || {};
    return [operationId, {
      available: section.available === true,
      data: section.data,
      traceId: section.traceId || body.traceId || null,
      sourceUpdatedAt: section.sourceUpdatedAt || null,
      dataStale: section.dataStale === true,
      isComplete: section.isComplete !== false,
      errorState: section.available === true ? null : section.state === 'syncing' ? 'initial-syncing' : 'error',
      retryable: section.retryable !== false,
      retryAfterSeconds: 2
    }];
  }));
  const unavailableSections = contract.readOperationIds.filter(operationId => sectionRecords[operationId]?.available !== true);
  const retryScope = contract.readOperationIds.filter(operationId => {
    const section = sectionRecords[operationId];
    return section?.retryable === true && (section.available !== true || section.dataStale === true);
  });
  const traceIds = [...new Set(Object.values(sectionRecords).map(section => section.traceId).filter(Boolean))];
  return {
    type: 'success',
    state: body.aggregateState === 'fresh' ? 'normal' : body.aggregateState === 'stale' ? 'data-stale' : 'partial',
    data: body.data || {}, traceId: body.traceId || null, traceIds,
    isComplete: unavailableSections.length === 0,
    dataStale: body.dataStale === true,
    lastSyncedAt: body.sourceUpdatedAt || null,
    unavailableSections,
    unavailableReasonCode: unavailableSections.length ? 'partial-read' : body.dataStale ? 'data-stale' : null,
    retryScope,
    sectionRecords,
    refreshing: body.refreshing === true,
    syncId: body.syncId || null,
    syncState: body.refreshing ? 'running' : body.syncId ? 'failed' : null,
    syncError: null
  };
}

export function assertWriteActionContext(action, operation, context = {}) {
  if (action?.remoteEnabled !== true) throw new Error('操作独立门禁未启用');
  if (!operation || operation.access !== 'write' || operation.remoteEnabled !== true) throw new Error('写 operation 未启用');
  if (!context.permissions?.includes(action.requiredPermission)) throw new Error('缺少操作权限');
  if (action.confirmationRequired && context.confirmed !== true) throw new Error('操作需要明确确认');
  if (action.idempotencyRequired && !context.idempotencyKey) throw new Error('操作需要幂等键');
  if (action.versionConditionRequired && !(context.ifMatch || context.version)) throw new Error('操作需要版本或 ETag 前置条件');
  if (action.isolatedTestRecordRequired && !context.isolatedTestRecordId) throw new Error('操作仅允许使用隔离测试记录');
  if (action.auditContractRequired && !context.auditContractId) throw new Error('操作需要审计合同');
  if (action.requestHashRequired && !context.requestHash) throw new Error('操作需要请求哈希');
  return true;
}

export function createPageDataSource({ route, runtime, client, homepageClient, operationResolver = getOperation }) {
  const contract = getPageIntegrationContract(route);
  if (!contract) throw new Error(`未登记页面接入合同：${route}`);
  const initialMode = runtime.mode;
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
    const controller = new AbortController();
    activeController = controller;
    const abortFromCaller = () => controller.abort(options.signal?.reason || new DOMException('页面读取已取消', 'AbortError'));
    if (options.signal?.aborted) abortFromCaller();
    else options.signal?.addEventListener?.('abort', abortFromCaller, { once: true });

    try {
      if (runtime.mode === 'disabled') {
        envelope = reduceDataState({ ...envelope, mode: 'disabled' }, { type: 'disable', reason: runtime.reason });
        return withContract(envelope);
      }
      const requestedOperationIds = options.operationIds || contract.readOperationIds;
      if (requestedOperationIds.some(operationId => !contract.readOperationIds.includes(operationId))) throw new Error('页面 load 只能执行已登记的只读 operation');
      const operations = requestedOperationIds.map(operationResolver);
      if (!client || operations.some(operation => !operation?.readOnly || operation.remoteEnabled !== true)) {
        envelope = reduceDataState({ ...envelope, mode: 'disabled' }, { type: 'disable', reason: 'read-operation-contract-disabled' });
        return withContract(envelope);
      }

      const stableEnvelope = envelope;
      envelope = reduceDataState({ ...envelope, mode: 'remote' }, { type: 'load' });
      if (route === '/workbench' && homepageClient) {
        const result = await homepageClient.load({ forceRefresh: options.forceRefresh === true, signal: controller.signal });
        if (currentGeneration !== generation) return withContract(envelope);
        envelope = reduceDataState({ ...envelope, mode: 'remote' }, homepageAggregateEvent(contract, result));
        return withContract(envelope);
      }
      const settled = await Promise.allSettled(requestedOperationIds.map(operationId => client.execute(
        operationId,
        options.inputByOperation?.[operationId] || input,
        { signal: controller.signal }
      )));
      if (currentGeneration !== generation) return withContract(envelope);
      const aggregate = aggregateReadResults(contract, requestedOperationIds, settled, options.operationIds ? stableEnvelope : null);
      envelope = aggregate.kind === 'success'
        ? reduceDataState({ ...envelope, mode: 'remote' }, { type: 'success', ...aggregate })
        : reduceDataState({ ...envelope, mode: 'remote' }, { type: 'fail', ...aggregate });
      return withContract(envelope);
    } finally {
      options.signal?.removeEventListener?.('abort', abortFromCaller);
      if (activeController === controller) activeController = null;
    }
  }

  async function retry(input = {}, options = {}) {
    if (route === '/workbench' && homepageClient) return load(input, { ...options, forceRefresh: true });
    if (!envelope.retryScope.length) return withContract(envelope);
    return load(input, { ...options, operationIds: [...envelope.retryScope] });
  }

  async function pollSync(options = {}) {
    if (route !== '/workbench' || !homepageClient || !envelope.syncId) return withContract(envelope);
    const currentGeneration = generation;
    const syncId = envelope.syncId;
    activeController?.abort(new DOMException('由更新的同步状态查询取代', 'AbortError'));
    const controller = new AbortController();
    activeController = controller;
    const abortFromCaller = () => controller.abort(options.signal?.reason || new DOMException('同步状态查询已取消', 'AbortError'));
    if (options.signal?.aborted) abortFromCaller();
    else options.signal?.addEventListener?.('abort', abortFromCaller, { once: true });
    let status;
    try {
      status = await homepageClient.status(syncId, { signal: controller.signal });
    } finally {
      options.signal?.removeEventListener?.('abort', abortFromCaller);
      if (activeController === controller) activeController = null;
    }
    if (currentGeneration !== generation || syncId !== envelope.syncId) return withContract(envelope);
    if (status.state === 'queued' || status.state === 'running') {
      envelope = Object.freeze({ ...envelope, refreshing: true, syncState: status.state, traceId: status.traceId || envelope.traceId });
      return withContract(envelope);
    }
    if (status.state === 'completed') return load({}, options.loadOptions || {});
    envelope = reduceDataState({ ...envelope, mode: 'remote' }, {
      type: 'fail',
      code: envelope.data && Object.keys(envelope.data).length ? 'data-stale' : 'error',
      error: status.errorCode || '首页数据同步失败',
      traceId: status.traceId || envelope.traceId,
      isComplete: false,
      dataStale: envelope.dataStale,
      unavailableSections: envelope.unavailableSections,
      retryScope: envelope.retryScope.length ? envelope.retryScope : [...contract.readOperationIds],
      sectionRecords: envelope.sectionRecords,
      refreshing: false,
      syncId,
      syncState: status.state,
      syncError: status.errorCode || 'HOMEPAGE_SYNC_FAILED'
    });
    return withContract(envelope);
  }

  function cancel(reason = '页面已切换') {
    activeController?.abort(new DOMException(reason, 'AbortError'));
  }

  async function executeAction(actionId, input = {}, context = {}) {
    const action = contract.actions.find(candidate => candidate.actionId === actionId);
    if (!action) throw new Error(`页面未登记操作：${actionId}`);
    const operation = operationResolver(action.operationId);
    const effectiveAction = Object.freeze({ ...action, remoteEnabled: runtime.testWritesEnabled === true });
    if (runtime.mode !== 'remote' || runtime.testWritesEnabled !== true) throw new Error('操作独立门禁未启用');
    assertWriteActionContext(effectiveAction, operation, context);
    return client.execute(action.operationId, {
      ...input,
      idempotencyKey: context.idempotencyKey,
      ...(action.versionConditionRequired ? { ifMatch: context.ifMatch || context.version } : {})
    }, { signal: context.signal });
  }

  return Object.freeze({ load, retry, pollSync, cancel, executeAction, snapshot: () => withContract(envelope), contract });
}
