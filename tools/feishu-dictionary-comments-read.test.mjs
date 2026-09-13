import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const rowsByName = new Map([
  ['应用类型配置', [{ record_id: 'rec-type', fields: { 类型ID: 'TYPE-1', 类型编码: 'REPORT', 类型名称: '可视化报表', 类型描述: '报表应用', 颜色令牌: 'blue', 排序: 1, 状态: '启用', 版本: 2, 更新时间: '2026-09-02' } }]],
  ['业务域字典', [{ record_id: 'rec-domain', fields: { 业务域ID: 'DOMAIN-1', 业务域编码: 'PURCHASE', 业务域名称: '采购管理', 描述: '采购业务', 颜色令牌: 'green', 排序: 2, 启用: true, 版本: 3, 更新时间: '2026-09-01' } }]],
  ['场景字典', [{ record_id: 'rec-scene', fields: { 场景ID: 'SCENE-1', 场景名称: '生产运营' } }]],
  ['素材分类', [{ record_id: 'rec-category', fields: { 分类编码: 'DOC', 分类名称: '文档', 父级ID: '', 启用: true, 排序: 1, 版本: 1, 更新时间: '2026-08-30' } }]],
  ['应用评论', [{ record_id: 'rec-comment', fields: { 主键: 'COMMENT-1', 应用ID: 'APP-1', 评论人ID: 'USER-1', 评论内容: '很好用', 评论时间: '2026-09-01', 评分: 5, 状态: 'PUBLISHED', 回复内容脱敏值: '感谢反馈', 回复人ID: 'USER-2', 回复时间: '2026-09-02', 版本: 1, 更新时间: '2026-09-02' } }]],
  ['用户字典', [
    { record_id: 'rec-user-1', fields: { AD账号: 'USER-1', 姓名: '用户甲', 头像: 'avatar-secret-token', 所属部门名称: '采购部' } },
    { record_id: 'rec-user-2', fields: { AD账号: 'USER-2', 姓名: '管理员乙', 所属部门名称: '运营部' } }
  ]]
]);
const nameByTableId = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const client = { async listRecords(tableId) { const items = rowsByName.get(nameByTableId.get(tableId)) || []; return { items, total: items.length, hasMore: false, nextPageToken: '' }; } };
const service = createFeishuReadOnlyService({ client, identifierContract, now: () => new Date('2026-09-02T05:00:00.000Z'), traceIdFactory: () => 'trace-dict-comment' });
const contracts = createVerifiedReadOperationContracts();

const dictionaryResponse = await service.execute('COM-005', { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE', 'MATERIAL_CATEGORY', 'UNKNOWN'], includeDisabled: false });
assert.equal(dictionaryResponse.data.itemsByType.APPLICATION_TYPE[0].value, 'REPORT');
assert.equal(dictionaryResponse.data.itemsByType.BUSINESS_DOMAIN[0].label, '采购管理');
assert.equal(dictionaryResponse.data.itemsByType.SCENE[0].value, 'SCENE-1');
assert.deepEqual(dictionaryResponse.data.itemsByType.UNKNOWN, []);
assert.doesNotThrow(() => validateContractSchema(dictionaryResponse, contracts['COM-005'].successSchema));

const commentResponse = await service.execute('APP-007', { appId: 'APP-1', rating: 5, hasReply: true, page: 1, pageSize: 10 });
assert.equal(commentResponse.data.items[0].user.displayName, '用户甲');
assert.equal(commentResponse.data.items[0].reply.repliedBy, '管理员乙');
assert.equal(commentResponse.data.items[0].likeCount, 0);
assert.equal(commentResponse.data.items[0].isLiked, false);
assert.doesNotMatch(JSON.stringify(commentResponse), /avatar-secret-token/);
assert.doesNotThrow(() => validateContractSchema(commentResponse, contracts['APP-007'].successSchema));

for (const operationId of ['COM-005', 'APP-007']) assert.equal(resolveRemoteReadOperation(operationId).remoteEnabled, true);
await assert.rejects(service.execute('COM-005', { dictTypes: [] }), error => error.code === 'INVALID_OPERATION_INPUT');
await assert.rejects(service.execute('APP-007', { appId: 'APP-1', userId: 'spoofed' }), error => error.code === 'INVALID_OPERATION_INPUT');

console.log('COM-005 dictionaries and APP-007 comments expose exact safe projections');
