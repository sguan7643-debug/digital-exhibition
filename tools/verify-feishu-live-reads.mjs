import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';

const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const client = createFeishuOpenApiClient();

if (!client.credentialsReady) throw new Error('缺少服务端飞书环境变量');

const probes = [
  ['COM-004', '用户字典'],
  ['ANN-002', '公告通知'],
  ['APP-002', '应用索引'],
  ['TAL-002', '人才项目'],
  ['TAL-003', '项目进度'],
  ['MAT-002', '素材中心']
];

const results = [];
for (const [operationId, tableName] of probes) {
  const table = contract.byName.get(tableName);
  const result = await client.listRecords(table.tableId, {
    viewId: table.views[0].viewId,
    pageSize: 10,
    fieldNames: table.fields.map(field => field.name)
  });
  const returnedFieldNames = [...new Set(result.items.flatMap(item => Object.keys(item.fields || {})))].sort();
  const missingFields = table.fields.map(field => field.name).filter(name => !returnedFieldNames.includes(name));
  results.push({
    operationId,
    tableName,
    itemCount: result.items.length,
    total: result.total,
    hasMore: result.hasMore,
    expectedFieldCount: table.fields.length,
    returnedFieldCount: returnedFieldNames.length,
    returnedFieldNames,
    missingFields
  });
}

const evidence = {
  checkedAt: new Date().toISOString(),
  mode: 'read-only-open-api',
  containsRecordValues: false,
  containsCredentials: false,
  containsAccessToken: false,
  pageSize: 10,
  results
};

const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
if (/tenant_access_token|app_secret|authorization|cookie|bearer/i.test(serialized)) {
  throw new Error('脱敏证据包含禁止字段');
}
if (outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized, 'utf8');
}
console.log(serialized);
