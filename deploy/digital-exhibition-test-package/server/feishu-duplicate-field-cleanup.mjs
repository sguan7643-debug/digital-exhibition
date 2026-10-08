export function planDuplicateFieldCleanup(tableName, fields = []) {
  if (tableName !== '应用索引') throw new Error('仅允许清理应用索引的重复字段');
  const groups = new Map();
  for (const field of fields) {
    const name = String(field?.field_name || '').trim();
    const fieldId = String(field?.field_id || '').trim();
    if (!name || !fieldId) throw new Error('字段清单包含无效名称或字段 ID');
    const entries = groups.get(name) || [];
    entries.push(field);
    groups.set(name, entries);
  }
  const keep = [];
  const remove = [];
  for (const [name, entries] of groups) {
    if (entries.length < 2) continue;
    const expectedType = Number(entries[0].type);
    if (entries.some(field => Number(field.type) !== expectedType)) throw new Error(`同名字段类型不一致，拒绝自动清理：${name}`);
    if (entries.some(field => Boolean(field.is_primary))) throw new Error(`主键字段出现重复，拒绝自动清理：${name}`);
    keep.push({ fieldId: String(entries[0].field_id), name, type: expectedType });
    for (const field of entries.slice(1)) remove.push({ fieldId: String(field.field_id), name, type: expectedType });
  }
  return Object.freeze({
    tableName,
    duplicateGroupCount: keep.length,
    removeCount: remove.length,
    keep: Object.freeze(keep),
    remove: Object.freeze(remove)
  });
}
