import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATION_REGISTRY, getOperation, isKnownOperationId } from '../src/integration/operation-registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const expectedOperations = JSON.parse(fs.readFileSync(
  path.join(here, 'fixtures', 'feishu-operation-sources.fixture.json'),
  'utf8'
));
const snapshotPath = path.join(here, 'fixtures', 'feishu-base-schema-snapshot.fixture.json');
const snapshotBytes = fs.readFileSync(snapshotPath);
const snapshot = JSON.parse(snapshotBytes);
const governedSnapshotSha256 = fs.readFileSync(
  path.join(here, 'fixtures', 'feishu-base-schema-snapshot.fixture.sha256'),
  'utf8'
).trim();
const canonicalSchema = JSON.stringify(snapshot.sheets.map(sheet => ({ name: sheet.name, headers: sheet.headers })));
const canonicalSchemaSha256 = crypto.createHash('sha256').update(canonicalSchema).digest('hex').toUpperCase();

assert.equal(governedSnapshotSha256, '430CE3E588B3BA6985C4124044D38C5E17B7998E7E79729D0DDE4D860CC83EF9');
assert.equal(canonicalSchemaSha256, '175E87BF259C461553EA79DA5DD84D84922967515097BFB4425CFF95244D2131');
assert.equal(snapshot.sheetCount, 36);
assert.equal(snapshot.sheets.length, 36);

const tables = new Map(snapshot.sheets.map(sheet => [sheet.name, new Set(sheet.headers)]));
const expectedIds = Object.keys(expectedOperations);
assert.equal(expectedIds.length, 101, '独立 operation fixture 必须逐项覆盖 101 个操作');
assert.deepEqual([...OPERATION_REGISTRY.map(operation => operation.id)].sort(), [...expectedIds].sort());

function requirementSatisfied(requirement) {
  const actualFields = tables.get(requirement.table);
  return Boolean(actualFields) && requirement.fields.every(field => actualFields.has(field));
}

function expectedSourceVerification(contract) {
  const commonSatisfied = contract.requiredCommon.every(requirementSatisfied);
  const oneOfSatisfied = contract.conditionalOneOf.length === 0
    || contract.conditionalOneOf.every(group => group.options.length > 0 && group.options.some(requirementSatisfied));
  return commonSatisfied && oneOfSatisfied && contract.knownMissing.length === 0;
}

for (const operationId of expectedIds) {
  const expected = expectedOperations[operationId];
  const operation = getOperation(operationId);
  assert.ok(operation, `${operationId} 必须在运行时 registry 中存在`);
  assert.equal(operation.sourceFieldNamesVerified, expectedSourceVerification(expected), `${operationId} 来源字段门禁错误`);
  assert.equal(operation.apiIdentifiersVerified, false);
  assert.equal(operation.apiReady, false);
  assert.equal(operation.remoteEnabled, false);
  assert.equal(Object.hasOwn(operation, 'verifiedSourceTables'), false, '浏览器 registry 不得携带完整表目录');
  assert.equal(Object.hasOwn(operation, 'missingSourceTables'), false, '浏览器 registry 不得携带缺失表目录');
  assert.match(operation.disabledReason, /安全代理/);
}

for (const operationId of ['COM-001', 'WB-001', 'FAV-001', 'OAP-003', 'APP-003']) {
  assert.equal(getOperation(operationId).sourceFieldNamesVerified, false, `${operationId} 不得假完整`);
}

assert.ok(expectedOperations['COM-001'].requiredCommon.some(item => item.table === '消息通知'));
assert.ok(expectedOperations['COM-001'].requiredCommon.some(item => item.table === '应用收藏'));
assert.ok(expectedOperations['COM-001'].requiredCommon.some(item => item.table === '积分余额'));
assert.ok(expectedOperations['WB-001'].requiredCommon.some(item => item.table === '培训课程'));
assert.ok(expectedOperations['WB-001'].requiredCommon.some(item => item.table === '应用类型配置'));
assert.ok(expectedOperations['FAV-001'].requiredCommon.some(item => item.table === '应用索引'));
assert.ok(expectedOperations['FAV-001'].requiredCommon.some(item => item.table === '业务域字典'));
assert.ok(expectedOperations['OAP-003'].requiredCommon.some(item => item.table === '上架申请'));
assert.ok(expectedOperations['OAP-003'].knownMissing.includes('外部成果提交记录'));

const appDetail = expectedOperations['APP-003'];
assert.equal(appDetail.conditionalOneOf.length, 1);
assert.equal(appDetail.conditionalOneOf[0].options.length, 9);
assert.equal(appDetail.requiredCommon.some(item => item.table.endsWith('详情')), false);
assert.ok(appDetail.optional.some(item => item.table === '公告通知'));

assert.equal(getOperation('UNKNOWN-999'), undefined);
assert.equal(isKnownOperationId('UNKNOWN-999'), false);

console.log(`feishu source contract passed (${snapshot.sheets.length} governed tables, ${expectedIds.length} explicit operations)`);
