import { randomUUID } from 'node:crypto';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';
import { createFeishuWriteOperationService } from '../server/feishu-write-operation-service.mjs';

const suffix = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const businessKey = `TEST_TAL_ATTACHMENT_${suffix}`;
const idempotencyKey = `TEST_IDEM_ATTACHMENT_${suffix}`;
const fileName = `TEST_FEISHU_ATTACHMENT_${suffix}.txt`;
const bytes = new TextEncoder().encode(`TEST_ 数智展厅飞书附件联调\n${suffix}\n`);
const client = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const service = createFeishuSafeTestRecordService({ client });
const writeService = createFeishuWriteOperationService({ safeRecordService: service });
const result = {
  uploaded: false, uploadSessionCreated: false, uploadSessionUpdated: false,
  tokenPersisted: false, attachmentBound: false, recordCleaned: false, absentAfterCleanup: false,
  retentionPolicy: 'FEISHU_MEDIA_RETENTION_UNTIL_APPROVED_GC', mediaCleanup: 'retained_by_explicit_policy'
};

try {
  const uploaded = await client.uploadMedia({ fileName, bytes, mimeType: 'text/plain' });
  result.uploaded = Boolean(uploaded.fileToken);
  const uploadSession = await writeService.execute('COM-006', {
    businessKey,
    idempotencyKey,
    fields: {
      文件ID: businessKey,
      文件名: fileName,
      大小字节: bytes.byteLength,
      'MIME类型': 'text/plain',
      SHA256: suffix,
      业务类型: 'TALENT',
      业务ID: businessKey,
      用途: 'TEST_ATTACHMENT',
      分片上传: false,
      分片数: 1,
      状态: 'UPLOADED',
      '飞书文件令牌': uploaded.fileToken
    }
  });
  result.uploadSessionCreated = Boolean(uploadSession.data.recordId);
  const updatedSession = await writeService.execute('COM-007', {
    businessKey,
    idempotencyKey,
    ifMatch: 1,
    fields: { 状态: 'READY', '飞书文件令牌': uploaded.fileToken, 大小字节: bytes.byteLength, SHA256: suffix }
  });
  result.uploadSessionUpdated = updatedSession.data.version === 2;
  result.fileToken = uploaded.fileToken;
  const uploadTable = (await client.listTables()).find(item => item.name === '文件上传会话');
  const found = await client.searchRecords(uploadTable.table_id, '上传ID', businessKey);
  const record = found.items[0];
  result.tokenPersisted = Boolean(record?.fields?.['飞书文件令牌']);
  result.attachmentBound = record?.fields?.['飞书文件令牌'] === uploaded.fileToken;
  const removed = await service.remove({ tableName: '文件上传会话', keyField: '上传ID', businessKey, ifMatch: 2 });
  result.recordCleaned = removed.deleted;
  result.absentAfterCleanup = (await client.searchRecords(uploadTable.table_id, '上传ID', businessKey)).items.length === 0;
  const passed = Object.entries(result).filter(([key]) => !['fileToken', 'retentionPolicy', 'mediaCleanup'].includes(key)).every(([, value]) => value === true || value === 'retained_by_explicit_policy');
  console.log(JSON.stringify({ passed, fileName, ...result }, null, 2));
  if (!passed) process.exitCode = 2;
} catch (error) {
  const cleanupErrors = [];
  try {
    const table = (await client.listTables()).find(item => item.name === '文件上传会话');
    const found = table ? await client.searchRecords(table.table_id, '上传ID', businessKey) : { items: [] };
    for (const record of found.items) await client.deleteRecord(table.table_id, record.record_id);
    if (table && (await client.searchRecords(table.table_id, '上传ID', businessKey)).items.length) cleanupErrors.push({ code: 'RECORD_CLEANUP_UNVERIFIED' });
  } catch (cleanupError) { cleanupErrors.push({ code: cleanupError.code || 'CLEANUP_FAILED', message: cleanupError.message }); }
  console.error(JSON.stringify({ passed: false, fileName, code: error.code || 'UNEXPECTED', status: error.status || 500, details: error.details || {}, cleanupErrors }, null, 2));
  process.exitCode = 1;
}
