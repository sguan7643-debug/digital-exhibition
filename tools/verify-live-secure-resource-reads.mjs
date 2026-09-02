import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';
import { createFeishuFileAccessService } from '../server/feishu-file-access-service.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createSecureResourceOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const suffix = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const marker = name => `TEST_${name}_${suffix}`;
const userId = marker('USER');
const appId = marker('APP');
const uploadId = marker('UPLOAD');
const fileId = marker('FILE');
const materialId = marker('MATERIAL');
const adminClient = createFeishuSchemaAdminClient({ recordWriteEnabled: true });
const safeService = createFeishuSafeTestRecordService({ client: adminClient });
const openClient = createFeishuOpenApiClient();
const fileAccessService = createFeishuFileAccessService({ client: openClient });
const readService = createFeishuReadOnlyService({ client: openClient, identifierContract, fileAccessService, allowedAppLaunchHosts: ['test.example.invalid'], appProjectionCacheMs: 0 });
const contracts = createSecureResourceOperationContracts();
const context = { identity: { userId, openId: userId } };
const created = [];
const results = [];

async function create(tableName, keyField, businessKey, fields) {
  const result = await safeService.createOnce({ tableName, keyField, businessKey, idempotencyKey: marker(`IDEMPOTENCY_${created.length}`), fields });
  created.push({ tableName, keyField, businessKey, version: result.version || 1 });
  return result;
}

async function cleanup() {
  for (const target of [...created].reverse()) {
    try { await safeService.remove({ ...target, ifMatch: target.version }); } catch {}
  }
}

try {
  const bytes = new TextEncoder().encode(`TEST_ secure file integration ${suffix}`);
  const uploaded = await adminClient.uploadMedia({ fileName: `${marker('FILE')}.txt`, bytes, mimeType: 'text/plain' });
  await create('文件上传会话', '上传ID', uploadId, {
    文件ID: fileId, 文件名: `${marker('FILE')}.txt`, 大小字节: bytes.byteLength, MIME类型: 'text/plain', SHA256: marker('SHA'),
    业务类型: 'TEST_INTEGRATION', 业务ID: appId, 用途: 'TEST_DOWNLOAD', 分片上传: false, 分片数: 1, 状态: 'COMPLETED',
    过期时间: Date.now() + 3600000, 飞书文件令牌: uploaded.fileToken, 租户编码: 'TEST'
  });
  await create('素材中心', '素材ID', materialId, {
    素材名称: marker('素材'), 素材文件: uploaded.fileToken, 下载次数: 0, 状态: 'ONLINE'
  });
  await create('应用索引', '应用ID', appId, {
    应用名称: marker('应用'), 应用类型: 'TEST', 应用简介: 'TEST_ 安全启动接口联调', 应用URL地址: 'https://test.example.invalid/launch',
    状态: '已上架', 打开方式: 'NEW_TAB', SSO模式: 'NONE'
  });

  const fileResponse = await readService.execute('COM-008', { fileId, mode: 'DOWNLOAD', disposition: 'ATTACHMENT' }, context);
  validateContractSchema(fileResponse, contracts['COM-008'].successSchema, 'COM-008');
  const grantToken = fileResponse.data.url.split('/').at(-1);
  const downloaded = await fileAccessService.consume(grantToken, context.identity);
  const downloadedBytes = new Uint8Array(await downloaded.upstream.arrayBuffer());
  if (downloadedBytes.byteLength !== bytes.byteLength) throw new Error('COM-008 下载字节数与上传不一致');
  results.push({ operationId: 'COM-008', passed: true, bytes: downloadedBytes.byteLength, tokenExposed: JSON.stringify(fileResponse).includes(uploaded.fileToken) });

  const appResponse = await readService.execute('APP-004', { appId, launchMode: 'NEW_TAB', sourcePage: '/apps', requestedAt: new Date().toISOString() }, context);
  validateContractSchema(appResponse, contracts['APP-004'].successSchema, 'APP-004');
  if (!appResponse.data.allowed || appResponse.data.launchUrl !== 'https://test.example.invalid/launch') throw new Error('APP-004 安全启动未通过');
  results.push({ operationId: 'APP-004', passed: true, allowed: true, host: new URL(appResponse.data.launchUrl).hostname });

  const materialResponse = await readService.execute('MAT-003', { materialId, fileId: uploaded.fileToken, purpose: 'TEST_DOWNLOAD', sourcePage: '/materials', clientOccurredAt: new Date().toISOString() }, context);
  validateContractSchema(materialResponse, contracts['MAT-003'].successSchema, 'MAT-003');
  results.push({ operationId: 'MAT-003', passed: materialResponse.data.accessUrl.startsWith('/api/v1/files/content/'), tokenInUrl: materialResponse.data.accessUrl.includes(uploaded.fileToken) });
} finally {
  await cleanup();
}

const tables = await adminClient.listTables();
let cleanupComplete = true;
for (const target of created) {
  const table = tables.find(item => item.name === target.tableName);
  const remaining = table ? await adminClient.searchRecords(table.table_id, target.keyField, target.businessKey) : { items: [] };
  if (remaining.items.length) cleanupComplete = false;
}
const passed = results.length === 3 && results.every(item => item.passed && item.tokenExposed !== true && item.tokenInUrl !== true) && cleanupComplete;
console.log(JSON.stringify({ passed, expected: 3, verified: results.length, cleanupComplete, results }, null, 2));
if (!passed) process.exitCode = 2;
