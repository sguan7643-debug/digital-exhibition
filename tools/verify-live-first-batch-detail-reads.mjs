import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const service = createFeishuReadOnlyService({ client: createFeishuOpenApiClient(), identifierContract, appProjectionCacheMs: 0 });

const appList = await service.execute('APP-002', { page: 1, pageSize: 10 });
const announcementList = await service.execute('ANN-002', { page: 1, pageSize: 10 });
const appId = appList.data.items[0]?.appId;
const announcementId = announcementList.data.items[0]?.announcementId;
if (!appId) throw new Error('APP-003/009 实测缺少可见应用样例');
if (!announcementId) throw new Error('ANN-003/005 实测缺少可见公告样例');

const results = [];
for (const [operationId, input] of [
  ['APP-003', { appId }],
  ['APP-009', { appId, page: 1, pageSize: 10 }],
  ['ANN-003', { announcementId, markRead: false }],
  ['ANN-005', { announcementId, page: 1, pageSize: 10 }],
  ['MAT-002', { page: 1, pageSize: 10 }]
]) {
  const response = await service.execute(operationId, input);
  const serialized = JSON.stringify(response);
  if (/access_token|app_secret|file_token|tenant_access_token/i.test(serialized)) throw new Error(`${operationId} 响应泄露敏感字段`);
  results.push({
    operationId,
    schemaVersion: response.schemaVersion,
    itemCount: Array.isArray(response.data?.items) ? response.data.items.length : undefined,
    resourceId: response.data?.appId || response.data?.announcementId || undefined
  });
}

console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), expected: 5, passed: results.length, results }, null, 2));
