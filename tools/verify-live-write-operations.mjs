import { randomUUID } from 'node:crypto';
import { FEISHU_WRITE_OPERATION_MANIFEST } from '../server/contracts/feishu-write-operation-manifest.mjs';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';
import { createFeishuWriteOperationService } from '../server/feishu-write-operation-service.mjs';

const WRITE_INTERVAL_MS = 900;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const rawClient = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const tableList = await rawClient.listTables();
const tableByName = new Map(tableList.map(table => [table.name, table]));
const fieldByTable = new Map();

for (const tableName of new Set(FEISHU_WRITE_OPERATION_MANIFEST.map(item => item.tableName))) {
  const table = tableByName.get(tableName);
  if (!table) throw new Error(`找不到写接口目标表：${tableName}`);
  fieldByTable.set(tableName, await rawClient.listFields(table.table_id));
}

const client = {
  ...rawClient,
  async listTables() { return tableList; },
  async createRecord(tableId, fields) {
    const result = await rawClient.createRecord(tableId, fields);
    await sleep(WRITE_INTERVAL_MS);
    return result;
  },
  async updateRecord(tableId, recordId, fields) {
    const result = await rawClient.updateRecord(tableId, recordId, fields);
    await sleep(WRITE_INTERVAL_MS);
    return result;
  },
  async deleteRecord(tableId, recordId) {
    const result = await rawClient.deleteRecord(tableId, recordId);
    await sleep(WRITE_INTERVAL_MS);
    return result;
  }
};

const safeRecordService = createFeishuSafeTestRecordService({ client, wait: sleep });
const writeService = createFeishuWriteOperationService({ safeRecordService });
const runSuffix = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const results = [];
const cleanupTargets = [];

function representativeField(plan) {
  const fields = fieldByTable.get(plan.tableName) || [];
  const byName = new Map(fields.map(field => [field.field_name, field]));
  const managed = new Set([
    plan.keyField,
    plan.governance.versionField,
    plan.governance.traceField,
    plan.governance.sourceField,
    plan.governance.deletedField,
    '版本', '追踪ID', '来源系统', '已删除'
  ].filter(Boolean));
  for (const fieldName of plan.allowedFields) {
    const field = byName.get(fieldName);
    if (field && !managed.has(fieldName) && [1, 2, 5, 7].includes(field.type)) return field;
  }
  return null;
}

function valuesFor(field, operationId) {
  if (!field) return { initial: {}, changed: {}, restored: {} };
  const marker = `TEST_${operationId.replace('-', '_')}`;
  if (field.type === 2) return { initial: { [field.field_name]: 1 }, changed: { [field.field_name]: 2 }, restored: { [field.field_name]: 1 } };
  if (field.type === 5) {
    const initial = Date.now();
    return { initial: { [field.field_name]: initial }, changed: { [field.field_name]: initial + 60000 }, restored: { [field.field_name]: initial } };
  }
  if (field.type === 7) return { initial: { [field.field_name]: false }, changed: { [field.field_name]: true }, restored: { [field.field_name]: false } };
  return {
    initial: { [field.field_name]: `${marker}_INITIAL` },
    changed: { [field.field_name]: `${marker}_CHANGED` },
    restored: { [field.field_name]: `${marker}_INITIAL` }
  };
}

async function assertAbsent(plan, businessKey) {
  const table = tableByName.get(plan.tableName);
  const found = await rawClient.searchRecords(table.table_id, plan.keyField, businessKey);
  if (found.items.length !== 0) throw new Error(`${plan.operationId} 清理后仍存在 TEST_ 记录`);
}

async function removeIfPresent(plan, businessKey) {
  const table = tableByName.get(plan.tableName);
  const found = await rawClient.searchRecords(table.table_id, plan.keyField, businessKey);
  for (const record of found.items) await client.deleteRecord(table.table_id, record.record_id);
}

