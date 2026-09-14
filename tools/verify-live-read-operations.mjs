import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { runOperationRegistry } from '../server/feishu-live-operation-runner.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readRegistry = OPERATION_REGISTRY.filter(operation => operation.readOnly);
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const service = createFeishuReadOnlyService({ client: createFeishuOpenApiClient(), identifierContract, appProjectionCacheMs: 0 });
const contracts = createVerifiedReadOperationContracts();
const inputFor = operation => ({
  page: 1,
  pageSize: 10,
  limit: 10,
  timezone: 'Asia/Shanghai',
  period: 'DAY',
  environment: 'TEST'
});

const run = await runOperationRegistry({
  registry: readRegistry,
  inputFor,
  execute: async (operationId, input) => {
    const response = await service.execute(operationId, input, { identity: { userId: 'LIVE_VERIFY_USER' } });
    const contract = contracts[operationId];
    if (contract?.successSchema) validateContractSchema(response, contract.successSchema, operationId);
    return response;
  }
});

const summary = {
  passed: run.complete && run.passed,
  expected: readRegistry.length,
  executed: run.results.length,
  passedCount: run.results.filter(item => item.status === 'passed').length,
  blockedCount: run.results.filter(item => item.status === 'blocked').length,
  failedCount: run.results.filter(item => item.status === 'failed').length,
  results: run.results
};
console.log(JSON.stringify(summary, null, 2));
if (process.env.LIVE_EVIDENCE_FILE) await writeFile(process.env.LIVE_EVIDENCE_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
if (!summary.passed) process.exitCode = 1;
