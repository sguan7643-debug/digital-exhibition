import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createBusinessWriteGovernance } from '../server/business-write-governance.mjs';
import { createFeishuCompositeOperationService } from '../server/feishu-composite-operation-service.mjs';
import { createFeishuWriteOperationService } from '../server/feishu-write-operation-service.mjs';
import { FEISHU_WRITE_OPERATION_BY_ID } from '../server/contracts/feishu-write-operation-manifest.mjs';

const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
    : value;
const govern = (operationId, input) => ({
  ...input,
  governance: {
    confirmed: true,
    auditContractId: 'business-write.v1',
    requestHash: `sha256:${createHash('sha256').update(JSON.stringify(stable({ operationId, input }))).digest('hex')}`
  }
});

const calls = [];
const safeRecordService = {
  async createOnce(input) {
    calls.push(['create', input]);
    return { record: { record_id: `rec-${input.businessKey}` }, version: 1, replayed: false };
  },
  async remove(input) {
    calls.push(['remove', input]);
    return { recordId: `rec-${input.businessKey}`, deleted: true, alreadyAbsent: false };
  },
  async getRecord() {
    return { record_id: 'rec-owned', fields: { 用户ID: 'USER-A' } };
  }
};
const writeService = createFeishuWriteOperationService({
  safeRecordService,
  now: () => new Date('2026-10-10T10:00:00.000Z'),
  traceIdFactory: () => 'trace-real-data-write'
});
const governedService = createBusinessWriteGovernance({ writeService, recordService: safeRecordService });
const identity = { userId: 'USER-A', adAccount: 'USER-A', tenantKey: 'TENANT-A' };

const favoriteCreateInput = {
  businessKey: 'FAVORITE-A-001',
  idempotencyKey: 'IDEM-FAVORITE-A-001',
  fields: { 应用ID: 'APP-001', 收藏时间: '2026-10-10T10:00:00.000Z' }
};
const favoriteCreated = await governedService.execute('FAV-003', govern('FAV-003', favoriteCreateInput), { identity });
assert.equal(favoriteCreated.schemaVersion, 'feishu-business-write.v2');
assert.equal(favoriteCreated.data.favoriteId, favoriteCreateInput.businessKey);
assert.equal(favoriteCreated.data.favoriteVersion, 1);
assert.equal(favoriteCreated.data.version, 1);
assert.equal(calls.at(-1)[1].fields['用户ID'], 'USER-A', '收藏用户必须由当前授权身份注入');

const favoriteReplay = await governedService.execute('FAV-003', govern('FAV-003', favoriteCreateInput), { identity });
assert.equal(favoriteReplay.data.favoriteId, favoriteCreateInput.businessKey);
assert.equal(favoriteReplay.data.favoriteVersion, 1);
assert.equal(favoriteReplay.data.replayed, true);
assert.equal(calls.filter(([kind]) => kind === 'create').length, 1, '幂等重放不得产生第二次写入');

const favoriteDeleted = await governedService.execute('FAV-004', govern('FAV-004', {
  businessKey: favoriteCreated.data.favoriteId,
  idempotencyKey: 'IDEM-FAVORITE-A-DELETE-001',
  ifMatch: favoriteCreated.data.favoriteVersion,
  fields: {}
}), { identity });
assert.equal(favoriteDeleted.data.favoriteId, favoriteCreateInput.businessKey);
assert.equal(favoriteDeleted.data.favoriteVersion, 1);
assert.equal(favoriteDeleted.data.version, 1);
assert.equal(favoriteDeleted.data.deleted, true);

const applicationInput = {
  businessKey: 'APPLICATION-REQUEST-A-001',
  idempotencyKey: 'IDEM-APPLICATION-REQUEST-A-001',
  fields: { 应用ID: 'APP-002', 申请理由: '正式业务申请', 申请时间: '2026-10-10T10:00:00.000Z' }
};
const application = await governedService.execute('APP-005', govern('APP-005', applicationInput), { identity });
assert.equal(application.schemaVersion, 'feishu-business-write.v2');
assert.equal(application.data.applicationRequestId, applicationInput.businessKey);
assert.equal(application.data.requestId, applicationInput.businessKey);
assert.equal(application.data.applicationId, 'APP-002');
assert.equal(application.data.status, 'PENDING');
assert.equal(application.data.version, 1);
assert.equal(calls.at(-1)[1].fields['申请人ID'], 'USER-A', '申请人必须由当前授权身份注入');
assert.equal(calls.at(-1)[1].fields['状态'], 'PENDING', '申请初始状态必须由服务端固定为 PENDING');

