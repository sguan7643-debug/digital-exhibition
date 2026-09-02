import assert from 'node:assert/strict';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createFeishuOperationDispatcher } from '../server/feishu-proxy-handler.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';

const identity = Object.freeze({
  userId: 'u_test', openId: 'ou_test', unionId: 'on_test', displayName: '测试用户',
  avatarUrl: 'https://example.invalid/avatar.png', employeeNo: 'TEST_001', tenantKey: 'tenant-test', identityType: 'user_id'
});
const service = createFeishuReadOnlyService({
  client: { listRecords: async () => { throw new Error('COM-001 不应读取多维表'); } },
  identifierContract: { byName: new Map() },
  now: () => new Date('2026-09-02T02:00:00.000Z'),
  traceIdFactory: () => 'trace-current-user'
});

await assert.rejects(
  service.execute('COM-001', {}, {}),
  error => error.code === 'USER_AUTH_REQUIRED' && error.status === 401
);
await assert.rejects(
  service.execute('COM-001', { userId: 'spoofed' }, { identity }),
  error => error.code === 'INVALID_OPERATION_INPUT' && error.status === 400
);
const currentUser = await service.execute('COM-001', {}, { identity });
assert.deepEqual(currentUser, {
  code: 'OK', data: identity, traceId: 'trace-current-user', schemaVersion: 'feishu-user-context.v1',
  sourceUpdatedAt: '2026-09-02T02:00:00.000Z', isComplete: true, dataStale: false
});

const dispatch = createFeishuOperationDispatcher({
  service,
  resolveRequestContext: request => ({ identity: request.headers.cookie === 'session=valid' ? identity : null }),
  traceIdFactory: () => 'trace-dispatch-auth'
});
const dispatched = await dispatch({
  method: 'POST', url: '/api/v1/operations/COM-001', headers: { 'content-type': 'application/json', cookie: 'session=valid' },
  body: { operationId: 'COM-001', input: {} }
});
assert.equal(dispatched.status, 200);
assert.equal(dispatched.body.data.userId, 'u_test');
assert.doesNotMatch(JSON.stringify(dispatched), /access_token|mobile|email/);
const contract = createVerifiedReadOperationContracts()['COM-001'];
assert.equal(contract.contractStatus, 'official-oauth-v3-verified');
assert.doesNotThrow(() => validateContractSchema({}, contract.requestSchema));
assert.doesNotThrow(() => validateContractSchema(currentUser, contract.successSchema));
assert.equal(resolveRemoteReadOperation('COM-001').remoteEnabled, true);

console.log('COM-001 resolves only the authenticated server session and rejects browser-supplied identity');
