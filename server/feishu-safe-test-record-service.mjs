import { FeishuProxyError } from './feishu-open-api-client.mjs';

const TEST_PREFIX = 'TEST_';

function requireTestKey(value, label = '业务键') {
  const key = String(value || '').trim();
  if (!key.startsWith(TEST_PREFIX) || key.length < TEST_PREFIX.length + 4 || key.length > 128) {
    throw new FeishuProxyError('TEST_PREFIX_REQUIRED', `${label}必须使用 TEST_ 前缀`, 403);
  }
  return key;
}

function recordVersion(record, versionField = '版本') {
  if (!versionField) return 0;
  const value = Number(record?.fields?.[versionField]);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function textFieldValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === 'object' && 'text' in item) return String(item.text || '');
      return String(item ?? '');
    }).join('');
  }
  return String(value ?? '');
}

export function createFeishuSafeTestRecordService({ client, wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {
  if (!client) throw new Error('缺少飞书记录客户端');

  async function resolveTable(tableName) {
    const table = (await client.listTables()).find(item => item.name === tableName);
    if (!table) throw new FeishuProxyError('TABLE_NOT_FOUND', '测试目标表不存在', 404);
    return table;
  }

  async function find(tableId, keyField, businessKey) {
    const result = await client.searchRecords(tableId, keyField, businessKey);
    if (result.items.length > 1) throw new FeishuProxyError('TEST_KEY_NOT_UNIQUE', 'TEST_ 业务键不唯一', 409);
    return result.items[0] || null;
  }

  async function createOnce({ tableName, keyField, businessKey, idempotencyKey, fields = {}, governance = {} }) {
    const key = requireTestKey(businessKey);
    const idempotency = requireTestKey(idempotencyKey, '幂等键');
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    const versionField = governance.versionField === undefined ? '版本' : governance.versionField;
    const traceField = governance.traceField === undefined ? '追踪ID' : governance.traceField;
    const sourceField = governance.sourceField === undefined ? '来源系统' : governance.sourceField;
    const deletedField = governance.deletedField === undefined ? '已删除' : governance.deletedField;
    if (existing) {
      if (traceField && textFieldValue(existing.fields?.[traceField]) !== idempotency) {
        throw new FeishuProxyError('TEST_KEY_CONFLICT', 'TEST_ 业务键已被其他幂等请求占用', 409);
      }
      return { record: existing, replayed: true, version: recordVersion(existing, versionField) };
    }
    const managed = {};
    if (versionField) managed[versionField] = 1;
    if (sourceField) managed[sourceField] = 'TEST_INTEGRATION';
    if (traceField) managed[traceField] = idempotency;
    if (deletedField) managed[deletedField] = false;
    const record = await client.createRecord(table.table_id, { ...fields, [keyField]: key, ...managed });
    return { record, replayed: false, version: versionField ? 1 : 0 };
  }

  async function update({ tableName, keyField, businessKey, ifMatch, fields = {}, governance = {} }) {
    const key = requireTestKey(businessKey);
    const expectedVersion = Number(ifMatch);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FeishuProxyError('IF_MATCH_REQUIRED', '更新必须提供正整数版本', 428);
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    if (!existing) throw new FeishuProxyError('TEST_RECORD_NOT_FOUND', '测试记录不存在', 404);
    const versionField = governance.versionField === undefined ? '版本' : governance.versionField;
    if (!versionField) throw new FeishuProxyError('VERSION_FIELD_UNAVAILABLE', '该表不支持原地更新', 409);
    const actualVersion = recordVersion(existing, versionField);
    if (actualVersion !== expectedVersion) throw new FeishuProxyError('VERSION_CONFLICT', '记录版本冲突', 409, { expectedVersion, actualVersion });
    const nextVersion = actualVersion + 1;
    const record = await client.updateRecord(table.table_id, existing.record_id, { ...fields, [versionField]: nextVersion });
    return { record, version: nextVersion };
  }

  async function remove({ tableName, keyField, businessKey, ifMatch, governance = {} }) {
    const key = requireTestKey(businessKey);
    const expectedVersion = Number(ifMatch);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FeishuProxyError('IF_MATCH_REQUIRED', '删除必须提供正整数版本', 428);
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    if (!existing) return { deleted: false, alreadyAbsent: true };
    const versionField = governance.versionField === undefined ? '版本' : governance.versionField;
    if (versionField) {
      const actualVersion = recordVersion(existing, versionField);
      if (actualVersion !== expectedVersion) throw new FeishuProxyError('VERSION_CONFLICT', '记录版本冲突', 409, { expectedVersion, actualVersion });
    }
    await client.deleteRecord(table.table_id, existing.record_id);
    return { deleted: true, alreadyAbsent: false, recordId: existing.record_id };
  }

  async function rollback({ tableName, keyField, businessKey, fromVersion, restoreFields, governance }) {
    const updated = await update({ tableName, keyField, businessKey, ifMatch: fromVersion, fields: restoreFields, governance });
    await wait(800);
    return { ...updated, rolledBack: true };
  }

  return Object.freeze({ createOnce, update, remove, rollback });
}