await assert.rejects(
  () => governedService.execute('APP-005', govern('APP-005', {
    ...applicationInput,
    businessKey: 'APPLICATION-REQUEST-A-002',
    idempotencyKey: 'IDEM-APPLICATION-REQUEST-A-002',
    fields: { ...applicationInput.fields, 申请人ID: 'USER-B' }
  }), { identity }),
  error => error.code === 'SERVER_CONTROLLED_FIELD_FORBIDDEN' && error.status === 400
);
await assert.rejects(
  () => governedService.execute('APP-005', govern('APP-005', {
    ...applicationInput,
    businessKey: 'APPLICATION-REQUEST-A-002-SAME-ACTOR',
    idempotencyKey: 'IDEM-APPLICATION-REQUEST-A-002-SAME-ACTOR',
    fields: { ...applicationInput.fields, 申请人ID: 'USER-A' }
  }), { identity }),
  error => error.code === 'SERVER_CONTROLLED_FIELD_FORBIDDEN' && error.status === 400
);
await assert.rejects(
  () => governedService.execute('APP-005', govern('APP-005', {
    ...applicationInput,
    businessKey: 'APPLICATION-REQUEST-A-003',
    idempotencyKey: 'IDEM-APPLICATION-REQUEST-A-003',
    fields: { ...applicationInput.fields, 状态: 'APPROVED' }
  }), { identity }),
  error => error.code === 'SERVER_CONTROLLED_FIELD_FORBIDDEN' && error.status === 400
);

for (const [operationId, input] of [
  ['FAV-003', { businessKey: 'FAVORITE-MISSING-APP', idempotencyKey: 'IDEM-FAVORITE-MISSING-APP', fields: { 收藏时间: '2026-10-10T10:00:00.000Z' } }],
  ['APP-005', { businessKey: 'APPLICATION-MISSING-APP', idempotencyKey: 'IDEM-APPLICATION-MISSING-APP', fields: { 申请理由: '缺少应用' } }]
]) {
  await assert.rejects(
    () => governedService.execute(operationId, govern(operationId, input), { identity }),
    error => error.code === 'REQUIRED_FIELD_MISSING' && error.status === 400 && error.requiredFields?.includes('应用ID')
  );
}

for (const operationId of ['FAV-003', 'FAV-004', 'APP-005']) {
  const plan = FEISHU_WRITE_OPERATION_BY_ID.get(operationId);
  assert.equal(plan.requiresRequestGovernance, true);
  assert.equal(plan.responseSchemaVersion, 'feishu-business-write.v2');
}
assert.deepEqual(FEISHU_WRITE_OPERATION_BY_ID.get('FAV-003').clientAllowedFields, ['应用ID', '收藏时间']);
assert.deepEqual(FEISHU_WRITE_OPERATION_BY_ID.get('FAV-004').clientAllowedFields, []);
assert.deepEqual(FEISHU_WRITE_OPERATION_BY_ID.get('APP-005').clientAllowedFields, ['应用ID', '申请理由', '申请时间']);

await assert.rejects(
  () => writeService.execute('FAV-003', favoriteCreateInput),
  error => error.code === 'REQUEST_GOVERNANCE_REQUIRED' && error.status === 400
);
await assert.rejects(
  () => writeService.execute('APP-005', applicationInput),
  error => error.code === 'REQUEST_GOVERNANCE_REQUIRED' && error.status === 400
);

const permissionReadService = {
  execute: async () => ({ code: 'OK', data: { permissions: [] } }),
  executeConsistent: async () => ({ code: 'OK', data: { permissions: [] } }),
  getReadSyncStatus() {},
  invalidateTables() {}
};
const composite = createFeishuCompositeOperationService({
  readService: permissionReadService,
  writeService,
  businessWriteService: governedService
});
await assert.rejects(
  () => composite.execute('APP-005', govern('APP-005', applicationInput), { identity, sameOriginRequest: true }),
  error => error.code === 'APPLICATION_REQUEST_PERMISSION_DENIED' && error.status === 403
);
await assert.rejects(
  () => composite.execute('FAV-003', govern('FAV-003', favoriteCreateInput), { identity, sameOriginRequest: true }),
  error => error.code === 'PERMISSION_DENIED' && error.status === 403
);
console.log('formal favorite and application write contracts passed');
