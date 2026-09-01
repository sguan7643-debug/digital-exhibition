export class SchemaDriftError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'SchemaDriftError';
    this.code = 'SCHEMA_DRIFT';
    this.details = details;
  }
}
function normalizeField(field) {
  if (!field?.fieldId || !field?.name || !field?.type) throw new SchemaDriftError('字段字典缺少 field_id、名称或类型');
  return Object.freeze({
    fieldId: field.fieldId,
    name: field.name,
    type: field.type,
    options: Object.freeze([...(field.options || [])]),
    relation: field.relation ? Object.freeze({ ...field.relation }) : null
  });
}

export function createFieldDictionary({ schemaVersion, fields } = {}) {
  if (!schemaVersion || !Array.isArray(fields) || fields.length === 0) throw new SchemaDriftError('字段字典契约不完整');
  const normalized = fields.map(normalizeField);
  if (new Set(normalized.map(field => field.fieldId)).size !== normalized.length) throw new SchemaDriftError('field_id 重复');
  return Object.freeze({ schemaVersion, fields: Object.freeze(normalized) });
}

function assertValue(field, value) {
  if (value == null) return;
  if (field.type === 'text' && typeof value !== 'string') throw new SchemaDriftError(`${field.fieldId} 类型不匹配`);
  if (field.type === 'number' && typeof value !== 'number') throw new SchemaDriftError(`${field.fieldId} 类型不匹配`);
  if (field.type === 'singleSelect' && !field.options.includes(value)) throw new SchemaDriftError(`${field.fieldId} 选项不匹配`);
  if (field.type === 'multiSelect' && (!Array.isArray(value) || value.some(item => !field.options.includes(item)))) throw new SchemaDriftError(`${field.fieldId} 选项不匹配`);
}

export function mapRecordByFieldId(record, dictionary, remoteFields) {
  const actual = new Map((remoteFields || []).map(field => [field.fieldId, normalizeField(field)]));
  const output = {};
  for (const expected of dictionary.fields) {
    const field = actual.get(expected.fieldId);
    if (!field || field.name !== expected.name || field.type !== expected.type) {
      throw new SchemaDriftError(`字段漂移：${expected.fieldId}`, { expected, actual: field });
    }
    if (JSON.stringify(field.options) !== JSON.stringify(expected.options)) throw new SchemaDriftError(`字段选项漂移：${expected.fieldId}`);
    if (JSON.stringify(field.relation) !== JSON.stringify(expected.relation)) throw new SchemaDriftError(`字段关系漂移：${expected.fieldId}`);
    const value = record[field.name];
    assertValue(expected, value);
    output[expected.fieldId] = value;
  }
  return output;
}
