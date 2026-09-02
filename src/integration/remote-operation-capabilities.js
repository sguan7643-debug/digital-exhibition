import { getOperation } from './operation-registry.js';

const verifiedReadOperations = new Set([
  'COM-001',
  'APP-001', 'APP-002', 'APP-003', 'APP-009', 'ANN-001', 'ANN-002', 'ANN-003', 'ANN-005',
  'COM-003', 'COM-004',
  'TAL-001', 'TAL-002', 'TAL-003', 'TAL-005',
  'PTS-004', 'TRN-001', 'TRN-002', 'TRN-003',
  'CER-001', 'CER-002', 'OPS-003', 'MAT-001', 'MAT-002'
]);

export function resolveRemoteReadOperation(operationId) {
  const operation = getOperation(operationId);
  if (!operation) return undefined;
  if (!verifiedReadOperations.has(operationId)) return operation;
  return Object.freeze({ ...operation, readOnly: true, remoteEnabled: true, projectionContractVerified: true });
}

export const VERIFIED_REMOTE_READ_OPERATION_IDS = Object.freeze([...verifiedReadOperations]);
