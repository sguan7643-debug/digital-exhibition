import { getOperation } from './operation-registry.js';

const verifiedReadOperations = new Set(['APP-001', 'APP-002']);

export function resolveRemoteReadOperation(operationId) {
  const operation = getOperation(operationId);
  if (!operation) return undefined;
  if (!verifiedReadOperations.has(operationId)) return operation;
  return Object.freeze({ ...operation, readOnly: true, remoteEnabled: true, projectionContractVerified: true });
}

export const VERIFIED_REMOTE_READ_OPERATION_IDS = Object.freeze([...verifiedReadOperations]);
