import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const userId = String(process.env.FEISHU_VERIFY_AD_ACCOUNT || '').trim();
if (!userId) throw new Error('缺少 FEISHU_VERIFY_AD_ACCOUNT');
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const client = createFeishuOpenApiClient();
const service = createFeishuReadOnlyService({ client, identifierContract });
const context = { identity: { userId, adAccount: userId, openId: userId } };
const calls = [['COM-001', {}], ['WB-003', { recentMessageLimit: 5, todoLimit: 5 }], ['WB-004', { page: 1, pageSize: 10 }]];
const results = [];

const tableName = String(process.argv[2] || '').trim();
if (tableName) {
  const table = identifierContract.byName.get(tableName);
  if (!table) throw new Error(`未知表：${tableName}`);
  const startedAt = Date.now();
  try {
    const response = await client.listRecords(table.tableId, { viewId: table.views[0]?.viewId, pageSize: 10, fieldNames: table.fields.slice(0, 8).map(field => field.name) });
    console.log(JSON.stringify({ readOnly: true, tableName, status: 'passed', elapsedMs: Date.now() - startedAt, itemCount: response.items.length }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ readOnly: true, tableName, status: 'failed', elapsedMs: Date.now() - startedAt, code: String(error?.code || 'UNKNOWN'), httpStatus: Number(error?.status || 0) || null }, null, 2));
    process.exitCode = 1;
  }
  process.exit();
}

for (const [operationId, input] of calls) {
  const startedAt = Date.now();
  try {
    await service.execute(operationId, input, context);
    results.push({ operationId, status: 'passed', elapsedMs: Date.now() - startedAt });
  } catch (error) {
    results.push({ operationId, status: 'failed', elapsedMs: Date.now() - startedAt, code: String(error?.code || 'UNKNOWN'), httpStatus: Number(error?.status || 0) || null });
  }
}

console.log(JSON.stringify({ readOnly: true, results }, null, 2));
