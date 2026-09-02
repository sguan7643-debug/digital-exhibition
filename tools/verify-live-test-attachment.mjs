import { randomUUID } from 'node:crypto';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';

const suffix = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const businessKey = `TEST_TAL_ATTACHMENT_${suffix}`;
const idempotencyKey = `TEST_IDEM_ATTACHMENT_${suffix}`;
const fileName = `TEST_FEISHU_ATTACHMENT_${suffix}.txt`;
const bytes = new TextEncoder().encode(`TEST_ 数智展厅飞书附件联调\n${suffix}\n`);
const client = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const service = createFeishuSafeTestRecordService({ client });
const result = { uploaded: false, tokenPersisted: false, attachmentBound: false, recordCleaned: false, absentAfterCleanup: false };

try {
  const uploaded = await client.uploadMedia({ fileName, bytes, mimeType: 'text/plain' });
  result.uploaded = Boolean(uploaded.fileToken);
  const created = await service.createOnce({
    tableName: '人才库',
    keyField: '主键',
    businessKey,
    idempotencyKey,
    fields: {
      姓名: `TEST_附件联调_${suffix}`,
      状态: 'TEST_ATTACHMENT',
      附件: [{ file_token: uploaded.fileToken }]
    }
  });
  result.recordId = created.record.record_id;
  result.fileToken = uploaded.fileToken;
  const table = (await client.listTables()).find(item => item.name === '人才库');
  const found = await client.searchRecords(table.table_id, '主键', businessKey);
  const record = found.items[0];
  result.tokenPersisted = Boolean(record?.fields?.附件?.[0]?.file_token || record?.fields?.附件?.[0]?.file_token === '');
  result.attachmentBound = Array.isArray(record?.fields?.附件) && record.fields.附件.length === 1;
  const removed = await service.remove({ tableName: '人才库', keyField: '主键', businessKey, ifMatch: 1 });
  result.recordCleaned = removed.deleted;
  result.absentAfterCleanup = (await client.searchRecords(table.table_id, '主键', businessKey)).items.length === 0;
  const passed = Object.entries(result).filter(([key]) => !['recordId', 'fileToken'].includes(key)).every(([, value]) => value === true);
  console.log(JSON.stringify({ passed, fileName, ...result }, null, 2));
  if (!passed) process.exitCode = 2;
} catch (error) {
  try {
    const table = (await client.listTables()).find(item => item.name === '人才库');
    const found = table ? await client.searchRecords(table.table_id, '主键', businessKey) : { items: [] };
    for (const record of found.items) await client.deleteRecord(table.table_id, record.record_id);
  } catch {}
  console.error(JSON.stringify({ passed: false, fileName, code: error.code || 'UNEXPECTED', status: error.status || 500, details: error.details || {} }, null, 2));
  process.exitCode = 1;
}
