import { createHash } from 'node:crypto';
import { MISSING_TABLE_MANIFEST_VERSION, MISSING_TABLE_SCHEMAS } from '../server/contracts/feishu-missing-table-manifest.mjs';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';

const apply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const client = createFeishuSchemaAdminClient();
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const manifestHash = createHash('sha256').update(JSON.stringify(MISSING_TABLE_SCHEMAS)).digest('hex');

async function inspect() {
  const tables = await client.listTables();
  const byName = new Map(tables.map(table => [table.name, table]));
  const actions = [];
  for (const schema of MISSING_TABLE_SCHEMAS) {
    const table = byName.get(schema.table_name);
    if (!table) {
      actions.push({ action: 'CREATE_TABLE', tableName: schema.table_name, tableCode: schema.table_code, fieldCount: schema.fields.length });
      continue;
    }
    const fields = await client.listFields(table.table_id);
    const existing = new Set(fields.map(field => field.field_name));
    for (const field of schema.fields) {
      if (!existing.has(field.field_name)) actions.push({ action: 'CREATE_FIELD', tableName: schema.table_name, tableId: table.table_id, fieldName: field.field_name, field });
    }
  }
  return { tables, byName, actions };
}

let snapshot = await inspect();
if (apply && !verifyOnly) {
  if (!client.schemaWriteEnabled) throw new Error('必须同时设置 FEISHU_SCHEMA_WRITE_ENABLED=1 才能执行 --apply');
  for (const action of snapshot.actions) {
    if (action.action === 'CREATE_TABLE') {
      const schema = MISSING_TABLE_SCHEMAS.find(item => item.table_name === action.tableName);
      await client.createTable(schema);
    } else {
      await client.createField(action.tableId, action.field);
    }
    await wait(800);
  }
  snapshot = await inspect();
}

const remaining = snapshot.actions.map(action => ({
  action: action.action, tableName: action.tableName, fieldName: action.fieldName || '', fieldCount: action.fieldCount || 0
}));
const result = {
  mode: verifyOnly ? 'verify' : apply ? 'apply' : 'dry-run', manifestVersion: MISSING_TABLE_MANIFEST_VERSION,
  manifestSha256: manifestHash, expectedTables: MISSING_TABLE_SCHEMAS.length,
  discoveredTables: snapshot.tables.length, remainingActions: remaining.length, complete: remaining.length === 0,
  actions: remaining
};
console.log(JSON.stringify(result, null, 2));
if ((apply || verifyOnly) && remaining.length) process.exitCode = 2;
