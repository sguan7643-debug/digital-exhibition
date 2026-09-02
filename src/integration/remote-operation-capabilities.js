import { getOperation } from './operation-registry.js';

const verifiedReadOperations = new Set([
  'APP-001', 'APP-002', 'ANN-001', 'ANN-002',
  'COM-003', 'COM-004',
  'TAL-001', 'TAL-002', 'TAL-003', 'TAL-005'
]);

export function resolveRemoteReadOperation(operationId) {
  const operation = getOperation(operationId);
  if (!operation) return undefined;
  if (!verifiedReadOperations.has(operationId)) return operation;
  return Object.freeze({ ...operation, readOnly: true, remoteEnabled: true, projectionContractVerified: true });
}

export const VERIFIED_REMOTE_READ_OPERATION_IDS = Object.freeze([...verifiedReadOperations]);
