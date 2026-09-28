import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ONBOARDING_POC_MANIFEST,
  ONBOARDING_POC_MANIFEST_SHA256,
  ONBOARDING_POC_RECORD_TABLES,
  ONBOARDING_POC_SCHEMA_TABLES
} from '../server/contracts/feishu-onboarding-poc-schema-manifest.mjs';
import { createFeishuOnboardingPocOrchestrator } from '../server/feishu-onboarding-poc-orchestrator.mjs';
import { createFeishuOnboardingFileService, inspectOnboardingFile } from '../server/feishu-onboarding-file-service.mjs';

assert.deepEqual([...ONBOARDING_POC_SCHEMA_TABLES], ['上架申请', '文件上传会话', '附件资料', '应用索引', '海能work应用详情']);
assert.deepEqual([...ONBOARDING_POC_RECORD_TABLES], ['应用类型配置', '业务域字典', '用户字典', '部门字典', '上架申请', '文件上传会话', '附件资料', '应用索引', '海能work应用详情']);
assert.equal(ONBOARDING_POC_MANIFEST.tables.length, 5);
assert.match(ONBOARDING_POC_MANIFEST_SHA256, /^[a-f0-9]{64}$/);
assert.ok(ONBOARDING_POC_MANIFEST.tables.every(table => table.create_if_missing === true));
assert.ok(ONBOARDING_POC_MANIFEST.tables.every(table => ONBOARDING_POC_SCHEMA_TABLES.has(table.table_name)));

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const inspectedIcon = inspectOnboardingFile({ purpose: 'APPLICATION_ICON', fileName: 'logo.png', mimeType: 'image/png', bytes: png });
assert.equal(inspectedIcon.detectedType, 'PNG');
assert.match(inspectedIcon.sha256, /^[a-f0-9]{64}$/);
assert.throws(() => inspectOnboardingFile({ purpose: 'APPLICATION_ICON', fileName: 'logo.svg', mimeType: 'image/svg+xml', bytes: new TextEncoder().encode('<svg/>') }), error => error.code === 'ONBOARDING_FILE_TYPE_FORBIDDEN');
assert.throws(() => inspectOnboardingFile({ purpose: 'APPLICATION_ATTACHMENT', fileName: 'bundle.zip', mimeType: 'application/zip', bytes: new TextEncoder().encode('PK\u0003\u0004') }), error => error.code === 'ONBOARDING_FILE_TYPE_FORBIDDEN');
assert.throws(() => inspectOnboardingFile({ purpose: 'APPLICATION_ICON', fileName: 'fake.png', mimeType: 'image/png', bytes: new TextEncoder().encode('not png') }), error => error.code === 'ONBOARDING_FILE_SIGNATURE_MISMATCH');

const uploadService = createFeishuOnboardingFileService({
  adminClient: { async uploadMedia() { return { fileToken: 'box-test-upload-token' }; } },
  orchestrator: {
    async execute() { return { ready: true, runId: 'TEST_ONBOARDING_POC_UPLOAD_IDS' }; },
    appendLedger() {}
  }
});
const uploadInput = { purpose: 'APPLICATION_ICON', fileName: 'logo.png', mimeType: 'image/png', bytes: png };
const firstAttemptUpload = await uploadService.upload({ ...uploadInput, attemptId: 'TEST_ATTEMPT_UPLOAD_ONE' }, { identity: { userId: 'u_test' }, accessToken: 'server-only' });
const firstAttemptReplay = await uploadService.upload({ ...uploadInput, attemptId: 'TEST_ATTEMPT_UPLOAD_ONE' }, { identity: { userId: 'u_test' }, accessToken: 'server-only' });
const secondAttemptUpload = await uploadService.upload({ ...uploadInput, attemptId: 'TEST_ATTEMPT_UPLOAD_TWO' }, { identity: { userId: 'u_test' }, accessToken: 'server-only' });
assert.equal(firstAttemptUpload.uploadId, firstAttemptReplay.uploadId, '同一 attempt 和文件必须复用稳定上传标识');
assert.notEqual(firstAttemptUpload.uploadId, secondAttemptUpload.uploadId, '不同 attempt 上传相同文件不得发生标识碰撞');

