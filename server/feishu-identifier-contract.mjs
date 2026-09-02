import { readFileSync } from 'node:fs';

function assertIdentifier(value, prefix, label) {
  if (!new RegExp(`^${prefix}[A-Za-z0-9]+$`).test(value || '')) throw new Error(`${label} 非法`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function loadFeishuIdentifierContract(filePath) {
  const contract = JSON.parse(readFileSync(filePath, 'utf8'));
  if (contract.schemaVersion !== 'feishu-base-identifiers.v1') throw new Error('飞书标识契约版本不受支持');
  if (contract.tableCount !== 36 || contract.fieldCount !== 271 || contract.tables?.length !== 36) {
    throw new Error('飞书标识契约数量不完整');
  }
  if (Object.hasOwn(contract, 'baseId') || Object.hasOwn(contract, 'appToken')) {
    throw new Error('飞书标识契约不得包含 Base token');
  }

  const names = new Set();
  const tableIds = new Set();
  const fieldIds = new Set();
  for (const table of contract.tables) {
    assertIdentifier(table.tableId, 'tbl', 'tableId');
    if (!table.name || names.has(table.name) || tableIds.has(table.tableId)) throw new Error('飞书表名或 tableId 重复');
    names.add(table.name);
    tableIds.add(table.tableId);
    if (!Array.isArray(table.views) || !table.views.length) throw new Error(`表 ${table.name} 缺少视图`);
    table.views.forEach(view => assertIdentifier(view.viewId, 'vew', 'viewId'));
    if (!Array.isArray(table.fields) || table.fields.length !== table.fieldCount) throw new Error(`表 ${table.name} 字段不完整`);
    for (const field of table.fields) {
      assertIdentifier(field.fieldId, 'fld', 'fieldId');
      if (!field.name || fieldIds.has(field.fieldId)) throw new Error('fieldId 重复或字段名缺失');
      fieldIds.add(field.fieldId);
    }
  }
  if (fieldIds.size !== 271) throw new Error('飞书字段标识不完整');

  const byName = new Map(contract.tables.map(table => [table.name, table]));
  Object.defineProperty(contract, 'byName', { value: byName, enumerable: false, writable: false });
  return deepFreeze(contract);
}
