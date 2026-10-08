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

function normalizeReconcileFields(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new FeishuProxyError('INVALID_RECONCILE_FIELDS', '重放修复字段白名单必须是数组', 400);
  }
  const fields = value.map(item => String(item || '').trim());
  if (fields.some(field => !field || field.length > 128)) {
    throw new FeishuProxyError('INVALID_RECONCILE_FIELDS', '重放修复字段白名单包含非法字段名', 400);
  }
  return [...new Set(fields)];
}

function comparableFieldValue(value) {
  if (Array.isArray(value)) {
    if (value.every(item => item && typeof item === 'object' && 'text' in item)) return textFieldValue(value);
    return JSON.stringify(value);
  }
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '');
}

export function createFeishuSafeTestRecordService({ client, production = false, wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {
  if (!client) throw new Error('缺少飞书记录客户端');
  const tableByName = new Map();
  let tablesLoaded = false;
  let tablesPromise = null;
  const requireKey = (value, label = '业务键') => {
    if (!production) return requireTestKey(value, label);
    const key = String(value || '').trim();
    if (!key || key.length > 128 || /[\u0000-\u001f]/.test(key)) throw new FeishuProxyError('BUSINESS_KEY_REQUIRED', `${label}缺失或格式无效`, 400);
    return key;
  };

  async function loadTables({ refresh = false } = {}) {
    if (tablesLoaded && !refresh) return tableByName;
    if (!tablesPromise) {
      tablesPromise = client.listTables().then(tables => {
        tableByName.clear();
        for (const table of tables) tableByName.set(String(table.name || ''), table);
        tablesLoaded = true;
        return tableByName;
      }).finally(() => {
        tablesPromise = null;
      });
    }
    return tablesPromise;
  }

  async function resolveTable(tableName) {
    await loadTables();
    let table = tableByName.get(tableName);
    if (!table && tablesLoaded) {
      await loadTables({ refresh: true });
      table = tableByName.get(tableName);
    }
    if (!table) throw new FeishuProxyError('TABLE_NOT_FOUND', production ? '业务目标表不存在' : '测试目标表不存在', 404);
    return table;
  }

  async function find(tableId, keyField, businessKey) {
    const result = await client.searchRecords(tableId, keyField, businessKey);
    if (result.items.length > 1) throw new FeishuProxyError(production ? 'BUSINESS_KEY_NOT_UNIQUE' : 'TEST_KEY_NOT_UNIQUE', production ? '业务键不唯一' : 'TEST_ 业务键不唯一', 409);
    return result.items[0] || null;
  }

  async function createOnce({ tableName, keyField, businessKey, idempotencyKey, fields = {}, governance = {}, reconcileFields }) {
    const key = requireKey(businessKey);
    const idempotency = requireKey(idempotencyKey, '幂等键');
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    const versionField = governance.versionField === undefined ? '版本' : governance.versionField;
    const traceField = governance.traceField === undefined ? '追踪ID' : governance.traceField;
    const sourceField = governance.sourceField === undefined ? '来源系统' : governance.sourceField;
    const deletedField = governance.deletedField === undefined ? '已删除' : governance.deletedField;
    if (existing) {
      if (traceField && textFieldValue(existing.fields?.[traceField]) !== idempotency) {
        throw new FeishuProxyError(production ? 'BUSINESS_KEY_CONFLICT' : 'TEST_KEY_CONFLICT', production ? '业务键已被其他幂等请求占用' : 'TEST_ 业务键已被其他幂等请求占用', 409);
      }
      const allowlist = normalizeReconcileFields(reconcileFields);
      if (allowlist.length && versionField) {
        throw new FeishuProxyError('RECONCILE_VERSIONED_TABLE_FORBIDDEN', '带版本字段的记录必须使用乐观锁更新', 409);
      }
      const protectedFields = new Set([keyField, versionField, traceField, sourceField, deletedField].filter(Boolean));
      const patch = {};
      for (const field of allowlist) {
        if (protectedFields.has(field) || !Object.hasOwn(fields, field)) continue;
        if (comparableFieldValue(existing.fields?.[field]) !== comparableFieldValue(fields[field])) patch[field] = fields[field];
      }
      if (Object.keys(patch).length) {
        const updated = await client.updateRecord(table.table_id, existing.record_id, patch);
        const record = {
          ...existing,
          ...updated,
          fields: { ...(existing.fields || {}), ...(updated?.fields || {}) }
        };
        return { record, tableId: table.table_id, replayed: true, reconciled: true, version: recordVersion(record, versionField) };
      }
      return { record: existing, tableId: table.table_id, replayed: true, reconciled: false, version: recordVersion(existing, versionField) };
    }
    const managed = {};
    if (versionField) managed[versionField] = 1;
    if (sourceField) managed[sourceField] = production ? 'DIGITAL_EXHIBITION' : 'TEST_INTEGRATION';
    if (traceField) managed[traceField] = idempotency;
    if (deletedField) managed[deletedField] = false;
    const record = await client.createRecord(table.table_id, { ...fields, [keyField]: key, ...managed });
    return { record, tableId: table.table_id, replayed: false, version: versionField ? 1 : 0 };
  }

  async function update({ tableName, keyField, businessKey, ifMatch, fields = {}, governance = {} }) {
    const key = requireKey(businessKey);
    const expectedVersion = Number(ifMatch);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FeishuProxyError('IF_MATCH_REQUIRED', '更新必须提供正整数版本', 428);
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    if (!existing) throw new FeishuProxyError(production ? 'BUSINESS_RECORD_NOT_FOUND' : 'TEST_RECORD_NOT_FOUND', production ? '业务记录不存在' : '测试记录不存在', 404);
    const versionField = governance.versionField === undefined ? '版本' : governance.versionField;
    if (!versionField) throw new FeishuProxyError('VERSION_FIELD_UNAVAILABLE', '该表不支持原地更新', 409);
    const actualVersion = recordVersion(existing, versionField);
    if (actualVersion !== expectedVersion) throw new FeishuProxyError('VERSION_CONFLICT', '记录版本冲突', 409, { expectedVersion, actualVersion });
    const nextVersion = actualVersion + 1;
    const record = await client.updateRecord(table.table_id, existing.record_id, { ...fields, [versionField]: nextVersion });
    return { record, version: nextVersion };
  }

  async function remove({ tableName, keyField, businessKey, ifMatch, governance = {} }) {
    const key = requireKey(businessKey);
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

  async function updateMany({ tableName, matchField, matchValue, fields = {}, governance = {} }) {
    const value = requireKey(matchValue, '批量匹配值');
    if (!String(matchField || '').trim()) throw new FeishuProxyError('BATCH_MATCH_FIELD_REQUIRED', '批量更新缺少受控匹配字段', 400);
    const table = await resolveTable(tableName);
    const result = await client.searchRecords(table.table_id, matchField, value, { pageSize: 100 });
    if (result.hasMore) throw new FeishuProxyError('BATCH_SCOPE_TOO_LARGE', '批量更新超过单次安全上限，请缩小范围', 409);
    const versionField = governance.versionField === undefined ? '版本' : governance.versionField;
    let updatedCount = 0;
    for (const existing of result.items || []) {
      const patch = { ...fields };
      if (versionField) patch[versionField] = recordVersion(existing, versionField) + 1;
      await client.updateRecord(table.table_id, existing.record_id, patch);
      updatedCount += 1;
    }
    return { updatedCount, version: 0, command: 'UPDATE_MANY' };
  }

  async function rollback({ tableName, keyField, businessKey, fromVersion, restoreFields, governance }) {
    const updated = await update({ tableName, keyField, businessKey, ifMatch: fromVersion, fields: restoreFields, governance });
    await wait(800);
    return { ...updated, rolledBack: true };
  }

  async function getRecord({ tableName, keyField, businessKey }) {
    const table = await resolveTable(tableName);
    return find(table.table_id, keyField, requireKey(businessKey));
  }
  return Object.freeze({ createOnce, update, updateMany, remove, rollback, getRecord });
}
