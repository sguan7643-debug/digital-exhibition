import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFeishuOAuthAuthorizedHandler, createFeishuOAuthWriteAcceptance } from '../server/feishu-oauth-write-acceptance.mjs';

const records = new Map();
let sequence = 0;
const safeRecordService = {
  async createOnce({ tableName, keyField, businessKey, idempotencyKey, fields }) {
    assert.match(businessKey, /^TEST_/);
    assert.match(idempotencyKey, /^TEST_/);
    const record = { record_id: `rec-${++sequence}`, fields: { ...fields, [keyField]: businessKey, 版本: 1 } };
    records.set(`${tableName}:${businessKey}`, record);
    return { record, version: 1, replayed: false };
  },
  async remove({ tableName, businessKey, ifMatch }) {
    assert.equal(ifMatch, 1);
    const key = `${tableName}:${businessKey}`;
    const deleted = records.delete(key);
    return { deleted, alreadyAbsent: !deleted };
  }
};

const compositeService = {
  async execute(operationId, input, context) {
    assert.equal(operationId, 'FAV-003');
    assert.equal(context.sameOriginRequest, true);
    assert.equal(context.identity.userId, 'u-real-test');
    assert.match(input.businessKey, /^TEST_OAUTH_FAV_/);
    records.set(`应用收藏:${input.businessKey}`, { record_id: 'rec-favorite', fields: { 主键: input.businessKey, 版本: 1 } });
    return { code: 'OK', data: { operationId, recordId: 'rec-favorite', version: 1 } };
  }
};

const acceptance = createFeishuOAuthWriteAcceptance({
  safeRecordService,
  compositeService,
  now: () => new Date('2026-09-03T02:00:00.000Z'),
  randomId: () => 'fixed-acceptance-id'
});

const evidence = await acceptance.run({
  userId: 'u-real-test', openId: 'ou-real-test', identityType: 'user_id'
});

assert.deepEqual(evidence, {
  attempted: true,
  permissionCreated: true,
  permissionRecognized: true,
  operationId: 'FAV-003',
  operationSucceeded: true,
  testRecordCleaned: true,
  permissionCleaned: true,
  errorCode: ''
});
assert.equal(records.size, 0, '验收结束必须清理临时权限和 TEST_ 业务记录');
assert.doesNotMatch(JSON.stringify(evidence), /u-real-test|ou-real-test|fixed-acceptance-id/, '验收证据不得泄露身份或测试记录键');

const evidenceDirectory = await mkdtemp(join(tmpdir(), 'feishu-oauth-acceptance-'));
try {
  const evidencePath = join(evidenceDirectory, 'evidence.json');
  const handler = createFeishuOAuthAuthorizedHandler({
    evidencePath,
    writeAcceptanceEnabled: true,
    readService: {
      async execute(operationId, _input, context) {
        assert.equal(operationId, 'COM-001');
        assert.equal(context.identity.userId, 'u-real-test');
        return { schemaVersion: 'feishu-user-context.v2', data: { permissions: [] } };
      }
    },
    writeAcceptance: { async run() { return evidence; } },
    now: () => new Date('2026-09-03T02:01:00.000Z')
  });
  await handler({ userId: 'u-real-test', openId: 'ou-real-test', identityType: 'user_id' });
  const written = JSON.parse(await readFile(evidencePath, 'utf8'));
  assert.equal(written.permissionCount, 0);
  assert.deepEqual(written.writeAcceptance, evidence);
  assert.doesNotMatch(JSON.stringify(written), /u-real-test|ou-real-test|fixed-acceptance-id/);
} finally {
  await rm(evidenceDirectory, { recursive: true, force: true });
}

console.log('OAuth write acceptance creates a TEST_ permission, uses the normal write service, and cleans every test record');
