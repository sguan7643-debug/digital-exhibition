import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const rows = new Map([
  ['应用索引', [{ record_id: 'a1', fields: { 应用ID: 'APP-1', 应用名称: '采购分析', 应用类型: 'REPORT', 应用简介: '采购经营分析', 应用关键字: '采购、分析', 所属场景ID: 'SCENE-1', 使用次数: 12, 状态: 'ONLINE' } }]],
  ['应用类型配置', [{ record_id: 't1', fields: { 类型ID: 'REPORT', 类型编码: 'REPORT', 类型名称: '可视化报表' } }]],
  ['场景字典', [{ record_id: 's1', fields: { 场景ID: 'SCENE-1', 场景名称: '生产运营' } }]],
  ['用户字典', []], ['部门字典', []], ['业务域字典', []]
]);
const names = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const client = { async listRecords(tableId) { const items = rows.get(names.get(tableId)) || []; return { items, total: items.length, hasMore: false, nextPageToken: '' }; } };
const service = createFeishuReadOnlyService({ client, identifierContract, appProjectionCacheMs: 0 });
const response = await service.execute('WB-002', { keyword: ' 采购 ', scene: '生产运营', typeCode: 'REPORT', page: 1, pageSize: 10 });
assert.equal(response.data.items[0].appId, 'APP-1');
assert.equal(response.data.normalizedKeyword, '采购');
assert.deepEqual(response.data.facets.scenes, [{ value: 'SCENE-1', label: '生产运营', count: 1 }]);
assert.doesNotThrow(() => validateContractSchema(response, createVerifiedReadOperationContracts()['WB-002'].successSchema));
assert.equal(resolveRemoteReadOperation('WB-002').remoteEnabled, true);
await assert.rejects(service.execute('WB-002', { page: 1, pageSize: 12 }), error => error.code === 'INVALID_PAGE_SIZE');
console.log('WB-002 searches real application projections with exact facets and unified pagination');
