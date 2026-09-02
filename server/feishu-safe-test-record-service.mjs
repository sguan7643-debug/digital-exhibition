import { FeishuProxyError } from './feishu-open-api-client.mjs';

const TEST_PREFIX = 'TEST_';

function requireTestKey(value, label = '业务键') {
  const key = String(value || '').trim();
  if (!key.startsWith(TEST_PREFIX) || key.length < TEST_PREFIX.length + 4 || key.length > 128) {
    throw new FeishuProxyError('TEST_PREFIX_REQUIRED', `${label}必须使用 TEST_ 前缀`, 403);
  }
  return key;
}

function recordVersion(record) {
  const value = Number(record?.fields?.['版本']);
  return Number.isInteger(value) && value >= 0 ? value : 0;
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

  async function createOnce({ tableName, keyField, businessKey, idempotencyKey, fields = {} }) {
    const key = requireTestKey(businessKey);
    const idempotency = requireTestKey(idempotencyKey, '幂等键');
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    if (existing) return { record: existing, replayed: true, version: recordVersion(existing) };
    const record = await client.createRecord(table.table_id, {
      ...fields, [keyField]: key, '版本': 1, '来源系统': 'TEST_INTEGRATION', '追踪ID': idempotency, '已删除': false
    });
    return { record, replayed: false, version: 1 };
  }

  async function update({ tableName, keyField, businessKey, ifMatch, fields = {} }) {
    const key = requireTestKey(businessKey);
    const expectedVersion = Number(ifMatch);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FeishuProxyError('IF_MATCH_REQUIRED', '更新必须提供正整数版本', 428);
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    if (!existing) throw new FeishuProxyError('TEST_RECORD_NOT_FOUND', '测试记录不存在', 404);
    const actualVersion = recordVersion(existing);
    if (actualVersion !== expectedVersion) throw new FeishuProxyError('VERSION_CONFLICT', '记录版本冲突', 409, { expectedVersion, actualVersion });
    const nextVersion = actualVersion + 1;
    const record = await client.updateRecord(table.table_id, existing.record_id, { ...fields, '版本': nextVersion });
    return { record, version: nextVersion };
  }

  async function remove({ tableName, keyField, businessKey, ifMatch }) {
    const key = requireTestKey(businessKey);
    const expectedVersion = Number(ifMatch);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FeishuProxyError('IF_MATCH_REQUIRED', '删除必须提供正整数版本', 428);
    const table = await resolveTable(tableName);
    const existing = await find(table.table_id, keyField, key);
    if (!existing) return { deleted: false, alreadyAbsent: true };
    const actualVersion = recordVersion(existing);
    if (actualVersion !== expectedVersion) throw new FeishuProxyError('VERSION_CONFLICT', '记录版本冲突', 409, { expectedVersion, actualVersion });
    await client.deleteRecord(table.table_id, existing.record_id);
    return { deleted: true, alreadyAbsent: false, recordId: existing.record_id };
  }

  async function rollback({ tableName, keyField, businessKey, fromVersion, restoreFields }) {
    const updated = await update({ tableName, keyField, businessKey, ifMatch: fromVersion, fields: restoreFields });
    await wait(800);
    return { ...updated, rolledBack: true };
  }

  return Object.freeze({ createOnce, update, remove, rollback });
}
