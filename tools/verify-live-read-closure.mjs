import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { createFeishuFileAccessService } from '../server/feishu-file-access-service.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import {
  APPROVED_AD_ACCOUNT,
  APPROVED_PERMISSION_CODES,
  cleanupLiveReadFixtures,
  createLiveReadFixtures,
  reconcileLiveReadPermissions,
  summarizeLiveReadResults
} from '../server/feishu-live-read-closure.mjs';
import { createLiveReadInputResolver } from '../server/feishu-live-read-inputs.mjs';
import { runOperationRegistry } from '../server/feishu-live-operation-runner.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';

const REQUIRED_PERMISSIONS = Object.freeze({
  'INT-001': 'admin.integrations.view', 'INT-003': 'admin.integrations.view', 'INT-005': 'admin.integrations.view', 'INT-004': 'admin.integrations.view',
  'OPS-001': 'operations.dashboard.view',
  'OAN-001': 'operations.announcements.manage', 'OAN-002': 'operations.announcements.manage', 'OAN-003': 'operations.announcements.manage', 'OAN-008': 'operations.announcements.manage',
  'OAP-001': 'operations.apps.manage', 'OAP-002': 'operations.apps.manage', 'OAP-003': 'operations.apps.manage', 'OAP-006': 'operations.apps.manage', 'OAP-008': 'operations.apps.manage', 'OAP-011': 'operations.apps.manage',
  'ADM-003': 'admin.audit.view', 'ADM-004': 'admin.audit.view', 'ADM-006': 'admin.health.view', 'ADM-007': 'admin.permissions.view',
  'ARC-002': 'admin.archive.view'
});

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const taskDir = path.join(root, '.ai-team', 'tasks', 'DEH-LIVE-READ-CLOSURE-20260918');
const evidenceDir = path.join(taskDir, 'evidence');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const evidenceFile = String(process.env.LIVE_EVIDENCE_FILE || path.join(evidenceDir, `live-read-closure-${timestamp}.json`));
const runId = `TEST_DEH_LIVE_READ_CLOSURE_${timestamp.replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const readRegistry = OPERATION_REGISTRY.filter(operation => operation.readOnly);
if (readRegistry.length !== 65) throw new Error(`读取清单数量异常：${readRegistry.length}`);
if (String(process.env.FEISHU_VERIFY_AD_ACCOUNT || APPROVED_AD_ACCOUNT).trim() !== APPROVED_AD_ACCOUNT) {
  throw new Error('正式闭环只允许已批准 AD 账号');
}

const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const adminClient = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const openClient = createFeishuOpenApiClient();
const contracts = createVerifiedReadOperationContracts();
const identity = { userId: APPROVED_AD_ACCOUNT, adAccount: APPROVED_AD_ACCOUNT, openId: APPROVED_AD_ACCOUNT };
const requestContext = { identity };
let fixtures = null;
let cleanup = { ok: false, residueFree: false, outcomes: [], residue: [] };
let permission = null;
let run = { results: [], complete: false, passed: false };
let fatalError = null;

try {
  permission = await reconcileLiveReadPermissions({
    client: adminClient,
    identifierContract,
    adAccount: APPROVED_AD_ACCOUNT,
    subjectId: APPROVED_AD_ACCOUNT,
    permissionCodes: APPROVED_PERMISSION_CODES,
    runId
  });
  fixtures = await createLiveReadFixtures({
    client: adminClient,
    identifierContract,
    adAccount: APPROVED_AD_ACCOUNT,
    runId
  });
  const fileAccessService = createFeishuFileAccessService({ client: openClient });
  const readService = createFeishuReadOnlyService({
    client: openClient,
    identifierContract,
    fileAccessService,
    appProjectionCacheMs: 30_000,
    tableReadCacheMs: 30_000
  });
  const inputResolver = createLiveReadInputResolver({
    client: openClient,
    identifierContract,
    identity,
    contextOverrides: fixtures.contextOverrides
  });
  run = await runOperationRegistry({
    registry: readRegistry,
    inputFor: operation => inputResolver.resolve(operation),
    execute: async (operationId, input) => {
      const response = await readService.execute(operationId, input, requestContext);
      const contract = contracts[operationId];
      if (contract?.successSchema) validateContractSchema(response, contract.successSchema, operationId);
      return response;
    }
  });
} catch (error) {
  fatalError = {
    errorCode: String(error?.code || 'LIVE_READ_CLOSURE_FAILED'),
    httpStatus: Number(error?.status || 0) || undefined,
    message: String(error?.message || error).slice(0, 240)
  };
} finally {
  if (fixtures?.ledger) cleanup = await cleanupLiveReadFixtures({ client: adminClient, ledger: fixtures.ledger });
}

const readSummary = summarizeLiveReadResults(run.results, { expected: readRegistry.length, requiredPermissions: REQUIRED_PERMISSIONS });
const evidence = {
  taskId: 'DEH-LIVE-READ-CLOSURE-20260918',
  generatedAt: new Date().toISOString(),
  identity: { adAccount: APPROVED_AD_ACCOUNT },
  permissions: permission ? {
    verified: permission.verified,
    retained: permission.retained,
    requiredCodes: permission.requiredCodes,
    activeCodes: permission.activeCodes,
    existingCount: permission.before.length,
    createdCodes: permission.created.map(item => item.permissionCode)
  } : { verified: false, retained: false, requiredCodes: [...APPROVED_PERMISSION_CODES], activeCodes: [], existingCount: 0, createdCodes: [] },
  fixtures: {
    createdCount: fixtures?.ledger?.length || 0,
    cleanupOk: cleanup.ok,
    residueFree: cleanup.residueFree,
    cleanup: cleanup.outcomes.map(item => ({ tableName: item.tableName, businessKey: item.businessKey, deleted: item.deleted, ...(item.errorCode ? { errorCode: item.errorCode } : {}) })),
    residue: cleanup.residue,
    mediaUploadCalled: false
  },
  reads: readSummary,
  ...(fatalError ? { fatalError } : {})
};
evidence.passed = Boolean(evidence.permissions.verified && evidence.permissions.retained && evidence.fixtures.cleanupOk && evidence.fixtures.residueFree && evidence.reads.passed && !fatalError);

await mkdir(path.dirname(evidenceFile), { recursive: true });
await writeFile(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  passed: evidence.passed,
  permissions: { verified: evidence.permissions.verified, created: evidence.permissions.createdCodes.length },
  fixtures: { created: evidence.fixtures.createdCount, cleanupOk: evidence.fixtures.cleanupOk, residueFree: evidence.fixtures.residueFree },
  reads: { expected: readSummary.expected, passed: readSummary.passedCount, blocked: readSummary.blockedCount, failed: readSummary.failedCount },
  evidenceFile
}, null, 2));
if (!evidence.passed) process.exitCode = 2;

