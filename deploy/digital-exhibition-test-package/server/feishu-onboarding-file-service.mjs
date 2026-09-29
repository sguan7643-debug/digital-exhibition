import { createHash } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

const MB = 1024 * 1024;
const RULES = Object.freeze({
  APPLICATION_ICON: Object.freeze({ maximum: 5 * MB, extensions: new Set(['png', 'jpg', 'jpeg', 'webp']), types: new Set(['PNG', 'JPEG', 'WEBP']) }),
  APPLICATION_ATTACHMENT: Object.freeze({ maximum: 20 * MB, extensions: new Set(['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg']), types: new Set(['PDF', 'DOCX', 'XLSX', 'PNG', 'JPEG']) })
});
const MIME_BY_TYPE = Object.freeze({
  PNG: new Set(['image/png']),
  JPEG: new Set(['image/jpeg', 'image/jpg']),
  WEBP: new Set(['image/webp']),
  PDF: new Set(['application/pdf']),
  DOCX: new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  XLSX: new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
});
const EXTENSION_TYPE = Object.freeze({ png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', webp: 'WEBP', pdf: 'PDF', docx: 'DOCX', xlsx: 'XLSX' });

function fileError(code, message) {
  throw new FeishuProxyError(code, message, 422);
}

function byteString(bytes) {
  return Buffer.from(bytes).toString('latin1');
}

function detectType(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length >= 8 && Buffer.from(data.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'PNG';
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'JPEG';
  if (data.length >= 12 && byteString(data.subarray(0, 4)) === 'RIFF' && byteString(data.subarray(8, 12)) === 'WEBP') return 'WEBP';
  if (data.length >= 5 && byteString(data.subarray(0, 5)) === '%PDF-') return 'PDF';
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && [0x03, 0x05, 0x07].includes(data[2]) && [0x04, 0x06, 0x08].includes(data[3])) {
    const archive = byteString(data);
    if (archive.includes('[Content_Types].xml') && archive.includes('word/')) return 'DOCX';
    if (archive.includes('[Content_Types].xml') && archive.includes('xl/')) return 'XLSX';
    return 'ZIP';
  }
  return 'UNKNOWN';
}

export function inspectOnboardingFile({ purpose, fileName, mimeType, bytes } = {}) {
  const rule = RULES[String(purpose || '')];
  if (!rule) fileError('ONBOARDING_FILE_PURPOSE_INVALID', '文件用途非法');
  const normalizedName = String(fileName || '').trim();
  const extension = normalizedName.includes('.') ? normalizedName.split('.').pop().toLowerCase() : '';
  if (!rule.extensions.has(extension)) fileError('ONBOARDING_FILE_TYPE_FORBIDDEN', '文件扩展名不在允许范围内');
  const content = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (!content.byteLength || content.byteLength > rule.maximum) fileError('ONBOARDING_FILE_SIZE_INVALID', purpose === 'APPLICATION_ICON' ? '应用图标必须大于 0 且不超过 5MB' : '申请附件必须大于 0 且单个不超过 20MB');
  const extensionType = EXTENSION_TYPE[extension];
  const detectedType = detectType(content);
  if (!rule.types.has(detectedType) || detectedType !== extensionType) fileError('ONBOARDING_FILE_SIGNATURE_MISMATCH', '文件扩展名与内容特征不一致');
  const normalizedMime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (!MIME_BY_TYPE[detectedType]?.has(normalizedMime)) fileError('ONBOARDING_FILE_MIME_MISMATCH', '文件声明 MIME 与内容类型不一致');
  return Object.freeze({
    fileName: normalizedName,
    mimeType: normalizedMime,
    sizeBytes: content.byteLength,
    detectedType,
    sha256: createHash('sha256').update(content).digest('hex'),
    bytes: content
  });
}

export function createFeishuOnboardingFileService({ adminClient, safeRecordService = null, orchestrator, now = Date.now } = {}) {
  if (!adminClient?.uploadMedia) throw new Error('上线申请文件服务缺少飞书媒体客户端');
  async function upload(input, session) {
    const gate = orchestrator?.execute
      ? await orchestrator.execute({ session })
      : orchestrator?.prepared || await orchestrator?.prepare?.({ session });
    if (!gate?.ready) throw new FeishuProxyError('POC_GATES_NOT_READY', '申请服务暂不可用', 503);
    const inspected = inspectOnboardingFile(input);
    const suffix = createHash('sha256').update(`${gate.runId}\0${String(input.attemptId || '')}\0${inspected.sha256}\0${input.purpose}`).digest('hex').slice(0, 20);
    const extension = inspected.fileName.split('.').pop().toLowerCase();
    const uploadId = `TEST_UPLOAD_${suffix}`;
    const serverFileName = `TEST_ONBOARDING_${input.purpose === 'APPLICATION_ICON' ? 'ICON' : 'ATTACHMENT'}_${suffix}.${extension}`;
    const uploaded = await adminClient.uploadMedia({ fileName: serverFileName, bytes: inspected.bytes, mimeType: inspected.mimeType });
    orchestrator.appendLedger({ objectType: 'MEDIA', tableName: '', tableId: '', recordId: '', businessKey: uploadId, fileName: serverFileName, uploadId, instanceId: '', cleanupStrategy: 'UNLINK_AND_GC', fileTokenHash: createHash('sha256').update(uploaded.fileToken).digest('hex') });
    const uploadedAt = new Date(Number(now())).toISOString();
    if (safeRecordService?.createOnce) {
      const fields = {
        文件ID: stableFileId(uploadId), 文件名: inspected.fileName, 大小字节: inspected.sizeBytes, MIME类型: inspected.mimeType,
        SHA256: inspected.sha256, 业务类型: 'APP_ONBOARDING', 业务ID: input.attemptId || '', 用途: input.purpose,
        分片上传: false, 分片数: 1, 状态: 'READY', 过期时间: Number(now()) + 8 * 24 * 60 * 60 * 1000,
        飞书文件令牌: uploaded.fileToken, 租户编码: 'POC', 追踪ID: gate.runId, 运行标识: gate.runId
      };
      orchestrator.assertRecordWrite('文件上传会话', fields);
      const created = await safeRecordService.createOnce({
        tableName: '文件上传会话', keyField: '上传ID', businessKey: uploadId,
        idempotencyKey: `TEST_UPLOAD_TRACE_${suffix}`,
        governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' },
        fields
      });
      if (!created.replayed) orchestrator.appendLedger({ objectType: 'RECORD', tableName: '文件上传会话', tableId: created.tableId, recordId: String(created.record?.record_id || ''), keyField: '上传ID', businessKey: uploadId, fileName: serverFileName, uploadId, instanceId: '', cleanupStrategy: 'EXACT_RECORD_DELETE' });
    }
    return Object.freeze({ uploadId, purpose: input.purpose, originalName: inspected.fileName, serverFileName, sizeBytes: inspected.sizeBytes, mimeType: inspected.mimeType, detectedType: inspected.detectedType, sha256: inspected.sha256, uploadedAt, fileToken: uploaded.fileToken });
  }
  return Object.freeze({ upload });
}

function stableFileId(uploadId) {
  return `TEST_FILE_${createHash('sha256').update(uploadId).digest('hex').slice(0, 20)}`;
}
