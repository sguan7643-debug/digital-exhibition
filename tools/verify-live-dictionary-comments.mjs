import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createDictionaryCommentReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const service = createFeishuReadOnlyService({ client: createFeishuOpenApiClient(), identifierContract, appProjectionCacheMs: 0 });
const contracts = createDictionaryCommentReadOperationContracts();

const dictionaries = await service.execute('COM-005', {
  dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE', 'MATERIAL_CATEGORY'], includeDisabled: false
});
validateContractSchema(dictionaries, contracts['COM-005'].successSchema, 'COM-005');

const appList = await service.execute('APP-002', { page: 1, pageSize: 10 });
const appId = appList.data.items[0]?.appId;
if (!appId) throw new Error('APP-007 实测缺少可见应用样例');
const comments = await service.execute('APP-007', { appId, page: 1, pageSize: 10, sort: 'createdAt,desc' });
validateContractSchema(comments, contracts['APP-007'].successSchema, 'APP-007');

const serialized = JSON.stringify({ dictionaries, comments });
if (/access_token|app_secret|file_token|tenant_access_token|手机号|邮箱/i.test(serialized)) throw new Error('字典或评论响应泄露敏感字段');
console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(), expected: 2, passed: 2,
  results: [
    { operationId: 'COM-005', typeCounts: Object.fromEntries(Object.entries(dictionaries.data.itemsByType).map(([type, items]) => [type, items.length])) },
    { operationId: 'APP-007', appId, itemCount: comments.data.items.length, total: comments.data.total }
  ]
}, null, 2));
