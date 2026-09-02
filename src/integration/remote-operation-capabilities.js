import { getOperation } from './operation-registry.js';

const verifiedReadOperations = new Set([
  'COM-001', 'COM-002', 'COM-005',
  'WB-001', 'WB-002', 'WB-003', 'WB-004',
  'APP-001', 'APP-002', 'APP-003', 'APP-007', 'APP-009', 'APP-010', 'ANN-001', 'ANN-002', 'ANN-003', 'ANN-005',
  'MSG-001', 'MSG-002', 'FAV-001', 'FAV-002', 'PTS-001', 'PTS-002', 'PTS-003',
  'COM-003', 'COM-004',
  'TAL-001', 'TAL-002', 'TAL-003', 'TAL-005',
  'PTS-004', 'TRN-001', 'TRN-002', 'TRN-003', 'TRN-006',
  'CER-001', 'CER-002', 'CER-003', 'OPS-003', 'MAT-001', 'MAT-002', 'COM-010'
]);

export function resolveRemoteReadOperation(operationId) {
  const operation = getOperation(operationId);
  if (!operation) return undefined;
  if (!verifiedReadOperations.has(operationId)) return operation;
  return Object.freeze({ ...operation, readOnly: true, remoteEnabled: true, projectionContractVerified: true });
}

export const VERIFIED_REMOTE_READ_OPERATION_IDS = Object.freeze([...verifiedReadOperations]);
