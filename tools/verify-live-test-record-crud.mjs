import { randomUUID } from 'node:crypto';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';

const suffix = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const businessKey = `TEST_DIFF_${suffix}`;
const idempotencyKey = `TEST_IDEM_${suffix}`;
const tableName = '完整性差异记录';
const keyField = '差异ID';
const client = createFeishuSchemaAdminClient();
const service = createFeishuSafeTestRecordService({ client });
const evidence = { businessKey, created: false, replayed: false, conflictVerified: false, updated: false, rolledBack: false, cleaned: false, absentAfterCleanup: false };

try {
  const created = await service.createOnce({
    tableName, keyField, businessKey, idempotencyKey,
    fields: {
      执行ID: `TEST_EXEC_${suffix}`, 资源类型: 'INTEGRATION_TEST', 资源ID: businessKey,
      字段编码: 'status', 期望值哈希: 'TEST_EXPECTED', 实际值哈希: 'TEST_ACTUAL',
      差异类型: 'VALUE_MISMATCH', 差异摘要: 'TEST_ 飞书记录写接口联调', 状态: 'OPEN'
    }
  });
  evidence.created = !created.replayed;
  evidence.recordId = created.record.record_id;
  const replay = await service.createOnce({ tableName, keyField, businessKey, idempotencyKey });
  evidence.replayed = replay.replayed && replay.record.record_id === created.record.record_id;
  try {
    await service.update({ tableName, keyField, businessKey, ifMatch: 2, fields: { 状态: 'RESOLVED' } });
  } catch (error) {
    if (error.code !== 'VERSION_CONFLICT') throw error;
    evidence.conflictVerified = true;
  }
  const updated = await service.update({ tableName, keyField, businessKey, ifMatch: 1, fields: { 状态: 'RESOLVED', 差异摘要: 'TEST_ 已更新' } });
  evidence.updated = updated.version === 2;
  const rolledBack = await service.rollback({ tableName, keyField, businessKey, fromVersion: 2, restoreFields: { 状态: 'OPEN', 差异摘要: 'TEST_ 已回滚' } });
  evidence.rolledBack = rolledBack.rolledBack && rolledBack.version === 3;
  const removed = await service.remove({ tableName, keyField, businessKey, ifMatch: 3 });
  evidence.cleaned = removed.deleted;
  const table = (await client.listTables()).find(item => item.name === tableName);
  evidence.absentAfterCleanup = (await client.searchRecords(table.table_id, keyField, businessKey)).items.length === 0;
  const passed = Object.entries(evidence).filter(([key]) => !['businessKey', 'recordId'].includes(key)).every(([, value]) => value === true);
  console.log(JSON.stringify({ passed, ...evidence }, null, 2));
  if (!passed) process.exitCode = 2;
} catch (error) {
  try {
    const table = (await client.listTables()).find(item => item.name === tableName);
    const existing = table ? (await client.searchRecords(table.table_id, keyField, businessKey)).items[0] : null;
    if (existing) await client.deleteRecord(table.table_id, existing.record_id);
  } catch {}
  console.error(JSON.stringify({ passed: false, code: error.code || 'UNEXPECTED', status: error.status || 500, businessKey }, null, 2));
  process.exitCode = 1;
}
