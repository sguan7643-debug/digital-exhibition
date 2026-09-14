import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuFileAccessService } from '../server/feishu-file-access-service.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { runOperationRegistry } from '../server/feishu-live-operation-runner.mjs';
import { createLiveReadInputResolver } from '../server/feishu-live-read-inputs.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readRegistry = OPERATION_REGISTRY.filter(operation => operation.readOnly);
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const client = createFeishuOpenApiClient();
const fileAccessService = createFeishuFileAccessService({ client });
const service = createFeishuReadOnlyService({ client, identifierContract, fileAccessService, appProjectionCacheMs: 0 });
const contracts = createVerifiedReadOperationContracts();
const verifyUser = String(process.env.FEISHU_VERIFY_AD_ACCOUNT || process.env.LIVE_VERIFY_AD_ACCOUNT || process.env.LIVE_VERIFY_USER || '').trim();
const identity = { userId: verifyUser, adAccount: verifyUser, openId: verifyUser };
const requestContext = { identity };
const inputResolver = createLiveReadInputResolver({ client, identifierContract, identity });
const requiredPermissions = Object.freeze({
  'INT-001': 'admin.integrations.view', 'INT-003': 'admin.integrations.view', 'INT-005': 'admin.integrations.view',
  'OPS-001': 'operations.dashboard.view',
  'OAN-001': 'operations.announcements.manage', 'OAN-002': 'operations.announcements.manage', 'OAN-003': 'operations.announcements.manage', 'OAN-008': 'operations.announcements.manage',
  'OAP-001': 'operations.apps.manage', 'OAP-002': 'operations.apps.manage', 'OAP-003': 'operations.apps.manage', 'OAP-006': 'operations.apps.manage', 'OAP-008': 'operations.apps.manage', 'OAP-011': 'operations.apps.manage',
  'ADM-003': 'admin.audit.view', 'ADM-004': 'admin.audit.view', 'ADM-006': 'admin.health.view', 'ADM-007': 'admin.permissions.view',
  'INT-004': 'admin.integrations.view', 'ARC-002': 'admin.archive.view'
});
const authorizationUrl = String(process.env.LIVE_VERIFY_AUTHORIZATION_URL || 'http://127.0.0.1:4173/api/v1/auth/feishu/start?returnTo=%2Flive-approval-runner.html');

const run = await runOperationRegistry({
  registry: readRegistry,
  inputFor: operation => inputResolver.resolve(operation),
  execute: async (operationId, input) => {
    const response = await service.execute(operationId, input, requestContext);
    const contract = contracts[operationId];
    if (contract?.successSchema) validateContractSchema(response, contract.successSchema, operationId);
    return response;
  }
});

const results = run.results.map(result => result.errorCode === 'PERMISSION_DENIED'
  ? { ...result, requiredPermission: requiredPermissions[result.operationId] || '按服务端错误返回的权限编码核对' }
  : result);
const summary = {
  passed: run.complete && run.passed,
  expected: readRegistry.length,
  executed: results.length,
  passedCount: results.filter(item => item.status === 'passed').length,
  blockedCount: results.filter(item => item.status === 'blocked').length,
  failedCount: results.filter(item => item.status === 'failed').length,
  identitySource: verifyUser ? 'FEISHU_VERIFY_AD_ACCOUNT' : 'missing',
  authorization: { authorizationUrl, requiredPermissions: [...new Set(results.map(item => item.requiredPermission).filter(Boolean))] },
  results
};
console.log(JSON.stringify(summary, null, 2));
if (process.env.LIVE_EVIDENCE_FILE) await writeFile(process.env.LIVE_EVIDENCE_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
if (!summary.passed) process.exitCode = 1;
