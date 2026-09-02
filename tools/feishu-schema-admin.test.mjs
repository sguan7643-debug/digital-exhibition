import assert from 'node:assert/strict';
import { EXISTING_TABLE_FIELD_COMPLETIONS, MISSING_TABLE_SCHEMAS } from '../server/contracts/feishu-missing-table-manifest.mjs';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';

assert.equal(MISSING_TABLE_SCHEMAS.length, 28);
assert.equal(new Set(MISSING_TABLE_SCHEMAS.map(item => item.table_name)).size, 28);
assert.ok(MISSING_TABLE_SCHEMAS.every(item => item.fields.length >= 5));
assert.equal(EXISTING_TABLE_FIELD_COMPLETIONS.length, 14);

const calls = [];
const fetchImpl = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
  if (String(url).endsWith('/auth/v3/tenant_access_token/internal')) return Response.json({ code: 0, tenant_access_token: 'test-token', expire: 7200 });
  if (String(url).includes('/tables?')) return Response.json({ code: 0, data: { items: [], has_more: false } });
  if (options.method === 'POST' && String(url).endsWith('/tables')) return Response.json({ code: 0, data: { table_id: 'tbl-created', default_view_id: 'vew-created', field_id_list: ['fld-created'] } });
  throw new Error(`未声明请求：${url}`);
};
const disabled = createFeishuSchemaAdminClient({ appId: 'app-test', appSecret: 'secret-test', baseToken: 'base-test', fetchImpl });
assert.deepEqual(await disabled.listTables(), []);
await assert.rejects(() => disabled.createTable(MISSING_TABLE_SCHEMAS[0]), error => error.code === 'SCHEMA_WRITE_DISABLED');
const enabled = createFeishuSchemaAdminClient({ appId: 'app-test', appSecret: 'secret-test', baseToken: 'base-test', fetchImpl, schemaWriteEnabled: true });
const created = await enabled.createTable(MISSING_TABLE_SCHEMAS[0]);
assert.equal(created.tableId, 'tbl-created');
const request = JSON.parse(calls.find(call => call.method === 'POST' && call.url.endsWith('/tables')).body);
assert.equal(request.table.name, '公告关联对象');
assert.equal(request.table.fields[0].field_name, '关联编码');
assert.equal(request.table.fields[0].description.text, 'business_code=relation_code');
assert.equal(Object.hasOwn(request.table.fields[0], 'business_code'), false);
assert.doesNotMatch(request.table.name, /secret-test|test-token/);
console.log('28-table schema manifest, read-only dry-run and dual write gate passed');
