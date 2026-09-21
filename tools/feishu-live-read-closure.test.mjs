import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APPROVED_AD_ACCOUNT,
  APPROVED_PERMISSION_CODES,
  cleanupLiveReadFixtures,
  createLiveReadFixtures,
  reconcileLiveReadPermissions,
  summarizeLiveReadResults
} from '../server/feishu-live-read-closure.mjs';

const permissionTable = {
  tableId: 'tbl_permissions',
  fields: [
    '主键', 'AD账号', '主体类型', '主体ID', '权限编码', '状态', '启用', '来源系统', '来源记录ID', '追踪ID'
  ].map(name => ({ name }))
};
const identifierContract = { byName: new Map([['用户权限', permissionTable]]) };

function permissionRow(recordId, code, extra = {}) {
  return {
    record_id: recordId,
    fields: {
      主键: `PERMISSION_${recordId}`,
      AD账号: APPROVED_AD_ACCOUNT,
      主体类型: 'USER',
      主体ID: APPROVED_AD_ACCOUNT,
      权限编码: code,
      状态: '有效',
      启用: true,
      ...extra
    }
  };
}

function createPermissionClient(initialRows, { hideCreatedCode = '' } = {}) {
  const rows = initialRows.map(row => structuredClone(row));
  const calls = { create: [], delete: [], update: [] };
  return {
    calls,
    rows,
    async searchRecords(_tableId, fieldName, value) {
      assert.equal(fieldName, 'AD账号');
      assert.equal(value, APPROVED_AD_ACCOUNT);
      return {
        items: rows.filter(row => row.fields.AD账号 === value && !(hideCreatedCode && row.fields.权限编码 === hideCreatedCode && row.record_id.startsWith('created-')))
      };
    },
    async createRecord(tableId, fields) {
      assert.equal(tableId, permissionTable.tableId);
      const record = { record_id: `created-${calls.create.length + 1}`, fields: structuredClone(fields) };
      calls.create.push(record);
      rows.push(record);
      return record;
    },
    async deleteRecord(tableId, recordId) {
      assert.equal(tableId, permissionTable.tableId);
      calls.delete.push(recordId);
      const index = rows.findIndex(row => row.record_id === recordId);
      if (index >= 0) rows.splice(index, 1);
      return {};
    },
    async updateRecord(...args) {
      calls.update.push(args);
      throw new Error('existing permission rows must never be updated');
    }
  };
}

assert.equal(APPROVED_AD_ACCOUNT, '3d8egf55');
assert.deepEqual(APPROVED_PERMISSION_CODES, [
  'admin.integrations.view',
  'operations.dashboard.view',
  'operations.announcements.manage',
  'operations.apps.manage',
  'admin.audit.view',
  'admin.health.view',
  'admin.permissions.view',
  'admin.archive.view'
]);

const existingCodes = APPROVED_PERMISSION_CODES.slice(0, 2);
const existingRows = existingCodes.map((code, index) => permissionRow(`existing-${index + 1}`, code));
const successClient = createPermissionClient(existingRows);
const success = await reconcileLiveReadPermissions({
  client: successClient,
  identifierContract,
  adAccount: APPROVED_AD_ACCOUNT,
  subjectId: APPROVED_AD_ACCOUNT,
  runId: 'TEST_RUN_PERMISSION_SUCCESS'
});
assert.equal(success.verified, true);
assert.equal(success.retained, true);
assert.deepEqual(success.activeCodes, APPROVED_PERMISSION_CODES);
assert.equal(successClient.calls.create.length, 6, '只应创建缺失的六项权限');
assert.deepEqual(successClient.calls.create.map(row => row.fields.权限编码), APPROVED_PERMISSION_CODES.slice(2));
assert.ok(successClient.calls.create.every(row => row.fields.AD账号 === APPROVED_AD_ACCOUNT && row.fields.主键.startsWith('TEST_')));
assert.ok(successClient.calls.create.every(row => row.fields.状态 === '有效' && row.fields.启用 === true));
assert.deepEqual(successClient.calls.delete, []);
assert.deepEqual(successClient.calls.update, []);
assert.deepEqual(successClient.rows.filter(row => row.record_id.startsWith('existing-')), existingRows, '既有权限必须逐字段保持不变');

const idempotent = await reconcileLiveReadPermissions({
  client: successClient,
  identifierContract,
  adAccount: APPROVED_AD_ACCOUNT,
  subjectId: APPROVED_AD_ACCOUNT,
  runId: 'TEST_RUN_PERMISSION_IDEMPOTENT'
});
assert.equal(idempotent.created.length, 0);
assert.equal(successClient.calls.create.length, 6, '第二次运行不得产生重复有效授权');

