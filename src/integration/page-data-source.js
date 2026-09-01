import { createDataState, reduceDataState } from './data-state.js';
import { getPageIntegrationContract } from './page-integration-matrix.js';
import { getOperation } from './operation-registry.js';

export function createPageDataSource({ route, runtime, mockLoader, client }) {
  const contract = getPageIntegrationContract(route);
  if (!contract) throw new Error(`未登记页面接入合同：${route}`);
  let envelope = createDataState({ mode: runtime.mode, data: null });
  async function load(input = {}) {
    if (runtime.mode === 'mock') {
      const data = await mockLoader?.(input);
      envelope = reduceDataState({ ...envelope, mode: 'mock' }, { type: 'success', data });
      return Object.freeze({ ...envelope, mode: 'mock', operationIds: contract.operationIds });
    }
    if (runtime.mode !== 'remote') {
      envelope = reduceDataState({ ...envelope, mode: 'disabled' }, { type: 'disable', reason: runtime.reason });
      return Object.freeze({ ...envelope, mode: 'disabled', operationIds: contract.operationIds });
    }
    const operations = contract.operationIds.map(getOperation);
    if (operations.some(operation => !operation || operation.remoteEnabled !== true)) {
      envelope = reduceDataState({ ...envelope, mode: 'disabled' }, { type: 'disable', reason: 'operation-contract-disabled' });
      return Object.freeze({ ...envelope, mode: 'disabled', operationIds: contract.operationIds });
    }
    envelope = reduceDataState(envelope, { type: 'load' });
    try {
      const results = await Promise.all(contract.operationIds.map(operationId => client.execute(operationId, input)));
      envelope = reduceDataState(envelope, { type: 'success', data: results, traceId: results.at(-1)?.traceId });
    } catch (error) {
      envelope = reduceDataState(envelope, { type: 'fail', code: error.state, error: error.message, traceId: error.traceId });
    }
    return Object.freeze({ ...envelope, mode: runtime.mode, operationIds: contract.operationIds });
  }
  return Object.freeze({ load, snapshot: () => envelope, contract });
}
