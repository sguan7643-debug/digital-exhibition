import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error('用法：node tools/build-feishu-server-contract.mjs <已核验结构证据> <服务端输出>');
}

const sourceBytes = readFileSync(path.resolve(sourcePath));
const source = JSON.parse(sourceBytes.toString('utf8'));
const tables = Array.isArray(source.tables) ? source.tables : [];

if (
  source.tableCount !== 36
  || tables.length !== 36
  || source.containsRecordValues !== false
  || source.containsCredentials !== false
  || source.containsRequestAuthorization !== false
) {
  throw new Error('飞书结构证据未通过 36 表或脱敏完整性校验');
}

const tableIds = new Set();
const fieldIds = new Set();
const safeTables = tables.map(table => {
  if (!/^tbl[A-Za-z0-9]+$/.test(table.tableId) || tableIds.has(table.tableId)) {
    throw new Error(`非法或重复 tableId：${table.tableId}`);
  }
  tableIds.add(table.tableId);
  const views = (table.views || []).map(view => {
    if (!/^vew[A-Za-z0-9]+$/.test(view.viewId)) throw new Error(`非法 viewId：${view.viewId}`);
    return { viewId: view.viewId, name: view.name, type: view.type };
  });
  const fields = (table.fields || []).map(field => {
    if (!/^fld[A-Za-z0-9]+$/.test(field.fieldId) || fieldIds.has(field.fieldId)) {
      throw new Error(`非法或重复 fieldId：${field.fieldId}`);
    }
    fieldIds.add(field.fieldId);
    return {
      fieldId: field.fieldId,
      name: field.name,
      type: field.type,
      uiType: field.uiType,
      isPrimary: Boolean(field.isPrimary),
      formatter: field.formatter ?? null,
      optionsType: field.optionsType ?? null,
      options: Array.isArray(field.options) ? field.options : [],
      relationTargetTableId: field.relationTargetTableId ?? null
    };
  });
  if (!views.length || fields.length !== table.fieldCount) throw new Error(`表结构不完整：${table.name}`);
  return { name: table.name, tableId: table.tableId, views, fieldCount: fields.length, fields };
});

if (fieldIds.size !== 271) throw new Error(`字段总数不符：${fieldIds.size}`);

const output = {
  schemaVersion: 'feishu-base-identifiers.v1',
  sourceSha256: createHash('sha256').update(sourceBytes).digest('hex').toUpperCase(),
  tableCount: safeTables.length,
  fieldCount: fieldIds.size,
  tables: safeTables
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;
if (/"(?:baseId|appToken|authorization|cookie|credential|secret|token)"\s*:/i.test(serialized)) {
  throw new Error('服务端标识契约意外包含凭据或 Base token');
}

mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
writeFileSync(path.resolve(outputPath), serialized, 'utf8');
console.log(`generated ${safeTables.length} tables / ${fieldIds.size} fields -> ${path.resolve(outputPath)}`);