const rollbackBaseline = [permissionRow('existing-only', APPROVED_PERMISSION_CODES[0])];
const rollbackClient = createPermissionClient(rollbackBaseline, { hideCreatedCode: APPROVED_PERMISSION_CODES.at(-1) });
await assert.rejects(
  () => reconcileLiveReadPermissions({
    client: rollbackClient,
    identifierContract,
    adAccount: APPROVED_AD_ACCOUNT,
    subjectId: APPROVED_AD_ACCOUNT,
    runId: 'TEST_RUN_PERMISSION_ROLLBACK'
  }),
  error => error.code === 'PERMISSION_VERIFICATION_INCOMPLETE' && error.rollbackVerified === true
);
assert.deepEqual(rollbackClient.rows, rollbackBaseline, '八项未完整验证时必须恢复写入前基线');
assert.equal(rollbackClient.calls.delete.length, APPROVED_PERMISSION_CODES.length - 1);
assert.ok(rollbackClient.calls.delete.every(recordId => recordId.startsWith('created-')), '不得删除写入前既有记录');
assert.deepEqual(rollbackClient.calls.update, []);

for (const invalidRequest of [
  { adAccount: 'other-account', permissionCodes: APPROVED_PERMISSION_CODES },
  { adAccount: APPROVED_AD_ACCOUNT, permissionCodes: [...APPROVED_PERMISSION_CODES, 'admin.*'] },
  { adAccount: APPROVED_AD_ACCOUNT, permissionCodes: APPROVED_PERMISSION_CODES.slice(0, -1) }
]) {
  const guardedClient = createPermissionClient([]);
  await assert.rejects(
    () => reconcileLiveReadPermissions({
      client: guardedClient,
      identifierContract,
      subjectId: APPROVED_AD_ACCOUNT,
      runId: 'TEST_RUN_PERMISSION_GUARD',
      ...invalidRequest
    }),
    error => error.code === 'PERMISSION_SCOPE_REJECTED'
  );
  assert.equal(guardedClient.calls.create.length, 0, '越界账号或权限必须在写入前失败');
  assert.equal(guardedClient.calls.delete.length, 0);
}

console.log('live read closure permission reconciliation passed');

const fixtureTables = new Map([
  ['使用申请', { tableId: 'tbl_apply' }],
  ['认证项目', { tableId: 'tbl_cert' }],
  ['导出任务', { tableId: 'tbl_export' }]
]);
const fixtureContract = { byName: fixtureTables };

function createFixtureClient({ failSearchOnce = false } = {}) {
  const rowsByTable = new Map([...fixtureTables.values()].map(table => [table.tableId, []]));
  const calls = { create: [], delete: [], upload: [], search: 0 };
  return {
    calls,
    rowsByTable,
    async searchRecords(tableId, fieldName, value) {
      calls.search += 1;
      if (failSearchOnce && calls.search === 1) throw new TypeError('fetch failed');
      return { items: (rowsByTable.get(tableId) || []).filter(row => row.fields[fieldName] === value) };
    },
    async createRecord(tableId, fields) {
      const record = { record_id: `fixture-${calls.create.length + 1}`, fields: structuredClone(fields) };
      calls.create.push({ tableId, record });
      rowsByTable.get(tableId).push(record);
      return record;
    },
    async deleteRecord(tableId, recordId) {
      calls.delete.push({ tableId, recordId });
      const rows = rowsByTable.get(tableId);
      const index = rows.findIndex(row => row.record_id === recordId);
      if (index >= 0) rows.splice(index, 1);
      return {};
    },
    async uploadMedia(...args) {
      calls.upload.push(args);
      throw new Error('live read closure must never upload media');
    }
  };
}

const fixtureClient = createFixtureClient();
const fixtures = await createLiveReadFixtures({
  client: fixtureClient,
  identifierContract: fixtureContract,
  adAccount: APPROVED_AD_ACCOUNT,
  runId: 'TEST_DEH_LIVE_READ_CLOSURE_001',
  now: () => new Date('2026-09-20T00:00:00.000Z')
});
assert.deepEqual(Object.keys(fixtures.contextOverrides).sort(), ['applicationId', 'certificationId', 'exportId']);
assert.ok(Object.values(fixtures.contextOverrides).every(value => value.startsWith('TEST_')));
assert.equal(fixtures.ledger.length, 3);
assert.equal(fixtureClient.calls.create.length, 3);
assert.equal(fixtureClient.calls.upload.length, 0, '闭环不得创建飞书媒体对象');
const applyFields = fixtureClient.calls.create.find(call => call.tableId === 'tbl_apply').record.fields;
assert.equal(applyFields.申请人ID, APPROVED_AD_ACCOUNT);
assert.equal(applyFields.主键, fixtures.contextOverrides.applicationId);
const exportFields = fixtureClient.calls.create.find(call => call.tableId === 'tbl_export').record.fields;
assert.equal(exportFields.创建用户ID, APPROVED_AD_ACCOUNT);
assert.equal(exportFields.导出任务ID, fixtures.contextOverrides.exportId);

