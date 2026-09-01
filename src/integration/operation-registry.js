const expand = (prefix, numbers) => numbers.map(number => `${prefix}-${String(number).padStart(3, '0')}`);

export const FIRST_BATCH_OPERATION_IDS = Object.freeze([
  ...expand('COM', [1, 2, 3, 4, 5]),
  ...expand('WB', [1, 2, 3]),
  ...expand('ANN', [1, 2, 3, 5]),
  ...expand('APP', [1, 2, 3, 9]),
  ...expand('TAL', [1, 2, 3, 5]),
  ...expand('MAT', [1, 2]),
  ...expand('INT', [1, 3, 5])
]);

export const LATER_BATCH_OPERATION_IDS = Object.freeze([
  ...expand('COM', [6, 7, 8, 11]), ...expand('WB', [4]),
  ...expand('MSG', [1, 2, 3, 4, 5]), ...expand('ANN', [4]),
  ...expand('FAV', [1, 2, 3, 4]), ...expand('APP', [4, 5, 6, 7, 8, 10]),
  ...expand('PTS', [1, 2, 3, 4]), ...expand('TRN', [1, 2, 3, 4, 5, 6]),
  ...expand('CER', [1, 2, 3, 4]), ...expand('OPS', [1, 3]),
  ...expand('OAN', [1, 2, 3, 8]), ...expand('OAP', [1, 2, 3, 6, 8, 10, 11]),
  ...expand('ADM', [1, 2, 3, 4, 5, 6, 7]), ...expand('TAL', [4]),
  ...expand('MAT', [3]), ...expand('INT', [2, 4])
]);

export const DEFERRED_OPERATION_IDS = Object.freeze([
  ...expand('COM', [9, 10]), ...expand('PTS', [5]), ...expand('OPS', [2, 4]),
  ...expand('OAN', [4, 5, 6, 7]), ...expand('OAP', [4, 5, 7, 9, 12]),
  ...expand('ARC', [1, 2, 3])
]);

const writeIds = new Set([
  ...expand('COM', [6, 7, 9, 11]), ...expand('MSG', [3, 4, 5]), ...expand('ANN', [4]),
  ...expand('FAV', [3, 4]), ...expand('APP', [5, 6, 8]), ...expand('PTS', [5]),
  ...expand('TRN', [4, 5]), ...expand('CER', [4]), ...expand('OPS', [2, 4]),
  ...expand('OAN', [4, 5, 6, 7]), ...expand('OAP', [4, 5, 7, 9, 10, 12]),
  ...expand('ADM', [1, 2, 5]), ...expand('TAL', [4]), ...expand('INT', [2]),
  ...expand('ARC', [1, 3])
]);

const riskyIds = new Set([
  ...expand('COM', [6, 7, 9]), ...expand('OPS', [2, 4]), ...expand('OAN', [4, 5, 6, 7]),
  ...expand('OAP', [4, 5, 7, 9, 12]), ...expand('TAL', [4]), ...expand('INT', [2]),
  ...expand('ARC', [1, 3])
]);

const batches = [
  ['first', FIRST_BATCH_OPERATION_IDS],
  ['later', LATER_BATCH_OPERATION_IDS],
  ['deferred', DEFERRED_OPERATION_IDS]
];

export const OPERATION_REGISTRY = Object.freeze(batches.flatMap(([batch, ids]) => ids.map(id => Object.freeze({
  id,
  batch,
  access: writeIds.has(id) ? 'write' : 'read',
  readOnly: !writeIds.has(id),
  risk: riskyIds.has(id) ? 'high' : writeIds.has(id) ? 'controlled' : 'read-only',
  contractStatus: 'candidate-only',
  remoteEnabled: false,
  disabledReason: '缺少经核验的代理、表、视图与 field_id 契约证据'
}))));

export function getOperation(operationId) {
  return OPERATION_REGISTRY.find(operation => operation.id === operationId);
}

const governedOperationIds = new Set(OPERATION_REGISTRY.map(operation => operation.id));

export function isKnownOperationId(operationId) {
  return governedOperationIds.has(operationId);
}
