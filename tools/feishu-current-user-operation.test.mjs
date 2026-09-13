import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createFeishuOperationDispatcher } from '../server/feishu-proxy-handler.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';

const identity = Object.freeze({
  userId: 'feishu-user-123', adAccount: 'u_test', openId: 'ou_test', unionId: 'on_test', displayName: '测试用户',
  avatarUrl: 'https://example.invalid/avatar.png', employeeNo: 'TEST_001', tenantKey: 'tenant-test', identityType: 'user_id'
});
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const rowsByName = new Map([
  ['用户字典', [{ record_id: 'user-row', fields: { AD账号: 'u_test', 姓名: '测试用户', 工号: 'TEST_001', 组织ID: 'ORG-1', 组织名称: '测试组织', 所属部门ID: 'DEPT-1', 所属部门名称: '测试部门', 手机号脱敏值: '138****0000', 邮箱脱敏值: 't***@example.invalid' } }]],
  ['用户权限', [
    { record_id: 'permission-1', fields: { 用户ID: 'u_test', 权限编码: 'apps.view', 状态: '有效', 启用: true, 数据范围: 'ORG-1、ORG-2' } },
    { record_id: 'permission-other', fields: { 用户ID: 'u_other', 权限编码: 'admin.*', 状态: '有效', 启用: true } }
  ]],
  ['消息通知', [{ record_id: 'message-1', fields: { 接收人ID: 'u_test', 已读状态: '未读' } }, { record_id: 'message-other', fields: { 接收人ID: 'u_other', 已读状态: '未读' } }]],
  ['应用收藏', [{ record_id: 'favorite-1', fields: { 用户ID: 'u_test', 有效: true } }]],
  ['积分余额', [{ record_id: 'balance-1', fields: { 用户ID: 'u_test', 当前总积分: 88 } }]]
]);
const tableNameById = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const service = createFeishuReadOnlyService({
  client: { listRecords: async tableId => { const items = rowsByName.get(tableNameById.get(tableId)) || []; return { items, total: items.length, hasMore: false, nextPageToken: '' }; } },
  identifierContract,
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
assert.equal(currentUser.data.userId, 'u_test');
assert.equal(currentUser.data.departmentName, '测试部门');
assert.equal(currentUser.data.unreadMessageCount, 1);
assert.equal(currentUser.data.favoriteCount, 1);
assert.equal(currentUser.data.pointBalance, 88);
assert.deepEqual(currentUser.data.permissions, ['apps.view']);
assert.deepEqual(currentUser.data.availableOrgIds, ['ORG-1', 'ORG-2']);
assert.equal(currentUser.schemaVersion, 'feishu-user-context.v2');

const navigation = await service.execute('COM-002', { platform: 'WEB' }, { identity });
assert.ok(navigation.data.menus.some(menu => menu.path === '/workbench'));
assert.ok(navigation.data.menus.some(menu => menu.path === '/apps'));
assert.ok(!navigation.data.menus.some(menu => menu.path === '/admin'));
assert.deepEqual(navigation.data.actions, [{ permissionCode: 'apps.view', resourceType: 'ACTION', resourceId: null, allowed: true, reason: null }]);

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
assert.doesNotMatch(JSON.stringify(dispatched), /access_token|13800000000|test@example\.invalid/);
const contract = createVerifiedReadOperationContracts()['COM-001'];
assert.equal(contract.contractStatus, 'official-oauth-v3-verified');
assert.doesNotThrow(() => validateContractSchema({}, contract.requestSchema));
assert.doesNotThrow(() => validateContractSchema(currentUser, contract.successSchema));
assert.equal(resolveRemoteReadOperation('COM-001').remoteEnabled, true);
assert.doesNotThrow(() => validateContractSchema(navigation, createVerifiedReadOperationContracts()['COM-002'].successSchema));
assert.equal(resolveRemoteReadOperation('COM-002').remoteEnabled, true);
await assert.rejects(service.execute('COM-002', { platform: 'MOBILE' }, { identity }), error => error.code === 'INVALID_OPERATION_INPUT');

console.log('COM-001/002 aggregate only the authenticated user data and enforce permission-scoped navigation');