const baseToken = 'poc-base-token';
const expectedFingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(baseToken)).then(buffer => Buffer.from(buffer).toString('hex'));
let remoteReads = 0;
const deletedRecords = [];
const exactRecords = new Map();
const adminClient = {
  async listTables() {
    remoteReads += 1;
    return ONBOARDING_POC_MANIFEST.tables.map((table, index) => ({ table_id: `tbl-${index}`, name: table.table_name }));
  },
  async listFields(tableId) {
    const index = Number(tableId.split('-')[1]);
    return ONBOARDING_POC_MANIFEST.tables[index].fields.map((field, fieldIndex) => ({
      field_id: `fld-${index}-${fieldIndex}`,
      field_name: field.field_name,
      type: field.type,
      is_primary: field.primary === true,
      property: field.property || {}
    }));
  },
  async getRecord(tableId, recordId) {
    const value = exactRecords.get(`${tableId}/${recordId}`);
    if (!value) {
      const error = new Error('not found');
      error.status = 404;
      throw error;
    }
    return value;
  },
  async deleteRecord(tableId, recordId) {
    deletedRecords.push([tableId, recordId]);
    exactRecords.delete(`${tableId}/${recordId}`);
  }
};
const dir = mkdtempSync(join(tmpdir(), 'onboarding-poc-'));
const ledgerFile = join(dir, 'ledger.json');
const session = { identity: { userId: 'u_test', openId: 'ou_test' }, accessToken: 'server-only' };
try {
  const missingFingerprint = createFeishuOnboardingPocOrchestrator({ adminClient, baseToken, expectedFingerprint: '', ledgerFile });
  await assert.rejects(() => missingFingerprint.prepare({ session }), error => error.code === 'POC_BASE_FINGERPRINT_REQUIRED');
  assert.equal(remoteReads, 0, 'fingerprint failure must happen before remote schema discovery');

  const identityClient = { async preflightOnboardingPocActor() { return { userId: 'u_test', openId: 'ou_test', active: true, identityVerified: true, approverCapabilityVerified: true }; } };
  writeFileSync(ledgerFile, `${JSON.stringify({
    version: 'onboarding-poc-ledger.v1',
    runId: 'TEST_ONBOARDING_POC_OLD_MANIFEST',
    baseFingerprint: expectedFingerprint,
    manifestVersion: 'obsolete-manifest',
    manifestSha256: '0'.repeat(64),
    createdAt: '2026-09-25T10:00:00.000Z',
    status: 'ACTIVE',
    objects: []
  }, null, 2)}\n`, 'utf8');
  const orchestrator = createFeishuOnboardingPocOrchestrator({ adminClient, identityClient, baseToken, expectedFingerprint, ledgerFile, now: () => Date.parse('2026-09-26T10:00:00Z'), randomBytes: () => Buffer.from('12345678') });
  const prepared = await orchestrator.prepare({ session });
  const schemaReadsAfterPrepare = remoteReads;
  assert.equal(prepared.ready, true);
  assert.equal(prepared.plan.length, 0);
  assert.equal(prepared.gates.baseFingerprint, true);
  assert.equal(prepared.gates.realApprover, true);
  assert.equal(prepared.gates.identityPreflight, true);
  assert.equal(prepared.actorBinding.runId, prepared.runId);
  assert.equal(prepared.gates.schemaDryRun, true);
  assert.equal(prepared.gates.ledgerCreated, true);
  assert.match(prepared.runId, /^TEST_ONBOARDING_POC_/);
  assert.equal(JSON.parse(readFileSync(ledgerFile, 'utf8')).runId, prepared.runId);
  assert.equal(readdirSync(dir).filter(name => name.startsWith('ledger.json.manifest-archive-')).length, 1, '旧 manifest 台账必须自动归档，不能阻断上传');
  await orchestrator.execute({ session });
  await orchestrator.execute({ session });
  assert.equal(remoteReads, schemaReadsAfterPrepare, '已通过检查的同一进程不得在每次上传前重复读取整套 schema');
  assert.throws(() => orchestrator.assertRecordWrite('其他表', { 主键: 'TEST_BAD' }), error => error.code === 'POC_RECORD_TABLE_FORBIDDEN');
  assert.throws(() => orchestrator.assertSchemaPlan([{ action: 'DELETE_TABLE', tableName: '上架申请' }]), error => error.code === 'POC_SCHEMA_ACTION_FORBIDDEN');
  assert.throws(() => orchestrator.appendLedger({ objectType: 'RECORD', tableName: '上架申请', tableId: 'tbl-0', recordId: 'rec-bad-key', keyField: '备注', businessKey: 'TEST_BAD_KEY' }), error => error.code === 'POC_LEDGER_KEY_FIELD_INVALID');
  const recordCases = [
    ['应用类型配置', 'dict-type', '类型ID', 'TYPE'], ['业务域字典', 'dict-domain', '业务域ID', 'DOMAIN'],
    ['用户字典', 'dict-user', 'AD账号', 'USER'], ['部门字典', 'dict-dept', '部门ID', 'DEPT'],
    ['上架申请', 'tbl-0', '申请单号', 'REQUEST'], ['文件上传会话', 'tbl-1', '上传ID', 'UPLOAD'],
    ['附件资料', 'tbl-2', '主键', 'ATTACHMENT'], ['应用索引', 'tbl-3', '应用ID', 'APP'],
    ['海能work应用详情', 'tbl-4', '主键', 'DETAIL']
  ];
  recordCases.forEach(([tableName, tableId, keyField, suffix], index) => {
    const dictionary = index < 4;
    const businessKey = dictionary ? `TEST_${prepared.runId}_${suffix}` : `TEST_${suffix}_${prepared.runId}`;
    const recordId = `rec-${index}`;
    exactRecords.set(`${tableId}/${recordId}`, { record_id: recordId, fields: { [keyField]: businessKey, ...(dictionary ? {} : { '运行标识': prepared.runId }) } });
    orchestrator.appendLedger({ objectType: 'RECORD', tableName, tableId, recordId, keyField, businessKey, cleanupStrategy: 'EXACT_RECORD_DELETE' });
  });
  orchestrator.appendLedger({ objectType: 'APPROVAL_INSTANCE', instanceId: 'INSTANCE_RETAINED', businessKey: 'TEST_APPROVAL_BUSINESS', applicationId: 'TEST_APPLICATION', cleanupStrategy: 'RETAIN_APPROVAL_INSTANCE' });
  exactRecords.set('tbl-0/rec-unowned', { record_id: 'rec-unowned', fields: { '申请单号': 'TEST_SOMEONE_ELSE', '运行标识': prepared.runId, '备注': 'TEST_FAKE_LEDGER_KEY' } });
  orchestrator.appendLedger({ objectType: 'RECORD', tableName: '上架申请', tableId: 'tbl-0', recordId: 'rec-unowned', keyField: '申请单号', businessKey: 'TEST_FAKE_LEDGER_KEY', cleanupStrategy: 'EXACT_RECORD_DELETE' });
  await assert.rejects(() => orchestrator.cleanup({ session }), error => error.code === 'POC_CLEANUP_OWNERSHIP_MISMATCH');
  assert.equal(exactRecords.has('tbl-0/rec-unowned'), true, 'businessKey 出现在错误字段时不得删除');
  exactRecords.set('tbl-0/rec-unowned', { record_id: 'rec-unowned', fields: { '申请单号': 'TEST_FAKE_LEDGER_KEY', '运行标识': prepared.runId } });
  const cleanup = await orchestrator.cleanup({ session });
  assert.equal(cleanup.deleted, 10, 'four dictionaries, five POC tables, and the repaired ownership case must be deleted exactly');
  assert.equal(cleanup.verifiedAbsent, 10);
  assert.equal(cleanup.retained, 1);
  assert.deepEqual(cleanup.retainedObjects.map(item => [item.objectType, item.instanceId, item.cleanupResult]), [['APPROVAL_INSTANCE', 'INSTANCE_RETAINED', 'RETAINED_PENDING_GC']]);
  const cleanedLedger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
  assert.equal(cleanedLedger.status, 'CLEANED_WITH_MEDIA_RETENTION');
  assert.equal(cleanedLedger.objects.find(item => item.objectType === 'APPROVAL_INSTANCE').cleanupResult, 'RETAINED_PENDING_GC');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const forgedDir = mkdtempSync(join(tmpdir(), 'onboarding-poc-forged-ledger-'));
const forgedLedgerFile = join(forgedDir, 'ledger.json');
let forgedDeleteCalls = 0;
const forgedRecords = new Map();
const forgedAdminClient = {
  ...adminClient,
  async getRecord(tableId, recordId) {
    const record = forgedRecords.get(`${tableId}/${recordId}`);
    if (!record) { const error = new Error('not found'); error.status = 404; throw error; }
    return record;
  },
  async deleteRecord() { forgedDeleteCalls += 1; }
};
try {
  const forgedOrchestrator = createFeishuOnboardingPocOrchestrator({
    adminClient: forgedAdminClient,
    identityClient: { async preflightOnboardingPocActor() { return { userId: 'u_test', openId: 'ou_test', active: true, identityVerified: true, approverCapabilityVerified: true }; } },
    baseToken,
    expectedFingerprint,
    ledgerFile: forgedLedgerFile,
    now: () => Date.parse('2026-09-26T11:00:00Z'),
    randomBytes: () => Buffer.from('abcdefgh')
  });
  const forgedPrepared = await forgedOrchestrator.prepare({ session });
  const originalKey = `TEST_${forgedPrepared.runId}_TYPE`;
  forgedRecords.set('dict-type/rec-forged', { record_id: 'rec-forged', fields: { 类型ID: originalKey } });
  forgedOrchestrator.appendLedger({ objectType: 'RECORD', tableName: '应用类型配置', tableId: 'dict-type', recordId: 'rec-forged', keyField: '类型ID', businessKey: originalKey, cleanupStrategy: 'EXACT_RECORD_DELETE' });
  const forgedLedger = JSON.parse(readFileSync(forgedLedgerFile, 'utf8'));
  const wrongRunKey = 'TEST_OTHER_RUN_TYPE';
  forgedLedger.objects[0].businessKey = wrongRunKey;
  forgedRecords.set('dict-type/rec-forged', { record_id: 'rec-forged', fields: { 类型ID: wrongRunKey } });
  writeFileSync(forgedLedgerFile, `${JSON.stringify(forgedLedger, null, 2)}\n`, 'utf8');
  await assert.rejects(() => forgedOrchestrator.cleanup({ session }), error => error.code === 'POC_CLEANUP_OWNERSHIP_MISMATCH');
  assert.equal(forgedDeleteCalls, 0, 'recovered dictionary ledger with a mismatched runId must never call deleteRecord');
} finally {
  rmSync(forgedDir, { recursive: true, force: true });
}

console.log('onboarding POC manifest, four write gates, strict file inspection, and exact allowlists passed');
