import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const service = createFeishuReadOnlyService({ client: createFeishuOpenApiClient(), identifierContract, appProjectionCacheMs: 0 });
const contracts = createVerifiedReadOperationContracts();
const calls = [
  ['COM-003', { includeUsers: true, maxDepth: 5 }],
  ['COM-004', { page: 1, pageSize: 10, enabled: true, sort: 'name,asc' }],
  ['TAL-001', { page: 1, pageSize: 10 }],
  ['TAL-002', { page: 1, pageSize: 10 }],
  ['TAL-003', { page: 1, pageSize: 10 }],
  ['TAL-005', { page: 1, pageSize: 10 }]
];
const results = [];
for (const [operationId, input] of calls) {
  const response = await service.execute(operationId, input);
  validateContractSchema(response, contracts[operationId].successSchema, operationId);
  results.push({
    operationId,
    passed: true,
    itemCount: Array.isArray(response.data?.items) ? response.data.items.length : 0,
    total: Number(response.data?.total || response.data?.userCount || 0)
  });
}
const serialized = JSON.stringify(results);
if (/access_token|app_secret|tenant_access_token|mobile|email/i.test(serialized)) throw new Error('通讯录/人才验收证据泄露敏感字段');
console.log(JSON.stringify({ passed: true, expected: calls.length, verified: results.length, results }, null, 2));
