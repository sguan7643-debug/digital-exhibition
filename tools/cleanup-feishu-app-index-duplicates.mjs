import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDuplicateFieldCleanup } from '../server/feishu-duplicate-field-cleanup.mjs';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';

const apply = process.argv.includes('--apply');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const client = createFeishuSchemaAdminClient();
const table = (await client.listTables({ force: true })).find(item => item.name === '应用索引');
if (!table) throw new Error('应用索引不存在');
const fields = await client.listFields(table.table_id, { force: true });
const plan = planDuplicateFieldCleanup(table.name, fields);
const result = {
  mode: apply ? 'apply' : 'dry-run',
  tableName: table.name,
  tableId: table.table_id,
  fieldCountBefore: fields.length,
  duplicateGroupCount: plan.duplicateGroupCount,
  removeCount: plan.removeCount,
  keep: plan.keep,
  remove: plan.remove
};

if (apply && plan.remove.length) {
  if (!client.schemaWriteEnabled) throw new Error('必须设置 FEISHU_SCHEMA_WRITE_ENABLED=1 才能删除重复字段');
  const backupDirectory = path.join(root, '.local', 'schema-backups');
  mkdirSync(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, `应用索引-${stamp}.json`);
  writeFileSync(backupPath, `${JSON.stringify({ capturedAt: new Date().toISOString(), table, fields, plan }, null, 2)}\n`, 'utf8');
  for (const field of plan.remove) await client.deleteField(table.table_id, field.fieldId);
  const after = await client.listFields(table.table_id, { force: true });
  const verification = planDuplicateFieldCleanup(table.name, after);
  if (verification.removeCount) throw new Error(`重复字段清理后仍剩余 ${verification.removeCount} 个待删除字段`);
  Object.assign(result, { backupPath, fieldCountAfter: after.length, verified: true });
}

console.log(JSON.stringify(result, null, 2));
