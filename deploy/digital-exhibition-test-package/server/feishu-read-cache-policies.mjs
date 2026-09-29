const P0_USER = Object.freeze(['COM-001', 'COM-002', 'WB-001']);
const P0_TENANT = Object.freeze(['COM-005', 'WB-002']);
const CACHED_TENANT = Object.freeze([
  'COM-003', 'COM-004',
  'ANN-001', 'ANN-002', 'ANN-003', 'ANN-005',
  'APP-001', 'APP-002', 'APP-003', 'APP-007', 'APP-009',
  'PTS-004',
  'TRN-001', 'TRN-002', 'TRN-003',
  'CER-001', 'CER-002',
  'OPS-003',
  'MAT-001', 'MAT-002'
]);
const CACHED_USER = Object.freeze([
  'WB-003', 'WB-004',
  'MSG-001', 'MSG-002',
  'FAV-001', 'FAV-002',
  'PTS-001', 'PTS-002', 'PTS-003'
]);
const CACHED_ADMIN = Object.freeze([
  'TAL-001', 'TAL-002', 'TAL-003', 'TAL-005',
  'INT-001', 'INT-003', 'INT-004', 'INT-005',
  'OPS-001',
  'OAN-001', 'OAN-002', 'OAN-003', 'OAN-008',
  'OAP-001', 'OAP-002', 'OAP-003', 'OAP-006', 'OAP-008', 'OAP-011',
  'ADM-003', 'ADM-004', 'ADM-006'
]);

export const STRONG_CONSISTENCY_OPERATION_IDS = Object.freeze([
  'COM-008', 'APP-004', 'APP-010', 'TRN-006', 'CER-003',
  'ADM-007', 'MAT-003', 'COM-010', 'ARC-002'
]);

const policy = (code, freshMs, staleMs, scope) => Object.freeze({ code, freshMs, staleMs, scope });
const P0_U30 = policy('P0-U30', 30_000, 300_000, 'user');
const P0_T60 = policy('P0-T60', 60_000, 900_000, 'tenant');
const C_T60 = policy('C-T60', 60_000, 900_000, 'tenant');
const C_U30 = policy('C-U30', 30_000, 300_000, 'user');
const C_A30 = policy('C-A30', 30_000, 300_000, 'admin');

export const READ_OPERATION_CACHE_POLICIES = Object.freeze(Object.fromEntries([
  ...P0_USER.map(operationId => [operationId, P0_U30]),
  ...P0_TENANT.map(operationId => [operationId, P0_T60]),
  ...CACHED_TENANT.map(operationId => [operationId, C_T60]),
  ...CACHED_USER.map(operationId => [operationId, C_U30]),
  ...CACHED_ADMIN.map(operationId => [operationId, C_A30])
]));

export const CACHEABLE_READ_OPERATION_IDS = Object.freeze(Object.keys(READ_OPERATION_CACHE_POLICIES));