for (const plan of FEISHU_WRITE_OPERATION_MANIFEST) {
  const businessKey = `TEST_${plan.operationId.replace('-', '_')}_${runSuffix}`;
  const idempotencyKey = `TEST_IDEM_${plan.operationId.replace('-', '_')}_${runSuffix}`;
  const field = representativeField(plan);
  const values = valuesFor(field, plan.operationId);
  const result = {
    operationId: plan.operationId,
    tableName: plan.tableName,
    mode: plan.mode,
    representativeField: field?.field_name || '(仅受控字段)',
    createdOrSeeded: false,
    idempotency: 'not_applicable',
    versionConflict: 'not_applicable',
    updated: 'not_applicable',
    rollback: 'not_applicable',
    cleanup: false
  };
  cleanupTargets.push({ plan, businessKey });

  try {
    if (plan.mode === 'CREATE' || plan.mode === 'UPSERT') {
      const created = await writeService.execute(plan.operationId, { businessKey, idempotencyKey, fields: values.initial });
      result.createdOrSeeded = Boolean(created.data.recordId);
      const replay = await writeService.execute(plan.operationId, { businessKey, idempotencyKey, fields: values.initial });
      result.idempotency = replay.data.replayed === true ? 'passed' : 'failed';
    } else {
      const seeded = await safeRecordService.createOnce({
        tableName: plan.tableName,
        keyField: plan.keyField,
        businessKey,
        idempotencyKey,
        fields: values.initial,
        governance: plan.governance
      });
      result.createdOrSeeded = Boolean(seeded.record?.record_id);
      const replay = await safeRecordService.createOnce({
        tableName: plan.tableName,
        keyField: plan.keyField,
        businessKey,
        idempotencyKey,
        fields: values.initial,
        governance: plan.governance
      });
      result.idempotency = replay.replayed === true ? 'passed' : 'failed';
    }

    if (!plan.governance.versionField) {
      result.versionConflict = 'not_applicable_immutable';
      result.rollback = 'not_applicable_immutable';
    } else if (plan.mode === 'DELETE') {
      try {
        await writeService.execute(plan.operationId, { businessKey, idempotencyKey, ifMatch: 99, fields: {} });
        throw new Error('预期版本冲突未发生');
      } catch (error) {
        if (error.code !== 'VERSION_CONFLICT') throw error;
        result.versionConflict = 'passed';
      }
      const removed = await writeService.execute(plan.operationId, { businessKey, idempotencyKey, ifMatch: 1, fields: {} });
      result.updated = removed.data.deleted ? 'deleted' : 'failed';
      result.rollback = 'not_applicable_delete';
    } else {
      try {
        if (plan.mode === 'CREATE') {
          await safeRecordService.update({ tableName: plan.tableName, keyField: plan.keyField, businessKey, ifMatch: 99, fields: values.changed, governance: plan.governance });
        } else {
          await writeService.execute(plan.operationId, { businessKey, idempotencyKey, ifMatch: 99, fields: values.changed });
        }
        throw new Error('预期版本冲突未发生');
      } catch (error) {
        if (error.code !== 'VERSION_CONFLICT') throw error;
        result.versionConflict = 'passed';
      }

      const updated = plan.mode === 'CREATE'
        ? await safeRecordService.update({ tableName: plan.tableName, keyField: plan.keyField, businessKey, ifMatch: 1, fields: values.changed, governance: plan.governance })
        : await writeService.execute(plan.operationId, { businessKey, idempotencyKey, ifMatch: 1, fields: values.changed });
      const updatedVersion = updated.version || updated.data?.version;
      result.updated = updatedVersion === 2 ? 'passed' : 'failed';
      const rolledBack = await safeRecordService.rollback({
        tableName: plan.tableName,
        keyField: plan.keyField,
        businessKey,
        fromVersion: 2,
        restoreFields: values.restored,
        governance: plan.governance
      });
      result.rollback = rolledBack.rolledBack && rolledBack.version === 3 ? 'passed' : 'failed';
    }

    await removeIfPresent(plan, businessKey);
    await assertAbsent(plan, businessKey);
    result.cleanup = true;
    result.passed = result.createdOrSeeded
      && result.idempotency === 'passed'
      && result.versionConflict !== 'failed'
      && result.updated !== 'failed'
      && result.rollback !== 'failed'
      && result.cleanup;
    results.push(result);
    console.log(JSON.stringify(result));
    if (!result.passed) throw new Error(`${plan.operationId} 真实写接口验证未通过`);
  } catch (error) {
    result.passed = false;
    result.errorCode = error.code || 'UNEXPECTED';
    result.errorMessage = String(error.message || error).slice(0, 200);
    if (!results.includes(result)) results.push(result);
    console.error(JSON.stringify(result));
    break;
  }
}

for (const { plan, businessKey } of cleanupTargets) {
  try { await removeIfPresent(plan, businessKey); } catch {}
}

const passedCount = results.filter(item => item.passed).length;
const summary = {
  passed: passedCount === FEISHU_WRITE_OPERATION_MANIFEST.length,
  expected: FEISHU_WRITE_OPERATION_MANIFEST.length,
  executed: results.length,
  passedCount,
  failed: results.filter(item => !item.passed).map(item => ({ operationId: item.operationId, code: item.errorCode, message: item.errorMessage })),
  cleanupComplete: results.every(item => item.cleanup)
};
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