const cleanup = await cleanupLiveReadFixtures({
  client: fixtureClient,
  ledger: fixtures.ledger
});
assert.equal(cleanup.ok, true);
assert.equal(cleanup.residueFree, true);
assert.equal(fixtureClient.calls.delete.length, 3);
assert.ok([...fixtureClient.rowsByTable.values()].every(rows => rows.length === 0));

const transientSearchClient = createFixtureClient({ failSearchOnce: true });
const transientFixtures = await createLiveReadFixtures({
  client: transientSearchClient,
  identifierContract: fixtureContract,
  adAccount: APPROVED_AD_ACCOUNT,
  runId: 'TEST_DEH_LIVE_READ_CLOSURE_TRANSIENT_SEARCH'
});
assert.equal(transientFixtures.ledger.length, 3, '唯一一次无代码 fetch failed 应仅重试安全的存在性读取');
assert.equal(transientSearchClient.calls.create.length, 3, '不得因读取重试重复创建临时记录');
const transientCleanup = await cleanupLiveReadFixtures({ client: transientSearchClient, ledger: transientFixtures.ledger });
assert.equal(transientCleanup.ok, true);
assert.equal(transientCleanup.residueFree, true);

const failureClient = createFixtureClient();
let failureFixtures;
await assert.rejects(async () => {
  try {
    failureFixtures = await createLiveReadFixtures({
      client: failureClient,
      identifierContract: fixtureContract,
      adAccount: APPROVED_AD_ACCOUNT,
      runId: 'TEST_DEH_LIVE_READ_CLOSURE_FAILURE'
    });
    throw Object.assign(new Error('injected read failure'), { code: 'INJECTED_READ_FAILURE' });
  } finally {
    if (failureFixtures) {
      const result = await cleanupLiveReadFixtures({ client: failureClient, ledger: failureFixtures.ledger });
      assert.equal(result.ok, true);
      assert.equal(result.residueFree, true);
    }
  }
}, error => error.code === 'INJECTED_READ_FAILURE');
assert.ok([...failureClient.rowsByTable.values()].every(rows => rows.length === 0), '异常退出后 TEST_ 记录必须无残留');
assert.equal(failureClient.calls.upload.length, 0);

for (const invalidFixtureRequest of [
  { adAccount: 'other-account', runId: 'TEST_VALID' },
  { adAccount: APPROVED_AD_ACCOUNT, runId: 'NOT_TEST' }
]) {
  const guardedClient = createFixtureClient();
  await assert.rejects(
    () => createLiveReadFixtures({ client: guardedClient, identifierContract: fixtureContract, ...invalidFixtureRequest }),
    error => error.code === 'FIXTURE_SCOPE_REJECTED'
  );
  assert.equal(guardedClient.calls.create.length, 0);
}

console.log('live read closure fixture lifecycle passed');

const redactedSummary = summarizeLiveReadResults([
  {
    operationId: 'MAT-003', status: 'passed',
    request: { input: { fileId: 'file-token-secret' } },
    response: { data: { accessUrl: '/secret' } },
    startedAt: '2026-09-20T00:00:00.000Z', finishedAt: '2026-09-20T00:00:00.125Z'
  },
  {
    operationId: 'OPS-001', status: 'failed', errorCode: 'FEISHU_UPSTREAM_TIMEOUT',
    errorMessage: 'secret upstream payload', httpStatus: 504, upstreamCode: 1254045,
    startedAt: '2026-09-20T00:00:01.000Z', finishedAt: '2026-09-20T00:00:03.000Z'
  }
], { expected: 2, requiredPermissions: { 'OPS-001': 'operations.dashboard.view' } });
assert.equal(redactedSummary.passedCount, 1);
assert.equal(redactedSummary.failedCount, 1);
assert.equal(redactedSummary.results[0].elapsedMs, 125);
assert.equal(redactedSummary.results[1].requiredPermission, 'operations.dashboard.view');
assert.equal(redactedSummary.results[1].upstreamCode, 1254045);
assert.equal(JSON.stringify(redactedSummary).includes('file-token-secret'), false);
assert.equal(JSON.stringify(redactedSummary).includes('secret upstream payload'), false);
assert.equal('request' in redactedSummary.results[0], false);
assert.equal('response' in redactedSummary.results[0], false);

console.log('live read closure redacted evidence passed');

const verifierSource = readFileSync(new URL('./verify-live-read-closure.mjs', import.meta.url), 'utf8');
assert.match(verifierSource, /readRegistry\.length !== 65/);
assert.match(verifierSource, /try\s*\{/);
assert.match(verifierSource, /finally\s*\{/);
assert.match(verifierSource, /cleanupLiveReadFixtures/);
assert.match(verifierSource, /summarizeLiveReadResults/);
assert.match(verifierSource, /mediaUploadCalled:\s*false/);
assert.doesNotMatch(verifierSource, /uploadMedia\s*\(/);
for (const code of APPROVED_PERMISSION_CODES) assert.ok(verifierSource.includes(code));

console.log('live read closure verifier governance source passed');
