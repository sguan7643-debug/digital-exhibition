import assert from 'node:assert/strict';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createFeishuFileAccessService } from '../server/feishu-file-access-service.mjs';
import { createSecureResourceOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const identifierContract = loadFeishuIdentifierContract(new URL('../server/contracts/feishu-base-identifiers.json', import.meta.url));
const rows = new Map([
  ['应用索引', [{ record_id: 'rec-app', fields: { 应用ID: 'APP-1', 应用名称: '采购助手', 应用URL地址: 'https://apps.example.test/launch', 状态: '已上架', 打开方式: 'NEW_TAB', SSO模式: 'NONE' } }]],
  ['用户权限', [{ record_id: 'rec-perm', fields: { 应用ID: 'APP-1', 用户ID: 'USER-1', 状态: '启用', 启用: true } }]],
  ['文件上传会话', [{ record_id: 'rec-upload', fields: { 文件ID: 'FILE-1', 文件名: 'TEST_说明.txt', MIME类型: 'text/plain', 大小字节: 4, 飞书文件令牌: 'token-file-1' } }]],
  ['附件资料', []],
  ['素材中心', [{ record_id: 'rec-material', fields: { 素材ID: 'MAT-1', 素材名称: 'TEST_模板', 素材文件: [{ file_token: 'token-material-1', name: 'TEST_模板.xlsx', size: 12 }], 下载次数: 3, 状态: 'ONLINE' } }]]
]);
const byTableId = new Map([...rows].map(([name, items]) => [identifierContract.byName.get(name).tableId, items]));
const client = { async listRecords(tableId) { const items = byTableId.get(tableId) || []; return { items, total: items.length, hasMore: false, nextPageToken: '' }; } };
const grants = [];
const fileAccessService = { createGrant(input) { grants.push(input); return { url: `/api/v1/files/content/grant-${grants.length}`, expiresAt: '2026-09-02T06:05:00.000Z' }; } };
const service = createFeishuReadOnlyService({ client, identifierContract, fileAccessService, allowedAppLaunchHosts: ['apps.example.test'], now: () => new Date('2026-09-02T06:00:00.000Z'), traceIdFactory: () => 'trace-secure' });
const context = { identity: { userId: 'USER-1', openId: 'OPEN-1' } };
const contracts = createSecureResourceOperationContracts();

const file = await service.execute('COM-008', { fileId: 'FILE-1', mode: 'PREVIEW', disposition: 'INLINE' }, context);
validateContractSchema(file, contracts['COM-008'].successSchema);
assert.equal(file.data.url.startsWith('/api/v1/files/content/'), true);
assert.equal(JSON.stringify(file).includes('token-file-1'), false, '文件 token 不得返回浏览器');

const launch = await service.execute('APP-004', { appId: 'APP-1', launchMode: 'NEW_TAB', sourcePage: '/apps/APP-1', requestedAt: '2026-09-02T06:00:00.000Z' }, context);
validateContractSchema(launch, contracts['APP-004'].successSchema);
assert.equal(launch.data.allowed, true);
assert.equal(launch.data.launchUrl, 'https://apps.example.test/launch');

const deniedService = createFeishuReadOnlyService({ client, identifierContract, fileAccessService, allowedAppLaunchHosts: [], now: () => new Date('2026-09-02T06:00:00.000Z') });
const denied = await deniedService.execute('APP-004', { appId: 'APP-1', launchMode: 'NEW_TAB', sourcePage: '/apps', requestedAt: '2026-09-02T06:00:00.000Z' }, context);
assert.equal(denied.data.allowed, false);
assert.equal(denied.data.reasonCode, 'APP_HOST_NOT_ALLOWED');

const material = await service.execute('MAT-003', { materialId: 'MAT-1', fileId: 'token-material-1', purpose: 'USER_DOWNLOAD', sourcePage: '/materials/MAT-1', clientOccurredAt: '2026-09-02T06:00:00.000Z' }, context);
validateContractSchema(material, contracts['MAT-003'].successSchema);
assert.equal(material.data.accessUrl.startsWith('/api/v1/files/content/'), true);

const mediaCalls = [];
const access = createFeishuFileAccessService({ client: { async downloadMedia(token) { mediaCalls.push(token); return new Response('data', { headers: { 'content-type': 'text/plain' } }); } }, now: () => 1000, ttlMs: 5000 });
const grant = access.createGrant({ fileToken: 'private-token', fileName: 'TEST.txt', identity: context.identity });
const token = grant.url.split('/').at(-1);
await assert.rejects(() => access.consume(token, { userId: 'OTHER' }), error => error.code === 'FILE_ACCESS_FORBIDDEN');
const consumed = await access.consume(token, context.identity);
assert.equal(consumed.grant.fileName, 'TEST.txt');
assert.deepEqual(mediaCalls, ['private-token']);

console.log('COM-008/APP-004/MAT-003 secure grants, identity binding, host allowlist and token isolation passed');
