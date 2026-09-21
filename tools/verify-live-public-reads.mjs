import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createPublicReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const client = createFeishuOpenApiClient();
const service = createFeishuReadOnlyService({ client, identifierContract, appProjectionCacheMs: 0 });
const contracts = createPublicReadOperationContracts();
const evidence = [];

async function verify(operationId, input, summarize) {
  const response = await service.execute(operationId, input);
  validateContractSchema(response, contracts[operationId].successSchema, operationId);
  evidence.push({ operationId, schemaValid: true, sourceComplete: response.isComplete, dataStale: response.dataStale, ...summarize(response.data) });
  return response.data;
}

await verify('PTS-004', { page: 1, pageSize: 10 }, data => ({ itemCount: data.items.length, total: data.total }));
const trainingOverview = await verify('TRN-001', { limit: 6 }, data => ({ courseCount: data.stats.courseCount, categoryCount: data.categories.length }));
const trainingList = await verify('TRN-002', { page: 1, pageSize: 10 }, data => ({ itemCount: data.items.length, total: data.total }));
if (trainingList.items.length) {
  await verify('TRN-003', { courseId: trainingList.items[0].courseId }, data => ({ detailResolved: Boolean(data.courseId), relatedCount: data.relatedApps.length }));
} else {
  evidence.push({ operationId: 'TRN-003', schemaValid: false, sourceComplete: true, dataStale: false, unavailableReason: 'NO_VISIBLE_SOURCE_RECORD' });
}
const certificationOverview = await verify('CER-001', { newsLimit: 5, projectLimit: 12 }, data => ({ projectCount: data.stats.projectCount, directionCount: data.directions.length }));
const certificationList = await verify('CER-002', { page: 1, pageSize: 10 }, data => ({ itemCount: data.items.length, total: data.total }));
await verify('OPS-003', { page: 1, pageSize: 10 }, data => ({ itemCount: data.items.length, total: data.total }));
await verify('MAT-001', {}, data => ({ materialCount: data.total, typeCount: data.materialTypes.length, categoryCount: data.categories.length }));

const passedCount = evidence.filter(item => item.schemaValid).length;
const summary = { passed: passedCount === 8, expected: 8, passedCount, evidence };
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
