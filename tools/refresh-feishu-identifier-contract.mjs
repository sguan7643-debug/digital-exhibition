import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json');
const client = createFeishuSchemaAdminClient();
const currentContract = JSON.parse(readFileSync(outputPath, 'utf8'));
const expectedNames = new Set(currentContract.tables.map(table => table.name));
const liveTables = (await client.listTables()).filter(table => expectedNames.has(table.name));
if (liveTables.length !== currentContract.tableCount) throw new Error(`测试 Base 合同表数量不是 ${currentContract.tableCount}：${liveTables.length}`);

const tables = [];
const tableIds = new Set();
const fieldIds = new Set();
for (const liveTable of liveTables) {
  if (!/^tbl[A-Za-z0-9]+$/.test(liveTable.table_id) || tableIds.has(liveTable.table_id)) throw new Error(`非法或重复 tableId：${liveTable.table_id}`);
  tableIds.add(liveTable.table_id);
  const [liveViews, liveFields] = await Promise.all([
    client.listViews(liveTable.table_id),
    client.listFields(liveTable.table_id)
  ]);
  const views = liveViews.map(view => ({
    viewId: view.view_id,
    name: view.view_name || view.name || '',
    type: view.view_type || view.type || ''
  }));
  if (!views.length || views.some(view => !/^vew[A-Za-z0-9]+$/.test(view.viewId))) throw new Error(`表 ${liveTable.name} 缺少合法视图`);
  const fields = liveFields.map(field => {
    if (!/^fld[A-Za-z0-9]+$/.test(field.field_id) || fieldIds.has(field.field_id)) throw new Error(`非法或重复 fieldId：${field.field_id}`);
    fieldIds.add(field.field_id);
    return {
      fieldId: field.field_id,
      name: field.field_name,
      type: field.type,
      uiType: field.ui_type || '',
      isPrimary: Boolean(field.is_primary),
      formatter: field.property?.formatter ?? null,
      optionsType: field.property?.options_type ?? null,
      options: Array.isArray(field.property?.options) ? field.property.options.map(option => ({ id: option.id, name: option.name })) : [],
      relationTargetTableId: field.property?.table_id ?? null
    };
  });
  tables.push({ name: liveTable.name, tableId: liveTable.table_id, views, fieldCount: fields.length, fields });
  console.log(`${tables.length}/${currentContract.tableCount} ${liveTable.name} ${fields.length} fields`);
}

const canonical = JSON.stringify(tables);
const contract = {
  schemaVersion: 'feishu-base-identifiers.v2',
  sourceSha256: createHash('sha256').update(canonical).digest('hex').toUpperCase(),
  generatedAt: new Date().toISOString(),
  tableCount: tables.length,
  fieldCount: fieldIds.size,
  tables
};
const serialized = `${JSON.stringify(contract, null, 2)}\n`;
if (/"(?:baseId|appToken|authorization|cookie|credential|secret|token)"\s*:/i.test(serialized)) throw new Error('标识契约意外包含凭据或 Base token');
writeFileSync(outputPath, serialized, 'utf8');
console.log(JSON.stringify({ outputPath, tableCount: tables.length, fieldCount: fieldIds.size, sourceSha256: contract.sourceSha256 }, null, 2));
