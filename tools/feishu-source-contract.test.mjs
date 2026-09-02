import assert from 'node:assert/strict';
import {
  FEISHU_BASE_TABLES,
  FEISHU_SCHEMA_SOURCE,
  FEISHU_SCHEMA_WARNINGS,
  getFeishuOperationSourceContract
} from '../src/integration/feishu-source-contract.js';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';

assert.equal(FEISHU_SCHEMA_SOURCE.tableCount, 36);
assert.equal(Object.keys(FEISHU_BASE_TABLES).length, 36);
assert.equal(FEISHU_SCHEMA_SOURCE.containsRecordValues, false);
assert.equal(FEISHU_SCHEMA_SOURCE.containsCredentials, false);
assert.equal(FEISHU_SCHEMA_SOURCE.containsTableIds, false);
assert.equal(FEISHU_SCHEMA_SOURCE.containsViewIds, false);
assert.equal(FEISHU_SCHEMA_SOURCE.containsFieldIds, false);
assert.equal(FEISHU_SCHEMA_SOURCE.mappingScope, 'table-and-field-names-only');

for (const [tableName, schema] of Object.entries(FEISHU_BASE_TABLES)) {
  assert.ok(tableName.length > 0);
  assert.ok(schema.fields.length > 0, `${tableName} 必须包含字段`);
  assert.equal(new Set(schema.fields).size, schema.fields.length, `${tableName} 字段名必须唯一`);
}

assert.deepEqual(FEISHU_BASE_TABLES['RPA应用详情'].fields, [
  '主键', '应用ID', '应用编码', '版本号', 'RPA所属平台', '操作流程步骤', '应用描述'
]);
assert.ok(FEISHU_BASE_TABLES['应用索引'].fields.includes('应用类型'));
assert.ok(FEISHU_BASE_TABLES['用户月度统计'].fields.includes('当月使用次数'));
assert.equal(FEISHU_SCHEMA_WARNINGS.length, 1);
assert.equal(FEISHU_SCHEMA_WARNINGS[0].field, '列20');

for (const operation of OPERATION_REGISTRY) {
  const source = getFeishuOperationSourceContract(operation.id);
  assert.equal(source.operationId, operation.id);
  assert.equal(operation.remoteEnabled, false);
  assert.equal(operation.apiReady, false);
  assert.equal(source.apiReady, false);
  assert.equal(source.identifierCoverage, 'missing-table-view-field-ids');
  assert.equal(operation.contractStatus, source.schemaCoverage === 'verified' ? 'source-name-schema-verified' : 'source-name-schema-partial');
  assert.deepEqual(operation.verifiedSourceTables, source.verifiedTables);
  assert.deepEqual(operation.missingSourceTables, source.missingTables);
  assert.ok(source.verifiedTables.every(tableName => Object.hasOwn(FEISHU_BASE_TABLES, tableName)));
  assert.equal(new Set(source.verifiedTables).size, source.verifiedTables.length);
  assert.equal(new Set(source.missingTables).size, source.missingTables.length);
  assert.ok(source.verifiedTables.every(tableName => !source.missingTables.includes(tableName)));
  assert.match(source.disabledReason, /同源安全代理/);
  assert.match(source.disabledReason, /table_id\/view_id\/field_id/);
}

assert.equal(getFeishuOperationSourceContract('APP-003').schemaCoverage, 'verified');
assert.ok(getFeishuOperationSourceContract('APP-003').verifiedTables.includes('RPA应用详情'));
assert.ok(getFeishuOperationSourceContract('APP-003').verifiedTables.includes('指标应用详情'));
assert.ok(getFeishuOperationSourceContract('APP-003').verifiedTables.includes('附件资料'));
assert.ok(getFeishuOperationSourceContract('APP-003').verifiedTables.includes('应用评论'));
assert.equal(getFeishuOperationSourceContract('APP-003').verifiedTables.filter(tableName => tableName.endsWith('详情')).length, 9);
assert.deepEqual(getFeishuOperationSourceContract('APP-007').verifiedTables, ['应用评论', '用户字典']);
assert.deepEqual(getFeishuOperationSourceContract('PTS-002').missingTables, ['积分流水']);
assert.deepEqual(getFeishuOperationSourceContract('TRN-004').missingTables, ['培训报名']);
assert.ok(getFeishuOperationSourceContract('OAP-003').verifiedTables.includes('可视化报表详情'));
assert.ok(getFeishuOperationSourceContract('OPS-001').missingTables.includes('用户行为流水'));
assert.ok(getFeishuOperationSourceContract('ARC-001').missingTables.includes('归档任务'));

const serialized = JSON.stringify({ FEISHU_BASE_TABLES, FEISHU_SCHEMA_WARNINGS });
assert.doesNotMatch(serialized, /app[_-]?token|table[_-]?id|view[_-]?id|cookie|secret|access[_-]?token/i);

console.log(`feishu source contract passed (${Object.keys(FEISHU_BASE_TABLES).length} tables, ${OPERATION_REGISTRY.length} operations)`);
