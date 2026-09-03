import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';

const evidencePath = process.env.FEISHU_OAUTH_EVIDENCE_PATH || process.argv[2] || '';
if (!evidencePath) throw new Error('缺少 FEISHU_OAUTH_EVIDENCE_PATH');
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
assert.equal(evidence.authenticated, true);
assert.equal(evidence.permissionLookupSucceeded, true);
for (const field of ['permissionCreated', 'permissionRecognized', 'operationSucceeded', 'testRecordCleaned', 'permissionCleaned']) {
  assert.equal(evidence.writeAcceptance?.[field], true, `OAuth 写验收未通过：${field}`);
}
assert.equal(evidence.writeAcceptance?.errorCode, '');

const contractPath = fileURLToPath(new URL('../server/contracts/feishu-base-identifiers.json', import.meta.url));
const contract = loadFeishuIdentifierContract(contractPath);
const client = createFeishuOpenApiClient();

function text(value) {
  if (Array.isArray(value)) return value.map(text).join('');
  if (value && typeof value === 'object') return String(value.text || value.name || value.value || '');
  return String(value ?? '');
}

async function countResidue(tableName, keyField) {
  const table = contract.byName.get(tableName);
  if (!table) throw new Error(`合同缺少表：${tableName}`);
  let pageToken = '';
  let residue = 0;
  do {
    const page = await client.listRecords(table.tableId, { pageSize: 100, pageToken, fieldNames: [keyField] });
    residue += page.items.filter(record => text(record?.fields?.[keyField]).startsWith('TEST_OAUTH_')).length;
    pageToken = page.hasMore ? page.nextPageToken : '';
  } while (pageToken);
  return residue;
}

const permissionResidue = await countResidue('用户权限', '主键');
const favoriteResidue = await countResidue('应用收藏', '主键');
assert.equal(permissionResidue, 0, '用户权限表残留 TEST_OAUTH_ 记录');
assert.equal(favoriteResidue, 0, '应用收藏表残留 TEST_OAUTH_ 记录');

console.log(JSON.stringify({
  passed: true,
  authenticated: true,
  operationId: evidence.writeAcceptance.operationId,
  operationSucceeded: true,
  permissionResidue,
  favoriteResidue
}, null, 2));
