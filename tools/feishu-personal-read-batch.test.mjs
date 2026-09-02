import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const rowsByName = new Map([
  ['用户字典', [{ record_id: 'u1', fields: { 用户ID: 'USER-1', 姓名: '用户甲' } }, { record_id: 'u2', fields: { 用户ID: 'USER-2', 姓名: '用户乙' } }]],
  ['消息通知', [
    { record_id: 'm1', fields: { 消息ID: 'MSG-1', 接收人ID: 'USER-1', 消息标题: '待办提醒', 消息内容: '请处理', 分类: 'TODO', 已读状态: '未读', 消息时间: '2026-09-02T02:00:00.000Z', 消息类型编码: 'TODO', 优先级: 'HIGH', 发送人ID: 'USER-2', 目标类型: 'APPLICATION', 目标ID: 'AP-1', 目标路径: '/applications/AP-1' } },
    { record_id: 'm2', fields: { 消息ID: 'MSG-2', 接收人ID: 'USER-2', 消息标题: '他人消息', 已读状态: '未读', 消息时间: '2026-09-02T01:00:00.000Z' } }
  ]],
  ['应用收藏', [{ record_id: 'f1', fields: { 主键: 'FAV-1', 应用ID: 'APP-1', 用户ID: 'USER-1', 收藏时间: '2026-09-01T00:00:00.000Z', 资源类型: 'APP', 资源ID: 'APP-1', 有效: true } }]],
  ['应用索引', [{ record_id: 'a1', fields: { 应用ID: 'APP-1', 应用名称: '采购助手', 应用类型: 'AI', 应用简介: '采购应用', 所属业务域ID: 'DOMAIN-1', 状态: 'ONLINE' } }]],
  ['应用类型配置', [{ record_id: 't1', fields: { 类型ID: 'AI', 类型编码: 'AI', 类型名称: 'AI智能体' } }]],
  ['业务域字典', [{ record_id: 'd1', fields: { 业务域ID: 'DOMAIN-1', 业务域名称: '采购管理' } }]],
  ['部门字典', []], ['场景字典', []],
  ['积分余额', [{ record_id: 'b1', fields: { 主键: 'POINT-1', 用户ID: 'USER-1', 当前总积分: 90, 最后更新时间: '2026-09-02' } }]],
  ['积分流水', [
    { record_id: 'l1', fields: { 流水ID: 'LEDGER-1', 流水号: 'NO-1', 用户ID: 'USER-1', 积分类型编码: 'USE', 来源编码: 'APP_USE', 方向: 'INCOME', 变动积分: 100, 变动后余额: 100, 状态: 'EFFECTIVE', 发生时间: '2026-09-01T01:00:00.000Z', 备注: '使用应用' } },
    { record_id: 'l2', fields: { 流水ID: 'LEDGER-2', 流水号: 'NO-2', 用户ID: 'USER-1', 积分类型编码: 'REDEEM', 来源编码: 'REDEEM', 方向: 'EXPENSE', 变动积分: -10, 变动后余额: 90, 状态: 'EFFECTIVE', 发生时间: '2026-09-02T01:00:00.000Z', 备注: '兑换' } },
    { record_id: 'l3', fields: { 流水ID: 'LEDGER-3', 用户ID: 'USER-2', 变动积分: 999, 发生时间: '2026-09-02T01:00:00.000Z' } }
  ]],
  ['积分月度汇总', [{ record_id: 'mo1', fields: { 用户ID: 'USER-1', 年月: '2026-09', 月度总积分: 90, 应用使用月度合计: 100 } }]],
  ['积分规则', [{ record_id: 'r1', fields: { 当前版本: 4 } }]]
]);
const tableNames = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const client = { async listRecords(tableId) { const items = rowsByName.get(tableNames.get(tableId)) || []; return { items, total: items.length, hasMore: false, nextPageToken: '' }; } };
const service = createFeishuReadOnlyService({ client, identifierContract, appProjectionCacheMs: 0, now: () => new Date('2026-09-02T05:00:00.000Z'), traceIdFactory: () => 'trace-personal' });
const context = { identity: { userId: 'USER-1', openId: 'OPEN-1' } };
const contracts = createVerifiedReadOperationContracts();
const responses = new Map();

const messageStatsResponse = await service.execute('MSG-001', {}, context); responses.set('MSG-001', messageStatsResponse);
const messageStats = messageStatsResponse.data;
assert.equal(messageStats.totalCount, 1);
assert.equal(messageStats.unreadCount, 1);
const messagesResponse = await service.execute('MSG-002', { page: 1, pageSize: 10 }, context); responses.set('MSG-002', messagesResponse);
const messages = messagesResponse.data;
assert.equal(messages.items[0].senderName, '用户乙');
assert.equal(messages.items[0].targetType, 'APPLICATION');

const favoriteStatsResponse = await service.execute('FAV-001', { resourceType: 'APP' }, context); responses.set('FAV-001', favoriteStatsResponse);
const favoriteStats = favoriteStatsResponse.data;
assert.equal(favoriteStats.totalCount, 1);
const favoritesResponse = await service.execute('FAV-002', { resourceType: 'APP', page: 1, pageSize: 10 }, context); responses.set('FAV-002', favoritesResponse);
const favorites = favoritesResponse.data;
assert.equal(favorites.items[0].resource.name, '采购助手');

const pointsOverviewResponse = await service.execute('PTS-001', { month: '2026-09' }, context); responses.set('PTS-001', pointsOverviewResponse);
const pointsOverview = pointsOverviewResponse.data;
assert.equal(pointsOverview.account.balance, 90);
assert.equal(pointsOverview.account.totalEarned, 100);
assert.equal(pointsOverview.account.totalSpent, 10);
assert.equal(pointsOverview.rulesVersion, 4);
const ledgersResponse = await service.execute('PTS-002', { direction: 'ALL', page: 1, pageSize: 10 }, context); responses.set('PTS-002', ledgersResponse);
const ledgers = ledgersResponse.data;
assert.equal(ledgers.total, 2);
assert.deepEqual(ledgers.summary, { income: 100, expense: 10, netChange: 90 });
const pointStatsResponse = await service.execute('PTS-003', { groupBy: 'SOURCE' }, context); responses.set('PTS-003', pointStatsResponse);
const pointStats = pointStatsResponse.data;
assert.equal(pointStats.totalIncome, 100);
assert.equal(pointStats.totalExpense, 10);

for (const operationId of ['MSG-001', 'MSG-002', 'FAV-001', 'FAV-002', 'PTS-001', 'PTS-002', 'PTS-003']) {
  assert.doesNotThrow(() => validateContractSchema(responses.get(operationId), contracts[operationId].successSchema, operationId));
  assert.equal(resolveRemoteReadOperation(operationId).remoteEnabled, true);
  await assert.rejects(service.execute(operationId, {}, {}), error => error.code === 'USER_AUTH_REQUIRED');
  await assert.rejects(service.execute(operationId, { userId: 'USER-2' }, context), error => error.code === 'INVALID_OPERATION_INPUT');
}

console.log('7 personal reads are scoped exclusively to authenticated server identity');
